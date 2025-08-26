import { MouseManager } from './mouse-manager.js';
import { TerminalManager } from './terminal-manager.js';
import { createTerminalError, handleError } from './utils/error-utils.js';
import { MouseEvent } from './types.js';

export interface MouseAcceleration {
  enabled: boolean;
  sensitivity: number;
  threshold: number;
  maxSpeed: number;
}

export interface PressureSensitivity {
  enabled: boolean;
  threshold: number;
  maxPressure: number;
}

export interface FocusFollowMouse {
  enabled: boolean;
  delay: number;
  zones: Array<{ x: number; y: number; width: number; height: number; sessionId: string }>;
}

export class AdvancedMouseManager {
  private static instance: AdvancedMouseManager;
  private mouseManager: MouseManager;
  private terminalManager: TerminalManager;
  private accelerationSettings = new Map<string, MouseAcceleration>();
  private pressureSettings = new Map<string, PressureSensitivity>();
  private focusSettings = new Map<string, FocusFollowMouse>();
  private eventFilters = new Map<string, { debounceMs: number; lastEvent?: Date }>();
  private multiClickCounters = new Map<string, { count: number; lastClick: Date; maxClicks: number }>();

  private constructor() {
    this.mouseManager = MouseManager.getInstance();
    this.terminalManager = TerminalManager.getInstance();
  }

  static getInstance(): AdvancedMouseManager {
    if (!AdvancedMouseManager.instance) {
      AdvancedMouseManager.instance = new AdvancedMouseManager();
    }
    return AdvancedMouseManager.instance;
  }

  async configureAcceleration(sessionId: string, settings: Partial<MouseAcceleration>): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const currentSettings = this.accelerationSettings.get(sessionId) || {
        enabled: false,
        sensitivity: 1.0,
        threshold: 5,
        maxSpeed: 3.0
      };

      const newSettings = { ...currentSettings, ...settings };
      this.accelerationSettings.set(sessionId, newSettings);
    } catch (error) {
      throw handleError(error, `Failed to configure mouse acceleration for session ${sessionId}`);
    }
  }

  async configurePressureSensitivity(sessionId: string, settings: Partial<PressureSensitivity>): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const currentSettings = this.pressureSettings.get(sessionId) || {
        enabled: false,
        threshold: 0.5,
        maxPressure: 1.0
      };

      const newSettings = { ...currentSettings, ...settings };
      this.pressureSettings.set(sessionId, newSettings);
    } catch (error) {
      throw handleError(error, `Failed to configure pressure sensitivity for session ${sessionId}`);
    }
  }

  async configureFocusFollowMouse(sessionId: string, settings: Partial<FocusFollowMouse>): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const currentSettings = this.focusSettings.get(sessionId) || {
        enabled: false,
        delay: 100,
        zones: []
      };

      const newSettings = { ...currentSettings, ...settings };
      this.focusSettings.set(sessionId, newSettings);

      // Set up focus zones if enabled
      if (newSettings.enabled && newSettings.zones.length > 0) {
        this.setupFocusZones(sessionId, newSettings);
      }
    } catch (error) {
      throw handleError(error, `Failed to configure focus-follow-mouse for session ${sessionId}`);
    }
  }

  private setupFocusZones(sessionId: string, settings: FocusFollowMouse): void {
    // This would integrate with a mouse tracking system
    // For now, we simulate the setup
    console.log(`Focus zones configured for session ${sessionId}:`, settings.zones);
  }

  async processAcceleratedMovement(sessionId: string, x: number, y: number, deltaX: number, deltaY: number): Promise<{ x: number; y: number }> {
    try {
      const acceleration = this.accelerationSettings.get(sessionId);
      if (!acceleration || !acceleration.enabled) {
        return { x, y };
      }

      // Calculate movement speed
      const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (speed < acceleration.threshold) {
        return { x, y };
      }

      // Apply acceleration
      const accelerationFactor = Math.min(
        acceleration.maxSpeed,
        1 + (speed - acceleration.threshold) * acceleration.sensitivity / 10
      );

      const acceleratedX = x + deltaX * accelerationFactor;
      const acceleratedY = y + deltaY * accelerationFactor;

      return {
        x: Math.round(acceleratedX),
        y: Math.round(acceleratedY)
      };
    } catch (error) {
      throw handleError(error, `Failed to process accelerated movement for session ${sessionId}`);
    }
  }

  async detectPressure(sessionId: string, x: number, y: number, pressure?: number): Promise<{ normalClick: boolean; pressureLevel: number }> {
    try {
      const pressureSettings = this.pressureSettings.get(sessionId);
      if (!pressureSettings || !pressureSettings.enabled) {
        return { normalClick: true, pressureLevel: pressure || 1.0 };
      }

      const actualPressure = pressure || 1.0;
      const normalizedPressure = Math.min(actualPressure / pressureSettings.maxPressure, 1.0);
      
      return {
        normalClick: normalizedPressure >= pressureSettings.threshold,
        pressureLevel: normalizedPressure
      };
    } catch (error) {
      throw handleError(error, `Failed to detect pressure for session ${sessionId}`);
    }
  }

  async trackMultiClick(sessionId: string, x: number, y: number, maxClicks: number = 10): Promise<number> {
    try {
      const now = new Date();
      const counter = this.multiClickCounters.get(sessionId) || {
        count: 0,
        lastClick: new Date(0),
        maxClicks
      };

      // Check if this is within the multi-click time window (500ms)
      const timeSinceLastClick = now.getTime() - counter.lastClick.getTime();
      
      if (timeSinceLastClick < 500 && counter.count < maxClicks) {
        counter.count++;
      } else {
        counter.count = 1; // Reset to single click
      }

      counter.lastClick = now;
      counter.maxClicks = maxClicks;
      this.multiClickCounters.set(sessionId, counter);

      return counter.count;
    } catch (error) {
      throw handleError(error, `Failed to track multi-click for session ${sessionId}`);
    }
  }

  async filterMouseEvents(sessionId: string, event: MouseEvent): Promise<boolean> {
    try {
      const filter = this.eventFilters.get(sessionId);
      if (!filter) {
        return true; // No filter, allow event
      }

      const now = new Date();
      
      if (filter.lastEvent) {
        const timeSinceLastEvent = now.getTime() - filter.lastEvent.getTime();
        if (timeSinceLastEvent < filter.debounceMs) {
          return false; // Filter out this event
        }
      }

      filter.lastEvent = now;
      return true; // Allow event
    } catch (error) {
      throw handleError(error, `Failed to filter mouse event for session ${sessionId}`);
    }
  }

  async setEventFilter(sessionId: string, debounceMs: number): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      this.eventFilters.set(sessionId, {
        debounceMs: Math.max(0, Math.min(1000, debounceMs)), // Clamp between 0-1000ms
        lastEvent: undefined
      });
    } catch (error) {
      throw handleError(error, `Failed to set event filter for session ${sessionId}`);
    }
  }

  async processFocusFollowMouse(sessionId: string, x: number, y: number): Promise<string | null> {
    try {
      const focusSettings = this.focusSettings.get(sessionId);
      if (!focusSettings || !focusSettings.enabled) {
        return null;
      }

      // Check which zone the mouse is in
      for (const zone of focusSettings.zones) {
        if (x >= zone.x && x < zone.x + zone.width && 
            y >= zone.y && y < zone.y + zone.height) {
          
          // Simulate focus change with delay
          setTimeout(async () => {
            try {
              // This would trigger focus change in a real implementation
              console.log(`Focus would change to session ${zone.sessionId} after ${focusSettings.delay}ms delay`);
            } catch (error) {
              console.error('Error in focus follow mouse:', error);
            }
          }, focusSettings.delay);
          
          return zone.sessionId;
        }
      }

      return null;
    } catch (error) {
      throw handleError(error, `Failed to process focus-follow-mouse for session ${sessionId}`);
    }
  }

  getAccelerationSettings(sessionId: string): MouseAcceleration | null {
    return this.accelerationSettings.get(sessionId) || null;
  }

  getPressureSettings(sessionId: string): PressureSensitivity | null {
    return this.pressureSettings.get(sessionId) || null;
  }

  getFocusSettings(sessionId: string): FocusFollowMouse | null {
    return this.focusSettings.get(sessionId) || null;
  }

  getEventFilter(sessionId: string): { debounceMs: number } | null {
    const filter = this.eventFilters.get(sessionId);
    return filter ? { debounceMs: filter.debounceMs } : null;
  }

  getMultiClickStatus(sessionId: string): { count: number; maxClicks: number } | null {
    const counter = this.multiClickCounters.get(sessionId);
    return counter ? { count: counter.count, maxClicks: counter.maxClicks } : null;
  }

  async cleanup(): Promise<void> {
    this.accelerationSettings.clear();
    this.pressureSettings.clear();
    this.focusSettings.clear();
    this.eventFilters.clear();
    this.multiClickCounters.clear();
  }
}