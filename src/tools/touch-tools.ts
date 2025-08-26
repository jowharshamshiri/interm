import { CallToolRequest, Tool } from '@modelcontextprotocol/sdk/types.js';
import { TouchManager } from '../touch-manager.js';
import { TerminalManager } from '../terminal-manager.js';
import { TouchEvent, GestureEvent, ToolResult } from '../types.js';
import { createTerminalError, handleError } from '../utils/error-utils.js';

const touchManager = TouchManager.getInstance();
const terminalManager = TerminalManager.getInstance();

/**
 * Process touch input event
 */
export const touchInput: Tool = {
  name: 'touch_input',
  description: 'Process touch input event (touch, move, release, cancel)',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      type: {
        type: 'string',
        enum: ['touch', 'move', 'release', 'cancel'],
        description: 'Type of touch event'
      },
      x: {
        type: 'number',
        description: 'Touch X coordinate'
      },
      y: {
        type: 'number',
        description: 'Touch Y coordinate'
      },
      touchId: {
        type: 'number',
        description: 'Unique touch identifier',
        default: 1
      },
      pressure: {
        type: 'number',
        description: 'Touch pressure (0.0-1.0)',
        default: 1.0,
        minimum: 0.0,
        maximum: 1.0
      }
    },
    required: ['sessionId', 'type', 'x', 'y']
  }
};

export async function handleTouchInput(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, type, x, y, touchId = 1, pressure = 1.0 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // Validate coordinates
    if (x < 0 || y < 0) {
      throw createTerminalError('PARSING_ERROR', 'Touch coordinates must be non-negative');
    }

    // Create touch event
    const touchEvent: TouchEvent = {
      type,
      x,
      y,
      pressure,
      touchId,
      timestamp: new Date()
    };

    // Process touch event and detect gestures
    const gesture = touchManager.processTouchEvent(touchEvent);

    return {
      success: true,
      data: {
        touchEvent,
        gesture,
        activeTouches: touchManager.getActiveTouches().length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Detect gesture from touch sequence
 */
export const detectGesture: Tool = {
  name: 'detect_gesture',
  description: 'Analyze touch sequence to detect gestures (swipe, tap, long press, pinch)',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      touchSequence: {
        type: 'array',
        description: 'Array of touch events to analyze',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['touch', 'move', 'release', 'cancel'] },
            x: { type: 'number' },
            y: { type: 'number' },
            touchId: { type: 'number' },
            pressure: { type: 'number' },
            timestamp: { type: 'string' }
          },
          required: ['type', 'x', 'y', 'touchId']
        }
      }
    },
    required: ['sessionId', 'touchSequence']
  }
};

export async function handleDetectGesture(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, touchSequence } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const detectedGestures: GestureEvent[] = [];
    
    // Process each touch event in sequence
    for (const touchData of touchSequence) {
      const touchEvent: TouchEvent = {
        type: touchData.type,
        x: touchData.x,
        y: touchData.y,
        touchId: touchData.touchId,
        pressure: touchData.pressure || 1.0,
        timestamp: touchData.timestamp ? new Date(touchData.timestamp) : new Date()
      };

      const gesture = touchManager.processTouchEvent(touchEvent);
      if (gesture) {
        detectedGestures.push(gesture);
      }
    }

    return {
      success: true,
      data: {
        gestures: detectedGestures,
        totalEvents: touchSequence.length,
        gesturesDetected: detectedGestures.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Get touch capabilities
 */
export const getTouchCapabilities: Tool = {
  name: 'get_touch_capabilities',
  description: 'Get current touch input capabilities and settings',
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

export async function handleGetTouchCapabilities(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const capabilities = touchManager.getCapabilities();

    return {
      success: true,
      data: {
        capabilities,
        activeTouches: touchManager.getActiveTouches().length,
        platform: process.platform
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Get active touches
 */
export const getActiveTouches: Tool = {
  name: 'get_active_touches',
  description: 'Get currently active touch points',
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

export async function handleGetActiveTouches(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const activeTouches = touchManager.getActiveTouches();

    return {
      success: true,
      data: {
        activeTouches,
        count: activeTouches.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Get touch history
 */
export const getTouchHistory: Tool = {
  name: 'get_touch_history',
  description: 'Get recent touch event history',
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

export async function handleGetTouchHistory(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, limit = 100 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const touchHistory = touchManager.getTouchHistory(limit);

    return {
      success: true,
      data: {
        touchHistory,
        count: touchHistory.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Get gesture history
 */
export const getGestureHistory: Tool = {
  name: 'get_gesture_history',
  description: 'Get recent gesture event history',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of gestures to return',
        default: 50,
        minimum: 1,
        maximum: 500
      }
    },
    required: ['sessionId']
  }
};

export async function handleGetGestureHistory(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, limit = 50 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const gestureHistory = touchManager.getGestureHistory(limit);

    return {
      success: true,
      data: {
        gestureHistory,
        count: gestureHistory.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Configure touch gesture thresholds
 */
export const configureTouchGestures: Tool = {
  name: 'configure_touch_gestures',
  description: 'Configure gesture detection thresholds and parameters',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      swipeMinDistance: {
        type: 'number',
        description: 'Minimum distance for swipe detection (pixels)',
        minimum: 10,
        maximum: 200
      },
      swipeMaxTime: {
        type: 'number',
        description: 'Maximum time for swipe detection (ms)',
        minimum: 100,
        maximum: 2000
      },
      tapMaxDuration: {
        type: 'number',
        description: 'Maximum duration for tap detection (ms)',
        minimum: 50,
        maximum: 1000
      },
      longPressMinDuration: {
        type: 'number',
        description: 'Minimum duration for long press detection (ms)',
        minimum: 300,
        maximum: 3000
      },
      pinchMinDistance: {
        type: 'number',
        description: 'Minimum distance change for pinch detection (pixels)',
        minimum: 5,
        maximum: 100
      }
    },
    required: ['sessionId']
  }
};

export async function handleConfigureTouchGestures(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, ...thresholds } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // Filter out undefined values
    const filteredThresholds = Object.fromEntries(
      Object.entries(thresholds).filter(([, value]) => value !== undefined)
    );

    touchManager.configureThresholds(filteredThresholds);

    return {
      success: true,
      data: {
        message: 'Touch gesture thresholds configured successfully',
        updatedParameters: filteredThresholds
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

/**
 * Clear touch state
 */
export const clearTouchState: Tool = {
  name: 'clear_touch_state',
  description: 'Clear all touch state and history',
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

export async function handleClearTouchState(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    touchManager.clearState();

    return {
      success: true,
      data: {
        message: 'Touch state cleared successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to process touch input')
    };
  }
}

// Export all touch tools
export const touchTools = [
  touchInput,
  detectGesture,
  getTouchCapabilities,
  getActiveTouches,
  getTouchHistory,
  getGestureHistory,
  configureTouchGestures,
  clearTouchState
];

export const touchToolHandlers = {
  touch_input: handleTouchInput,
  detect_gesture: handleDetectGesture,
  get_touch_capabilities: handleGetTouchCapabilities,
  get_active_touches: handleGetActiveTouches,
  get_touch_history: handleGetTouchHistory,
  get_gesture_history: handleGetGestureHistory,
  configure_touch_gestures: handleConfigureTouchGestures,
  clear_touch_state: handleClearTouchState
};