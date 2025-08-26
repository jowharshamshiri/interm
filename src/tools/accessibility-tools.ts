import { CallToolRequest, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AccessibilityManager } from '../accessibility-manager.js';
import { TerminalManager } from '../terminal-manager.js';
import { ToolResult } from '../types.js';
import { createTerminalError, handleError } from '../utils/error-utils.js';

const accessibilityManager = AccessibilityManager.getInstance();
const terminalManager = TerminalManager.getInstance();

/**
 * Initialize accessibility features
 */
export const initializeAccessibility: Tool = {
  name: 'initialize_accessibility',
  description: 'Initialize and detect system accessibility features',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      }
    },
    required: ['sessionId']
  }
};

export async function handleInitializeAccessibility(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const accessibilityInfo = await accessibilityManager.initialize();

    return {
      success: true,
      data: {
        accessibilityInfo,
        message: 'Accessibility features initialized successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to initialize accessibility')
    };
  }
}

/**
 * Announce content to screen reader
 */
export const announceToScreenReader: Tool = {
  name: 'announce_to_screen_reader',
  description: 'Announce content to screen readers with speech synthesis',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      content: {
        type: 'string',
        description: 'Content to announce'
      },
      priority: {
        type: 'string',
        enum: ['polite', 'assertive'],
        description: 'Announcement priority level',
        default: 'polite'
      }
    },
    required: ['sessionId', 'content']
  }
};

export async function handleAnnounceToScreenReader(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, content, priority = 'polite' } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    if (!content || typeof content !== 'string') {
      throw createTerminalError('PARSING_ERROR', 'Content must be a non-empty string');
    }

    accessibilityManager.announceToScreenReader(content, priority);

    return {
      success: true,
      data: {
        content,
        priority,
        message: 'Content announced to screen reader'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to announce to screen reader')
    };
  }
}

/**
 * Apply high contrast filtering to terminal output
 */
export const applyHighContrast: Tool = {
  name: 'apply_high_contrast',
  description: 'Apply high contrast color filtering to terminal output',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable high contrast mode',
        default: true
      }
    },
    required: ['sessionId']
  }
};

export async function handleApplyHighContrast(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, enabled = true } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // Update accessibility settings
    const currentSettings = accessibilityManager.getSettings();
    accessibilityManager.updateSettings({
      ...currentSettings,
      highContrastEnabled: enabled
    });

    // Get current terminal state and apply filtering
    const terminalState = await terminalManager.getTerminalState(sessionId);
    const filteredState = accessibilityManager.applyHighContrastFiltering(terminalState);

    return {
      success: true,
      data: {
        enabled,
        filteredState,
        message: `High contrast mode ${enabled ? 'enabled' : 'disabled'}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to apply high contrast')
    };
  }
}

/**
 * Configure accessibility settings
 */
export const configureAccessibility: Tool = {
  name: 'configure_accessibility',
  description: 'Configure accessibility features and settings',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      settings: {
        type: 'object',
        properties: {
          screenReaderEnabled: {
            type: 'boolean',
            description: 'Enable screen reader support'
          },
          highContrastEnabled: {
            type: 'boolean',
            description: 'Enable high contrast mode'
          },
          magnificationLevel: {
            type: 'number',
            minimum: 1.0,
            maximum: 5.0,
            description: 'Magnification level (1.0-5.0)'
          },
          voiceInputEnabled: {
            type: 'boolean',
            description: 'Enable voice input recognition'
          },
          keyboardNavigationOnly: {
            type: 'boolean',
            description: 'Enable keyboard-only navigation'
          },
          announceChanges: {
            type: 'boolean',
            description: 'Announce content changes'
          },
          speechRate: {
            type: 'number',
            minimum: 0.5,
            maximum: 3.0,
            description: 'Speech synthesis rate (0.5-3.0)'
          },
          speechVolume: {
            type: 'number',
            minimum: 0.1,
            maximum: 1.0,
            description: 'Speech synthesis volume (0.1-1.0)'
          }
        }
      }
    },
    required: ['sessionId']
  }
};

export async function handleConfigureAccessibility(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, settings = {} } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // Update settings
    accessibilityManager.updateSettings(settings);
    const updatedSettings = accessibilityManager.getSettings();

    return {
      success: true,
      data: {
        settings: updatedSettings,
        message: 'Accessibility settings updated successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to configure accessibility')
    };
  }
}

/**
 * Handle focus change for screen reader navigation
 */
export const handleFocusChange: Tool = {
  name: 'handle_focus_change',
  description: 'Handle focus changes for screen reader navigation',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      newFocus: {
        type: 'string',
        description: 'New focus target (e.g., "terminal-input", "menu-item-1")'
      },
      content: {
        type: 'string',
        description: 'Optional content description for the focused element'
      }
    },
    required: ['sessionId', 'newFocus']
  }
};

export async function handleHandleFocusChange(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, newFocus, content } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    if (!newFocus || typeof newFocus !== 'string') {
      throw createTerminalError('PARSING_ERROR', 'New focus target must be a non-empty string');
    }

    accessibilityManager.handleFocusChange(newFocus, content);

    return {
      success: true,
      data: {
        newFocus,
        content,
        message: 'Focus change handled successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to handle focus change')
    };
  }
}

/**
 * Get accessibility status and report
 */
export const getAccessibilityStatus: Tool = {
  name: 'get_accessibility_status',
  description: 'Get current accessibility status, settings, and usage report',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      }
    },
    required: ['sessionId']
  }
};

export async function handleGetAccessibilityStatus(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const report = accessibilityManager.generateAccessibilityReport();

    return {
      success: true,
      data: {
        ...report,
        platform: process.platform
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to get accessibility status')
    };
  }
}

/**
 * Get keyboard navigation hints
 */
export const getKeyboardNavigationHints: Tool = {
  name: 'get_keyboard_navigation_hints',
  description: 'Get keyboard navigation hints for accessibility users',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      }
    },
    required: ['sessionId']
  }
};

export async function handleGetKeyboardNavigationHints(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const hints = accessibilityManager.getKeyboardNavigationHints();

    return {
      success: true,
      data: {
        hints,
        count: hints.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to get keyboard navigation hints')
    };
  }
}

/**
 * Get screen reader event history
 */
export const getScreenReaderEvents: Tool = {
  name: 'get_screen_reader_events',
  description: 'Get recent screen reader event history',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of events to return',
        default: 100,
        minimum: 1,
        maximum: 1000
      }
    },
    required: ['sessionId']
  }
};

export async function handleGetScreenReaderEvents(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, limit = 100 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const events = accessibilityManager.getScreenReaderEvents(limit);

    return {
      success: true,
      data: {
        events,
        count: events.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to get screen reader events')
    };
  }
}

// Export all accessibility tools
export const accessibilityTools = [
  initializeAccessibility,
  announceToScreenReader,
  applyHighContrast,
  configureAccessibility,
  handleFocusChange,
  getAccessibilityStatus,
  getKeyboardNavigationHints,
  getScreenReaderEvents
];

export const accessibilityToolHandlers = {
  initialize_accessibility: handleInitializeAccessibility,
  announce_to_screen_reader: handleAnnounceToScreenReader,
  apply_high_contrast: handleApplyHighContrast,
  configure_accessibility: handleConfigureAccessibility,
  handle_focus_change: handleHandleFocusChange,
  get_accessibility_status: handleGetAccessibilityStatus,
  get_keyboard_navigation_hints: handleGetKeyboardNavigationHints,
  get_screen_reader_events: handleGetScreenReaderEvents
};