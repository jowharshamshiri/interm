import { TouchEvent, GestureEvent, InteractionCapabilities } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  pressure: number;
  timestamp: Date;
  isActive: boolean;
}

export interface GestureState {
  type: GestureEvent['type'];
  startTime: Date;
  startPoints: TouchPoint[];
  currentPoints: TouchPoint[];
  isActive: boolean;
}

export class TouchManager {
  private static instance: TouchManager;
  private activeTouches = new Map<number, TouchPoint>();
  private activeGestures = new Map<string, GestureState>();
  private gestureThresholds = {
    swipeMinDistance: 50,
    swipeMaxTime: 500,
    tapMaxDuration: 200,
    longPressMinDuration: 800,
    pinchMinDistance: 20
  };
  private touchHistory: TouchEvent[] = [];
  private gestureHistory: GestureEvent[] = [];
  
  private constructor() {}

  static getInstance(): TouchManager {
    if (!TouchManager.instance) {
      TouchManager.instance = new TouchManager();
    }
    return TouchManager.instance;
  }

  /**
   * Process a touch event and detect gestures
   */
  processTouchEvent(event: TouchEvent): GestureEvent | null {
    this.touchHistory.push(event);
    
    // Limit history size
    if (this.touchHistory.length > 1000) {
      this.touchHistory = this.touchHistory.slice(-500);
    }

    switch (event.type) {
      case 'touch':
        return this.handleTouchStart(event);
      case 'move':
        return this.handleTouchMove(event);
      case 'release':
        return this.handleTouchEnd(event);
      case 'cancel':
        return this.handleTouchCancel(event);
      default:
        throw createTerminalError('PARSING_ERROR', `Unknown touch event type: ${event.type}`);
    }
  }

  private handleTouchStart(event: TouchEvent): GestureEvent | null {
    const touchPoint: TouchPoint = {
      id: event.touchId,
      x: event.x,
      y: event.y,
      pressure: event.pressure || 1.0,
      timestamp: event.timestamp,
      isActive: true
    };

    // Palm rejection check
    if (this.isPalmTouch(touchPoint)) {
      return null;
    }

    this.activeTouches.set(event.touchId, touchPoint);

    // Detect potential gestures based on active touches
    const activeTouchCount = this.activeTouches.size;
    
    if (activeTouchCount === 1) {
      // Single touch - could be tap or long press
      this.startGestureDetection('tap', [touchPoint]);
      this.startGestureDetection('long_press', [touchPoint]);
    } else if (activeTouchCount === 2) {
      // Two touches - could be pinch or rotate
      const touches = Array.from(this.activeTouches.values());
      this.startGestureDetection('pinch', touches);
      this.startGestureDetection('rotate', touches);
    } else if (activeTouchCount >= 3) {
      // Multi-touch gestures with 3+ fingers
      const touches = Array.from(this.activeTouches.values());
      this.startGestureDetection('swipe', touches.slice(0, 3)); // Use first 3 touches for multi-finger swipe
    }

    return null;
  }

  private handleTouchMove(event: TouchEvent): GestureEvent | null {
    const existingTouch = this.activeTouches.get(event.touchId);
    if (!existingTouch) {
      return null;
    }

    // Update touch position
    existingTouch.x = event.x;
    existingTouch.y = event.y;
    existingTouch.pressure = event.pressure || 1.0;
    existingTouch.timestamp = event.timestamp;

    // Check for swipe gestures
    const swipeGesture = this.detectSwipeGesture(existingTouch, event);
    if (swipeGesture) {
      return swipeGesture;
    }

    // Update multi-touch gestures if active
    if (this.activeGestures.has('pinch')) {
      const pinchGesture = this.updatePinchGesture();
      if (pinchGesture) return pinchGesture;
    }

    if (this.activeGestures.has('rotate')) {
      const rotateGesture = this.updateRotateGesture();
      if (rotateGesture) return rotateGesture;
    }

    return null;
  }

  private handleTouchEnd(event: TouchEvent): GestureEvent | null {
    const touchPoint = this.activeTouches.get(event.touchId);
    if (!touchPoint) {
      return null;
    }

    touchPoint.isActive = false;
    this.activeTouches.delete(event.touchId);

    // Check for completed gestures
    const tapGesture = this.detectTapGesture(touchPoint, event);
    if (tapGesture) {
      this.clearActiveGestures();
      return tapGesture;
    }

    const longPressGesture = this.detectLongPressGesture(touchPoint, event);
    if (longPressGesture) {
      this.clearActiveGestures();
      return longPressGesture;
    }

    // Clean up gestures when all touches are released
    if (this.activeTouches.size === 0) {
      this.clearActiveGestures();
    }

    return null;
  }

  private handleTouchCancel(event: TouchEvent): GestureEvent | null {
    this.activeTouches.delete(event.touchId);
    
    if (this.activeTouches.size === 0) {
      this.clearActiveGestures();
    }

    return null;
  }

  private startGestureDetection(gestureType: GestureEvent['type'], touchPoints: TouchPoint[]): void {
    const gestureState: GestureState = {
      type: gestureType,
      startTime: new Date(),
      startPoints: [...touchPoints],
      currentPoints: [...touchPoints],
      isActive: true
    };

    this.activeGestures.set(gestureType, gestureState);
  }

  private detectSwipeGesture(touchPoint: TouchPoint, event: TouchEvent): GestureEvent | null {
    const gestureState = this.activeGestures.get('swipe');
    
    // Start swipe detection if not already started
    if (!gestureState) {
      this.startGestureDetection('swipe', [touchPoint]);
      return null;
    }

    const startPoints = gestureState.startPoints;
    const fingerCount = startPoints.length;
    
    // Calculate average movement for multi-finger swipes
    let totalDeltaX = 0;
    let totalDeltaY = 0;
    
    if (fingerCount === 1) {
      const startPoint = startPoints[0];
      totalDeltaX = event.x - startPoint.x;
      totalDeltaY = event.y - startPoint.y;
    } else {
      // Multi-finger swipe - check if all fingers moved in same direction
      const activeTouches = Array.from(this.activeTouches.values());
      for (let i = 0; i < Math.min(fingerCount, activeTouches.length); i++) {
        const startPoint = startPoints[i];
        const currentTouch = activeTouches[i];
        totalDeltaX += currentTouch.x - startPoint.x;
        totalDeltaY += currentTouch.y - startPoint.y;
      }
      totalDeltaX /= fingerCount;
      totalDeltaY /= fingerCount;
    }

    const distance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
    const duration = event.timestamp.getTime() - gestureState.startTime.getTime();

    if (distance >= this.gestureThresholds.swipeMinDistance && 
        duration <= this.gestureThresholds.swipeMaxTime) {
      
      // Determine swipe direction
      let direction: 'up' | 'down' | 'left' | 'right';
      if (Math.abs(totalDeltaX) > Math.abs(totalDeltaY)) {
        direction = totalDeltaX > 0 ? 'right' : 'left';
      } else {
        direction = totalDeltaY > 0 ? 'down' : 'up';
      }

      const velocity = distance / duration;

      const swipeEvent: GestureEvent = {
        type: 'swipe',
        direction,
        velocity,
        fingers: fingerCount,
        timestamp: event.timestamp
      };

      this.gestureHistory.push(swipeEvent);
      return swipeEvent;
    }

    return null;
  }

  private detectTapGesture(touchPoint: TouchPoint, event: TouchEvent): GestureEvent | null {
    const gestureState = this.activeGestures.get('tap');
    if (!gestureState) {
      return null;
    }

    const duration = event.timestamp.getTime() - gestureState.startTime.getTime();
    
    if (duration <= this.gestureThresholds.tapMaxDuration) {
      const tapEvent: GestureEvent = {
        type: 'tap',
        fingers: 1,
        timestamp: event.timestamp
      };

      this.gestureHistory.push(tapEvent);
      return tapEvent;
    }

    return null;
  }

  private detectLongPressGesture(touchPoint: TouchPoint, event: TouchEvent): GestureEvent | null {
    const gestureState = this.activeGestures.get('long_press');
    if (!gestureState) {
      return null;
    }

    const duration = event.timestamp.getTime() - gestureState.startTime.getTime();
    
    if (duration >= this.gestureThresholds.longPressMinDuration) {
      const longPressEvent: GestureEvent = {
        type: 'long_press',
        fingers: 1,
        timestamp: event.timestamp
      };

      this.gestureHistory.push(longPressEvent);
      return longPressEvent;
    }

    return null;
  }

  private updatePinchGesture(): GestureEvent | null {
    const gestureState = this.activeGestures.get('pinch');
    if (!gestureState || this.activeTouches.size !== 2) {
      return null;
    }

    const touches = Array.from(this.activeTouches.values());
    const currentDistance = this.calculateDistance(touches[0], touches[1]);
    const initialDistance = this.calculateDistance(
      gestureState.startPoints[0], 
      gestureState.startPoints[1]
    );

    const scale = currentDistance / initialDistance;
    
    if (Math.abs(scale - 1.0) >= 0.1) { // 10% change threshold
      const pinchEvent: GestureEvent = {
        type: 'pinch',
        scale,
        fingers: 2,
        timestamp: new Date()
      };

      this.gestureHistory.push(pinchEvent);
      return pinchEvent;
    }

    return null;
  }

  private updateRotateGesture(): GestureEvent | null {
    const gestureState = this.activeGestures.get('rotate');
    if (!gestureState || this.activeTouches.size !== 2) {
      return null;
    }

    const touches = Array.from(this.activeTouches.values());
    const currentAngle = this.calculateAngle(touches[0], touches[1]);
    const initialAngle = this.calculateAngle(
      gestureState.startPoints[0], 
      gestureState.startPoints[1]
    );

    const rotation = currentAngle - initialAngle;
    
    if (Math.abs(rotation) >= 10) { // 10 degree threshold
      const rotateEvent: GestureEvent = {
        type: 'rotate',
        rotation,
        fingers: 2,
        timestamp: new Date()
      };

      this.gestureHistory.push(rotateEvent);
      return rotateEvent;
    }

    return null;
  }

  private calculateAngle(point1: TouchPoint, point2: TouchPoint): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  }

  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private clearActiveGestures(): void {
    this.activeGestures.clear();
  }

  /**
   * Get current touch capabilities
   */
  getCapabilities(): InteractionCapabilities['touch'] {
    return {
      enabled: true,
      multiTouch: true,
      gestureSupport: true,
      hapticFeedback: false // Platform dependent
    };
  }

  /**
   * Get active touch points
   */
  getActiveTouches(): TouchPoint[] {
    return Array.from(this.activeTouches.values());
  }

  /**
   * Get touch event history
   */
  getTouchHistory(limit: number = 100): TouchEvent[] {
    return this.touchHistory.slice(-limit);
  }

  /**
   * Get gesture event history
   */
  getGestureHistory(limit: number = 50): GestureEvent[] {
    return this.gestureHistory.slice(-limit);
  }

  /**
   * Clear all touch state
   */
  clearState(): void {
    this.activeTouches.clear();
    this.activeGestures.clear();
    this.touchHistory = [];
    this.gestureHistory = [];
  }

  /**
   * Configure gesture detection thresholds
   */
  configureThresholds(thresholds: Partial<typeof TouchManager.prototype.gestureThresholds>): void {
    this.gestureThresholds = {
      ...this.gestureThresholds,
      ...thresholds
    };
  }

  /**
   * Detect palm rejection - filter out large contact area touches
   */
  private isPalmTouch(touchPoint: TouchPoint): boolean {
    // Basic palm rejection - large pressure and low movement
    return touchPoint.pressure > 0.8 && this.getTouchMovementDistance(touchPoint) < 5;
  }

  private getTouchMovementDistance(touchPoint: TouchPoint): number {
    const history = this.touchHistory.filter(t => t.touchId === touchPoint.id).slice(-5);
    if (history.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < history.length; i++) {
      const deltaX = history[i].x - history[i-1].x;
      const deltaY = history[i].y - history[i-1].y;
      totalDistance += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    return totalDistance;
  }

  /**
   * Enhanced touch drag detection
   */
  detectTouchDrag(startPoint: TouchPoint, currentPoint: TouchPoint): boolean {
    const distance = this.calculateDistance(startPoint, currentPoint);
    const threshold = 15; // Minimum drag distance
    return distance >= threshold;
  }

  /**
   * Simulate multi-finger gesture
   */
  simulateMultiTouch(points: Array<{x: number, y: number, pressure?: number}>): TouchEvent[] {
    const events: TouchEvent[] = [];
    
    points.forEach((point, index) => {
      const touchEvent: TouchEvent = {
        type: 'touch',
        x: point.x,
        y: point.y,
        pressure: point.pressure || 1.0,
        touchId: index + 1,
        timestamp: new Date()
      };
      events.push(touchEvent);
      this.processTouchEvent(touchEvent);
    });
    
    return events;
  }

  /**
   * Check for haptic feedback capability
   */
  getHapticCapabilities(): { available: boolean, types: string[] } {
    // Platform-dependent haptic feedback detection
    const platform = process.platform;
    
    if (platform === 'darwin') {
      return { available: true, types: ['tap', 'click', 'heavy_click'] };
    } else if (platform === 'win32') {
      return { available: false, types: [] }; // Windows haptic support varies
    } else {
      return { available: false, types: [] }; // Linux haptic support limited
    }
  }

  /**
   * Simulate touch input for testing
   */
  simulateTouch(x: number, y: number, touchId: number = 1, pressure: number = 1.0): TouchEvent {
    const touchEvent: TouchEvent = {
      type: 'touch',
      x,
      y,
      pressure,
      touchId,
      timestamp: new Date()
    };

    this.processTouchEvent(touchEvent);
    return touchEvent;
  }

  /**
   * Simulate touch release for testing
   */
  simulateRelease(touchId: number = 1): TouchEvent {
    const activeTouch = this.activeTouches.get(touchId);
    if (!activeTouch) {
      throw createTerminalError('PARSING_ERROR', `No active touch with ID ${touchId}`);
    }

    const releaseEvent: TouchEvent = {
      type: 'release',
      x: activeTouch.x,
      y: activeTouch.y,
      pressure: 0,
      touchId,
      timestamp: new Date()
    };

    this.processTouchEvent(releaseEvent);
    return releaseEvent;
  }
}