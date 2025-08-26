// Unit tests for TouchManager - F00076-F00083
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TouchManager } from '../../src/touch-manager.js';
import { createTerminalError } from '../../src/utils/error-utils.js';

// Mock functions for testing
const vi = {
  fn: () => {
    const mock = (...args) => {
      mock.calls.push(args);
      return mock.returnValue;
    };
    mock.calls = [];
    mock.returnValue = undefined;
    mock.mockReturnValue = (value) => { mock.returnValue = value; return mock; };
    return mock;
  }
};

// Expect function compatible with Node.js assert
const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toBeGreaterThan: (expected) => assert.ok(actual > expected),
  toBeGreaterThanOrEqual: (expected) => assert.ok(actual >= expected),
  toBeCloseTo: (expected, precision = 2) => {
    const diff = Math.abs(actual - expected);
    assert.ok(diff < Math.pow(10, -precision));
  },
  toBeDefined: () => assert.ok(actual !== undefined),
  toThrow: (expectedMessage) => {
    if (typeof actual === 'function') {
      assert.throws(actual, expectedMessage ? new RegExp(expectedMessage) : undefined);
    } else {
      throw new Error('Expected a function to test for throwing');
    }
  }
});

describe('TouchManager Tests', () => {
  let touchManager;

  beforeEach(() => {
    // Reset singleton for each test
    TouchManager.instance = null;
    touchManager = TouchManager.getInstance();
    
    // Mock touch capability detection
    global.navigator = {
      maxTouchPoints: 10,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)'
    };
  });

  describe('F00076: Touch Input Recognition', () => {
    it('should detect single finger tap events', () => {
      const tapEvent = touchManager.processSingleTap(100, 150);
      
      expect(tapEvent.type).toBe('tap');
      expect(tapEvent.fingers).toBe(1);
      expect(tapEvent.x).toBe(100);
      expect(tapEvent.y).toBe(150);
    });

    it('should support touch capability detection', () => {
      expect(touchManager.isTouchSupported()).toBe(true);
      expect(touchManager.getMaxTouchPoints()).toBe(10);
    });

    it('should handle touch point tracking', () => {
      const touchPoints = [
        { id: 0, x: 100, y: 100 },
        { id: 1, x: 200, y: 200 }
      ];
      
      touchManager.updateTouchPoints(touchPoints);
      const activeTouches = touchManager.getActiveTouchPoints();
      
      expect(activeTouches.length).toBe(2);
      expect(activeTouches[0].id).toBe(0);
    });

    it('should validate touch coordinates', () => {
      expect(() => {
        touchManager.processSingleTap(-1, -1);
      }).toThrow('Invalid touch coordinates');
    });
  });

  describe('F00077: Multi-Touch Gestures', () => {
    it('should detect two-finger gestures', () => {
      const touches = [
        { id: 0, x: 100, y: 100 },
        { id: 1, x: 200, y: 100 }
      ];
      
      const gesture = touchManager.processTwoFingerGesture(touches);
      
      expect(gesture.fingers).toBe(2);
      expect(gesture.distance).toBeCloseTo(100);
    });

    it('should recognize pinch gestures', () => {
      const initialTouches = [
        { id: 0, x: 150, y: 150 },
        { id: 1, x: 250, y: 150 }
      ];
      
      const finalTouches = [
        { id: 0, x: 175, y: 150 },
        { id: 1, x: 225, y: 150 }
      ];
      
      const gesture = touchManager.recognizePinchGesture(initialTouches, finalTouches);
      
      expect(gesture.type).toBe('pinch');
      expect(gesture.scale).toBeLessThan(1); // Pinch in
    });

    it('should recognize zoom gestures', () => {
      const initialTouches = [
        { id: 0, x: 175, y: 150 },
        { id: 1, x: 225, y: 150 }
      ];
      
      const finalTouches = [
        { id: 0, x: 150, y: 150 },
        { id: 1, x: 250, y: 150 }
      ];
      
      const gesture = touchManager.recognizeZoomGesture(initialTouches, finalTouches);
      
      expect(gesture.type).toBe('zoom');
      expect(gesture.scale).toBeGreaterThan(1); // Zoom out
    });

    it('should recognize rotation gestures', () => {
      const initialTouches = [
        { id: 0, x: 150, y: 100 },
        { id: 1, x: 150, y: 200 }
      ];
      
      const finalTouches = [
        { id: 0, x: 200, y: 150 },
        { id: 1, x: 100, y: 150 }
      ];
      
      const gesture = touchManager.recognizeRotationGesture(initialTouches, finalTouches);
      
      expect(gesture.type).toBe('rotate');
      expect(Math.abs(gesture.angle)).toBeCloseTo(90, 5); // 90-degree rotation
    });
  });

  describe('F00078: Swipe Gesture Detection', () => {
    it('should detect horizontal swipes', () => {
      const swipePoints = [
        { x: 50, y: 100, timestamp: 0 },
        { x: 100, y: 100, timestamp: 100 },
        { x: 200, y: 100, timestamp: 200 }
      ];
      
      const gesture = touchManager.recognizeSwipeGesture(swipePoints);
      
      expect(gesture.type).toBe('swipe');
      expect(gesture.direction).toBe('right');
      expect(gesture.velocity).toBeGreaterThan(0);
    });

    it('should detect vertical swipes', () => {
      const swipePoints = [
        { x: 100, y: 200, timestamp: 0 },
        { x: 100, y: 150, timestamp: 100 },
        { x: 100, y: 50, timestamp: 200 }
      ];
      
      const gesture = touchManager.recognizeSwipeGesture(swipePoints);
      
      expect(gesture.type).toBe('swipe');
      expect(gesture.direction).toBe('up');
    });

    it('should support multi-finger swipes', () => {
      const twoFingerSwipe = [
        {
          finger1: { x: 50, y: 100, timestamp: 0 },
          finger2: { x: 60, y: 110, timestamp: 0 }
        },
        {
          finger1: { x: 150, y: 100, timestamp: 200 },
          finger2: { x: 160, y: 110, timestamp: 200 }
        }
      ];
      
      const gesture = touchManager.recognizeMultiFingerSwipe(twoFingerSwipe);
      
      expect(gesture.type).toBe('multi_swipe');
      expect(gesture.fingers).toBe(2);
      expect(gesture.direction).toBe('right');
    });

    it('should calculate swipe velocity and distance', () => {
      const swipePoints = [
        { x: 0, y: 100, timestamp: 0 },
        { x: 300, y: 100, timestamp: 300 }
      ];
      
      const gesture = touchManager.recognizeSwipeGesture(swipePoints);
      
      expect(gesture.distance).toBe(300);
      expect(gesture.velocity).toBe(1); // pixels per millisecond
      expect(gesture.duration).toBe(300);
    });
  });

  describe('F00079: Long Press Detection', () => {
    it('should detect long press events', async () => {
      const longPressPromise = touchManager.startLongPressDetection(100, 100, 500);
      
      // Simulate maintaining touch for required duration
      setTimeout(() => {
        touchManager.maintainTouch(100, 100);
      }, 400);
      
      const gesture = await longPressPromise;
      
      expect(gesture.type).toBe('long_press');
      expect(gesture.duration).toBeGreaterThanOrEqual(500);
    });

    it('should activate context menus on long press', () => {
      const contextMenuSpy = vi.fn();
      touchManager.onContextMenu(contextMenuSpy);
      
      touchManager.processLongPress(150, 150, 600);
      
      expect(contextMenuSpy).toHaveBeenCalledWith({
        x: 150,
        y: 150,
        trigger: 'long_press'
      });
    });

    it('should configure long press threshold', () => {
      touchManager.setLongPressThreshold(750);
      expect(touchManager.getLongPressThreshold()).toBe(750);
    });

    it('should cancel long press on movement', () => {
      touchManager.startLongPressDetection(100, 100, 500);
      
      // Move touch point beyond threshold
      const cancelled = touchManager.updateTouchPosition(120, 120);
      
      expect(cancelled).toBe(true);
      expect(touchManager.isLongPressActive()).toBe(false);
    });
  });

  describe('F00080: Touch Drag Operations', () => {
    it('should detect touch-based dragging', () => {
      const dragSequence = [
        { x: 50, y: 50, timestamp: 0 },
        { x: 100, y: 75, timestamp: 100 },
        { x: 150, y: 100, timestamp: 200 }
      ];
      
      const dragOperation = touchManager.processTouchDrag(dragSequence);
      
      expect(dragOperation.type).toBe('touch_drag');
      expect(dragOperation.distance).toBeCloseTo(111.8, 1);
    });

    it('should support touch-based text selection', () => {
      const selectionStart = { x: 50, y: 100 };
      const selectionEnd = { x: 200, y: 100 };
      
      const selection = touchManager.performTouchSelection(selectionStart, selectionEnd);
      
      expect(selection.type).toBe('touch_selection');
      expect(selection.startX).toBe(selectionStart.x);
      expect(selection.endX).toBe(selectionEnd.x);
    });

    it('should handle drag threshold configuration', () => {
      touchManager.setDragThreshold(15);
      
      const smallMovement = [
        { x: 100, y: 100, timestamp: 0 },
        { x: 105, y: 105, timestamp: 100 }
      ];
      
      const isDrag = touchManager.shouldStartDrag(smallMovement);
      expect(isDrag).toBe(false);
      
      const largeMovement = [
        { x: 100, y: 100, timestamp: 0 },
        { x: 120, y: 120, timestamp: 100 }
      ];
      
      const isLargeDrag = touchManager.shouldStartDrag(largeMovement);
      expect(isLargeDrag).toBe(true);
    });
  });

  describe('F00081: Pinch Zoom Control', () => {
    it('should control terminal content scaling', () => {
      const initialTouches = [
        { id: 0, x: 100, y: 100 },
        { id: 1, x: 200, y: 100 }
      ];
      
      const zoomedTouches = [
        { id: 0, x: 75, y: 100 },
        { id: 1, x: 225, y: 100 }
      ];
      
      const zoomOperation = touchManager.processPinchZoom(initialTouches, zoomedTouches);
      
      expect(zoomOperation.type).toBe('pinch_zoom');
      expect(zoomOperation.scaleFactor).toBeGreaterThan(1);
    });

    it('should maintain zoom center point', () => {
      const touches = [
        { id: 0, x: 150, y: 200 },
        { id: 1, x: 250, y: 200 }
      ];
      
      const centerPoint = touchManager.calculateZoomCenter(touches);
      
      expect(centerPoint.x).toBe(200);
      expect(centerPoint.y).toBe(200);
    });

    it('should apply zoom limits', () => {
      touchManager.setZoomLimits(0.5, 3.0);
      
      // Test zoom beyond maximum
      const extremeZoom = touchManager.applyZoomLimits(5.0);
      expect(extremeZoom).toBe(3.0);
      
      // Test zoom below minimum
      const tinyZoom = touchManager.applyZoomLimits(0.1);
      expect(tinyZoom).toBe(0.5);
    });
  });

  describe('F00082: Palm Rejection', () => {
    it('should filter accidental palm touches', () => {
      const touches = [
        { id: 0, x: 100, y: 100, size: 20, pressure: 0.3 }, // Finger
        { id: 1, x: 150, y: 120, size: 80, pressure: 0.1 }  // Palm
      ];
      
      const filteredTouches = touchManager.filterPalmTouches(touches);
      
      expect(filteredTouches.length).toBe(1);
      expect(filteredTouches[0].id).toBe(0);
    });

    it('should use intelligent palm detection algorithms', () => {
      const palmTouch = {
        id: 1,
        x: 200, y: 300,
        size: 100,
        pressure: 0.05,
        orientation: 45,
        contactArea: 500
      };
      
      const isPalm = touchManager.detectPalmTouch(palmTouch);
      expect(isPalm).toBe(true);
    });

    it('should configure palm rejection sensitivity', () => {
      touchManager.setPalmRejectionSensitivity('high');
      
      const borderlineTouch = {
        id: 1,
        size: 40,
        pressure: 0.2
      };
      
      const isRejected = touchManager.shouldRejectTouch(borderlineTouch);
      expect(isRejected).toBe(true);
    });

    it('should handle palm rejection for different device types', () => {
      const deviceTypes = ['tablet', 'phone', 'laptop_touchscreen'];
      
      deviceTypes.forEach(deviceType => {
        touchManager.setDeviceType(deviceType);
        const rejectionThreshold = touchManager.getPalmRejectionThreshold();
        
        expect(typeof rejectionThreshold).toBe('object');
        expect(rejectionThreshold.minSize).toBeGreaterThan(0);
      });
    });
  });

  describe('F00083: Haptic Feedback', () => {
    it('should detect haptic feedback capability', () => {
      // Mock vibration API
      global.navigator.vibrate = vi.fn();
      
      const hasHaptics = touchManager.hasHapticSupport();
      expect(hasHaptics).toBe(true);
    });

    it('should provide tactile response for touch events', () => {
      global.navigator.vibrate = vi.fn();
      
      touchManager.provideTactileFeedback('tap');
      
      expect(global.navigator.vibrate).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should support different haptic patterns', () => {
      global.navigator.vibrate = vi.fn();
      
      const patterns = ['tap', 'long_press', 'swipe', 'error', 'success'];
      
      patterns.forEach(pattern => {
        touchManager.provideTactileFeedback(pattern);
        expect(global.navigator.vibrate).toHaveBeenCalled();
      });
    });

    it('should handle platform-specific haptic implementations', () => {
      // Mock different platform APIs
      const platformTests = [
        { platform: 'iOS', api: 'tapticEngine' },
        { platform: 'Android', api: 'vibrate' },
        { platform: 'Windows', api: 'hapticFeedback' }
      ];
      
      platformTests.forEach(({ platform, api }) => {
        touchManager.setPlatform(platform);
        const hapticMethod = touchManager.getHapticMethod();
        
        expect(hapticMethod).toContain(api);
      });
    });

    it('should configure haptic intensity', () => {
      touchManager.setHapticIntensity(0.7);
      
      const intensity = touchManager.getHapticIntensity();
      expect(intensity).toBe(0.7);
    });
  });

  describe('Error Handling', () => {
    it('should handle touch capability absence gracefully', () => {
      global.navigator = { maxTouchPoints: 0 };
      
      expect(touchManager.isTouchSupported()).toBe(false);
      
      expect(() => {
        touchManager.processSingleTap(100, 100);
      }).toThrow('Touch input not supported');
    });

    it('should validate touch gesture parameters', () => {
      expect(() => {
        touchManager.recognizePinchGesture([], []);
      }).toThrow('Invalid touch points for pinch gesture');
    });

    it('should handle incomplete gesture sequences', () => {
      const incompleteSwipe = [{ x: 100, y: 100, timestamp: 0 }];
      
      const gesture = touchManager.recognizeSwipeGesture(incompleteSwipe);
      expect(gesture.type).toBe('unknown');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with terminal touch events', () => {
      const mockTerminal = {
        enableTouchMode: vi.fn(),
        processTouchEvent: vi.fn()
      };
      
      touchManager.setTerminalConnection(mockTerminal);
      touchManager.processSingleTap(100, 100);
      
      expect(mockTerminal.processTouchEvent).toHaveBeenCalled();
    });

    it('should coordinate with mouse events', () => {
      const mockMouseManager = {
        disableMouseInput: vi.fn(),
        enableMouseInput: vi.fn()
      };
      
      touchManager.setMouseCoordination(mockMouseManager);
      
      // Touch should disable mouse temporarily
      touchManager.processSingleTap(100, 100);
      expect(mockMouseManager.disableMouseInput).toHaveBeenCalled();
    });

    it('should support touch-to-mouse event conversion', () => {
      const touchEvent = {
        type: 'tap',
        x: 150,
        y: 200,
        timestamp: Date.now()
      };
      
      const mouseEvent = touchManager.convertToMouseEvent(touchEvent);
      
      expect(mouseEvent.type).toBe('click');
      expect(mouseEvent.button).toBe('left');
      expect(mouseEvent.x).toBe(150);
      expect(mouseEvent.y).toBe(200);
    });
  });
});