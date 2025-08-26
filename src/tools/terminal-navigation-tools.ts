import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TerminalManager } from '../terminal-manager.js';
import { TerminalNavigationManager } from '../terminal-navigation-manager.js';
import { ToolResult } from '../types.js';
import { handleError } from '../utils/error-utils.js';

const terminalManager = TerminalManager.getInstance();
const navigationManager = TerminalNavigationManager.getInstance();

// Dynamic terminal resizing with aspect ratio control
export const dynamicTerminalResize: Tool = {
  name: 'dynamic_terminal_resize',
  description: 'Dynamically resize terminal with optional aspect ratio maintenance',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      cols: {
        type: 'number',
        description: 'New width in columns'
      },
      rows: {
        type: 'number',
        description: 'New height in rows'
      },
      maintainAspectRatio: {
        type: 'boolean',
        description: 'Maintain current aspect ratio when resizing',
        default: false
      }
    },
    required: ['sessionId', 'cols', 'rows']
  }
};

export async function handleDynamicTerminalResize({ sessionId, cols, rows, maintainAspectRatio = false }: any): Promise<ToolResult> {
  try {
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

    await navigationManager.dynamicResize(sessionId, cols, rows, maintainAspectRatio);

    return {
      success: true,
      data: {
        sessionId,
        newCols: cols,
        newRows: rows,
        maintainAspectRatio,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to dynamically resize terminal').message,
        details: { sessionId, cols, rows }
      }
    };
  }
}

// Toggle fullscreen mode
export const toggleFullscreenMode: Tool = {
  name: 'toggle_fullscreen_mode',
  description: 'Toggle terminal fullscreen mode on/off',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enable: {
        type: 'boolean',
        description: 'Force enable/disable fullscreen (optional)'
      }
    },
    required: ['sessionId']
  }
};

export async function handleToggleFullscreenMode({ sessionId, enable }: any): Promise<ToolResult> {
  try {
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

    const isFullscreen = await navigationManager.toggleFullscreen(sessionId, enable);

    return {
      success: true,
      data: {
        sessionId,
        fullscreen: isFullscreen,
        action: isFullscreen ? 'enabled' : 'disabled',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to toggle fullscreen mode').message,
        details: { sessionId, enable }
      }
    };
  }
}

// Create terminal tab
export const createTerminalTab: Tool = {
  name: 'create_terminal_tab',
  description: 'Create a new terminal tab with optional session',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Tab title'
      },
      sessionId: {
        type: 'string',
        description: 'Existing session ID to use (optional)'
      }
    },
    required: ['title']
  }
};

export async function handleCreateTerminalTab({ title, sessionId }: any): Promise<ToolResult> {
  try {
    if (sessionId) {
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
    }

    const tabId = await navigationManager.createTab(title, sessionId);

    return {
      success: true,
      data: {
        tabId,
        title,
        sessionId: sessionId || 'new_session_created',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to create terminal tab').message,
        details: { title, sessionId }
      }
    };
  }
}

// Switch terminal tab
export const switchTerminalTab: Tool = {
  name: 'switch_terminal_tab',
  description: 'Switch to a specific terminal tab',
  inputSchema: {
    type: 'object',
    properties: {
      tabId: {
        type: 'string',
        description: 'Tab ID to switch to'
      }
    },
    required: ['tabId']
  }
};

export async function handleSwitchTerminalTab({ tabId }: any): Promise<ToolResult> {
  try {
    await navigationManager.switchTab(tabId);

    return {
      success: true,
      data: {
        tabId,
        message: 'Tab switched successfully',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to switch terminal tab').message,
        details: { tabId }
      }
    };
  }
}

// Split terminal pane
export const splitTerminalPane: Tool = {
  name: 'split_terminal_pane',
  description: 'Split an existing terminal pane horizontally or vertically',
  inputSchema: {
    type: 'object',
    properties: {
      paneId: {
        type: 'string',
        description: 'Pane ID to split'
      },
      direction: {
        type: 'string',
        enum: ['horizontal', 'vertical'],
        description: 'Split direction'
      },
      sessionId: {
        type: 'string',
        description: 'Session ID for new pane (optional - creates new session if not provided)'
      }
    },
    required: ['paneId', 'direction']
  }
};

export async function handleSplitTerminalPane({ paneId, direction, sessionId }: any): Promise<ToolResult> {
  try {
    if (sessionId) {
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
    }

    const newPaneId = await navigationManager.splitPane(paneId, direction, sessionId);

    return {
      success: true,
      data: {
        originalPaneId: paneId,
        newPaneId,
        direction,
        sessionId: sessionId || 'new_session_created',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to split terminal pane').message,
        details: { paneId, direction, sessionId }
      }
    };
  }
}

// Focus terminal pane
export const focusTerminalPane: Tool = {
  name: 'focus_terminal_pane',
  description: 'Set focus to a specific terminal pane',
  inputSchema: {
    type: 'object',
    properties: {
      paneId: {
        type: 'string',
        description: 'Pane ID to focus'
      }
    },
    required: ['paneId']
  }
};

export async function handleFocusTerminalPane({ paneId }: any): Promise<ToolResult> {
  try {
    await navigationManager.focusPane(paneId);

    return {
      success: true,
      data: {
        paneId,
        message: 'Pane focused successfully',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to focus terminal pane').message,
        details: { paneId }
      }
    };
  }
}

// Set zoom level
export const setZoomLevel: Tool = {
  name: 'set_zoom_level',
  description: 'Set zoom level for terminal text scaling',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      zoomLevel: {
        type: 'number',
        description: 'Zoom level (0.5 to 3.0, where 1.0 is normal size)'
      }
    },
    required: ['sessionId', 'zoomLevel']
  }
};

export async function handleSetZoomLevel({ sessionId, zoomLevel }: any): Promise<ToolResult> {
  try {
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

    await navigationManager.setZoomLevel(sessionId, zoomLevel);

    return {
      success: true,
      data: {
        sessionId,
        zoomLevel: Math.max(0.5, Math.min(3.0, zoomLevel)),
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to set zoom level').message,
        details: { sessionId, zoomLevel }
      }
    };
  }
}

// Scroll viewport
export const scrollViewport: Tool = {
  name: 'scroll_viewport',
  description: 'Scroll terminal viewport in specified direction',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      direction: {
        type: 'string',
        enum: ['up', 'down', 'left', 'right', 'home', 'end'],
        description: 'Scroll direction'
      },
      amount: {
        type: 'number',
        description: 'Amount to scroll (default: 1)',
        default: 1
      }
    },
    required: ['sessionId', 'direction']
  }
};

export async function handleScrollViewport({ sessionId, direction, amount = 1 }: any): Promise<ToolResult> {
  try {
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

    await navigationManager.scrollViewport(sessionId, direction, amount);

    return {
      success: true,
      data: {
        sessionId,
        direction,
        amount,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to scroll viewport').message,
        details: { sessionId, direction, amount }
      }
    };
  }
}

// Set terminal opacity
export const setTerminalOpacity: Tool = {
  name: 'set_terminal_opacity',
  description: 'Set transparency/opacity level for terminal',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      opacity: {
        type: 'number',
        description: 'Opacity level (0.1 to 1.0, where 1.0 is fully opaque)'
      }
    },
    required: ['sessionId', 'opacity']
  }
};

export async function handleSetTerminalOpacity({ sessionId, opacity }: any): Promise<ToolResult> {
  try {
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

    await navigationManager.setOpacity(sessionId, opacity);

    return {
      success: true,
      data: {
        sessionId,
        opacity: Math.max(0.1, Math.min(1.0, opacity)),
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to set terminal opacity').message,
        details: { sessionId, opacity }
      }
    };
  }
}

// Get navigation status
export const getNavigationStatus: Tool = {
  name: 'get_navigation_status',
  description: 'Get current navigation status including tabs, panes, and viewport info',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID (optional - returns all if not specified)'
      }
    }
  }
};

export async function handleGetNavigationStatus({ sessionId }: any): Promise<ToolResult> {
  try {
    if (sessionId) {
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
    }

    const activeTab = navigationManager.getActiveTab();
    const allTabs = navigationManager.getAllTabs();
    const viewport = sessionId ? navigationManager.getViewport(sessionId) : null;
    const zoomLevel = sessionId ? navigationManager.getZoomLevel(sessionId) : null;
    const isFullscreen = sessionId ? navigationManager.isFullscreen(sessionId) : null;

    return {
      success: true,
      data: {
        activeTab,
        allTabs,
        tabCount: allTabs.length,
        viewport,
        zoomLevel,
        isFullscreen,
        sessionId: sessionId || 'all_sessions',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to get navigation status').message,
        details: { sessionId }
      }
    };
  }
}