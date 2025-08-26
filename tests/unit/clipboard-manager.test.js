// Unit tests for ClipboardManager - F00069-F00075
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ClipboardManager } from '../../src/clipboard-manager.js';
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
  toBeDefined: () => assert.ok(actual !== undefined),
  toThrow: (expectedMessage) => {
    if (typeof actual === 'function') {
      assert.throws(actual, expectedMessage ? new RegExp(expectedMessage) : undefined);
    } else {
      throw new Error('Expected a function to test for throwing');
    }
  },
  rejects: {
    toThrow: async (expectedMessage) => {
      try {
        await actual;
        throw new Error('Expected promise to reject');
      } catch (error) {
        if (expectedMessage) {
          assert.match(error.message, new RegExp(expectedMessage));
        }
      }
    }
  }
});

describe('ClipboardManager Tests', () => {
  let clipboardManager;
  let mockClipboard;

  beforeEach(() => {
    // Reset singleton for each test
    ClipboardManager.instance = null;
    clipboardManager = ClipboardManager.getInstance();
    
    // Mock system clipboard
    mockClipboard = {
      readText: vi.fn(),
      writeText: vi.fn(),
      read: vi.fn(),
      write: vi.fn()
    };
    
    // Mock clipboard API availability
    global.navigator = {
      clipboard: mockClipboard
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('F00069: Text Selection Methods', () => {
    it('should support coordinate-based text selection', () => {
      const selection = clipboardManager.selectByCoordinates(10, 5, 20, 8);
      
      expect(selection.type).toBe('coordinate');
      expect(selection.startX).toBe(10);
      expect(selection.startY).toBe(5);
      expect(selection.endX).toBe(20);
      expect(selection.endY).toBe(8);
    });

    it('should support word-based selection', () => {
      const mockTerminalContent = 'Hello world this is a test';
      clipboardManager.setTerminalContent(mockTerminalContent);
      
      const selection = clipboardManager.selectWord(6); // Position in 'world'
      
      expect(selection.type).toBe('word');
      expect(selection.selectedText).toBe('world');
    });

    it('should support line-based selection', () => {
      const mockLines = [
        'First line of text',
        'Second line of text',
        'Third line of text'
      ];
      clipboardManager.setTerminalLines(mockLines);
      
      const selection = clipboardManager.selectLine(1); // Second line
      
      expect(selection.type).toBe('line');
      expect(selection.selectedText).toBe('Second line of text');
      expect(selection.lineNumber).toBe(1);
    });

    it('should support pattern-based selection', () => {
      const content = 'Error: File not found at /path/to/file.txt';
      clipboardManager.setTerminalContent(content);
      
      const selection = clipboardManager.selectByPattern(/\/[\w\/\.]+/);
      
      expect(selection.type).toBe('pattern');
      expect(selection.selectedText).toBe('/path/to/file.txt');
    });

    it('should validate selection parameters', () => {
      expect(() => {
        clipboardManager.selectByCoordinates(-1, -1, 10, 10);
      }).toThrow('Invalid selection coordinates');
    });
  });

  describe('F00070: Clipboard Integration', () => {
    it('should read from system clipboard', async () => {
      const testText = 'Clipboard test content';
      mockClipboard.readText.mockResolvedValue(testText);
      
      const clipboardContent = await clipboardManager.readClipboard();
      
      expect(clipboardContent.text).toBe(testText);
      expect(mockClipboard.readText).toHaveBeenCalled();
    });

    it('should write to system clipboard', async () => {
      const testText = 'Text to write to clipboard';
      mockClipboard.writeText.mockResolvedValue();
      
      await clipboardManager.writeClipboard(testText);
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(testText);
    });

    it('should support multiple clipboard formats', async () => {
      const testData = {
        'text/plain': 'Plain text content',
        'text/html': '<p>HTML content</p>',
        'application/json': '{"key": "value"}'
      };
      
      mockClipboard.write.mockResolvedValue();
      
      await clipboardManager.writeClipboardMultiFormat(testData);
      
      expect(mockClipboard.write).toHaveBeenCalled();
    });

    it('should handle clipboard access errors gracefully', async () => {
      mockClipboard.readText.mockRejectedValue(new Error('Clipboard access denied'));
      
      await expect(clipboardManager.readClipboard()).rejects.toThrow('Clipboard access denied');
    });
  });

  describe('F00071: Selection Highlighting', () => {
    it('should track active selection state', () => {
      expect(clipboardManager.hasActiveSelection()).toBe(false);
      
      clipboardManager.selectByCoordinates(0, 0, 10, 2);
      expect(clipboardManager.hasActiveSelection()).toBe(true);
      
      clipboardManager.clearSelection();
      expect(clipboardManager.hasActiveSelection()).toBe(false);
    });

    it('should provide selection information', () => {
      const selection = clipboardManager.selectByCoordinates(5, 3, 15, 7);
      const selectionInfo = clipboardManager.getSelectionInfo();
      
      expect(selectionInfo.active).toBe(true);
      expect(selectionInfo.type).toBe('coordinate');
      expect(selectionInfo.bounds).toEqual({
        startX: 5, startY: 3,
        endX: 15, endY: 7
      });
    });

    it('should support selection highlighting styles', () => {
      const selection = clipboardManager.selectWord(10);
      clipboardManager.setHighlightStyle({
        backgroundColor: '#3377ff',
        foregroundColor: '#ffffff',
        style: 'inverse'
      });
      
      const highlight = clipboardManager.getHighlightStyle();
      expect(highlight.backgroundColor).toBe('#3377ff');
      expect(highlight.style).toBe('inverse');
    });
  });

  describe('F00072: Multi-Selection Support', () => {
    it('should support multiple non-contiguous selections', () => {
      clipboardManager.addSelection(clipboardManager.selectByCoordinates(0, 0, 5, 0));
      clipboardManager.addSelection(clipboardManager.selectByCoordinates(10, 0, 15, 0));
      clipboardManager.addSelection(clipboardManager.selectByCoordinates(20, 0, 25, 0));
      
      const selections = clipboardManager.getAllSelections();
      expect(selections.length).toBe(3);
    });

    it('should manage multi-selection state', () => {
      expect(clipboardManager.getSelectionCount()).toBe(0);
      
      clipboardManager.addSelection(clipboardManager.selectWord(5));
      clipboardManager.addSelection(clipboardManager.selectWord(15));
      
      expect(clipboardManager.getSelectionCount()).toBe(2);
    });

    it('should support multi-selection operations', () => {
      clipboardManager.addSelection(clipboardManager.selectByCoordinates(0, 0, 5, 0));
      clipboardManager.addSelection(clipboardManager.selectByCoordinates(10, 0, 15, 0));
      
      const combinedText = clipboardManager.getCombinedSelectionText();
      expect(combinedText).toContain('\n'); // Should be separated by newlines
    });

    it('should clear all selections', () => {
      clipboardManager.addSelection(clipboardManager.selectWord(5));
      clipboardManager.addSelection(clipboardManager.selectWord(10));
      
      clipboardManager.clearAllSelections();
      expect(clipboardManager.getSelectionCount()).toBe(0);
    });
  });

  describe('F00073: Selection Copy Operations', () => {
    it('should copy selection to clipboard', async () => {
      const testText = 'Selected text content';
      mockClipboard.writeText.mockResolvedValue();
      
      clipboardManager.setSelectedText(testText);
      await clipboardManager.copySelectionToClipboard();
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(testText);
    });

    it('should copy from screen coordinates', async () => {
      const mockTerminalContent = 'Line 1\nLine 2\nLine 3';
      clipboardManager.setTerminalContent(mockTerminalContent);
      mockClipboard.writeText.mockResolvedValue();
      
      await clipboardManager.copyFromCoordinates(0, 1, 5, 1); // "Line 2"
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Line 2');
    });

    it('should copy entire screen content', async () => {
      const mockScreenContent = 'Full screen content\nWith multiple lines';
      clipboardManager.setTerminalContent(mockScreenContent);
      mockClipboard.writeText.mockResolvedValue();
      
      await clipboardManager.copyEntireScreen();
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(mockScreenContent);
    });

    it('should handle copy operation failures', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));
      
      await expect(clipboardManager.copySelectionToClipboard()).rejects.toThrow('Copy failed');
    });
  });

  describe('F00074: Paste with Formatting', () => {
    it('should paste plain text without formatting', async () => {
      const htmlContent = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      mockClipboard.readText.mockResolvedValue(htmlContent);
      
      const pasteContent = await clipboardManager.pasteAsPlainText();
      
      expect(pasteContent.text).not.toContain('<p>');
      expect(pasteContent.text).not.toContain('<strong>');
      expect(pasteContent.format).toBe('plain');
    });

    it('should preserve formatting when requested', async () => {
      const formattedContent = 'Text with \x1b[1mbold\x1b[0m formatting';
      mockClipboard.readText.mockResolvedValue(formattedContent);
      
      const pasteContent = await clipboardManager.pasteWithFormatting();
      
      expect(pasteContent.text).toContain('\x1b[1m');
      expect(pasteContent.format).toBe('formatted');
    });

    it('should support different paste processing options', async () => {
      const testContent = 'Test\tContent\nWith\rDifferent\r\nLineEndings';
      mockClipboard.readText.mockResolvedValue(testContent);
      
      const options = {
        convertTabs: true,
        normalizeLineEndings: true,
        trimWhitespace: true
      };
      
      const processed = await clipboardManager.pasteWithProcessing(options);
      
      expect(processed.text).not.toContain('\t');
      expect(processed.text).not.toContain('\r\n');
    });

    it('should handle different text encodings', async () => {
      const unicodeText = 'Text with émojis: 🎉🚀 and symbols: ±∞≠';
      mockClipboard.readText.mockResolvedValue(unicodeText);
      
      const pasteContent = await clipboardManager.pasteUnicode();
      
      expect(pasteContent.text).toBe(unicodeText);
      expect(pasteContent.encoding).toBe('UTF-8');
    });
  });

  describe('F00075: Paste History Management', () => {
    it('should maintain clipboard history', async () => {
      const historyItems = [
        'First clipboard item',
        'Second clipboard item', 
        'Third clipboard item'
      ];
      
      for (const item of historyItems) {
        mockClipboard.writeText.mockResolvedValue();
        await clipboardManager.writeClipboard(item);
      }
      
      const history = clipboardManager.getClipboardHistory();
      expect(history.length).toBe(historyItems.length);
      expect(history[0].text).toBe(historyItems[historyItems.length - 1]); // Most recent first
    });

    it('should limit clipboard history size', async () => {
      clipboardManager.setHistoryLimit(5);
      
      // Add more items than the limit
      for (let i = 0; i < 10; i++) {
        mockClipboard.writeText.mockResolvedValue();
        await clipboardManager.writeClipboard(`Item ${i}`);
      }
      
      const history = clipboardManager.getClipboardHistory();
      expect(history.length).toBe(5);
    });

    it('should support clipboard history search', () => {
      const historyItems = [
        { text: 'Error: File not found', timestamp: Date.now() - 1000 },
        { text: 'Success: Operation completed', timestamp: Date.now() - 500 },
        { text: 'Warning: Low disk space', timestamp: Date.now() }
      ];
      
      clipboardManager.setHistoryItems(historyItems);
      
      const searchResults = clipboardManager.searchClipboardHistory('Error');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].text).toContain('Error');
    });

    it('should manage clipboard history operations', () => {
      const historyItems = [
        { text: 'Item 1', timestamp: Date.now() - 2000 },
        { text: 'Item 2', timestamp: Date.now() - 1000 },
        { text: 'Item 3', timestamp: Date.now() }
      ];
      
      clipboardManager.setHistoryItems(historyItems);
      
      // Test history operations
      clipboardManager.removeHistoryItem(1);
      expect(clipboardManager.getClipboardHistory().length).toBe(2);
      
      clipboardManager.clearClipboardHistory();
      expect(clipboardManager.getClipboardHistory().length).toBe(0);
    });

    it('should support history item restoration', async () => {
      const historyItem = {
        text: 'Historical clipboard content',
        timestamp: Date.now() - 5000,
        format: 'plain'
      };
      
      clipboardManager.addHistoryItem(historyItem);
      mockClipboard.writeText.mockResolvedValue();
      
      await clipboardManager.restoreHistoryItem(0);
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(historyItem.text);
    });
  });

  describe('Error Handling', () => {
    it('should handle clipboard API unavailability', () => {
      global.navigator = {}; // No clipboard API
      
      expect(() => {
        ClipboardManager.getInstance();
      }).toThrow('Clipboard API not available');
    });

    it('should handle selection validation errors', () => {
      expect(() => {
        clipboardManager.selectByCoordinates(null, undefined, 10, 10);
      }).toThrow('Invalid selection parameters');
    });

    it('should handle empty selection operations', () => {
      clipboardManager.clearSelection();
      
      expect(() => {
        clipboardManager.copySelectionToClipboard();
      }).toThrow('No active selection');
    });

    it('should handle clipboard permission errors', async () => {
      mockClipboard.writeText.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
      
      await expect(clipboardManager.writeClipboard('test')).rejects.toThrow('Permission denied');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with terminal selection', () => {
      const mockTerminal = {
        getContentAtCoordinates: vi.fn().mockReturnValue('selected text'),
        highlightRegion: vi.fn(),
        clearHighlights: vi.fn()
      };
      
      clipboardManager.setTerminalConnection(mockTerminal);
      const selection = clipboardManager.selectByCoordinates(0, 0, 10, 0);
      
      expect(mockTerminal.getContentAtCoordinates).toHaveBeenCalled();
      expect(selection.selectedText).toBe('selected text');
    });

    it('should support different selection modes', () => {
      const modes = ['block', 'line', 'character'];
      
      modes.forEach(mode => {
        clipboardManager.setSelectionMode(mode);
        const selection = clipboardManager.selectByCoordinates(0, 0, 10, 5);
        
        expect(selection.mode).toBe(mode);
      });
    });

    it('should handle platform-specific clipboard formats', () => {
      const platforms = ['darwin', 'linux', 'win32'];
      
      platforms.forEach(platform => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: platform });
        
        const formats = clipboardManager.getSupportedFormats();
        expect(Array.isArray(formats)).toBe(true);
        expect(formats.length).toBeGreaterThan(0);
        
        // Restore original platform
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });
    });
  });
});