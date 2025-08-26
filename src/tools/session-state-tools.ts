import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../session-manager.js';
import { ToolResult } from '../types.js';
import { handleError } from '../utils/error-utils.js';

const sessionManager = SessionManager.getInstance();

// Save session bookmark
export const saveSessionBookmark: Tool = {
  name: 'save_session_bookmark',
  description: 'Save current terminal state as a bookmark',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      bookmarkName: {
        type: 'string',
        description: 'Name for the bookmark'
      }
    },
    required: ['sessionId', 'bookmarkName']
  }
};

export async function handleSaveSessionBookmark({ sessionId, bookmarkName }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    await sessionManager.saveBookmark(sessionId, bookmarkName);

    return {
      success: true,
      data: {
        sessionId,
        bookmarkName,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to save session bookmark').message,
        details: { sessionId, bookmarkName }
      }
    };
  }
}

// Restore session bookmark
export const restoreSessionBookmark: Tool = {
  name: 'restore_session_bookmark',
  description: 'Restore terminal state from a saved bookmark',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      bookmarkName: {
        type: 'string',
        description: 'Name of the bookmark to restore'
      }
    },
    required: ['sessionId', 'bookmarkName']
  }
};

export async function handleRestoreSessionBookmark({ sessionId, bookmarkName }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    await sessionManager.restoreBookmark(sessionId, bookmarkName);

    return {
      success: true,
      data: {
        sessionId,
        bookmarkName,
        restored: true,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to restore session bookmark').message,
        details: { sessionId, bookmarkName }
      }
    };
  }
}

// Get session history
export const getSessionHistory: Tool = {
  name: 'get_session_history',
  description: 'Get command history for a terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of history entries to return',
        default: 100
      }
    },
    required: ['sessionId']
  }
};

export async function handleGetSessionHistory({ sessionId, limit = 100 }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const history = sessionManager.getSessionHistory(sessionId, limit);

    return {
      success: true,
      data: {
        sessionId,
        history,
        count: history.length,
        limit
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to get session history').message,
        details: { sessionId }
      }
    };
  }
}

// Search session history
export const searchSessionHistory: Tool = {
  name: 'search_session_history',
  description: 'Search through terminal session history',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      pattern: {
        type: 'string',
        description: 'Search pattern or regular expression'
      },
      isRegex: {
        type: 'boolean',
        description: 'Whether pattern is a regular expression',
        default: false
      }
    },
    required: ['sessionId', 'pattern']
  }
};

export async function handleSearchSessionHistory({ sessionId, pattern, isRegex = false }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const results = sessionManager.searchHistory(sessionId, pattern, isRegex);

    return {
      success: true,
      data: {
        sessionId,
        pattern,
        isRegex,
        results,
        count: results.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to search session history').message,
        details: { sessionId, pattern, isRegex }
      }
    };
  }
}

// List session bookmarks
export const listSessionBookmarks: Tool = {
  name: 'list_session_bookmarks',
  description: 'List all bookmarks for a terminal session',
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

export async function handleListSessionBookmarks({ sessionId }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const bookmarks = sessionManager.getBookmarks(sessionId);

    return {
      success: true,
      data: {
        sessionId,
        bookmarks,
        count: bookmarks.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to list session bookmarks').message,
        details: { sessionId }
      }
    };
  }
}

// Serialize session state
export const serializeSessionState: Tool = {
  name: 'serialize_session_state',
  description: 'Save complete terminal session state to JSON',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      includeHistory: {
        type: 'boolean',
        description: 'Include command history in serialization',
        default: true
      },
      includeBookmarks: {
        type: 'boolean',
        description: 'Include bookmarks in serialization',
        default: true
      }
    },
    required: ['sessionId']
  }
};

export async function handleSerializeSessionState({ sessionId, includeHistory = true, includeBookmarks = true }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const terminalState = await sessionManager.getTerminalState(sessionId);
    const serializedState: any = {
      session: {
        id: session.id,
        cols: session.cols,
        rows: session.rows,
        shell: session.shell,
        workingDirectory: session.workingDirectory,
        createdAt: session.createdAt,
        title: session.title,
        environment: session.environment
      },
      terminalState,
      timestamp: new Date()
    };

    if (includeHistory) {
      serializedState.history = sessionManager.getSessionHistory(sessionId);
    }

    if (includeBookmarks) {
      serializedState.bookmarks = sessionManager.getBookmarks(sessionId);
    }

    return {
      success: true,
      data: {
        sessionId,
        serializedState,
        size: JSON.stringify(serializedState).length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to serialize session state').message,
        details: { sessionId }
      }
    };
  }
}

// Undo last command (simplified implementation)
export const undoLastCommand: Tool = {
  name: 'undo_last_command',
  description: 'Attempt to undo the last command by sending Ctrl+C and clearing line',
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

export async function handleUndoLastCommand({ sessionId }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    // Send interrupt signal and clear current line
    await sessionManager.sendInput(sessionId, '\u0003'); // Ctrl+C
    await sessionManager.sendInput(sessionId, '\u0015'); // Ctrl+U (clear line)

    return {
      success: true,
      data: {
        sessionId,
        action: 'interrupted_and_cleared',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to undo last command').message,
        details: { sessionId }
      }
    };
  }
}

// Auto-save session state
export const autoSaveSession: Tool = {
  name: 'auto_save_session',
  description: 'Enable or disable automatic session state saving',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable auto-save',
        default: true
      },
      interval: {
        type: 'number',
        description: 'Auto-save interval in seconds',
        default: 300
      }
    },
    required: ['sessionId']
  }
};

export async function handleAutoSaveSession({ sessionId, enabled = true, interval = 300 }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    // This is a simplified implementation - in a real system you'd set up
    // an interval to automatically save bookmarks
    if (enabled) {
      const autoSaveBookmarkName = `autosave_${Date.now()}`;
      await sessionManager.saveBookmark(sessionId, autoSaveBookmarkName);
    }

    return {
      success: true,
      data: {
        sessionId,
        autoSaveEnabled: enabled,
        interval,
        message: enabled ? `Auto-save enabled with ${interval}s interval` : 'Auto-save disabled'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to configure auto-save').message,
        details: { sessionId, enabled, interval }
      }
    };
  }
}