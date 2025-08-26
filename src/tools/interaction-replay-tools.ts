import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TerminalManager } from '../terminal-manager.js';
import { InteractionReplayManager } from '../interaction-replay-manager.js';
import { ToolResult } from '../types.js';
import { handleError } from '../utils/error-utils.js';

const terminalManager = TerminalManager.getInstance();
const replayManager = InteractionReplayManager.getInstance();

// Start interaction recording
export const startInteractionRecording: Tool = {
  name: 'start_interaction_recording',
  description: 'Start recording interaction events for later replay',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      name: {
        type: 'string',
        description: 'Recording name'
      },
      description: {
        type: 'string',
        description: 'Optional recording description'
      }
    },
    required: ['sessionId', 'name']
  }
};

export async function handleStartInteractionRecording({ sessionId, name, description }: any): Promise<ToolResult> {
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

    const recordingId = await replayManager.startRecording(sessionId, name, description);

    return {
      success: true,
      data: {
        recordingId,
        sessionId,
        name,
        description,
        startTime: new Date(),
        message: 'Recording started successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to start interaction recording').message,
        details: { sessionId, name }
      }
    };
  }
}

// Stop interaction recording
export const stopInteractionRecording: Tool = {
  name: 'stop_interaction_recording',
  description: 'Stop an active interaction recording',
  inputSchema: {
    type: 'object',
    properties: {
      recordingId: {
        type: 'string',
        description: 'Recording ID to stop'
      }
    },
    required: ['recordingId']
  }
};

export async function handleStopInteractionRecording({ recordingId }: any): Promise<ToolResult> {
  try {
    const recording = await replayManager.stopRecording(recordingId);

    return {
      success: true,
      data: {
        recording: {
          id: recording.id,
          sessionId: recording.sessionId,
          name: recording.name,
          startTime: recording.startTime,
          endTime: recording.endTime,
          totalDuration: recording.totalDuration,
          eventCount: recording.eventCount
        },
        message: 'Recording stopped successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to stop interaction recording').message,
        details: { recordingId }
      }
    };
  }
}

// Replay interaction sequence
export const replayInteractionSequence: Tool = {
  name: 'replay_interaction_sequence',
  description: 'Replay a recorded interaction sequence on a terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      recordingId: {
        type: 'string',
        description: 'Recording ID to replay'
      },
      targetSessionId: {
        type: 'string',
        description: 'Target session ID for replay'
      },
      speedMultiplier: {
        type: 'number',
        description: 'Playback speed multiplier (0.1 to 10.0, default: 1.0)',
        default: 1.0
      }
    },
    required: ['recordingId', 'targetSessionId']
  }
};

export async function handleReplayInteractionSequence({ recordingId, targetSessionId, speedMultiplier = 1.0 }: any): Promise<ToolResult> {
  try {
    const session = terminalManager.getSession(targetSessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${targetSessionId} not found`
        }
      };
    }

    const recording = replayManager.getRecording(recordingId);
    if (!recording) {
      return {
        success: false,
        error: {
          type: 'RESOURCE_ERROR',
          message: `Recording ${recordingId} not found`
        }
      };
    }

    // Start replay asynchronously
    replayManager.replayInteraction(recordingId, targetSessionId, speedMultiplier)
      .catch(error => console.error('Replay error:', error));

    return {
      success: true,
      data: {
        recordingId,
        targetSessionId,
        speedMultiplier,
        recording: {
          name: recording.name,
          eventCount: recording.eventCount,
          totalDuration: recording.totalDuration
        },
        message: 'Replay started successfully',
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to replay interaction sequence').message,
        details: { recordingId, targetSessionId, speedMultiplier }
      }
    };
  }
}

// List interaction recordings
export const listInteractionRecordings: Tool = {
  name: 'list_interaction_recordings',
  description: 'List all interaction recordings or recordings for a specific session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Filter by session ID (optional)'
      }
    }
  }
};

export async function handleListInteractionRecordings({ sessionId }: any): Promise<ToolResult> {
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

    const recordings = replayManager.getAllRecordings(sessionId);
    const activeRecordings = replayManager.getActiveRecordings();

    return {
      success: true,
      data: {
        recordings: recordings.map(r => ({
          id: r.id,
          sessionId: r.sessionId,
          name: r.name,
          description: r.description,
          startTime: r.startTime,
          endTime: r.endTime,
          totalDuration: r.totalDuration,
          eventCount: r.eventCount
        })),
        activeRecordings,
        totalRecordings: recordings.length,
        activeCount: activeRecordings.length,
        sessionId: sessionId || 'all_sessions'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to list interaction recordings').message,
        details: { sessionId }
      }
    };
  }
}

// Create state snapshot
export const createStateSnapshot: Tool = {
  name: 'create_state_snapshot',
  description: 'Create a snapshot of current terminal state',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata to store with snapshot'
      }
    },
    required: ['sessionId']
  }
};

export async function handleCreateStateSnapshot({ sessionId, metadata }: any): Promise<ToolResult> {
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

    const snapshotId = await replayManager.createStateSnapshot(sessionId, metadata);

    return {
      success: true,
      data: {
        snapshotId,
        sessionId,
        metadata,
        timestamp: new Date(),
        message: 'State snapshot created successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to create state snapshot').message,
        details: { sessionId }
      }
    };
  }
}

// Generate state diff
export const generateStateDiff: Tool = {
  name: 'generate_state_diff',
  description: 'Generate a diff between two terminal state snapshots',
  inputSchema: {
    type: 'object',
    properties: {
      fromSnapshotId: {
        type: 'string',
        description: 'Source snapshot ID'
      },
      toSnapshotId: {
        type: 'string',
        description: 'Target snapshot ID'
      }
    },
    required: ['fromSnapshotId', 'toSnapshotId']
  }
};

export async function handleGenerateStateDiff({ fromSnapshotId, toSnapshotId }: any): Promise<ToolResult> {
  try {
    const diffId = await replayManager.generateStateDiff(fromSnapshotId, toSnapshotId);
    const diff = replayManager.getDiff(diffId);

    return {
      success: true,
      data: {
        diffId,
        fromSnapshotId,
        toSnapshotId,
        diff: diff ? {
          summary: diff.summary,
          changeCount: diff.changes.length,
          changes: diff.changes,
          timestamp: diff.timestamp
        } : null,
        message: 'State diff generated successfully'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to generate state diff').message,
        details: { fromSnapshotId, toSnapshotId }
      }
    };
  }
}

// List state snapshots
export const listStateSnapshots: Tool = {
  name: 'list_state_snapshots',
  description: 'List all state snapshots or snapshots for a specific session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Filter by session ID (optional)'
      }
    }
  }
};

export async function handleListStateSnapshots({ sessionId }: any): Promise<ToolResult> {
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

    const snapshots = replayManager.getAllSnapshots(sessionId);

    return {
      success: true,
      data: {
        snapshots: snapshots.map(s => ({
          id: s.id,
          sessionId: s.sessionId,
          timestamp: s.timestamp,
          metadata: s.metadata,
          contentLength: s.state.content.length,
          dimensions: s.state.dimensions,
          cursorPosition: s.state.cursor
        })),
        totalSnapshots: snapshots.length,
        sessionId: sessionId || 'all_sessions'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to list state snapshots').message,
        details: { sessionId }
      }
    };
  }
}

// List state diffs
export const listStateDiffs: Tool = {
  name: 'list_state_diffs',
  description: 'List all generated state diffs',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function handleListStateDiffs(): Promise<ToolResult> {
  try {
    const diffs = replayManager.getAllDiffs();

    return {
      success: true,
      data: {
        diffs: diffs.map(d => ({
          id: d.id,
          fromSnapshotId: d.fromSnapshotId,
          toSnapshotId: d.toSnapshotId,
          timestamp: d.timestamp,
          summary: d.summary,
          changeCount: d.changes.length
        })),
        totalDiffs: diffs.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to list state diffs').message
      }
    };
  }
}