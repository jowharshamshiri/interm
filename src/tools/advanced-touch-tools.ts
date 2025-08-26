import { CallToolRequest, Tool } from '@modelcontextprotocol/sdk/types.js';
import { TouchManager } from '../touch-manager.js';
import { TerminalManager } from '../terminal-manager.js';
import { ToolResult } from '../types.js';
import { createTerminalError, handleError } from '../utils/error-utils.js';

const touchManager = TouchManager.getInstance();
const terminalManager = TerminalManager.getInstance();

/**
 * Simulate multi-touch gesture
 */
export const simulateMultiTouch: Tool = {
  name: 'simulate_multi_touch',
  description: 'Simulate multi-finger touch gestures for testing',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      touchPoints: {
        type: 'array',
        description: 'Array of touch points with coordinates and pressure',
        items: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate' },
            y: { type: 'number', description: 'Y coordinate' },
            pressure: { type: 'number', description: 'Touch pressure (0.0-1.0)', default: 1.0 }
          },
          required: ['x', 'y']
        },
        minItems: 1,
        maxItems: 10
      }
    },
    required: ['sessionId', 'touchPoints']
  }
};

export async function handleSimulateMultiTouch(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, touchPoints } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // Validate touch points
    if (!Array.isArray(touchPoints) || touchPoints.length === 0) {
      throw createTerminalError('PARSING_ERROR', 'Touch points array is required and must not be empty');
    }

    const events = touchManager.simulateMultiTouch(touchPoints);

    return {
      success: true,
      data: {
        touchEvents: events,
        fingersSimulated: touchPoints.length,
        activeTouches: touchManager.getActiveTouches().length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to simulate multi-touch')
    };
  }
}

/**
 * Detect touch drag operation
 */
export const detectTouchDrag: Tool = {
  name: 'detect_touch_drag',
  description: 'Detect if touch movement constitutes a drag operation',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      startX: {
        type: 'number',
        description: 'Starting X coordinate'
      },
      startY: {
        type: 'number',
        description: 'Starting Y coordinate'
      },
      endX: {
        type: 'number',
        description: 'Ending X coordinate'
      },
      endY: {
        type: 'number',
        description: 'Ending Y coordinate'
      },
      pressure: {
        type: 'number',
        description: 'Touch pressure',
        default: 1.0
      }
    },
    required: ['sessionId', 'startX', 'startY', 'endX', 'endY']
  }
};

export async function handleDetectTouchDrag(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, startX, startY, endX, endY, pressure = 1.0 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const startPoint = {
      id: 1,
      x: startX,
      y: startY,
      pressure,
      timestamp: new Date(),
      isActive: true
    };

    const endPoint = {
      id: 1,
      x: endX,
      y: endY,
      pressure,
      timestamp: new Date(),
      isActive: true
    };

    const isDrag = touchManager.detectTouchDrag(startPoint, endPoint);
    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

    return {
      success: true,
      data: {
        isDrag,
        distance,
        threshold: 15,
        startPosition: { x: startX, y: startY },
        endPosition: { x: endX, y: endY }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to detect touch drag')
    };
  }
}

/**
 * Get haptic feedback capabilities
 */
export const getHapticCapabilities: Tool = {
  name: 'get_haptic_capabilities',
  description: 'Get available haptic feedback capabilities for the platform',
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

export async function handleGetHapticCapabilities(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const hapticCapabilities = touchManager.getHapticCapabilities();

    return {
      success: true,
      data: {
        hapticCapabilities,
        platform: process.platform,
        supported: hapticCapabilities.available
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to get haptic capabilities')
    };
  }
}

/**
 * Enhanced gesture recognition with multiple gesture types
 */
export const recognizeComplexGesture: Tool = {
  name: 'recognize_complex_gesture',
  description: 'Analyze complex multi-touch gesture patterns',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      gestureData: {
        type: 'object',
        properties: {
          touchSequence: {
            type: 'array',
            description: 'Sequence of touch events',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['touch', 'move', 'release'] },
                x: { type: 'number' },
                y: { type: 'number' },
                touchId: { type: 'number' },
                pressure: { type: 'number' },
                timestamp: { type: 'string' }
              },
              required: ['type', 'x', 'y', 'touchId']
            }
          },
          minConfidence: {
            type: 'number',
            description: 'Minimum confidence threshold for gesture recognition',
            default: 0.7,
            minimum: 0.1,
            maximum: 1.0
          }
        },
        required: ['touchSequence']
      }
    },
    required: ['sessionId', 'gestureData']
  }
};

export async function handleRecognizeComplexGesture(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, gestureData } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const { touchSequence, minConfidence = 0.7 } = gestureData;
    
    if (!Array.isArray(touchSequence) || touchSequence.length === 0) {
      throw createTerminalError('PARSING_ERROR', 'Touch sequence is required and must not be empty');
    }

    const recognizedGestures = [];
    const gestureConfidence = new Map<string, number>();

    // Process touch sequence and analyze patterns
    for (const touchData of touchSequence) {
      const touchEvent = {
        type: touchData.type,
        x: touchData.x,
        y: touchData.y,
        touchId: touchData.touchId,
        pressure: touchData.pressure || 1.0,
        timestamp: touchData.timestamp ? new Date(touchData.timestamp) : new Date()
      };

      const gesture = touchManager.processTouchEvent(touchEvent);
      if (gesture) {
        recognizedGestures.push(gesture);
        
        // Calculate confidence based on gesture consistency
        const confidenceKey = `${gesture.type}_${gesture.fingers}`;
        const currentConfidence = gestureConfidence.get(confidenceKey) || 0;
        gestureConfidence.set(confidenceKey, Math.min(1.0, currentConfidence + 0.2));
      }
    }

    // Filter gestures by confidence threshold
    const highConfidenceGestures = recognizedGestures.filter(gesture => {
      const confidenceKey = `${gesture.type}_${gesture.fingers}`;
      return (gestureConfidence.get(confidenceKey) || 0) >= minConfidence;
    });

    return {
      success: true,
      data: {
        allGestures: recognizedGestures,
        highConfidenceGestures,
        confidenceScores: Object.fromEntries(gestureConfidence),
        totalEvents: touchSequence.length,
        gesturesRecognized: recognizedGestures.length,
        highConfidenceCount: highConfidenceGestures.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to recognize complex gesture')
    };
  }
}

/**
 * Configure advanced touch parameters
 */
export const configureAdvancedTouch: Tool = {
  name: 'configure_advanced_touch',
  description: 'Configure advanced touch detection and gesture parameters',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      configuration: {
        type: 'object',
        properties: {
          palmRejectionEnabled: {
            type: 'boolean',
            description: 'Enable palm rejection filtering',
            default: true
          },
          touchSensitivity: {
            type: 'number',
            description: 'Touch sensitivity level (0.1-2.0)',
            minimum: 0.1,
            maximum: 2.0,
            default: 1.0
          },
          gestureRecognitionAccuracy: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Gesture recognition accuracy level',
            default: 'medium'
          },
          multiTouchEnabled: {
            type: 'boolean',
            description: 'Enable multi-touch gesture detection',
            default: true
          }
        }
      }
    },
    required: ['sessionId']
  }
};

export async function handleConfigureAdvancedTouch(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, configuration = {} } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const {
      palmRejectionEnabled = true,
      touchSensitivity = 1.0,
      gestureRecognitionAccuracy = 'medium',
      multiTouchEnabled = true
    } = configuration;

    // Adjust gesture thresholds based on configuration
    const thresholdAdjustments: any = {};
    
    if (gestureRecognitionAccuracy === 'high') {
      thresholdAdjustments.swipeMinDistance = 30;
      thresholdAdjustments.tapMaxDuration = 150;
      thresholdAdjustments.longPressMinDuration = 1000;
    } else if (gestureRecognitionAccuracy === 'low') {
      thresholdAdjustments.swipeMinDistance = 80;
      thresholdAdjustments.tapMaxDuration = 300;
      thresholdAdjustments.longPressMinDuration = 600;
    }

    // Apply sensitivity adjustments
    if (touchSensitivity !== 1.0) {
      Object.keys(thresholdAdjustments).forEach(key => {
        if (thresholdAdjustments[key]) {
          thresholdAdjustments[key] = Math.round(thresholdAdjustments[key] / touchSensitivity);
        }
      });
    }

    touchManager.configureThresholds(thresholdAdjustments);

    return {
      success: true,
      data: {
        configuration: {
          palmRejectionEnabled,
          touchSensitivity,
          gestureRecognitionAccuracy,
          multiTouchEnabled
        },
        appliedThresholds: thresholdAdjustments,
        message: 'Advanced touch configuration applied successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to configure advanced touch')
    };
  }
}

// Export all advanced touch tools
export const advancedTouchTools = [
  simulateMultiTouch,
  detectTouchDrag,
  getHapticCapabilities,
  recognizeComplexGesture,
  configureAdvancedTouch
];

export const advancedTouchToolHandlers = {
  simulate_multi_touch: handleSimulateMultiTouch,
  detect_touch_drag: handleDetectTouchDrag,
  get_haptic_capabilities: handleGetHapticCapabilities,
  recognize_complex_gesture: handleRecognizeComplexGesture,
  configure_advanced_touch: handleConfigureAdvancedTouch
};