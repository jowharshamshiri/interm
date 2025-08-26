// Unit tests for Interaction Managers - Real Implementation Tests
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { KeyboardManager } from '../../dist/keyboard-manager.js';
import { MouseManager } from '../../dist/mouse-manager.js';
import { ClipboardManager } from '../../dist/clipboard-manager.js';
import { TouchManager } from '../../dist/touch-manager.js';

describe('KeyboardManager Real Tests - F00031-F00040', () => {
  let keyboardManager;

  beforeEach(() => {
    KeyboardManager.instance = null;
    keyboardManager = KeyboardManager.getInstance();
  });

  it('should be a singleton instance', () => {
    const instance1 = KeyboardManager.getInstance();
    const instance2 = KeyboardManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  it('should generate function key sequences', () => {
    const f1Sequence = keyboardManager.getFunctionKeySequence('f1');
    const f12Sequence = keyboardManager.getFunctionKeySequence('f12');
    
    assert.strictEqual(typeof f1Sequence, 'string');
    assert.strictEqual(typeof f12Sequence, 'string');
    assert.ok(f1Sequence.includes('\x1b')); // Should contain escape sequence
    assert.strictEqual(f1Sequence, '\x1bOP');
    assert.strictEqual(f12Sequence, '\x1b[24~');
  });

  it('should throw error for invalid function keys', () => {
    assert.throws(() => {
      keyboardManager.getFunctionKeySequence('invalid_key');
    }, /Unknown function key/);
  });

  it('should build modifier combinations', () => {
    const ctrlC = keyboardManager.buildModifierCombination(['ctrl'], 'c');
    const altTab = keyboardManager.buildModifierCombination(['alt'], 'tab');
    const ctrlShiftHome = keyboardManager.buildModifierCombination(['ctrl', 'shift'], 'home');
    
    assert.strictEqual(typeof ctrlC, 'string');
    assert.strictEqual(typeof altTab, 'string');
    assert.strictEqual(typeof ctrlShiftHome, 'string');
    
    // Ctrl+C should be \x03
    assert.strictEqual(ctrlC, '\x03');
  });

  it('should build key sequences from array', () => {
    const sequence = [
      { type: 'text', value: 'hello' },
      { type: 'key', value: 'enter' },
      { type: 'delay', delay: 100 }
    ];
    
    const result = keyboardManager.buildKeySequence(sequence);
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.includes('hello'));
  });

  it('should handle different sequence types', () => {
    const keySequence = [{ type: 'key', value: 'f1' }];
    const textSequence = [{ type: 'text', value: 'test' }];
    
    const keyResult = keyboardManager.buildKeySequence(keySequence);
    const textResult = keyboardManager.buildKeySequence(textSequence);
    
    assert.ok(keyResult.includes('\x1b'));
    assert.strictEqual(textResult, 'test');
  });
});

describe('MouseManager Real Tests - F00041-F00052', () => {
  let mouseManager;

  beforeEach(() => {
    MouseManager.instance = null;
    mouseManager = MouseManager.getInstance();
  });

  it('should be a singleton instance', () => {
    const instance1 = MouseManager.getInstance();
    const instance2 = MouseManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  it('should track mouse position', () => {
    mouseManager.updatePosition(100, 150);
    const position = mouseManager.getCurrentPosition();
    
    assert.strictEqual(position.x, 100);
    assert.strictEqual(position.y, 150);
  });

  it('should generate mouse sequences', () => {
    const leftClick = mouseManager.generateMouseSequence('test-session', 'left', 50, 50, 1);
    const rightClick = mouseManager.generateMouseSequence('test-session', 'right', 75, 75, 1);
    const middleClick = mouseManager.generateMouseSequence('test-session', 'middle', 100, 100, 1);
    
    assert.strictEqual(typeof leftClick, 'string');
    assert.strictEqual(typeof rightClick, 'string');
    assert.strictEqual(typeof middleClick, 'string');
    
    // All should contain escape sequences
    assert.ok(leftClick.includes('\x1b'));
    assert.ok(rightClick.includes('\x1b'));
    assert.ok(middleClick.includes('\x1b'));
  });

  it('should handle different button types', () => {
    const wheelUp = mouseManager.generateMouseSequence('test', 'wheel_up', 100, 100, 1);
    const wheelDown = mouseManager.generateMouseSequence('test', 'wheel_down', 100, 100, 1);
    const x1Button = mouseManager.generateMouseSequence('test', 'x1', 100, 100, 1);
    
    assert.strictEqual(typeof wheelUp, 'string');
    assert.strictEqual(typeof wheelDown, 'string');
    assert.strictEqual(typeof x1Button, 'string');
  });

  it('should handle multi-click sequences', () => {
    const doubleClick = mouseManager.generateMouseSequence('test', 'left', 50, 50, 2);
    const tripleClick = mouseManager.generateMouseSequence('test', 'left', 50, 50, 3);
    
    assert.strictEqual(typeof doubleClick, 'string');
    assert.strictEqual(typeof tripleClick, 'string');
    
    // Should contain different sequences for different click counts
    assert.notStrictEqual(doubleClick, tripleClick);
  });

  it('should clamp coordinates to valid range', () => {
    // Test with coordinates outside valid range
    const sequence1 = mouseManager.generateMouseSequence('test', 'left', -10, -10, 1);
    const sequence2 = mouseManager.generateMouseSequence('test', 'left', 1000, 1000, 1);
    
    assert.strictEqual(typeof sequence1, 'string');
    assert.strictEqual(typeof sequence2, 'string');
  });
});

describe('ClipboardManager Real Tests - F00069-F00075', () => {
  let clipboardManager;

  beforeEach(() => {
    ClipboardManager.instance = null;
    
    // Mock clipboard API for testing
    global.navigator = {
      clipboard: {
        readText: () => Promise.resolve('test clipboard content'),
        writeText: () => Promise.resolve()
      }
    };
    
    clipboardManager = ClipboardManager.getInstance();
  });

  it('should be a singleton instance', () => {
    const instance1 = ClipboardManager.getInstance();
    const instance2 = ClipboardManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  it('should handle coordinate-based selection', () => {
    const selection = clipboardManager.selectTextByCoordinates(10, 5, 20, 8);
    
    assert.strictEqual(typeof selection, 'object');
    assert.strictEqual(selection.startCol, 10);
    assert.strictEqual(selection.startRow, 5);
    assert.strictEqual(selection.endCol, 20);
    assert.strictEqual(selection.endRow, 8);
  });

  it('should copy text to clipboard', async () => {
    const testText = 'test content for clipboard';
    await clipboardManager.copyToClipboard(testText);
    // Should not throw error - success is indicated by no exception
  });

  it('should paste text from clipboard', async () => {
    const content = await clipboardManager.pasteFromClipboard();
    assert.strictEqual(typeof content, 'string');
    assert.strictEqual(content, 'test clipboard content');
  });

  it('should manage selection state', () => {
    clipboardManager.clearSelection();
    assert.strictEqual(clipboardManager.hasActiveSelection(), false);
    
    clipboardManager.selectTextByCoordinates(0, 0, 10, 0);
    assert.strictEqual(clipboardManager.hasActiveSelection(), true);
  });

  it('should handle text formatting options', () => {
    const formattedSelection = clipboardManager.selectTextByCoordinates(0, 0, 10, 0, {
      preserveFormatting: true,
      trimWhitespace: false
    });
    
    assert.strictEqual(typeof formattedSelection, 'object');
    assert.strictEqual(formattedSelection.preserveFormatting, true);
  });
});

describe('TouchManager Real Tests - F00076-F00083', () => {
  let touchManager;

  beforeEach(() => {
    TouchManager.instance = null;
    
    // Mock touch capability
    global.navigator = {
      maxTouchPoints: 10,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)'
    };
    
    touchManager = TouchManager.getInstance();
  });

  it('should be a singleton instance', () => {
    const instance1 = TouchManager.getInstance();
    const instance2 = TouchManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  it('should detect touch capability', () => {
    const isSupported = touchManager.isTouchSupported();
    assert.strictEqual(typeof isSupported, 'boolean');
    assert.strictEqual(isSupported, true);
  });

  it('should get maximum touch points', () => {
    const maxPoints = touchManager.getMaxTouchPoints();
    assert.strictEqual(typeof maxPoints, 'number');
    assert.strictEqual(maxPoints, 10);
  });

  it('should process touch input events', () => {
    const touchEvent = touchManager.processTouchInput(100, 150, 'start');
    
    assert.strictEqual(typeof touchEvent, 'object');
    assert.strictEqual(touchEvent.x, 100);
    assert.strictEqual(touchEvent.y, 150);
    assert.strictEqual(touchEvent.type, 'start');
  });

  it('should handle multi-touch gestures', () => {
    const gesture = touchManager.processMultiTouchGesture([
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 200, y: 100 }
    ]);
    
    assert.strictEqual(typeof gesture, 'object');
    assert.strictEqual(gesture.touchCount, 2);
  });

  it('should detect gesture patterns', () => {
    const swipeGesture = touchManager.detectGesturePattern([
      { x: 50, y: 100, timestamp: 0 },
      { x: 150, y: 100, timestamp: 200 }
    ]);
    
    assert.strictEqual(typeof swipeGesture, 'object');
    assert.ok(['swipe', 'tap', 'unknown'].includes(swipeGesture.type));
  });

  it('should handle touch settings configuration', () => {
    touchManager.configureTouchSettings({
      tapThreshold: 10,
      longPressDelay: 500,
      swipeMinDistance: 50
    });
    
    const settings = touchManager.getTouchSettings();
    assert.strictEqual(typeof settings, 'object');
    assert.strictEqual(settings.tapThreshold, 10);
  });

  it('should validate touch coordinates', () => {
    assert.throws(() => {
      touchManager.processTouchInput(-1, -1, 'start');
    }, /Invalid touch coordinates/);
  });

  it('should handle palm rejection', () => {
    const palmTouch = {
      id: 1,
      x: 200,
      y: 300,
      size: 100,
      pressure: 0.05
    };
    
    const shouldReject = touchManager.shouldRejectTouch(palmTouch);
    assert.strictEqual(typeof shouldReject, 'boolean');
  });
});

describe('Integration Tests for Interaction Managers', () => {
  it('should coordinate between keyboard and mouse managers', () => {
    const keyboardManager = KeyboardManager.getInstance();
    const mouseManager = MouseManager.getInstance();
    
    // Test that both managers exist and are functional
    const keySequence = keyboardManager.getFunctionKeySequence('f1');
    mouseManager.updatePosition(100, 100);
    const mouseSequence = mouseManager.generateMouseSequence('test', 'left', 100, 100, 1);
    
    assert.strictEqual(typeof keySequence, 'string');
    assert.strictEqual(typeof mouseSequence, 'string');
  });

  it('should integrate clipboard operations with selection', () => {
    const clipboardManager = ClipboardManager.getInstance();
    
    // Create a selection and copy it
    clipboardManager.selectTextByCoordinates(0, 0, 10, 0);
    assert.strictEqual(clipboardManager.hasActiveSelection(), true);
    
    // Should be able to copy the selection
    const selection = clipboardManager.getActiveSelection();
    assert.strictEqual(typeof selection, 'object');
  });

  it('should handle touch input conversion to mouse events', () => {
    const touchManager = TouchManager.getInstance();
    const mouseManager = MouseManager.getInstance();
    
    // Touch input should be convertible to mouse events
    const touchEvent = touchManager.processTouchInput(150, 200, 'start');
    assert.strictEqual(touchEvent.x, 150);
    assert.strictEqual(touchEvent.y, 200);
    
    // Mouse manager should handle the same coordinates
    mouseManager.updatePosition(touchEvent.x, touchEvent.y);
    const position = mouseManager.getCurrentPosition();
    assert.strictEqual(position.x, 150);
    assert.strictEqual(position.y, 200);
  });
});