import { ClipboardEntry, TextSelection } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export class ClipboardManager {
  private static instance: ClipboardManager;
  private history: ClipboardEntry[] = [];
  private maxHistorySize: number = 20;
  private selections = new Map<string, TextSelection[]>();

  private constructor() {}

  static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  async readClipboard(format: string = 'text'): Promise<ClipboardEntry | null> {
    try {
      // In a real implementation, this would interface with the system clipboard
      // For now, we'll simulate clipboard access
      
      if (this.history.length === 0) {
        return null;
      }

      // Return the most recent entry matching the format
      for (const entry of this.history) {
        if (entry.format === format) {
          return { ...entry };
        }
      }

      // If no format match, return the most recent text entry
      const textEntry = this.history.find(entry => entry.format === 'text');
      return textEntry ? { ...textEntry } : null;

    } catch (error) {
      throw createTerminalError('RESOURCE_ERROR', `Failed to read clipboard: ${error}`);
    }
  }

  async writeClipboard(content: string, format: string = 'text', source: string = 'api'): Promise<void> {
    try {
      const entry: ClipboardEntry = {
        content,
        format: format as 'text' | 'html' | 'rtf',
        timestamp: new Date(),
        source: source as 'copy' | 'cut' | 'api'
      };

      // Add to history
      this.history.unshift(entry);

      // Trim history to max size
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(0, this.maxHistorySize);
      }

      // In a real implementation, this would write to the system clipboard
      // This could use libraries like 'clipboardy' or native APIs

    } catch (error) {
      throw createTerminalError('RESOURCE_ERROR', `Failed to write clipboard: ${error}`);
    }
  }

  getHistory(): ClipboardEntry[] {
    return [...this.history];
  }

  getHistoryEntry(index: number): ClipboardEntry | null {
    if (index >= 0 && index < this.history.length) {
      return { ...this.history[index] };
    }
    return null;
  }

  addToHistory(entry: ClipboardEntry): void {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  removeFromHistory(index: number): boolean {
    if (index >= 0 && index < this.history.length) {
      this.history.splice(index, 1);
      return true;
    }
    return false;
  }

  clearHistory(): void {
    this.history = [];
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, Math.min(size, 100));
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  // Text selection methods
  createTextSelection(sessionId: string, startX: number, startY: number, 
                     endX: number, endY: number, type: string = 'rectangle'): TextSelection {
    const selection: TextSelection = {
      startX,
      startY,
      endX,
      endY,
      type: type as 'character' | 'word' | 'line' | 'rectangle'
    };

    // Store selection for the session
    const sessionSelections = this.selections.get(sessionId) || [];
    sessionSelections.push(selection);
    this.selections.set(sessionId, sessionSelections);

    return selection;
  }

  getSelections(sessionId: string): TextSelection[] {
    return [...(this.selections.get(sessionId) || [])];
  }

  clearSelections(sessionId: string): void {
    this.selections.delete(sessionId);
  }

  addMultipleSelections(sessionId: string, selections: TextSelection[]): void {
    const existingSelections = this.selections.get(sessionId) || [];
    this.selections.set(sessionId, [...existingSelections, ...selections]);
  }

  selectWord(terminalContent: string, cols: number, x: number, y: number): TextSelection {
    // Calculate absolute position in content
    const lines = terminalContent.split('\n');
    if (y >= lines.length) {
      throw createTerminalError('PARSING_ERROR', 'Y coordinate exceeds terminal content');
    }

    const line = lines[y];
    if (x >= line.length) {
      throw createTerminalError('PARSING_ERROR', 'X coordinate exceeds line length');
    }

    // Find word boundaries
    const wordRegex = /\b\w+\b/g;
    let match;
    let startX = x, endX = x;

    while ((match = wordRegex.exec(line)) !== null) {
      if (match.index <= x && x < match.index + match[0].length) {
        startX = match.index;
        endX = match.index + match[0].length - 1;
        break;
      }
    }

    return {
      startX,
      startY: y,
      endX,
      endY: y,
      type: 'word',
      content: line.substring(startX, endX + 1)
    };
  }

  selectLine(terminalContent: string, cols: number, y: number): TextSelection {
    const lines = terminalContent.split('\n');
    if (y >= lines.length) {
      throw createTerminalError('PARSING_ERROR', 'Y coordinate exceeds terminal content');
    }

    return {
      startX: 0,
      startY: y,
      endX: Math.min(lines[y].length - 1, cols - 1),
      endY: y,
      type: 'line',
      content: lines[y]
    };
  }

  selectAll(terminalContent: string, cols: number, rows: number): TextSelection {
    const lines = terminalContent.split('\n');
    const lastLineIndex = Math.min(lines.length - 1, rows - 1);
    const lastLine = lines[lastLineIndex] || '';

    return {
      startX: 0,
      startY: 0,
      endX: Math.min(lastLine.length - 1, cols - 1),
      endY: lastLineIndex,
      type: 'rectangle',
      content: terminalContent
    };
  }

  selectByPattern(terminalContent: string, pattern: string): TextSelection[] {
    const regex = new RegExp(pattern, 'g');
    const lines = terminalContent.split('\n');
    const selections: TextSelection[] = [];

    lines.forEach((line, y) => {
      let match;
      while ((match = regex.exec(line)) !== null) {
        selections.push({
          startX: match.index,
          startY: y,
          endX: match.index + match[0].length - 1,
          endY: y,
          type: 'character',
          content: match[0]
        });
      }
    });

    return selections;
  }

  extractSelectionContent(terminalContent: string, selection: TextSelection): string {
    const lines = terminalContent.split('\n');
    let content = '';

    if (selection.startY === selection.endY) {
      // Single line selection
      const line = lines[selection.startY] || '';
      content = line.substring(selection.startX, selection.endX + 1);
    } else {
      // Multi-line selection
      for (let y = selection.startY; y <= selection.endY; y++) {
        const line = lines[y] || '';
        if (y === selection.startY) {
          content += line.substring(selection.startX) + '\n';
        } else if (y === selection.endY) {
          content += line.substring(0, selection.endX + 1);
        } else {
          content += line + '\n';
        }
      }
    }

    return content;
  }

  processTextForPasting(text: string, processing: string): string {
    switch (processing) {
      case 'raw':
        return text;
      
      case 'escape_special':
        // Escape special shell characters
        return text.replace(/([\\$`"'])/g, '\\$1');
      
      case 'convert_newlines':
        // Convert newlines to spaces
        return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      case 'strip_formatting':
        // Remove ANSI escape sequences
        return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
      
      default:
        return text;
    }
  }

  chunkText(text: string, chunkSize: number): string[] {
    if (chunkSize <= 0) {
      return [text];
    }

    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substr(i, chunkSize));
    }
    return chunks;
  }

  // Platform-specific clipboard integration points
  async getSystemClipboard(): Promise<string> {
    // This would integrate with system clipboard APIs
    // On macOS: pbpaste
    // On Linux: xclip or xsel
    // On Windows: Get-Clipboard or clip.exe
    throw createTerminalError('UNKNOWN_ERROR', 'System clipboard integration not implemented');
  }

  async setSystemClipboard(content: string): Promise<void> {
    // This would integrate with system clipboard APIs
    // On macOS: pbcopy
    // On Linux: xclip or xsel
    // On Windows: Set-Clipboard or clip.exe
    throw createTerminalError('UNKNOWN_ERROR', 'System clipboard integration not implemented');
  }
}