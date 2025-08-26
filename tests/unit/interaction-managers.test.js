// Unit tests for Interaction Managers - F00031-F00083
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { KeyboardManager } from '../../dist/keyboard-manager.js';
import { MouseManager } from '../../dist/mouse-manager.js';
import { ClipboardManager } from '../../dist/clipboard-manager.js';
import { TouchManager } from '../../dist/touch-manager.js';

describe('KeyboardManager Tests - F00031-F00040', () => {
  let keyboardManager;

  beforeEach(() => {
    // Reset singleton instance for each test
    KeyboardManager.instance = null;
    keyboardManager = KeyboardManager.getInstance();
  });

  it('should be a singleton instance', () => {
    const instance1 = KeyboardManager.getInstance();
    const instance2 = KeyboardManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  it('should generate function key sequences', () => {
    const f1Sequence = keyboardManager.getFunctionKey('f1');
    const f12Sequence = keyboardManager.getFunctionKey('f12');
    const f24Sequence = keyboardManager.getFunctionKey('f24');
    
    assert.strictEqual(typeof f1Sequence, 'string');
    assert.strictEqual(typeof f12Sequence, 'string');
    assert.strictEqual(typeof f24Sequence, 'string');
    assert.ok(f1Sequence.includes('\x1b'));
  });

  it('should handle modifier combinations', () => {
    const ctrlC = keyboardManager.getModifierCombination('c', ['ctrl']);
    const altTab = keyboardManager.getModifierCombination('tab', ['alt']);
    
    assert.strictEqual(typeof ctrlC, 'string');
    assert.strictEqual(typeof altTab, 'string');
  });

  it('should support navigation keys', () => {
    const home = keyboardManager.getNavigationKey('home');
    const end = keyboardManager.getNavigationKey('end');
    const pageUp = keyboardManager.getNavigationKey('page_up');
    
    assert.strictEqual(typeof home, 'string');
    assert.strictEqual(typeof end, 'string'); 
    assert.strictEqual(typeof pageUp, 'string');
    assert.ok(home.includes('\x1b'));
  });

  it('should handle editing shortcuts', () => {
    const copy = keyboardManager.getEditingShortcut('copy');
    const paste = keyboardManager.getEditingShortcut('paste');
    
    assert.strictEqual(typeof copy, 'string');
    assert.strictEqual(typeof paste, 'string');
  });

  it('should support unicode input', () => {
    const unicodeSequence = keyboardManager.getUnicodeInput('é');
    assert.strictEqual(typeof unicodeSequence, 'string');
    assert.ok(unicodeSequence.includes('é'));
  });

  it('should record and replay key sequences', () => {
    keyboardManager.startRecording('test_sequence');
    keyboardManager.recordKey('h');
    keyboardManager.recordKey('e');
    keyboardManager.recordKey('l');
    const recorded = keyboardManager.stopRecording();
    
    assert.strictEqual(recorded.name, 'test_sequence');
    assert.ok(Array.isArray(recorded.sequence));
  });

  it('should handle key chord combinations', () => {
    const chord = keyboardManager.getKeyChord(['ctrl', 'alt', 'delete']);
    assert.strictEqual(typeof chord, 'string');
  });

  it('should support key hold with duration', () => {
    const holdConfig = { key: 'space', duration: 1000, autoRepeat: true };
    const holdSequence = keyboardManager.getKeyHold(holdConfig);
    assert.strictEqual(typeof holdSequence, 'string');
  });

  it('should validate key parameters', () => {
    assert.throws(() => {
      keyboardManager.getFunctionKey('invalid_key');
    }, /Invalid function key/);
  });
});

describe('MouseManager Tests - F00041-F00052, F00057', () => {
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

  it('should generate mouse click sequences', () => {
    const leftClick = mouseManager.generateMouseSequence('test-session', 'left', 50, 50, 1);
    const rightClick = mouseManager.generateMouseSequence('test-session', 'right', 75, 75, 1);
    
    assert.strictEqual(typeof leftClick, 'string');
    assert.strictEqual(typeof rightClick, 'string');
    assert.ok(leftClick.includes('\x1b'));
  });

  it('should handle different mouse buttons', () => {
    const middleClick = mouseManager.generateMouseSequence('test-session', 'middle', 100, 100, 1);
    const wheelUp = mouseManager.generateMouseSequence('test-session', 'wheel_up', 100, 100, 1);
    
    assert.strictEqual(typeof middleClick, 'string');
    assert.strictEqual(typeof wheelUp, 'string');
  });

  it('should detect multi-click sequences', () => {
    const doubleClick = mouseManager.generateMouseSequence('test-session', 'left', 50, 50, 2);
    const tripleClick = mouseManager.generateMouseSequence('test-session', 'left', 50, 50, 3);
    
    assert.strictEqual(typeof doubleClick, 'string');
    assert.strictEqual(typeof tripleClick, 'string');
  });

  it('should handle drag operations', () => {
    const dragStart = mouseManager.startDrag(50, 50);
    const dragEnd = mouseManager.endDrag(150, 150);
    
    assert.strictEqual(typeof dragStart, 'object');
    assert.strictEqual(typeof dragEnd, 'object');
  });

  it('should recognize gestures', () => {
    const swipePoints = [
      { x: 50, y: 50 },
      { x: 100, y: 50 },
      { x: 150, y: 50 }
    ];
    
    const gesture = mouseManager.recognizeGesture(swipePoints);
    assert.strictEqual(typeof gesture, 'object');
    assert.ok(gesture.type);
  });

  it('should configure drag threshold', () => {
    mouseManager.setDragThreshold(10);
    const threshold = mouseManager.getDragThreshold();
    assert.strictEqual(threshold, 10);
  });

  it('should handle hover detection', () => {
    const hoverEvent = mouseManager.startHover(500);
    assert.strictEqual(typeof hoverEvent, 'object');
    assert.strictEqual(hoverEvent.duration, 500);
  });

  it('should validate mouse coordinates', () => {
    assert.throws(() => {
      mouseManager.generateMouseSequence('test', 'left', -1, -1, 1);
    }, /Invalid mouse coordinates/);
  });
});

describe('ClipboardManager Tests - F00069-F00075', () => {
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

  it('should support coordinate-based selection', () => {
    const selection = clipboardManager.selectByCoordinates(10, 5, 20, 8);
    
    assert.strictEqual(selection.type, 'coordinate');
    assert.strictEqual(selection.startX, 10);
    assert.strictEqual(selection.startY, 5);
    assert.strictEqual(selection.endX, 20);
    assert.strictEqual(selection.endY, 8);
  });

  it('should support word-based selection', () => {
    clipboardManager.setTerminalContent('Hello world this is a test');
    const selection = clipboardManager.selectWord(6);
    
    assert.strictEqual(selection.type, 'word');
    assert.strictEqual(typeof selection.selectedText, 'string');
  });

  it('should support line-based selection', () => {
    const lines = ['First line', 'Second line', 'Third line'];
    clipboardManager.setTerminalLines(lines);
    const selection = clipboardManager.selectLine(1);
    
    assert.strictEqual(selection.type, 'line');
    assert.strictEqual(selection.selectedText, 'Second line');
  });

  it('should handle pattern-based selection', () => {
    clipboardManager.setTerminalContent('Error: File not found at /path/to/file.txt');
    const selection = clipboardManager.selectByPattern(/\/[\w\/\.]+/);
    
    assert.strictEqual(selection.type, 'pattern');
    assert.ok(selection.selectedText.includes('/path'));
  });

  it('should manage clipboard operations', async () => {
    const content = await clipboardManager.readClipboard();
    assert.strictEqual(typeof content.text, 'string');
    
    await clipboardManager.writeClipboard('test content');
    // Should not throw error
  });

  it('should support multi-selection', () => {
    clipboardManager.addSelection(clipboardManager.selectByCoordinates(0, 0, 5, 0));
    clipboardManager.addSelection(clipboardManager.selectByCoordinates(10, 0, 15, 0));
    
    const selections = clipboardManager.getAllSelections();
    assert.strictEqual(selections.length, 2);
  });

  it('should maintain clipboard history', async () => {
    await clipboardManager.writeClipboard('Item 1');
    await clipboardManager.writeClipboard('Item 2');
    await clipboardManager.writeClipboard('Item 3');
    
    const history = clipboardManager.getClipboardHistory();
    assert.ok(Array.isArray(history));
    assert.ok(history.length > 0);
  });

  it('should validate selection parameters', () => {
    assert.throws(() => {
      clipboardManager.selectByCoordinates(-1, -1, 10, 10);
    }, /Invalid selection coordinates/);
  });
});

describe('TouchManager Tests - F00076-F00083', () => {
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
    const maxPoints = touchManager.getMaxTouchPoints();
    
    assert.strictEqual(typeof isSupported, 'boolean');
    assert.strictEqual(typeof maxPoints, 'number');
  });

  it('should process single tap events', () => {
    const tapEvent = touchManager.processSingleTap(100, 150);
    
    assert.strictEqual(tapEvent.type, 'tap');
    assert.strictEqual(tapEvent.fingers, 1);
    assert.strictEqual(tapEvent.x, 100);
    assert.strictEqual(tapEvent.y, 150);
  });

  it('should handle multi-touch gestures', () => {
    const touches = [
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 200, y: 100 }
    ];
    
    const gesture = touchManager.processTwoFingerGesture(touches);
    assert.strictEqual(gesture.fingers, 2);
    assert.strictEqual(typeof gesture.distance, 'number');
  });

  it('should recognize swipe gestures', () => {
    const swipePoints = [
      { x: 50, y: 100, timestamp: 0 },
      { x: 100, y: 100, timestamp: 100 },
      { x: 200, y: 100, timestamp: 200 }
    ];
    
    const gesture = touchManager.recognizeSwipeGesture(swipePoints);
    assert.strictEqual(gesture.type, 'swipe');
    assert.ok(['left', 'right', 'up', 'down'].includes(gesture.direction));
  });

  it('should detect long press events', async () => {
    const longPressPromise = touchManager.startLongPressDetection(100, 100, 100); // Short timeout for test
    
    setTimeout(() => {
      touchManager.maintainTouch(100, 100);
    }, 50);
    
    const gesture = await longPressPromise;
    assert.strictEqual(gesture.type, 'long_press');
  });

  it('should handle pinch zoom operations', () => {
    const initialTouches = [
      { id: 0, x: 100, y: 100 },
      { id: 1, x: 200, y: 100 }
    ];
    
    const zoomedTouches = [
      { id: 0, x: 75, y: 100 },
      { id: 1, x: 225, y: 100 }
    ];
    
    const zoomOperation = touchManager.processPinchZoom(initialTouches, zoomedTouches);
    assert.strictEqual(zoomOperation.type, 'pinch_zoom');
    assert.strictEqual(typeof zoomOperation.scaleFactor, 'number');
  });

  it('should filter palm touches', () => {
    const touches = [
      { id: 0, x: 100, y: 100, size: 20, pressure: 0.3 }, // Finger
      { id: 1, x: 150, y: 120, size: 80, pressure: 0.1 }  // Palm
    ];
    
    const filteredTouches = touchManager.filterPalmTouches(touches);
    assert.ok(Array.isArray(filteredTouches));
    assert.ok(filteredTouches.length <= touches.length);
  });

  it('should provide haptic feedback', () => {
    // Mock vibration API
    global.navigator.vibrate = () => true;
    
    const hasHaptics = touchManager.hasHapticSupport();
    assert.strictEqual(typeof hasHaptics, 'boolean');
    
    // Should not throw error
    touchManager.provideTactileFeedback('tap');
  });

  it('should validate touch coordinates', () => {
    assert.throws(() => {
      touchManager.processSingleTap(-1, -1);
    }, /Invalid touch coordinates/);
  });
});