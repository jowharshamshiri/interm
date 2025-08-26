export interface TerminalSession {
  id: string;
  pid: number;
  cols: number;
  rows: number;
  shell: string;
  workingDirectory: string;
  createdAt: Date;
  lastActivity: Date;
  environment?: Record<string, string>;
  title?: string;
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  background?: string;
  fontSize?: number;
  fontFamily?: string;
  theme?: 'dark' | 'light';
}

export interface TerminalState {
  content: string;
  cursor: {
    x: number;
    y: number;
    visible: boolean;
  };
  dimensions: {
    cols: number;
    rows: number;
  };
  attributes: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    foregroundColor: string;
    backgroundColor: string;
  }[];
}

export type TerminalErrorType = 
  | 'SESSION_NOT_FOUND'
  | 'COMMAND_FAILED'
  | 'TIMEOUT_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVALID_SHELL'
  | 'SCREENSHOT_ERROR'
  | 'PARSING_ERROR'
  | 'RESOURCE_ERROR'
  | 'INVALID_PARAMETER'
  | 'UNKNOWN_ERROR';

export class TerminalAutomationError extends Error {
  constructor(
    public readonly type: TerminalErrorType,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TerminalAutomationError';
  }
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: TerminalErrorType;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ExecuteCommandOptions {
  timeout?: number;
  expectOutput?: boolean;
  workingDirectory?: string;
  environment?: Record<string, string>;
  input?: string;
  signal?: string;
}

export interface EnvironmentVariable {
  name: string;
  value: string;
  sessionId?: string;
  timestamp?: Date;
}

export interface ProcessSignal {
  name: string;
  number: number;
  description: string;
}

export interface JobControl {
  jobId: number;
  command: string;
  state: 'running' | 'suspended' | 'stopped' | 'background';
  pid: number;
}

export interface CommandResult {
  output: string;
  exitCode: number | null;
  duration: number;
  command: string;
  timestamp: Date;
}

// Enhanced interaction types
export interface MousePosition {
  x: number;
  y: number;
  button?: string;
  modifiers?: string[];
}

export interface KeyboardEvent {
  key: string;
  modifiers?: string[];
  type: 'keydown' | 'keyup' | 'keypress';
  timestamp: Date;
  repeat?: boolean;
}

export interface MouseEvent {
  type: 'move' | 'click' | 'scroll' | 'drag' | 'hover';
  x: number;
  y: number;
  button?: string;
  clickCount?: number;
  scrollDirection?: 'up' | 'down' | 'left' | 'right';
  scrollAmount?: number;
  modifiers?: string[];
  timestamp: Date;
}

export interface TextSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  content?: string;
  type?: 'character' | 'word' | 'line' | 'rectangle';
}

export interface ClipboardEntry {
  content: string;
  format: 'text' | 'html' | 'rtf';
  timestamp: Date;
  source?: 'copy' | 'cut' | 'api';
}

export interface InputSequence {
  events: Array<KeyboardEvent | MouseEvent>;
  duration: number;
  name?: string;
  description?: string;
}

export interface TouchEvent {
  type: 'touch' | 'release' | 'move' | 'cancel';
  x: number;
  y: number;
  pressure?: number;
  touchId: number;
  timestamp: Date;
}

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'long_press';
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  rotation?: number;
  velocity?: number;
  fingers: number;
  timestamp: Date;
}

export interface AccessibilityInfo {
  screenReaderActive: boolean;
  highContrastMode: boolean;
  voiceInputActive: boolean;
  eyeTrackingActive: boolean;
  magnificationLevel?: number;
}

// Enhanced session state with interaction history
export interface EnhancedTerminalState extends TerminalState {
  inputHistory: Array<KeyboardEvent | MouseEvent | TouchEvent>;
  clipboardHistory: ClipboardEntry[];
  selections: TextSelection[];
  mousePosition: MousePosition;
  accessibility: AccessibilityInfo;
}

export interface InteractionCapabilities {
  mouse: {
    enabled: boolean;
    buttons: string[];
    precisionScrolling: boolean;
    gestureRecognition: boolean;
  };
  keyboard: {
    enabled: boolean;
    functionKeys: boolean;
    modifierKeys: string[];
    internationalInput: boolean;
  };
  touch: {
    enabled: boolean;
    multiTouch: boolean;
    gestureSupport: boolean;
    hapticFeedback: boolean;
  };
  clipboard: {
    enabled: boolean;
    formats: string[];
    historySize: number;
  };
  accessibility: {
    screenReader: boolean;
    voiceInput: boolean;
    eyeTracking: boolean;
    magnification: boolean;
  };
}