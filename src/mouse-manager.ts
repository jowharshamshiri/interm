import { MouseEvent, MousePosition, GestureEvent } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export class MouseManager {
  private static instance: MouseManager;
  private currentPosition: MousePosition = { x: 0, y: 0 };
  private dragThreshold: number = 3;
  private doubleClickThreshold: number = 500; // milliseconds
  private lastClickTime: number = 0;
  private lastClickPosition: MousePosition = { x: 0, y: 0 };
  private clickCount: number = 0;

  private constructor() {}

  static getInstance(): MouseManager {
    if (!MouseManager.instance) {
      MouseManager.instance = new MouseManager();
    }
    return MouseManager.instance;
  }

  updatePosition(x: number, y: number): void {
    this.currentPosition = { x, y };
  }

  getCurrentPosition(): MousePosition {
    return { ...this.currentPosition };
  }

  generateMouseSequence(sessionId: string, button: string, x: number, y: number, clickCount: number = 1): string {
    // Generate terminal mouse sequence
    // Format: \x1b[M<button><x+32><y+32> for button press
    // Format: \x1b[M<button+32><x+32><y+32> for button release
    
    const buttonCodes: Record<string, number> = {
      'left': 0,
      'middle': 1, 
      'right': 2,
      'wheel_up': 64,
      'wheel_down': 65,
      'wheel_left': 66,
      'wheel_right': 67,
      'x1': 3,
      'x2': 4
    };

    const buttonCode = buttonCodes[button] ?? 0;
    
    // Clamp coordinates to valid range
    const clampedX = Math.max(1, Math.min(x + 1, 223));
    const clampedY = Math.max(1, Math.min(y + 1, 223));

    let sequence = '';
    
    for (let i = 0; i < clickCount; i++) {
      // Button press
      sequence += `\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`;
      // Button release  
      sequence += `\x1b[M${String.fromCharCode(buttonCode + 32 + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`;
    }

    this.updatePosition(x, y);
    return sequence;
  }

  generateMoveSequence(x: number, y: number, smooth: boolean = false, duration: number = 200): string[] {
    if (!smooth) {
      this.updatePosition(x, y);
      // Generate mouse tracking sequence for movement
      return [`\x1b[M${String.fromCharCode(35)}${String.fromCharCode(x + 33)}${String.fromCharCode(y + 33)}`];
    }

    // Generate smooth movement sequence
    const steps = Math.max(1, duration / 16); // ~60fps
    const sequences: string[] = [];
    const startX = this.currentPosition.x;
    const startY = this.currentPosition.y;
    const deltaX = (x - startX) / steps;
    const deltaY = (y - startY) / steps;

    for (let i = 0; i <= steps; i++) {
      const currentX = Math.round(startX + deltaX * i);
      const currentY = Math.round(startY + deltaY * i);
      const clampedX = Math.max(1, Math.min(currentX + 1, 223));
      const clampedY = Math.max(1, Math.min(currentY + 1, 223));
      
      sequences.push(`\x1b[M${String.fromCharCode(35)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);
    }

    this.updatePosition(x, y);
    return sequences;
  }

  generateDragSequence(startX: number, startY: number, endX: number, endY: number, 
                      button: string = 'left', smooth: boolean = true): string[] {
    const sequences: string[] = [];
    
    // Check drag threshold
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    if (distance < this.dragThreshold) {
      // Not enough distance for drag, perform regular click
      return [this.generateMouseSequence('', button, startX, startY, 1)];
    }

    const buttonCodes: Record<string, number> = {
      'left': 0, 'middle': 1, 'right': 2
    };
    const buttonCode = buttonCodes[button] ?? 0;

    // Button press at start position
    const startClampedX = Math.max(1, Math.min(startX + 1, 223));
    const startClampedY = Math.max(1, Math.min(startY + 1, 223));
    sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(startClampedX + 32)}${String.fromCharCode(startClampedY + 32)}`);

    if (smooth) {
      // Generate intermediate positions
      const steps = Math.max(5, Math.floor(distance / 10));
      const deltaX = (endX - startX) / steps;
      const deltaY = (endY - startY) / steps;

      for (let i = 1; i < steps; i++) {
        const currentX = Math.round(startX + deltaX * i);
        const currentY = Math.round(startY + deltaY * i);
        const clampedX = Math.max(1, Math.min(currentX + 1, 223));
        const clampedY = Math.max(1, Math.min(currentY + 1, 223));
        
        // Drag movement (button held down)
        sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);
      }
    }

    // Button release at end position
    const endClampedX = Math.max(1, Math.min(endX + 1, 223));
    const endClampedY = Math.max(1, Math.min(endY + 1, 223));
    sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32 + 32)}${String.fromCharCode(endClampedX + 32)}${String.fromCharCode(endClampedY + 32)}`);

    this.updatePosition(endX, endY);
    return sequences;
  }

  generateScrollSequence(direction: string, amount: number, x: number, y: number, precision: boolean = false): string {
    const directionCodes: Record<string, number> = {
      'up': 64,
      'down': 65, 
      'left': 66,
      'right': 67
    };

    const buttonCode = directionCodes[direction] ?? 64;
    const clampedX = Math.max(1, Math.min(x + 1, 223));
    const clampedY = Math.max(1, Math.min(y + 1, 223));

    let sequence = '';
    
    if (precision) {
      // For precision scrolling, generate multiple small scroll events
      const steps = Math.max(1, amount);
      for (let i = 0; i < steps; i++) {
        sequence += `\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`;
      }
    } else {
      // Regular scrolling
      for (let i = 0; i < amount; i++) {
        sequence += `\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`;
      }
    }

    return sequence;
  }

  detectMultiClick(x: number, y: number): number {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastClickTime;
    const distance = Math.sqrt(
      Math.pow(x - this.lastClickPosition.x, 2) + 
      Math.pow(y - this.lastClickPosition.y, 2)
    );

    if (timeDiff < this.doubleClickThreshold && distance < this.dragThreshold) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }

    this.lastClickTime = currentTime;
    this.lastClickPosition = { x, y };

    return this.clickCount;
  }

  generateGestureSequence(gestureType: string, startX: number, startY: number, size: number): string[] {
    const sequences: string[] = [];

    switch (gestureType) {
      case 'swipe_left':
        return this.generateDragSequence(startX, startY, startX - size, startY, 'left', true);
      
      case 'swipe_right':
        return this.generateDragSequence(startX, startY, startX + size, startY, 'left', true);
      
      case 'swipe_up':
        return this.generateDragSequence(startX, startY, startX, startY - size, 'left', true);
      
      case 'swipe_down':
        return this.generateDragSequence(startX, startY, startX, startY + size, 'left', true);
      
      case 'circle_clockwise':
        return this.generateCircleGesture(startX, startY, size, true);
      
      case 'circle_counterclockwise':
        return this.generateCircleGesture(startX, startY, size, false);
      
      case 'zigzag_horizontal':
        return this.generateZigzagGesture(startX, startY, size, true);
      
      case 'zigzag_vertical':
        return this.generateZigzagGesture(startX, startY, size, false);
      
      default:
        throw createTerminalError('UNKNOWN_ERROR', `Unknown gesture type: ${gestureType}`);
    }
  }

  private generateCircleGesture(centerX: number, centerY: number, radius: number, clockwise: boolean): string[] {
    const sequences: string[] = [];
    const steps = 36; // 10-degree increments
    const angleIncrement = (2 * Math.PI) / steps * (clockwise ? 1 : -1);
    
    // Start at the top of the circle
    let angle = -Math.PI / 2;
    const startX = Math.round(centerX + radius * Math.cos(angle));
    const startY = Math.round(centerY + radius * Math.sin(angle));

    // Button press at start
    const buttonCode = 0; // left button
    let clampedX = Math.max(1, Math.min(startX + 1, 223));
    let clampedY = Math.max(1, Math.min(startY + 1, 223));
    sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);

    // Generate circle points
    for (let i = 1; i <= steps; i++) {
      angle += angleIncrement;
      const x = Math.round(centerX + radius * Math.cos(angle));
      const y = Math.round(centerY + radius * Math.sin(angle));
      
      clampedX = Math.max(1, Math.min(x + 1, 223));
      clampedY = Math.max(1, Math.min(y + 1, 223));
      
      sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);
    }

    // Button release
    sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32 + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);

    return sequences;
  }

  private generateZigzagGesture(startX: number, startY: number, size: number, horizontal: boolean): string[] {
    const sequences: string[] = [];
    const buttonCode = 0; // left button
    const segments = 4;
    const amplitude = size / 4;

    // Button press at start
    let clampedX = Math.max(1, Math.min(startX + 1, 223));
    let clampedY = Math.max(1, Math.min(startY + 1, 223));
    sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);

    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      let x, y;

      if (horizontal) {
        x = Math.round(startX + size * progress);
        y = Math.round(startY + amplitude * (i % 2 === 0 ? 1 : -1));
      } else {
        x = Math.round(startX + amplitude * (i % 2 === 0 ? 1 : -1));
        y = Math.round(startY + size * progress);
      }

      clampedX = Math.max(1, Math.min(x + 1, 223));
      clampedY = Math.max(1, Math.min(y + 1, 223));
      
      sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);
    }

    // Button release
    sequences.push(`\x1b[M${String.fromCharCode(buttonCode + 32 + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`);

    return sequences;
  }

  generateMultiButtonSequence(buttons: string[], x: number, y: number, holdDuration: number): string {
    const buttonCodes: Record<string, number> = {
      'left': 0, 'middle': 1, 'right': 2, 'x1': 3, 'x2': 4
    };

    const clampedX = Math.max(1, Math.min(x + 1, 223));
    const clampedY = Math.max(1, Math.min(y + 1, 223));

    let sequence = '';

    // Press all buttons
    for (const button of buttons) {
      const buttonCode = buttonCodes[button] ?? 0;
      sequence += `\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`;
    }

    // Hold duration would be handled by timing in the calling code

    // Release all buttons
    for (const button of buttons) {
      const buttonCode = buttonCodes[button] ?? 0;
      sequence += `\x1b[M${String.fromCharCode(buttonCode + 32 + 32)}${String.fromCharCode(clampedX + 32)}${String.fromCharCode(clampedY + 32)}`;
    }

    this.updatePosition(x, y);
    return sequence;
  }

  enableMouseTracking(): string {
    // Enable mouse tracking mode in terminal
    return '\x1b[?1000h\x1b[?1002h\x1b[?1015h\x1b[?1006h';
  }

  disableMouseTracking(): string {
    // Disable mouse tracking mode in terminal
    return '\x1b[?1006l\x1b[?1015l\x1b[?1002l\x1b[?1000l';
  }

  setDragThreshold(threshold: number): void {
    this.dragThreshold = Math.max(1, Math.min(threshold, 50));
  }

  setDoubleClickThreshold(threshold: number): void {
    this.doubleClickThreshold = Math.max(50, Math.min(threshold, 2000));
  }
}