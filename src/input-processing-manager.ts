import { KeyboardEvent, MouseEvent, TouchEvent, GestureEvent, InputSequence } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export interface InputEvent {
  id: string;
  type: 'keyboard' | 'mouse' | 'touch' | 'gesture' | 'voice' | 'eye_tracking';
  timestamp: Date;
  data: any;
  processed: boolean;
  filtered: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface InputFilter {
  id: string;
  name: string;
  type: 'allow' | 'block' | 'modify' | 'rate_limit';
  pattern?: RegExp;
  condition?: (event: InputEvent) => boolean;
  action?: (event: InputEvent) => InputEvent | null;
  enabled: boolean;
  maxRate?: number; // Events per second
  lastActivated?: Date;
}

export interface InputDevice {
  id: string;
  type: 'keyboard' | 'mouse' | 'touchscreen' | 'microphone' | 'eye_tracker' | 'gamepad' | 'midi';
  name: string;
  connected: boolean;
  capabilities: string[];
  lastActivity: Date;
  eventCount: number;
}

export interface InputAnalytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  averageLatency: number;
  peakLatency: number;
  filteredEvents: number;
  errorRate: number;
  deviceStats: Record<string, { events: number, errors: number }>;
  sessionDuration: number;
  startTime: Date;
}

export class InputProcessingManager {
  private static instance: InputProcessingManager;
  private eventQueue: InputEvent[] = [];
  private filters: Map<string, InputFilter> = new Map();
  private devices: Map<string, InputDevice> = new Map();
  private recordings: Map<string, InputSequence> = new Map();
  private isRecording: boolean = false;
  private currentRecordingId: string | null = null;
  private eventHistory: InputEvent[] = [];
  private analytics: InputAnalytics;
  private maxQueueSize = 10000;
  private maxHistorySize = 50000;
  private processingEnabled = true;
  
  private constructor() {
    this.analytics = {
      totalEvents: 0,
      eventsByType: {},
      averageLatency: 0,
      peakLatency: 0,
      filteredEvents: 0,
      errorRate: 0,
      deviceStats: {},
      sessionDuration: 0,
      startTime: new Date()
    };
    this.initializeDefaultFilters();
  }

  static getInstance(): InputProcessingManager {
    if (!InputProcessingManager.instance) {
      InputProcessingManager.instance = new InputProcessingManager();
    }
    return InputProcessingManager.instance;
  }

  /**
   * Initialize default input filters
   */
  private initializeDefaultFilters(): void {
    // Rate limiting filter
    this.addFilter({
      id: 'rate_limiter',
      name: 'Global Rate Limiter',
      type: 'rate_limit',
      maxRate: 1000, // 1000 events per second
      enabled: true,
      condition: () => true,
      action: (event) => {
        const now = new Date();
        const filter = this.filters.get('rate_limiter')!;
        
        if (filter.lastActivated) {
          const timeDiff = now.getTime() - filter.lastActivated.getTime();
          if (timeDiff < (1000 / filter.maxRate!)) {
            return null; // Rate limited
          }
        }
        
        filter.lastActivated = now;
        return event;
      }
    });

    // Security filter for dangerous key combinations
    this.addFilter({
      id: 'security_filter',
      name: 'Security Key Filter',
      type: 'block',
      enabled: true,
      condition: (event) => {
        if (event.type === 'keyboard') {
          const keyEvent = event.data as KeyboardEvent;
          // Block dangerous system key combinations
          const dangerousKeys = ['alt+f4', 'ctrl+alt+del', 'cmd+q'];
          const keyCombo = `${keyEvent.modifiers?.join('+') || ''}+${keyEvent.key}`.toLowerCase();
          return dangerousKeys.includes(keyCombo);
        }
        return false;
      }
    });

    // Accessibility enhancement filter
    this.addFilter({
      id: 'accessibility_enhancer',
      name: 'Accessibility Enhancement',
      type: 'modify',
      enabled: true,
      condition: (event) => event.type === 'keyboard',
      action: (event) => {
        if (event.type === 'keyboard') {
          const keyEvent = event.data as KeyboardEvent;
          // Add accessibility metadata
          event.data = {
            ...keyEvent,
            accessibilityInfo: {
              isNavigationKey: ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(keyEvent.key),
              isActionKey: ['Enter', 'Space'].includes(keyEvent.key),
              needsAnnouncement: keyEvent.modifiers?.includes('shift') && keyEvent.key === 'Tab'
            }
          };
        }
        return event;
      }
    });

    // Input validation filter
    this.addFilter({
      id: 'input_validator',
      name: 'Input Validation',
      type: 'block',
      enabled: true,
      condition: (event) => {
        // Block events with invalid or malformed data
        return !event.data || !event.timestamp || !event.type;
      }
    });
  }

  /**
   * Queue input event for processing
   */
  queueEvent(event: Omit<InputEvent, 'id' | 'processed' | 'filtered'> & { priority?: 'low' | 'normal' | 'high' | 'critical' }): string {
    const inputEvent: InputEvent = {
      id: this.generateEventId(),
      processed: false,
      filtered: false,
      ...event,
      priority: event.priority || 'normal'
    };

    // Check queue size limit
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest event
    }

    this.eventQueue.push(inputEvent);
    this.analytics.totalEvents++;
    this.analytics.eventsByType[event.type] = (this.analytics.eventsByType[event.type] || 0) + 1;

    // Process event immediately if processing is enabled
    if (this.processingEnabled) {
      this.processNextEvent();
    }

    return inputEvent.id;
  }

  /**
   * Process next event in queue
   */
  private processNextEvent(): InputEvent | null {
    if (this.eventQueue.length === 0) {
      return null;
    }

    const event = this.eventQueue.shift()!;
    const startTime = performance.now();

    try {
      // Apply filters
      const filteredEvent = this.applyFilters(event);
      
      if (!filteredEvent) {
        this.analytics.filteredEvents++;
        return null;
      }

      // Record if recording is active
      if (this.isRecording && this.currentRecordingId) {
        this.addToRecording(this.currentRecordingId, filteredEvent);
      }

      // Mark as processed
      filteredEvent.processed = true;
      
      // Add to history
      this.addToHistory(filteredEvent);

      // Update analytics
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.updateLatencyStats(latency);

      return filteredEvent;
    } catch (error) {
      this.analytics.errorRate = (this.analytics.errorRate || 0) + 1;
      console.error('Event processing error:', error);
      return null;
    }
  }

  /**
   * Apply filters to input event
   */
  private applyFilters(event: InputEvent): InputEvent | null {
    let currentEvent = event;

    for (const filter of this.filters.values()) {
      if (!filter.enabled) continue;

      try {
        if (filter.condition && filter.condition(currentEvent)) {
          switch (filter.type) {
            case 'block':
              return null;
            
            case 'allow':
              continue; // Allow through
            
            case 'modify':
            case 'rate_limit':
              if (filter.action) {
                const modifiedEvent = filter.action(currentEvent);
                if (!modifiedEvent) {
                  return null; // Filtered out
                }
                currentEvent = modifiedEvent;
              }
              break;
          }
        }
      } catch (error) {
        console.error(`Filter ${filter.id} error:`, error);
        continue; // Skip failed filter
      }
    }

    currentEvent.filtered = true;
    return currentEvent;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: InputEvent): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-Math.floor(this.maxHistorySize * 0.8));
    }
  }

  /**
   * Update latency statistics
   */
  private updateLatencyStats(latency: number): void {
    const currentAvg = this.analytics.averageLatency;
    const totalEvents = this.analytics.totalEvents;
    
    this.analytics.averageLatency = (currentAvg * (totalEvents - 1) + latency) / totalEvents;
    
    if (latency > this.analytics.peakLatency) {
      this.analytics.peakLatency = latency;
    }
  }

  /**
   * Start recording input sequence
   */
  startRecording(name?: string, description?: string): string {
    const recordingId = this.generateRecordingId();
    
    this.recordings.set(recordingId, {
      events: [],
      duration: 0,
      name: name || `Recording ${recordingId}`,
      description: description || `Input sequence recorded at ${new Date().toISOString()}`
    });
    
    this.isRecording = true;
    this.currentRecordingId = recordingId;
    
    return recordingId;
  }

  /**
   * Stop current recording
   */
  stopRecording(): InputSequence | null {
    if (!this.isRecording || !this.currentRecordingId) {
      return null;
    }

    const recording = this.recordings.get(this.currentRecordingId);
    if (!recording) {
      return null;
    }

    // Calculate duration
    if (recording.events.length > 0) {
      const startTime = recording.events[0].timestamp.getTime();
      const endTime = recording.events[recording.events.length - 1].timestamp.getTime();
      recording.duration = endTime - startTime;
    }

    this.isRecording = false;
    this.currentRecordingId = null;
    
    return recording;
  }

  /**
   * Add event to current recording
   */
  private addToRecording(recordingId: string, event: InputEvent): void {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      return;
    }

    // Convert InputEvent to format expected by InputSequence
    let sequenceEvent;
    
    if (event.type === 'keyboard') {
      sequenceEvent = event.data as KeyboardEvent;
    } else if (event.type === 'mouse') {
      sequenceEvent = event.data as MouseEvent;
    } else {
      // For other event types, create a compatible format
      sequenceEvent = {
        type: 'keypress',
        key: event.type,
        timestamp: event.timestamp
      } as KeyboardEvent;
    }

    recording.events.push(sequenceEvent);
  }

  /**
   * Playback recorded sequence
   */
  async playbackRecording(recordingId: string, speed: number = 1.0): Promise<void> {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw createTerminalError('PARSING_ERROR', `Recording ${recordingId} not found`);
    }

    if (recording.events.length === 0) {
      return;
    }

    const baseTime = recording.events[0].timestamp.getTime();
    
    for (let i = 0; i < recording.events.length; i++) {
      const event = recording.events[i];
      const delay = (event.timestamp.getTime() - baseTime) / speed;
      
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Re-queue the event for processing
      this.queueEvent({
        type: event.type === 'keypress' ? 'keyboard' : 'mouse',
        timestamp: new Date(),
        data: event,
        priority: 'normal'
      });
    }
  }

  /**
   * Auto-detect connected input devices
   */
  async detectDevices(): Promise<InputDevice[]> {
    const detectedDevices: InputDevice[] = [];
    const platform = process.platform;

    try {
      // Platform-specific device detection
      if (platform === 'darwin') {
        await this.detectMacOSDevices(detectedDevices);
      } else if (platform === 'win32') {
        await this.detectWindowsDevices(detectedDevices);
      } else if (platform === 'linux') {
        await this.detectLinuxDevices(detectedDevices);
      }

      // Update device registry
      for (const device of detectedDevices) {
        this.devices.set(device.id, device);
      }

    } catch (error) {
      console.warn('Device detection error:', error);
    }

    return detectedDevices;
  }

  /**
   * macOS device detection
   */
  private async detectMacOSDevices(devices: InputDevice[]): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      
      // Detect keyboards
      const keyboardInfo = execSync('system_profiler SPUSBDataType | grep -A 5 -i keyboard', { encoding: 'utf8' });
      if (keyboardInfo) {
        devices.push({
          id: 'macos_keyboard',
          type: 'keyboard',
          name: 'macOS Keyboard',
          connected: true,
          capabilities: ['typing', 'shortcuts', 'function_keys'],
          lastActivity: new Date(),
          eventCount: 0
        });
      }

      // Detect mice and trackpads
      const mouseInfo = execSync('system_profiler SPUSBDataType | grep -A 5 -i mouse', { encoding: 'utf8' });
      if (mouseInfo) {
        devices.push({
          id: 'macos_mouse',
          type: 'mouse',
          name: 'macOS Mouse/Trackpad',
          connected: true,
          capabilities: ['pointing', 'clicking', 'scrolling', 'gestures'],
          lastActivity: new Date(),
          eventCount: 0
        });
      }

    } catch (error) {
      // Fallback: assume standard devices
      devices.push(
        {
          id: 'default_keyboard',
          type: 'keyboard',
          name: 'Default Keyboard',
          connected: true,
          capabilities: ['typing'],
          lastActivity: new Date(),
          eventCount: 0
        },
        {
          id: 'default_mouse',
          type: 'mouse',
          name: 'Default Mouse',
          connected: true,
          capabilities: ['pointing', 'clicking'],
          lastActivity: new Date(),
          eventCount: 0
        }
      );
    }
  }

  /**
   * Windows device detection
   */
  private async detectWindowsDevices(devices: InputDevice[]): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      
      // Use WMI to detect input devices
      const deviceInfo = execSync('wmic path Win32_PointingDevice get Name,Status', { encoding: 'utf8' });
      
      if (deviceInfo.includes('OK')) {
        devices.push({
          id: 'windows_mouse',
          type: 'mouse',
          name: 'Windows Mouse',
          connected: true,
          capabilities: ['pointing', 'clicking', 'scrolling'],
          lastActivity: new Date(),
          eventCount: 0
        });
      }

    } catch (error) {
      // Fallback devices
      devices.push(
        {
          id: 'default_keyboard',
          type: 'keyboard',
          name: 'Default Keyboard',
          connected: true,
          capabilities: ['typing'],
          lastActivity: new Date(),
          eventCount: 0
        },
        {
          id: 'default_mouse',
          type: 'mouse',
          name: 'Default Mouse',
          connected: true,
          capabilities: ['pointing', 'clicking'],
          lastActivity: new Date(),
          eventCount: 0
        }
      );
    }
  }

  /**
   * Linux device detection
   */
  private async detectLinuxDevices(devices: InputDevice[]): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      
      // Check /proc/bus/input/devices
      const deviceInfo = execSync('cat /proc/bus/input/devices 2>/dev/null || echo ""', { encoding: 'utf8' });
      
      if (deviceInfo.includes('keyboard')) {
        devices.push({
          id: 'linux_keyboard',
          type: 'keyboard',
          name: 'Linux Keyboard',
          connected: true,
          capabilities: ['typing', 'shortcuts'],
          lastActivity: new Date(),
          eventCount: 0
        });
      }

      if (deviceInfo.includes('mouse')) {
        devices.push({
          id: 'linux_mouse',
          type: 'mouse',
          name: 'Linux Mouse',
          connected: true,
          capabilities: ['pointing', 'clicking', 'scrolling'],
          lastActivity: new Date(),
          eventCount: 0
        });
      }

    } catch (error) {
      // Fallback devices
      devices.push(
        {
          id: 'default_keyboard',
          type: 'keyboard',
          name: 'Default Keyboard',
          connected: true,
          capabilities: ['typing'],
          lastActivity: new Date(),
          eventCount: 0
        }
      );
    }
  }

  /**
   * Add custom input filter
   */
  addFilter(filter: InputFilter): void {
    this.filters.set(filter.id, filter);
  }

  /**
   * Remove input filter
   */
  removeFilter(filterId: string): boolean {
    return this.filters.delete(filterId);
  }

  /**
   * Get input analytics
   */
  getAnalytics(): InputAnalytics {
    this.analytics.sessionDuration = Date.now() - this.analytics.startTime.getTime();
    return { ...this.analytics };
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 1000): InputEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get connected devices
   */
  getDevices(): InputDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get recordings
   */
  getRecordings(): InputSequence[] {
    return Array.from(this.recordings.values());
  }

  /**
   * Clear event queue
   */
  clearQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Enable/disable event processing
   */
  setProcessingEnabled(enabled: boolean): void {
    this.processingEnabled = enabled;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique recording ID
   */
  private generateRecordingId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Optimize latency for high-performance scenarios
   */
  optimizeLatency(): void {
    // Process all queued events immediately
    while (this.eventQueue.length > 0) {
      this.processNextEvent();
    }

    // Reduce history size for better performance
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    // Disable non-critical filters temporarily
    for (const filter of this.filters.values()) {
      if (filter.id !== 'security_filter' && filter.id !== 'input_validator') {
        filter.enabled = false;
      }
    }
  }

  /**
   * Reset latency optimizations
   */
  resetOptimizations(): void {
    // Re-enable all filters
    for (const filter of this.filters.values()) {
      filter.enabled = true;
    }
  }
}