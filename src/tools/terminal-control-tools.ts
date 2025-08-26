import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TerminalManager } from '../terminal-manager.js';
import { ToolResult } from '../types.js';
import { handleError } from '../utils/error-utils.js';

const terminalManager = TerminalManager.getInstance();

// Send terminal bell notification
export const sendTerminalBell: Tool = {
  name: 'send_terminal_bell',
  description: 'Send a bell notification to the terminal',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      visual: {
        type: 'boolean',
        description: 'Use visual bell instead of audio (default: false)',
        default: false
      }
    },
    required: ['sessionId']
  }
};

export async function handleSendTerminalBell({ sessionId, visual = false }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    // Send bell character or visual bell sequence
    const bellSequence = visual ? '\u001b[?5h\u001b[?5l' : '\u0007';
    await terminalManager.sendInput(sessionId, bellSequence);

    return {
      success: true,
      data: {
        sessionId,
        bellType: visual ? 'visual' : 'audio',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to send terminal bell').message,
        details: { sessionId, visual }
      }
    };
  }
}

// Set cursor style
export const setCursorStyle: Tool = {
  name: 'set_cursor_style',
  description: 'Set the cursor style (shape and blinking)',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      style: {
        type: 'string',
        enum: ['block', 'underline', 'bar', 'block_blink', 'underline_blink', 'bar_blink'],
        description: 'Cursor style'
      }
    },
    required: ['sessionId', 'style']
  }
};

export async function handleSetCursorStyle({ sessionId, style }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    // Map cursor styles to ANSI escape sequences
    let cursorSequence = '';
    switch (style) {
      case 'block':
        cursorSequence = '\u001b[2 q';
        break;
      case 'block_blink':
        cursorSequence = '\u001b[1 q';
        break;
      case 'underline':
        cursorSequence = '\u001b[4 q';
        break;
      case 'underline_blink':
        cursorSequence = '\u001b[3 q';
        break;
      case 'bar':
        cursorSequence = '\u001b[6 q';
        break;
      case 'bar_blink':
        cursorSequence = '\u001b[5 q';
        break;
      default:
        cursorSequence = '\u001b[2 q'; // Default to block
    }

    await terminalManager.sendInput(sessionId, cursorSequence);

    return {
      success: true,
      data: {
        sessionId,
        style,
        sequence: cursorSequence,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to set cursor style').message,
        details: { sessionId, style }
      }
    };
  }
}

// Switch terminal mode
export const switchTerminalMode: Tool = {
  name: 'switch_terminal_mode',
  description: 'Switch terminal between raw and canonical modes',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      mode: {
        type: 'string',
        enum: ['raw', 'canonical', 'cbreak'],
        description: 'Terminal input mode'
      },
      echo: {
        type: 'boolean',
        description: 'Enable character echo (default: true for canonical)',
        default: true
      }
    },
    required: ['sessionId', 'mode']
  }
};

export async function handleSwitchTerminalMode({ sessionId, mode, echo }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    let command = '';
    
    // Use stty command to change terminal modes
    switch (mode) {
      case 'raw':
        command = echo !== false ? 'stty raw echo\n' : 'stty raw -echo\n';
        break;
      case 'canonical':
        command = echo !== false ? 'stty cooked echo\n' : 'stty cooked -echo\n';
        break;
      case 'cbreak':
        command = echo !== false ? 'stty cbreak echo\n' : 'stty cbreak -echo\n';
        break;
    }

    await terminalManager.sendInput(sessionId, command);

    return {
      success: true,
      data: {
        sessionId,
        mode,
        echo,
        command: command.trim(),
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to switch terminal mode').message,
        details: { sessionId, mode, echo }
      }
    };
  }
}