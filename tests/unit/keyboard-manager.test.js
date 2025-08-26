// Unit tests for KeyboardManager - F00031-F00040
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { KeyboardManager } from '../../src/keyboard-manager.js';
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
    mock.mockResolvedValue = (value) => { mock.returnValue = Promise.resolve(value); return mock; };
    mock.mockRejectedValue = (error) => { mock.returnValue = Promise.reject(error); return mock; };
    return mock;
  },
  clearAllMocks: () => {}
};

// Expect function compatible with Node.js assert
const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toContain: (expected) => assert.ok(actual.includes(expected)),
  toMatch: (regex) => assert.match(actual, regex),
  toBeGreaterThan: (expected) => assert.ok(actual > expected),
  toBeGreaterThanOrEqual: (expected) => assert.ok(actual >= expected),
  toBeLessThan: (expected) => assert.ok(actual < expected),
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

describe('KeyboardManager Tests', () => {
  let keyboardManager;

  beforeEach(() => {
    // Reset singleton for each test
    KeyboardManager.instance = null;
    keyboardManager = KeyboardManager.getInstance();
  });

  describe('F00031: Function Key Support', () => {
    it('should support F1-F12 function keys', () => {
      const testCases = [
        { key: 'f1', expected: '\x1bOP' },
        { key: 'f2', expected: '\x1bOQ' },
        { key: 'f3', expected: '\x1bOR' },
        { key: 'f4', expected: '\x1bOS' },
        { key: 'f5', expected: '\x1b[15~' },
        { key: 'f12', expected: '\x1b[24~' }
      ];

      testCases.forEach(({ key, expected }) => {
        const sequence = keyboardManager.getFunctionKey(key);
        expect(sequence).toBe(expected);
      });
    });

    it('should support extended function keys F13-F24', () => {
      const testCases = [
        { key: 'f13', expected: '\x1b[25~' },
        { key: 'f16', expected: '\x1b[29~' },
        { key: 'f20', expected: '\x1b[34~' },
        { key: 'f24', expected: '\x1b[38~' }
      ];

      testCases.forEach(({ key, expected }) => {
        const sequence = keyboardManager.getFunctionKey(key);
        expect(sequence).toBe(expected);
      });
    });

    it('should throw error for invalid function key', () => {
      expect(() => {
        keyboardManager.getFunctionKey('f25');
      }).toThrow('Invalid function key');
    });
  });

  describe('F00032: Modifier Key Combinations', () => {
    it('should handle Ctrl combinations', () => {
      const testCases = [
        { key: 'a', modifiers: ['ctrl'], expected: '\x01' },
        { key: 'c', modifiers: ['ctrl'], expected: '\x03' },
        { key: 'z', modifiers: ['ctrl'], expected: '\x1a' }
      ];

      testCases.forEach(({ key, modifiers, expected }) => {
        const sequence = keyboardManager.getModifierCombination(key, modifiers);
        expect(sequence).toBe(expected);
      });
    });

    it('should handle Alt combinations', () => {
      const sequence = keyboardManager.getModifierCombination('a', ['alt']);
      expect(sequence).toBe('\x1ba');
    });

    it('should handle multiple modifiers', () => {
      const sequence = keyboardManager.getModifierCombination('c', ['ctrl', 'shift']);
      expect(sequence).toMatch(/\x1b\[\d+;[2-8]u/);
    });

    it('should validate modifier keys', () => {
      expect(() => {
        keyboardManager.getModifierCombination('a', ['invalid']);
      }).toThrow('Invalid modifier key');
    });
  });

  describe('F00033: Navigation Key Suite', () => {
    it('should support basic navigation keys', () => {
      const testCases = [
        { key: 'home', expected: '\x1b[H' },
        { key: 'end', expected: '\x1b[F' },
        { key: 'page_up', expected: '\x1b[5~' },
        { key: 'page_down', expected: '\x1b[6~' },
        { key: 'insert', expected: '\x1b[2~' },
        { key: 'delete', expected: '\x1b[3~' }
      ];

      testCases.forEach(({ key, expected }) => {
        const sequence = keyboardManager.getNavigationKey(key);
        expect(sequence).toBe(expected);
      });
    });

    it('should support arrow keys', () => {
      const testCases = [
        { key: 'arrow_up', expected: '\x1b[A' },
        { key: 'arrow_down', expected: '\x1b[B' },
        { key: 'arrow_right', expected: '\x1b[C' },
        { key: 'arrow_left', expected: '\x1b[D' }
      ];

      testCases.forEach(({ key, expected }) => {
        const sequence = keyboardManager.getNavigationKey(key);
        expect(sequence).toBe(expected);
      });
    });

    it('should support navigation keys with modifiers', () => {
      const sequence = keyboardManager.getNavigationKey('home', ['ctrl']);
      expect(sequence).toMatch(/\x1b\[1;5H/);
    });
  });

  describe('F00034: Editing Key Sequences', () => {
    it('should support platform-specific editing shortcuts', () => {
      const originalPlatform = process.platform;
      
      // Test macOS shortcuts
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      keyboardManager = KeyboardManager.getInstance();
      
      expect(keyboardManager.getEditingShortcut('copy')).toBe('\x1b[cmd+c');
      expect(keyboardManager.getEditingShortcut('paste')).toBe('\x1b[cmd+v');
      
      // Test Windows/Linux shortcuts
      Object.defineProperty(process, 'platform', { value: 'linux' });
      keyboardManager = KeyboardManager.getInstance();
      
      expect(keyboardManager.getEditingShortcut('copy')).toBe('\x03');
      expect(keyboardManager.getEditingShortcut('paste')).toBe('\x16');
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should support undo/redo operations', () => {
      const undo = keyboardManager.getEditingShortcut('undo');
      const redo = keyboardManager.getEditingShortcut('redo');
      
      expect(undo).toMatch(/\x1a|\x1b\[cmd\+z/);
      expect(redo).toMatch(/\x19|\x1b\[cmd\+y/);
    });
  });

  describe('F00035: System Key Commands', () => {
    it('should support system key combinations', () => {
      const testCases = [
        'alt_tab',
        'ctrl_alt_del',
        'win_key',
        'menu_key'
      ];

      testCases.forEach(key => {
        const sequence = keyboardManager.getSystemKey(key);
        expect(sequence).toBeDefined();
        expect(typeof sequence).toBe('string');
        expect(sequence.length).toBeGreaterThan(0);
      });
    });

    it('should handle platform-specific system keys', () => {
      const winKey = keyboardManager.getSystemKey('win_key');
      const menuKey = keyboardManager.getSystemKey('menu_key');
      
      expect(winKey).toMatch(/\x1b\[.*|VK_LWIN/);
      expect(menuKey).toMatch(/\x1b\[.*|VK_APPS/);
    });
  });

  describe('F00036: International Keyboard', () => {
    it('should support Unicode input', () => {
      const unicodeChars = ['é', 'ñ', 'ü', '中', '🎉'];
      
      unicodeChars.forEach(char => {
        const sequence = keyboardManager.getUnicodeInput(char);
        expect(sequence).toBeDefined();
        expect(sequence).toContain(char);
      });
    });

    it('should handle dead key sequences', () => {
      const deadKeys = ['´', '`', '^', '~', '¨'];
      
      deadKeys.forEach(deadKey => {
        const sequence = keyboardManager.getDeadKeySequence(deadKey, 'a');
        expect(sequence).toBeDefined();
        expect(typeof sequence).toBe('string');
      });
    });

    it('should support compose sequences', () => {
      const composeSequences = [
        { keys: ['a', '\''], expected: 'á' },
        { keys: ['e', '`'], expected: 'è' },
        { keys: ['n', '~'], expected: 'ñ' }
      ];

      composeSequences.forEach(({ keys, expected }) => {
        const result = keyboardManager.getComposeSequence(keys);
        expect(result).toContain(expected);
      });
    });
  });

  describe('F00037: Custom Key Mappings', () => {
    it('should allow user-defined key remapping', () => {
      const customMapping = { from: 'f13', to: 'ctrl+s' };
      
      keyboardManager.addCustomMapping(customMapping.from, customMapping.to);
      const sequence = keyboardManager.getCustomMapping(customMapping.from);
      
      expect(sequence).toBeDefined();
      expect(sequence).toMatch(/\x13/);
    });

    it('should support macro definitions', () => {
      const macro = {
        name: 'git_status',
        sequence: ['g', 'i', 't', ' ', 's', 't', 'a', 't', 'u', 's', '\r']
      };
      
      keyboardManager.defineMacro(macro.name, macro.sequence);
      const result = keyboardManager.getMacro(macro.name);
      
      expect(result).toEqual(macro.sequence);
    });

    it('should validate custom mappings', () => {
      expect(() => {
        keyboardManager.addCustomMapping('', 'ctrl+a');
      }).toThrow('Invalid key mapping');
    });
  });

  describe('F00038: Key Sequence Recording', () => {
    it('should record key sequences', () => {
      const testSequence = ['h', 'e', 'l', 'l', 'o'];
      
      keyboardManager.startRecording('test_sequence');
      testSequence.forEach(key => keyboardManager.recordKey(key));
      const recorded = keyboardManager.stopRecording();
      
      expect(recorded.name).toBe('test_sequence');
      expect(recorded.sequence).toEqual(testSequence);
    });

    it('should replay recorded sequences', () => {
      const sequence = ['t', 'e', 's', 't'];
      keyboardManager.saveSequence('replay_test', sequence);
      
      const replayed = keyboardManager.replaySequence('replay_test');
      expect(replayed).toEqual(sequence);
    });

    it('should handle recording state', () => {
      expect(keyboardManager.isRecording()).toBe(false);
      
      keyboardManager.startRecording('state_test');
      expect(keyboardManager.isRecording()).toBe(true);
      
      keyboardManager.stopRecording();
      expect(keyboardManager.isRecording()).toBe(false);
    });
  });

  describe('F00039: Simultaneous Key Press', () => {
    it('should handle multi-key chords', () => {
      const chord = ['ctrl', 'alt', 'delete'];
      const sequence = keyboardManager.getKeyChord(chord);
      
      expect(sequence).toBeDefined();
      expect(sequence).toMatch(/\x1b\[.*|simultaneous/);
    });

    it('should support chord validation', () => {
      const validChord = ['ctrl', 'c'];
      const invalidChord = ['invalid1', 'invalid2'];
      
      expect(keyboardManager.validateChord(validChord)).toBe(true);
      expect(keyboardManager.validateChord(invalidChord)).toBe(false);
    });

    it('should handle chord timing', () => {
      const chord = ['shift', 'f10'];
      const sequence = keyboardManager.getKeyChord(chord, { timing: 'simultaneous' });
      
      expect(sequence).toBeDefined();
      expect(sequence).toContain('simultaneous');
    });
  });

  describe('F00040: Key Hold Detection', () => {
    it('should support key hold duration', () => {
      const holdConfig = {
        key: 'a',
        duration: 1000, // 1 second
        autoRepeat: true
      };
      
      const sequence = keyboardManager.getKeyHold(holdConfig);
      expect(sequence).toBeDefined();
      expect(sequence).toMatch(/hold:\d+/);
    });

    it('should handle auto-repeat configuration', () => {
      const config = {
        key: 'space',
        duration: 500,
        autoRepeat: true,
        repeatRate: 100
      };
      
      const sequence = keyboardManager.getKeyHold(config);
      expect(sequence).toContain('repeat:100');
    });

    it('should validate hold parameters', () => {
      expect(() => {
        keyboardManager.getKeyHold({ key: '', duration: -1 });
      }).toThrow('Invalid hold parameters');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid key names gracefully', () => {
      expect(() => {
        keyboardManager.getFunctionKey('invalid_key');
      }).toThrow('Invalid function key');
    });

    it('should validate input parameters', () => {
      expect(() => {
        keyboardManager.getModifierCombination(null, ['ctrl']);
      }).toThrow('Invalid key parameter');
    });

    it('should handle empty sequences', () => {
      expect(() => {
        keyboardManager.replaySequence('non_existent');
      }).toThrow('Sequence not found');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with terminal PTY', async () => {
      // Mock PTY integration
      const mockPty = {
        write: vi.fn()
      };
      
      keyboardManager.setPtyConnection(mockPty);
      await keyboardManager.sendKeyToTerminal('f1');
      
      expect(mockPty.write).toHaveBeenCalledWith('\x1bOP');
    });

    it('should handle platform differences', () => {
      const originalPlatform = process.platform;
      
      // Test different platforms
      ['darwin', 'linux', 'win32'].forEach(platform => {
        Object.defineProperty(process, 'platform', { value: platform });
        const manager = KeyboardManager.getInstance();
        
        const sequence = manager.getEditingShortcut('copy');
        expect(sequence).toBeDefined();
        expect(typeof sequence).toBe('string');
      });
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});