// Unit tests for MouseManager - F00041-F00052, F00057
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MouseManager } from '../../src/mouse-manager.js';
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
  toContain: (expected) => assert.ok(actual.includes(expected)),
  toMatch: (regex) => assert.match(actual, regex),
  toBeGreaterThan: (expected) => assert.ok(actual > expected),
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

describe('MouseManager Tests', () => {
  let mouseManager;

  beforeEach(() => {
    // Reset singleton for each test
    MouseManager.instance = null;
    mouseManager = MouseManager.getInstance();
  });

  describe('F00041: Mouse Movement Tracking', () => {
    it('should track mouse movement with coordinates', () => {
      const positions = [
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 200, y: 150 }
      ];

      positions.forEach(pos => {
        mouseManager.moveTo(pos.x, pos.y);
        const currentPos = mouseManager.getCurrentPosition();
        expect(currentPos.x).toBe(pos.x);
        expect(currentPos.y).toBe(pos.y);
      });
    });

    it('should support smooth movement interpolation', () => {
      const startPos = { x: 0, y: 0 };
      const endPos = { x: 100, y: 100 };
      
      mouseManager.moveTo(startPos.x, startPos.y);
      const sequence = mouseManager.smoothMoveTo(endPos.x, endPos.y, { duration: 1000 });
      
      expect(sequence).toBeDefined();
      expect(sequence.type).toBe('smooth_movement');
      expect(sequence.steps).toBeGreaterThan(1);
    });

    it('should handle movement validation', () => {
      expect(() => {
        mouseManager.moveTo(-1, -1);
      }).toThrow('Invalid mouse coordinates');
    });

    it('should track movement history', () => {
      const moves = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 }
      ];

      moves.forEach(pos => mouseManager.moveTo(pos.x, pos.y));
      const history = mouseManager.getMovementHistory();
      
      expect(history.length).toBe(moves.length + 1); // +1 for initial position
      expect(history[history.length - 1]).toEqual(moves[moves.length - 1]);
    });
  });

  describe('F00042: Left Click Operations', () => {
    it('should perform single left clicks', () => {
      const clickPos = { x: 50, y: 50 };
      const clickEvent = mouseManager.leftClick(clickPos.x, clickPos.y);
      
      expect(clickEvent.button).toBe('left');
      expect(clickEvent.x).toBe(clickPos.x);
      expect(clickEvent.y).toBe(clickPos.y);
      expect(clickEvent.type).toBe('single_click');
    });

    it('should handle click with modifiers', () => {
      const clickEvent = mouseManager.leftClick(100, 100, ['ctrl']);
      
      expect(clickEvent.modifiers).toContain('ctrl');
      expect(clickEvent.sequence).toMatch(/ctrl\+click/);
    });

    it('should generate terminal sequences for clicks', () => {
      const sequence = mouseManager.getClickSequence('left', 50, 50);
      
      expect(sequence).toMatch(/\x1b\[<0;51;51M/);
    });
  });

  describe('F00043: Right Click Support', () => {
    it('should perform right clicks for context menus', () => {
      const clickEvent = mouseManager.rightClick(75, 75);
      
      expect(clickEvent.button).toBe('right');
      expect(clickEvent.type).toBe('context_menu');
    });

    it('should support right click with modifiers', () => {
      const clickEvent = mouseManager.rightClick(100, 100, ['shift']);
      
      expect(clickEvent.modifiers).toContain('shift');
      expect(clickEvent.button).toBe('right');
    });
  });

  describe('F00044: Middle Click Functions', () => {
    it('should perform middle clicks for paste operations', () => {
      const clickEvent = mouseManager.middleClick(80, 80);
      
      expect(clickEvent.button).toBe('middle');
      expect(clickEvent.action).toBe('paste');
    });

    it('should support additional mouse buttons', () => {
      const buttons = ['button4', 'button5'];
      
      buttons.forEach(button => {
        const clickEvent = mouseManager.clickButton(button, 100, 100);
        expect(clickEvent.button).toBe(button);
      });
    });
  });

  describe('F00045: Double Click Detection', () => {
    it('should detect double clicks with timing validation', () => {
      const pos = { x: 60, y: 60 };
      
      // First click
      mouseManager.leftClick(pos.x, pos.y);
      
      // Second click within double-click window
      setTimeout(() => {
        const doubleClick = mouseManager.leftClick(pos.x, pos.y);
        expect(doubleClick.type).toBe('double_click');
      }, 200);
    });

    it('should configure double-click timing threshold', () => {
      mouseManager.setDoubleClickThreshold(500);
      expect(mouseManager.getDoubleClickThreshold()).toBe(500);
    });

    it('should validate click position tolerance', () => {
      const pos1 = { x: 50, y: 50 };
      const pos2 = { x: 55, y: 55 }; // Within tolerance
      
      mouseManager.leftClick(pos1.x, pos1.y);
      const secondClick = mouseManager.leftClick(pos2.x, pos2.y);
      
      expect(mouseManager.isWithinClickTolerance(pos1, pos2)).toBe(true);
    });
  });

  describe('F00046: Triple Click Selection', () => {
    it('should detect triple clicks for line selection', () => {
      const pos = { x: 70, y: 70 };
      
      // Simulate triple click
      mouseManager.leftClick(pos.x, pos.y);
      mouseManager.leftClick(pos.x, pos.y);
      const tripleClick = mouseManager.leftClick(pos.x, pos.y);
      
      expect(tripleClick.type).toBe('triple_click');
      expect(tripleClick.action).toBe('select_line');
    });

    it('should support multi-click sequences up to 10 clicks', () => {
      const pos = { x: 80, y: 80 };
      
      for (let i = 1; i <= 10; i++) {
        const clickEvent = mouseManager.leftClick(pos.x, pos.y);
        if (i >= 2) {
          expect(clickEvent.clickCount).toBe(i);
        }
      }
    });
  });

  describe('F00047: Click and Drag Operations', () => {
    it('should perform drag operations for text selection', () => {
      const startPos = { x: 50, y: 50 };
      const endPos = { x: 150, y: 50 };
      
      const dragOperation = mouseManager.dragFromTo(startPos.x, startPos.y, endPos.x, endPos.y);
      
      expect(dragOperation.type).toBe('drag');
      expect(dragOperation.startX).toBe(startPos.x);
      expect(dragOperation.startY).toBe(startPos.y);
      expect(dragOperation.endX).toBe(endPos.x);
      expect(dragOperation.endY).toBe(endPos.y);
    });

    it('should support drag with threshold detection', () => {
      mouseManager.setDragThreshold(5);
      
      // Movement below threshold should not trigger drag
      let isDrag = mouseManager.checkDragThreshold({ x: 0, y: 0 }, { x: 3, y: 3 });
      expect(isDrag).toBe(false);
      
      // Movement above threshold should trigger drag
      isDrag = mouseManager.checkDragThreshold({ x: 0, y: 0 }, { x: 10, y: 10 });
      expect(isDrag).toBe(true);
    });

    it('should handle drag state management', () => {
      expect(mouseManager.isDragging()).toBe(false);
      
      mouseManager.startDrag(50, 50);
      expect(mouseManager.isDragging()).toBe(true);
      
      mouseManager.endDrag(100, 100);
      expect(mouseManager.isDragging()).toBe(false);
    });
  });

  describe('F00048: Mouse Wheel Scrolling', () => {
    it('should handle vertical scrolling', () => {
      const scrollEvent = mouseManager.scroll('vertical', -3); // Scroll up 3 units
      
      expect(scrollEvent.direction).toBe('vertical');
      expect(scrollEvent.delta).toBe(-3);
      expect(scrollEvent.sequence).toMatch(/\x1b\[<64/);
    });

    it('should handle horizontal scrolling', () => {
      const scrollEvent = mouseManager.scroll('horizontal', 2); // Scroll right 2 units
      
      expect(scrollEvent.direction).toBe('horizontal');
      expect(scrollEvent.delta).toBe(2);
    });

    it('should support 4-directional scrolling', () => {
      const directions = ['up', 'down', 'left', 'right'];
      
      directions.forEach(direction => {
        const scrollEvent = mouseManager.scrollDirection(direction, 1);
        expect(scrollEvent.direction).toBe(direction);
      });
    });
  });

  describe('F00049: Precision Scrolling', () => {
    it('should support pixel-level scrolling precision', () => {
      const precisionScroll = mouseManager.precisionScroll({
        deltaX: 0.5,
        deltaY: -1.5,
        precision: 'pixel'
      });
      
      expect(precisionScroll.precision).toBe('pixel');
      expect(precisionScroll.deltaX).toBe(0.5);
      expect(precisionScroll.deltaY).toBe(-1.5);
    });

    it('should handle different precision modes', () => {
      const modes = ['line', 'page', 'pixel'];
      
      modes.forEach(mode => {
        const scroll = mouseManager.precisionScroll({
          deltaY: -1,
          precision: mode
        });
        expect(scroll.precision).toBe(mode);
      });
    });
  });

  describe('F00050: Mouse Button Combinations', () => {
    it('should handle multiple buttons pressed simultaneously', () => {
      const combo = mouseManager.pressButtonCombination(['left', 'right'], 100, 100);
      
      expect(combo.buttons).toEqual(['left', 'right']);
      expect(combo.type).toBe('multi_button');
    });

    it('should support button hold duration', () => {
      const holdEvent = mouseManager.holdButton('left', 100, 100, 1000);
      
      expect(holdEvent.button).toBe('left');
      expect(holdEvent.duration).toBe(1000);
      expect(holdEvent.type).toBe('button_hold');
    });

    it('should validate button combinations', () => {
      const validCombo = ['left', 'middle'];
      const invalidCombo = ['invalid_button'];
      
      expect(mouseManager.validateButtonCombo(validCombo)).toBe(true);
      expect(mouseManager.validateButtonCombo(invalidCombo)).toBe(false);
    });
  });

  describe('F00051: Mouse Gesture Recognition', () => {
    it('should recognize swipe gestures', () => {
      const swipePoints = [
        { x: 50, y: 50 },
        { x: 100, y: 50 },
        { x: 150, y: 50 }
      ];
      
      const gesture = mouseManager.recognizeGesture(swipePoints);
      expect(gesture.type).toBe('swipe');
      expect(gesture.direction).toBe('right');
    });

    it('should recognize circle gestures', () => {
      const circlePoints = mouseManager.generateCircleGesture(100, 100, 50);
      const gesture = mouseManager.recognizeGesture(circlePoints);
      
      expect(gesture.type).toBe('circle');
      expect(gesture.radius).toBeCloseTo(50, 5);
    });

    it('should recognize zigzag gestures', () => {
      const zigzagPoints = [
        { x: 50, y: 50 },
        { x: 75, y: 25 },
        { x: 100, y: 50 },
        { x: 125, y: 25 },
        { x: 150, y: 50 }
      ];
      
      const gesture = mouseManager.recognizeGesture(zigzagPoints);
      expect(gesture.type).toBe('zigzag');
    });
  });

  describe('F00052: Hover State Detection', () => {
    it('should detect mouse hover with timing', () => {
      const hoverPos = { x: 75, y: 75 };
      
      mouseManager.moveTo(hoverPos.x, hoverPos.y);
      const hoverEvent = mouseManager.startHover(500); // 500ms hover duration
      
      expect(hoverEvent.duration).toBe(500);
      expect(hoverEvent.x).toBe(hoverPos.x);
      expect(hoverEvent.y).toBe(hoverPos.y);
    });

    it('should configure hover detection parameters', () => {
      mouseManager.setHoverThreshold(1000);
      mouseManager.setHoverTolerance(10);
      
      expect(mouseManager.getHoverThreshold()).toBe(1000);
      expect(mouseManager.getHoverTolerance()).toBe(10);
    });

    it('should handle hover state management', () => {
      expect(mouseManager.isHovering()).toBe(false);
      
      mouseManager.startHover(500);
      expect(mouseManager.isHovering()).toBe(true);
      
      mouseManager.endHover();
      expect(mouseManager.isHovering()).toBe(false);
    });
  });

  describe('F00057: Drag Distance Thresholds', () => {
    it('should configure drag initiation distance', () => {
      const threshold = 10;
      mouseManager.setDragThreshold(threshold);
      
      expect(mouseManager.getDragThreshold()).toBe(threshold);
    });

    it('should validate drag threshold before initiating drag', () => {
      mouseManager.setDragThreshold(15);
      
      const startPos = { x: 50, y: 50 };
      const nearPos = { x: 55, y: 55 }; // Within threshold
      const farPos = { x: 70, y: 70 }; // Beyond threshold
      
      expect(mouseManager.shouldInitiateDrag(startPos, nearPos)).toBe(false);
      expect(mouseManager.shouldInitiateDrag(startPos, farPos)).toBe(true);
    });

    it('should support different threshold calculations', () => {
      const methods = ['euclidean', 'manhattan', 'maximum'];
      
      methods.forEach(method => {
        mouseManager.setThresholdMethod(method);
        const distance = mouseManager.calculateDistance(
          { x: 0, y: 0 }, 
          { x: 3, y: 4 },
          method
        );
        
        if (method === 'euclidean') expect(distance).toBeCloseTo(5);
        if (method === 'manhattan') expect(distance).toBe(7);
        if (method === 'maximum') expect(distance).toBe(4);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', () => {
      expect(() => {
        mouseManager.moveTo(null, undefined);
      }).toThrow('Invalid mouse coordinates');
    });

    it('should validate button names', () => {
      expect(() => {
        mouseManager.clickButton('invalid_button', 100, 100);
      }).toThrow('Invalid mouse button');
    });

    it('should handle gesture recognition failures', () => {
      const invalidPoints = [];
      const gesture = mouseManager.recognizeGesture(invalidPoints);
      
      expect(gesture.type).toBe('unknown');
      expect(gesture.confidence).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with terminal mouse reporting', () => {
      // Mock terminal with mouse reporting enabled
      const mockTerminal = {
        write: vi.fn(),
        mouseReporting: true
      };
      
      mouseManager.setTerminalConnection(mockTerminal);
      mouseManager.leftClick(100, 100);
      
      expect(mockTerminal.write).toHaveBeenCalledWith(expect.stringMatching(/\x1b\[<0;101;101M/));
    });

    it('should handle different terminal mouse protocols', () => {
      const protocols = ['X10', 'VT200', 'VT200_HIGHLIGHT', 'BTN_EVENT', 'SGR', 'URXVT'];
      
      protocols.forEach(protocol => {
        mouseManager.setMouseProtocol(protocol);
        const sequence = mouseManager.getClickSequence('left', 50, 50);
        
        expect(sequence).toBeDefined();
        expect(typeof sequence).toBe('string');
      });
    });

    it('should handle coordinate system transformations', () => {
      const screenCoords = { x: 200, y: 150 };
      const terminalCoords = mouseManager.screenToTerminal(screenCoords);
      
      expect(terminalCoords.col).toBeGreaterThan(0);
      expect(terminalCoords.row).toBeGreaterThan(0);
      
      const backToScreen = mouseManager.terminalToScreen(terminalCoords);
      expect(backToScreen.x).toBeCloseTo(screenCoords.x, 1);
      expect(backToScreen.y).toBeCloseTo(screenCoords.y, 1);
    });
  });
});