import { EnvironmentVariable, TerminalAutomationError } from './types.js';
import { createTerminalError, handleError } from './utils/error-utils.js';

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private sessionEnvironments = new Map<string, Map<string, EnvironmentVariable>>();

  private constructor() {}

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  async setVariable(sessionId: string, name: string, value: string): Promise<void> {
    try {
      if (!sessionId) {
        throw createTerminalError('SESSION_NOT_FOUND', 'Session ID is required');
      }

      if (!name || typeof name !== 'string') {
        throw createTerminalError('INVALID_PARAMETER', 'Variable name must be a non-empty string');
      }

      if (value === undefined || value === null) {
        throw createTerminalError('INVALID_PARAMETER', 'Variable value cannot be null or undefined');
      }

      // Initialize session environment if it doesn't exist
      if (!this.sessionEnvironments.has(sessionId)) {
        this.sessionEnvironments.set(sessionId, new Map());
      }

      const sessionEnv = this.sessionEnvironments.get(sessionId)!;
      const variable: EnvironmentVariable = {
        name,
        value: String(value),
        sessionId,
        timestamp: new Date()
      };

      sessionEnv.set(name, variable);

      // Update the actual process environment for the session would happen here
      // In a real implementation, this would interact with the terminal session's environment
    } catch (error) {
      throw handleError(error, `Failed to set environment variable ${name}`);
    }
  }

  async getVariable(sessionId: string, name: string): Promise<EnvironmentVariable | null> {
    try {
      if (!sessionId) {
        throw createTerminalError('SESSION_NOT_FOUND', 'Session ID is required');
      }

      const sessionEnv = this.sessionEnvironments.get(sessionId);
      if (!sessionEnv) {
        return null;
      }

      return sessionEnv.get(name) || null;
    } catch (error) {
      throw handleError(error, `Failed to get environment variable ${name}`);
    }
  }

  async getAllVariables(sessionId: string): Promise<EnvironmentVariable[]> {
    try {
      if (!sessionId) {
        throw createTerminalError('SESSION_NOT_FOUND', 'Session ID is required');
      }

      const sessionEnv = this.sessionEnvironments.get(sessionId);
      if (!sessionEnv) {
        return [];
      }

      return Array.from(sessionEnv.values());
    } catch (error) {
      throw handleError(error, 'Failed to get environment variables');
    }
  }

  async unsetVariable(sessionId: string, name: string): Promise<boolean> {
    try {
      if (!sessionId) {
        throw createTerminalError('SESSION_NOT_FOUND', 'Session ID is required');
      }

      const sessionEnv = this.sessionEnvironments.get(sessionId);
      if (!sessionEnv) {
        return false;
      }

      return sessionEnv.delete(name);
    } catch (error) {
      throw handleError(error, `Failed to unset environment variable ${name}`);
    }
  }

  async exportVariable(sessionId: string, name: string, value: string): Promise<void> {
    try {
      await this.setVariable(sessionId, name, value);
      
      // In a real implementation, this would send the export command to the terminal
      // For now, we just track it in our environment storage
    } catch (error) {
      throw handleError(error, `Failed to export environment variable ${name}`);
    }
  }

  async getSystemEnvironment(): Promise<EnvironmentVariable[]> {
    try {
      const systemEnv: EnvironmentVariable[] = [];
      
      for (const [name, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          systemEnv.push({
            name,
            value,
            timestamp: new Date()
          });
        }
      }
      
      return systemEnv;
    } catch (error) {
      throw handleError(error, 'Failed to get system environment variables');
    }
  }

  async mergeEnvironments(sessionId: string, variables: Record<string, string>): Promise<void> {
    try {
      const promises = Object.entries(variables).map(([name, value]) =>
        this.setVariable(sessionId, name, value)
      );
      
      await Promise.all(promises);
    } catch (error) {
      throw handleError(error, 'Failed to merge environment variables');
    }
  }

  async clearSessionEnvironment(sessionId: string): Promise<void> {
    try {
      this.sessionEnvironments.delete(sessionId);
    } catch (error) {
      throw handleError(error, 'Failed to clear session environment');
    }
  }

  async cleanup(): Promise<void> {
    this.sessionEnvironments.clear();
  }
}