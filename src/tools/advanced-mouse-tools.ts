import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TerminalManager } from '../terminal-manager.js';
import { AdvancedMouseManager } from '../advanced-mouse-manager.js';
import { ToolResult } from '../types.js';
import { handleError } from '../utils/error-utils.js';

const terminalManager = TerminalManager.getInstance();
const advancedMouseManager = AdvancedMouseManager.getInstance();

// Configure mouse acceleration
export const configureMouseAcceleration: Tool = {
  name: 'configure_mouse_acceleration',
  description: 'Configure dynamic mouse acceleration settings',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable mouse acceleration'
      },
      sensitivity: {
        type: 'number',
        description: 'Acceleration sensitivity (0.1 to 5.0)',
        default: 1.0
      },
      threshold: {
        type: 'number',
        description: 'Movement threshold to trigger acceleration',
        default: 5
      },
      maxSpeed: {
        type: 'number',
        description: 'Maximum acceleration multiplier',
        default: 3.0
      }
    },
    required: ['sessionId']
  }
};

export async function handleConfigureMouseAcceleration({ sessionId, enabled, sensitivity, threshold, maxSpeed }: any): Promise<ToolResult> {
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

    const settings: any = {};
    if (enabled !== undefined) settings.enabled = enabled;
    if (sensitivity !== undefined) settings.sensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
    if (threshold !== undefined) settings.threshold = Math.max(1, threshold);
    if (maxSpeed !== undefined) settings.maxSpeed = Math.max(1.0, Math.min(10.0, maxSpeed));

    await advancedMouseManager.configureAcceleration(sessionId, settings);

    return {
      success: true,
      data: {
        sessionId,
        settings,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to configure mouse acceleration').message,
        details: { sessionId }
      }
    };
  }
}

// Configure pressure sensitivity
export const configurePressureSensitivity: Tool = {
  name: 'configure_pressure_sensitivity',
  description: 'Configure pressure-sensitive click detection',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable pressure sensitivity'
      },
      threshold: {
        type: 'number',
        description: 'Pressure threshold for click detection (0.1 to 1.0)',
        default: 0.5
      },
      maxPressure: {
        type: 'number',
        description: 'Maximum pressure value for normalization',
        default: 1.0
      }
    },
    required: ['sessionId']
  }
};

export async function handleConfigurePressureSensitivity({ sessionId, enabled, threshold, maxPressure }: any): Promise<ToolResult> {
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

    const settings: any = {};
    if (enabled !== undefined) settings.enabled = enabled;
    if (threshold !== undefined) settings.threshold = Math.max(0.1, Math.min(1.0, threshold));
    if (maxPressure !== undefined) settings.maxPressure = Math.max(0.1, maxPressure);

    await advancedMouseManager.configurePressureSensitivity(sessionId, settings);

    return {
      success: true,
      data: {
        sessionId,
        settings,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to configure pressure sensitivity').message,
        details: { sessionId }
      }
    };
  }
}

// Track multi-click sequences
export const trackMultiClickSequence: Tool = {
  name: 'track_multi_click_sequence',
  description: 'Track and detect multi-click sequences beyond triple-click',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      x: {
        type: 'number',
        description: 'Click X coordinate'
      },
      y: {
        type: 'number',
        description: 'Click Y coordinate'
      },
      maxClicks: {
        type: 'number',
        description: 'Maximum click count to track (default: 10)',
        default: 10
      }
    },
    required: ['sessionId', 'x', 'y']
  }
};

export async function handleTrackMultiClickSequence({ sessionId, x, y, maxClicks = 10 }: any): Promise<ToolResult> {
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

    const clickCount = await advancedMouseManager.trackMultiClick(sessionId, x, y, maxClicks);
    
    // Determine click type description
    let clickType = 'single';
    if (clickCount === 2) clickType = 'double';
    else if (clickCount === 3) clickType = 'triple';
    else if (clickCount === 4) clickType = 'quadruple';
    else if (clickCount === 5) clickType = 'quintuple';
    else if (clickCount > 5) clickType = `${clickCount}-click`;

    return {
      success: true,
      data: {
        sessionId,
        x,
        y,
        clickCount,
        clickType,
        maxClicks,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to track multi-click sequence').message,
        details: { sessionId, x, y }
      }
    };
  }
}

// Configure focus-follow-mouse
export const configureFocusFollowMouse: Tool = {
  name: 'configure_focus_follow_mouse',
  description: 'Configure focus-follows-mouse behavior with defined zones',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable focus-follows-mouse'
      },
      delay: {
        type: 'number',
        description: 'Focus change delay in milliseconds (default: 100)',
        default: 100
      },
      zones: {
        type: 'array',
        description: 'Focus zones with session associations',
        items: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Zone X coordinate' },
            y: { type: 'number', description: 'Zone Y coordinate' },
            width: { type: 'number', description: 'Zone width' },
            height: { type: 'number', description: 'Zone height' },
            sessionId: { type: 'string', description: 'Target session ID for this zone' }
          },
          required: ['x', 'y', 'width', 'height', 'sessionId']
        }
      }
    },
    required: ['sessionId']
  }
};

export async function handleConfigureFocusFollowMouse({ sessionId, enabled, delay, zones }: any): Promise<ToolResult> {
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

    const settings: any = {};
    if (enabled !== undefined) settings.enabled = enabled;
    if (delay !== undefined) settings.delay = Math.max(0, Math.min(5000, delay));
    if (zones !== undefined) settings.zones = zones;

    await advancedMouseManager.configureFocusFollowMouse(sessionId, settings);

    return {
      success: true,
      data: {
        sessionId,
        settings,
        zoneCount: zones ? zones.length : 0,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to configure focus-follow-mouse').message,
        details: { sessionId }
      }
    };
  }
}

// Set mouse event filter
export const setMouseEventFilter: Tool = {
  name: 'set_mouse_event_filter',
  description: 'Configure mouse event filtering and debouncing',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      debounceMs: {
        type: 'number',
        description: 'Debounce time in milliseconds (0-1000)',
        default: 50
      }
    },
    required: ['sessionId', 'debounceMs']
  }
};

export async function handleSetMouseEventFilter({ sessionId, debounceMs }: any): Promise<ToolResult> {
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

    await advancedMouseManager.setEventFilter(sessionId, debounceMs);

    return {
      success: true,
      data: {
        sessionId,
        debounceMs,
        filterEnabled: debounceMs > 0,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to set mouse event filter').message,
        details: { sessionId, debounceMs }
      }
    };
  }
}

// Get advanced mouse status
export const getAdvancedMouseStatus: Tool = {
  name: 'get_advanced_mouse_status',
  description: 'Get current advanced mouse settings and status',
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

export async function handleGetAdvancedMouseStatus({ sessionId }: any): Promise<ToolResult> {
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

    const acceleration = advancedMouseManager.getAccelerationSettings(sessionId);
    const pressure = advancedMouseManager.getPressureSettings(sessionId);
    const focus = advancedMouseManager.getFocusSettings(sessionId);
    const filter = advancedMouseManager.getEventFilter(sessionId);
    const multiClick = advancedMouseManager.getMultiClickStatus(sessionId);

    return {
      success: true,
      data: {
        sessionId,
        acceleration,
        pressure,
        focus,
        filter,
        multiClick,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to get advanced mouse status').message,
        details: { sessionId }
      }
    };
  }
}