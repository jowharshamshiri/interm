import { TerminalManager } from './terminal-manager.js';
import { SessionManager } from './session-manager.js';
import { createTerminalError, handleError } from './utils/error-utils.js';
import { KeyboardEvent, MouseEvent, TouchEvent, InputSequence, TerminalState } from './types.js';

export interface RecordedInteraction {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  events: Array<KeyboardEvent | MouseEvent | TouchEvent>;
  totalDuration: number;
  eventCount: number;
}

export interface StateSnapshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  state: TerminalState;
  metadata?: Record<string, unknown>;
}

export interface StateDiff {
  id: string;
  fromSnapshotId: string;
  toSnapshotId: string;
  timestamp: Date;
  changes: Array<{
    type: 'content' | 'cursor' | 'dimensions' | 'attributes';
    oldValue: unknown;
    newValue: unknown;
    path: string;
  }>;
  summary: string;
}

export class InteractionReplayManager {
  private static instance: InteractionReplayManager;
  private terminalManager: TerminalManager;
  private sessionManager: SessionManager;
  private recordings = new Map<string, RecordedInteraction>();
  private snapshots = new Map<string, StateSnapshot>();
  private diffs = new Map<string, StateDiff>();
  private activeRecordings = new Map<string, {
    sessionId: string;
    name: string;
    startTime: Date;
    events: Array<KeyboardEvent | MouseEvent | TouchEvent>;
  }>();

  private constructor() {
    this.terminalManager = TerminalManager.getInstance();
    this.sessionManager = SessionManager.getInstance();
  }

  static getInstance(): InteractionReplayManager {
    if (!InteractionReplayManager.instance) {
      InteractionReplayManager.instance = new InteractionReplayManager();
    }
    return InteractionReplayManager.instance;
  }

  async startRecording(sessionId: string, name: string, description?: string): Promise<string> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.activeRecordings.set(recordingId, {
        sessionId,
        name,
        startTime: new Date(),
        events: []
      });

      return recordingId;
    } catch (error) {
      throw handleError(error, `Failed to start recording for session ${sessionId}`);
    }
  }

  async stopRecording(recordingId: string): Promise<RecordedInteraction> {
    try {
      const activeRecording = this.activeRecordings.get(recordingId);
      if (!activeRecording) {
        throw createTerminalError('RESOURCE_ERROR', `Recording ${recordingId} not found`);
      }

      const endTime = new Date();
      const totalDuration = endTime.getTime() - activeRecording.startTime.getTime();

      const recording: RecordedInteraction = {
        id: recordingId,
        sessionId: activeRecording.sessionId,
        name: activeRecording.name,
        startTime: activeRecording.startTime,
        endTime,
        events: activeRecording.events,
        totalDuration,
        eventCount: activeRecording.events.length
      };

      this.recordings.set(recordingId, recording);
      this.activeRecordings.delete(recordingId);

      return recording;
    } catch (error) {
      throw handleError(error, `Failed to stop recording ${recordingId}`);
    }
  }

  async addEventToRecording(recordingId: string, event: KeyboardEvent | MouseEvent | TouchEvent): Promise<void> {
    try {
      const activeRecording = this.activeRecordings.get(recordingId);
      if (!activeRecording) {
        return; // Recording might have been stopped
      }

      activeRecording.events.push(event);
    } catch (error) {
      console.error('Error adding event to recording:', error);
    }
  }

  async replayInteraction(recordingId: string, targetSessionId: string, speedMultiplier: number = 1.0): Promise<void> {
    try {
      const recording = this.recordings.get(recordingId);
      if (!recording) {
        throw createTerminalError('RESOURCE_ERROR', `Recording ${recordingId} not found`);
      }

      const session = this.terminalManager.getSession(targetSessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${targetSessionId} not found`);
      }

      const adjustedSpeedMultiplier = Math.max(0.1, Math.min(10.0, speedMultiplier));

      for (let i = 0; i < recording.events.length; i++) {
        const event = recording.events[i];
        const nextEvent = recording.events[i + 1];

        // Execute the current event
        await this.executeEvent(targetSessionId, event);

        // Calculate delay until next event
        if (nextEvent) {
          const originalDelay = nextEvent.timestamp.getTime() - event.timestamp.getTime();
          const adjustedDelay = Math.max(10, originalDelay / adjustedSpeedMultiplier);
          await new Promise(resolve => setTimeout(resolve, adjustedDelay));
        }
      }
    } catch (error) {
      throw handleError(error, `Failed to replay interaction ${recordingId}`);
    }
  }

  private async executeEvent(sessionId: string, event: KeyboardEvent | MouseEvent | TouchEvent): Promise<void> {
    try {
      if (event.type === 'keydown' || event.type === 'keypress') {
        const keyEvent = event as KeyboardEvent;
        let input = keyEvent.key;
        
        // Handle special keys
        if (keyEvent.modifiers && keyEvent.modifiers.length > 0) {
          if (keyEvent.modifiers.includes('ctrl') && keyEvent.key.length === 1) {
            const charCode = keyEvent.key.toLowerCase().charCodeAt(0) - 96;
            input = String.fromCharCode(charCode);
          }
        }
        
        await this.terminalManager.sendInput(sessionId, input);
      } else if (event.type === 'click' || event.type === 'move') {
        const mouseEvent = event as MouseEvent;
        // Mouse events would be handled by the mouse manager
        console.log(`Mouse event: ${mouseEvent.type} at (${mouseEvent.x}, ${mouseEvent.y})`);
      } else if (event.type === 'touch') {
        const touchEvent = event as TouchEvent;
        // Touch events would be handled by the touch manager
        console.log(`Touch event: ${touchEvent.type} at (${touchEvent.x}, ${touchEvent.y})`);
      }
    } catch (error) {
      console.error('Error executing event:', error);
    }
  }

  async createStateSnapshot(sessionId: string, metadata?: Record<string, unknown>): Promise<string> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const state = await this.terminalManager.getTerminalState(sessionId);
      const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const snapshot: StateSnapshot = {
        id: snapshotId,
        sessionId,
        timestamp: new Date(),
        state,
        metadata
      };

      this.snapshots.set(snapshotId, snapshot);
      return snapshotId;
    } catch (error) {
      throw handleError(error, `Failed to create state snapshot for session ${sessionId}`);
    }
  }

  async generateStateDiff(fromSnapshotId: string, toSnapshotId: string): Promise<string> {
    try {
      const fromSnapshot = this.snapshots.get(fromSnapshotId);
      const toSnapshot = this.snapshots.get(toSnapshotId);
      
      if (!fromSnapshot) {
        throw createTerminalError('RESOURCE_ERROR', `Snapshot ${fromSnapshotId} not found`);
      }
      
      if (!toSnapshot) {
        throw createTerminalError('RESOURCE_ERROR', `Snapshot ${toSnapshotId} not found`);
      }

      const diffId = `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const changes: StateDiff['changes'] = [];

      // Compare content
      if (fromSnapshot.state.content !== toSnapshot.state.content) {
        changes.push({
          type: 'content',
          oldValue: fromSnapshot.state.content,
          newValue: toSnapshot.state.content,
          path: 'state.content'
        });
      }

      // Compare cursor position
      const fromCursor = fromSnapshot.state.cursor;
      const toCursor = toSnapshot.state.cursor;
      if (fromCursor.x !== toCursor.x || fromCursor.y !== toCursor.y || fromCursor.visible !== toCursor.visible) {
        changes.push({
          type: 'cursor',
          oldValue: fromCursor,
          newValue: toCursor,
          path: 'state.cursor'
        });
      }

      // Compare dimensions
      const fromDim = fromSnapshot.state.dimensions;
      const toDim = toSnapshot.state.dimensions;
      if (fromDim.cols !== toDim.cols || fromDim.rows !== toDim.rows) {
        changes.push({
          type: 'dimensions',
          oldValue: fromDim,
          newValue: toDim,
          path: 'state.dimensions'
        });
      }

      // Generate summary
      let summary = '';
      if (changes.length === 0) {
        summary = 'No changes detected';
      } else {
        const changeTypes = changes.map(c => c.type);
        summary = `Changes detected in: ${changeTypes.join(', ')}`;
      }

      const diff: StateDiff = {
        id: diffId,
        fromSnapshotId,
        toSnapshotId,
        timestamp: new Date(),
        changes,
        summary
      };

      this.diffs.set(diffId, diff);
      return diffId;
    } catch (error) {
      throw handleError(error, `Failed to generate state diff between ${fromSnapshotId} and ${toSnapshotId}`);
    }
  }

  getRecording(recordingId: string): RecordedInteraction | null {
    return this.recordings.get(recordingId) || null;
  }

  getAllRecordings(sessionId?: string): RecordedInteraction[] {
    const recordings = Array.from(this.recordings.values());
    return sessionId ? recordings.filter(r => r.sessionId === sessionId) : recordings;
  }

  getSnapshot(snapshotId: string): StateSnapshot | null {
    return this.snapshots.get(snapshotId) || null;
  }

  getAllSnapshots(sessionId?: string): StateSnapshot[] {
    const snapshots = Array.from(this.snapshots.values());
    return sessionId ? snapshots.filter(s => s.sessionId === sessionId) : snapshots;
  }

  getDiff(diffId: string): StateDiff | null {
    return this.diffs.get(diffId) || null;
  }

  getAllDiffs(): StateDiff[] {
    return Array.from(this.diffs.values());
  }

  getActiveRecordings(): Array<{ id: string; sessionId: string; name: string; startTime: Date; eventCount: number }> {
    return Array.from(this.activeRecordings.entries()).map(([id, recording]) => ({
      id,
      sessionId: recording.sessionId,
      name: recording.name,
      startTime: recording.startTime,
      eventCount: recording.events.length
    }));
  }

  async deleteRecording(recordingId: string): Promise<boolean> {
    return this.recordings.delete(recordingId);
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return this.snapshots.delete(snapshotId);
  }

  async deleteStateDiff(diffId: string): Promise<boolean> {
    return this.diffs.delete(diffId);
  }

  async cleanup(): Promise<void> {
    this.recordings.clear();
    this.snapshots.clear();
    this.diffs.clear();
    this.activeRecordings.clear();
  }
}