import { CallToolRequest, Tool } from '@modelcontextprotocol/sdk/types.js';
import { InputProcessingManager } from '../input-processing-manager.js';
import { TerminalManager } from '../terminal-manager.js';
import { ToolResult } from '../types.js';
import { createTerminalError, handleError } from '../utils/error-utils.js';

const inputManager = InputProcessingManager.getInstance();
const terminalManager = TerminalManager.getInstance();

/**
 * Queue input event for processing
 */
export const queueInputEvent: Tool = {
  name: 'queue_input_event',
  description: 'Queue an input event for ordered processing and filtering',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      eventType: {
        type: 'string',
        enum: ['keyboard', 'mouse', 'touch', 'gesture', 'voice', 'eye_tracking'],
        description: 'Type of input event'
      },
      eventData: {
        type: 'object',
        description: 'Event-specific data payload'
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'critical'],
        description: 'Event processing priority',
        default: 'normal'
      }
    },
    required: ['sessionId', 'eventType', 'eventData']
  }
};

export async function handleQueueInputEvent(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, eventType, eventData, priority = 'normal' } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    if (!eventData || typeof eventData !== 'object') {
      throw createTerminalError('PARSING_ERROR', 'Event data must be a valid object');
    }

    const eventId = inputManager.queueEvent({
      type: eventType,
      timestamp: new Date(),
      data: eventData,
      priority
    });

    return {
      success: true,
      data: {
        eventId,
        eventType,
        priority,
        queueSize: inputManager.getQueueSize(),
        message: 'Input event queued successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to queue input event')
    };
  }
}

/**
 * Start recording input sequence
 */
export const startInputRecording: Tool = {
  name: 'start_input_recording',
  description: 'Start recording input events for later playback',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      recordingName: {
        type: 'string',
        description: 'Optional name for the recording'
      },
      description: {
        type: 'string',
        description: 'Optional description of the recording'
      }
    },
    required: ['sessionId']
  }
};

export async function handleStartInputRecording(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, recordingName, description } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const recordingId = inputManager.startRecording(recordingName, description);

    return {
      success: true,
      data: {
        recordingId,
        recordingName,
        description,
        startTime: new Date(),
        message: 'Input recording started successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to start input recording')
    };
  }
}

/**
 * Stop input recording
 */
export const stopInputRecording: Tool = {
  name: 'stop_input_recording',
  description: 'Stop current input recording and return recorded sequence',
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

export async function handleStopInputRecording(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const recording = inputManager.stopRecording();

    if (!recording) {
      throw createTerminalError('PARSING_ERROR', 'No active recording found');
    }

    return {
      success: true,
      data: {
        recording,
        eventCount: recording.events.length,
        duration: recording.duration,
        message: 'Input recording stopped successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to stop input recording')
    };
  }
}

/**
 * Playback recorded input sequence
 */
export const playbackInputRecording: Tool = {
  name: 'playback_input_recording',
  description: 'Playback a recorded input sequence',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      recordingId: {
        type: 'string',
        description: 'ID of the recording to playback'
      },
      speed: {
        type: 'number',
        description: 'Playback speed multiplier (1.0 = normal)',
        default: 1.0,
        minimum: 0.1,
        maximum: 10.0
      }
    },
    required: ['sessionId', 'recordingId']
  }
};

export async function handlePlaybackInputRecording(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, recordingId, speed = 1.0 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    await inputManager.playbackRecording(recordingId, speed);

    return {
      success: true,
      data: {
        recordingId,
        speed,
        message: 'Input recording playback completed successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to playback input recording')
    };
  }
}

/**
 * Detect connected input devices
 */
export const detectInputDevices: Tool = {
  name: 'detect_input_devices',
  description: 'Auto-detect connected input devices (keyboards, mice, touchscreens, etc.)',
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

export async function handleDetectInputDevices(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const devices = await inputManager.detectDevices();

    return {
      success: true,
      data: {
        devices,
        deviceCount: devices.length,
        platform: process.platform,
        message: 'Input device detection completed'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to detect input devices')
    };
  }
}

/**
 * Add input filter
 */
export const addInputFilter: Tool = {
  name: 'add_input_filter',
  description: 'Add custom input event filter for processing control',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      filter: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique filter identifier'
          },
          name: {
            type: 'string',
            description: 'Human-readable filter name'
          },
          type: {
            type: 'string',
            enum: ['allow', 'block', 'modify', 'rate_limit'],
            description: 'Filter action type'
          },
          enabled: {
            type: 'boolean',
            description: 'Whether filter is enabled',
            default: true
          },
          maxRate: {
            type: 'number',
            description: 'Maximum events per second (for rate_limit type)',
            minimum: 1
          },
          conditions: {
            type: 'object',
            description: 'Filter conditions (eventType, pattern, etc.)',
            properties: {
              eventType: {
                type: 'string',
                description: 'Target event type to filter'
              },
              pattern: {
                type: 'string',
                description: 'Regex pattern to match'
              }
            }
          }
        },
        required: ['id', 'name', 'type']
      }
    },
    required: ['sessionId', 'filter']
  }
};

export async function handleAddInputFilter(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, filter } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // Create filter with basic condition function
    const inputFilter = {
      id: filter.id,
      name: filter.name,
      type: filter.type,
      enabled: filter.enabled ?? true,
      maxRate: filter.maxRate,
      condition: (event: any) => {
        if (filter.conditions?.eventType && event.type !== filter.conditions.eventType) {
          return false;
        }
        if (filter.conditions?.pattern) {
          const regex = new RegExp(filter.conditions.pattern);
          return regex.test(JSON.stringify(event.data));
        }
        return true;
      }
    };

    inputManager.addFilter(inputFilter);

    return {
      success: true,
      data: {
        filter: inputFilter,
        message: 'Input filter added successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to add input filter')
    };
  }
}

/**
 * Remove input filter
 */
export const removeInputFilter: Tool = {
  name: 'remove_input_filter',
  description: 'Remove an input event filter',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      filterId: {
        type: 'string',
        description: 'ID of the filter to remove'
      }
    },
    required: ['sessionId', 'filterId']
  }
};

export async function handleRemoveInputFilter(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, filterId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const removed = inputManager.removeFilter(filterId);

    if (!removed) {
      throw createTerminalError('PARSING_ERROR', `Filter ${filterId} not found`);
    }

    return {
      success: true,
      data: {
        filterId,
        message: 'Input filter removed successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to remove input filter')
    };
  }
}

/**
 * Get input processing analytics
 */
export const getInputAnalytics: Tool = {
  name: 'get_input_analytics',
  description: 'Get input processing performance and usage analytics',
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

export async function handleGetInputAnalytics(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const analytics = inputManager.getAnalytics();

    return {
      success: true,
      data: {
        analytics,
        queueSize: inputManager.getQueueSize(),
        connectedDevices: inputManager.getDevices().length,
        activeRecordings: inputManager.getRecordings().length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to get input analytics')
    };
  }
}

/**
 * Optimize input latency
 */
export const optimizeInputLatency: Tool = {
  name: 'optimize_input_latency',
  description: 'Optimize input processing for minimal latency (high-performance mode)',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable latency optimization',
        default: true
      }
    },
    required: ['sessionId']
  }
};

export async function handleOptimizeInputLatency(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, enabled = true } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    if (enabled) {
      inputManager.optimizeLatency();
    } else {
      inputManager.resetOptimizations();
    }

    return {
      success: true,
      data: {
        enabled,
        message: `Input latency optimization ${enabled ? 'enabled' : 'disabled'}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to optimize input latency')
    };
  }
}

/**
 * Get input event history
 */
export const getInputHistory: Tool = {
  name: 'get_input_history',
  description: 'Get recent input event processing history',
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
        maximum: 10000
      }
    },
    required: ['sessionId']
  }
};

export async function handleGetInputHistory(request: CallToolRequest): Promise<ToolResult> {
  try {
    const { sessionId, limit = 100 } = request.params as any;

    // Validate session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const history = inputManager.getEventHistory(limit);

    return {
      success: true,
      data: {
        history,
        count: history.length,
        totalProcessed: inputManager.getAnalytics().totalEvents
      }
    };
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'Failed to get input history')
    };
  }
}

// Export all input processing tools
export const inputProcessingTools = [
  queueInputEvent,
  startInputRecording,
  stopInputRecording,
  playbackInputRecording,
  detectInputDevices,
  addInputFilter,
  removeInputFilter,
  getInputAnalytics,
  optimizeInputLatency,
  getInputHistory
];

export const inputProcessingToolHandlers = {
  queue_input_event: handleQueueInputEvent,
  start_input_recording: handleStartInputRecording,
  stop_input_recording: handleStopInputRecording,
  playback_input_recording: handlePlaybackInputRecording,
  detect_input_devices: handleDetectInputDevices,
  add_input_filter: handleAddInputFilter,
  remove_input_filter: handleRemoveInputFilter,
  get_input_analytics: handleGetInputAnalytics,
  optimize_input_latency: handleOptimizeInputLatency,
  get_input_history: handleGetInputHistory
};