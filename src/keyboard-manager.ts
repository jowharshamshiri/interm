import { KeyboardEvent, InputSequence } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export class KeyboardManager {
  private static instance: KeyboardManager;
  private keyMappings = new Map<string, string>();
  private sequences = new Map<string, InputSequence>();
  
  private constructor() {
    this.initializeKeyMappings();
  }

  static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }

  private initializeKeyMappings(): void {
    // Function key mappings
    for (let i = 1; i <= 24; i++) {
      this.keyMappings.set(`f${i}`, `\x1bO${String.fromCharCode(80 + i - 1)}`);
    }

    // Extended function key mappings
    const functionKeyMap: Record<string, string> = {
      'f1': '\x1bOP', 'f2': '\x1bOQ', 'f3': '\x1bOR', 'f4': '\x1bOS',
      'f5': '\x1b[15~', 'f6': '\x1b[17~', 'f7': '\x1b[18~', 'f8': '\x1b[19~',
      'f9': '\x1b[20~', 'f10': '\x1b[21~', 'f11': '\x1b[23~', 'f12': '\x1b[24~',
      'f13': '\x1b[25~', 'f14': '\x1b[26~', 'f15': '\x1b[28~', 'f16': '\x1b[29~',
      'f17': '\x1b[31~', 'f18': '\x1b[32~', 'f19': '\x1b[33~', 'f20': '\x1b[34~',
      'f21': '\x1b[35~', 'f22': '\x1b[36~', 'f23': '\x1b[37~', 'f24': '\x1b[38~'
    };

    // Navigation keys
    const navigationKeys: Record<string, string> = {
      'home': '\x1b[H',
      'end': '\x1b[F',
      'page_up': '\x1b[5~',
      'page_down': '\x1b[6~',
      'insert': '\x1b[2~',
      'delete': '\x1b[3~',
      'arrow_up': '\x1b[A',
      'arrow_down': '\x1b[B',
      'arrow_right': '\x1b[C',
      'arrow_left': '\x1b[D'
    };

    // Modifier combinations
    const modifierCombinations: Record<string, string> = {
      'ctrl+home': '\x1b[1;5H',
      'ctrl+end': '\x1b[1;5F',
      'shift+home': '\x1b[1;2H',
      'shift+end': '\x1b[1;2F',
      'ctrl+shift+home': '\x1b[1;6H',
      'ctrl+shift+end': '\x1b[1;6F',
      'alt+left': '\x1b[1;3D',
      'alt+right': '\x1b[1;3C',
      'alt+up': '\x1b[1;3A',
      'alt+down': '\x1b[1;3B'
    };

    // Merge all mappings
    Object.assign(functionKeyMap, navigationKeys, modifierCombinations);
    
    for (const [key, sequence] of Object.entries(functionKeyMap)) {
      this.keyMappings.set(key, sequence);
    }

    // Platform-specific editing shortcuts
    this.initializeEditingShortcuts();
  }

  private initializeEditingShortcuts(): void {
    const platform = process.platform;
    const editingShortcuts: Record<string, Record<string, string>> = {
      'windows': {
        'cut': '\x03',      // Ctrl+X
        'copy': '\x03',     // Ctrl+C  
        'paste': '\x16',    // Ctrl+V
        'select_all': '\x01', // Ctrl+A
        'undo': '\x1a',     // Ctrl+Z
        'redo': '\x19',     // Ctrl+Y
        'find': '\x06',     // Ctrl+F
        'save': '\x13',     // Ctrl+S
        'new': '\x0e',      // Ctrl+N
        'open': '\x0f',     // Ctrl+O
        'quit': '\x11'      // Ctrl+Q
      },
      'macos': {
        'cut': '\x18',      // Cmd+X (simulated)
        'copy': '\x03',     // Cmd+C (simulated)
        'paste': '\x16',    // Cmd+V (simulated)
        'select_all': '\x01', // Cmd+A (simulated)
        'undo': '\x1a',     // Cmd+Z (simulated)
        'redo': '\x19',     // Cmd+Shift+Z (simulated)
        'find': '\x06',     // Cmd+F (simulated)
        'save': '\x13',     // Cmd+S (simulated)
        'new': '\x0e',      // Cmd+N (simulated)
        'open': '\x0f',     // Cmd+O (simulated)
        'quit': '\x11'      // Cmd+Q (simulated)
      },
      'linux': {
        'cut': '\x18',      // Ctrl+X
        'copy': '\x03',     // Ctrl+C
        'paste': '\x16',    // Ctrl+V
        'select_all': '\x01', // Ctrl+A
        'undo': '\x1a',     // Ctrl+Z
        'redo': '\x19',     // Ctrl+Y
        'find': '\x06',     // Ctrl+F
        'save': '\x13',     // Ctrl+S
        'new': '\x0e',      // Ctrl+N
        'open': '\x0f',     // Ctrl+O
        'quit': '\x11'      // Ctrl+Q
      }
    };

    const platformShortcuts = editingShortcuts[platform] || editingShortcuts['linux'];
    for (const [action, sequence] of Object.entries(platformShortcuts)) {
      this.keyMappings.set(`edit_${action}`, sequence);
    }
  }

  getFunctionKeySequence(key: string): string {
    const sequence = this.keyMappings.get(key.toLowerCase());
    if (!sequence) {
      throw createTerminalError('INVALID_SHELL', `Unknown function key: ${key}`);
    }
    return sequence;
  }

  buildModifierCombination(modifiers: string[], key: string): string {
    // Basic modifier key codes
    let modifierCode = 0;
    if (modifiers.includes('shift')) modifierCode += 1;
    if (modifiers.includes('alt')) modifierCode += 2;
    if (modifiers.includes('ctrl')) modifierCode += 4;
    if (modifiers.includes('meta') || modifiers.includes('cmd')) modifierCode += 8;

    // For basic keys, use simple control sequences
    if (key.length === 1) {
      if (modifiers.includes('ctrl')) {
        const charCode = key.toLowerCase().charCodeAt(0) - 96;
        if (charCode > 0 && charCode < 27) {
          return String.fromCharCode(charCode);
        }
      }
      if (modifiers.includes('alt')) {
        return `\x1b${key}`;
      }
    }

    // For special keys, use extended sequences
    const baseSequences: Record<string, string> = {
      'left': '\x1b[D', 'right': '\x1b[C', 'up': '\x1b[A', 'down': '\x1b[B',
      'home': '\x1b[H', 'end': '\x1b[F'
    };

    const baseSequence = baseSequences[key.toLowerCase()];
    if (baseSequence && modifierCode > 0) {
      // Insert modifier code: \x1b[1;{modifier}letter
      return baseSequence.replace('[', `[1;${modifierCode + 1}`);
    }

    return key; // Fallback to plain key
  }

  buildKeySequence(sequence: Array<{type: string, value?: string, delay?: number}>): string {
    let result = '';
    const delays: number[] = [];

    for (const item of sequence) {
      switch (item.type) {
        case 'key':
          if (item.value) {
            const keySequence = this.keyMappings.get(item.value) || item.value;
            result += keySequence;
          }
          break;
        case 'text':
          if (item.value) {
            result += item.value;
          }
          break;
        case 'delay':
          if (item.delay) {
            delays.push(item.delay);
          }
          break;
        case 'modifier_down':
        case 'modifier_up':
          // These would be handled by the PTY layer in a real implementation
          break;
      }
    }

    return result;
  }

  simulateKeyHold(key: string, duration: number, repeatRate: number): string[] {
    const keySequence = this.keyMappings.get(key.toLowerCase()) || key;
    const interval = 1000 / repeatRate; // milliseconds per repeat
    const repeatCount = Math.floor(duration / interval);
    
    return Array(repeatCount).fill(keySequence);
  }

  processUnicodeInput(text: string, inputMethod: string = 'direct'): string {
    switch (inputMethod) {
      case 'direct':
        return text;
      case 'compose':
        // Simulate compose key sequences for special characters
        return this.simulateComposeSequence(text);
      case 'alt_codes':
        // Simulate Alt+numeric codes
        return this.simulateAltCodes(text);
      case 'ime':
        // Input Method Editor simulation would be more complex
        return text;
      default:
        return text;
    }
  }

  private simulateComposeSequence(text: string): string {
    // Basic compose sequences for common characters
    const composeMap: Record<string, string> = {
      'á': 'Compose+\'+a',
      'é': 'Compose+\'+e', 
      'í': 'Compose+\'+i',
      'ó': 'Compose+\'+o',
      'ú': 'Compose+\'+u',
      'ñ': 'Compose+~+n',
      '©': 'Compose+o+c',
      '®': 'Compose+o+r'
    };

    // For now, return the text directly
    // In a real implementation, this would generate the compose sequences
    return text;
  }

  private simulateAltCodes(text: string): string {
    // Alt+numeric code simulation
    // This would generate sequences like Alt+0233 for é
    return text;
  }

  recordSequence(name: string, events: KeyboardEvent[]): void {
    const sequence: InputSequence = {
      events,
      duration: events.length > 0 ? 
        events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime() : 0,
      name,
      description: `Recorded sequence: ${name}`
    };
    
    this.sequences.set(name, sequence);
  }

  playSequence(name: string): InputSequence | null {
    return this.sequences.get(name) || null;
  }

  listSequences(): string[] {
    return Array.from(this.sequences.keys());
  }
}