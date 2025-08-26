import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { TerminalSession, TerminalState, TerminalAutomationError, CommandResult } from './types.js';
import { createTerminalError, handleError, isValidShell } from './utils/error-utils.js';

export class TerminalManager {
  private static instance: TerminalManager;
  private sessions = new Map<string, {
    session: TerminalSession;
    ptyProcess: pty.IPty;
    outputBuffer: string;
    lastOutput: string;
  }>();

  private constructor() {}

  static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager();
    }
    return TerminalManager.instance;
  }

  async createSession(
    cols: number = 80,
    rows: number = 24,
    shell: string = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash',
    workingDirectory: string = process.cwd()
  ): Promise<TerminalSession> {
    try {
      if (!isValidShell(shell)) {
        throw createTerminalError('INVALID_SHELL', `Invalid shell: ${shell}`);
      }

      const id = uuidv4();
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols,
        rows,
        cwd: workingDirectory,
        env: process.env as { [key: string]: string }
      });

      const session: TerminalSession = {
        id,
        pid: ptyProcess.pid,
        cols,
        rows,
        shell,
        workingDirectory,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      const sessionData = {
        session,
        ptyProcess,
        outputBuffer: '',
        lastOutput: ''
      };

      // Set up data handler
      ptyProcess.onData((data: string) => {
        sessionData.outputBuffer += data;
        sessionData.lastOutput = data;
        sessionData.session.lastActivity = new Date();
      });

      // Set up exit handler
      ptyProcess.onExit(({ exitCode }) => {
        console.log(`Terminal session ${id} exited with code ${exitCode}`);
        this.sessions.delete(id);
      });

      this.sessions.set(id, sessionData);
      
      // Wait a moment for shell to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return session;
    } catch (error) {
      throw handleError(error, 'Failed to create terminal session');
    }
  }

  async executeCommand(
    sessionId: string,
    command: string,
    timeout: number = 30000,
    expectOutput: boolean = true
  ): Promise<CommandResult> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const startTime = Date.now();
    const startBuffer = sessionData.outputBuffer;

    try {
      // Clear previous output
      sessionData.outputBuffer = '';
      
      // Send command
      sessionData.ptyProcess.write(command + '\r');
      
      if (!expectOutput) {
        return {
          output: '',
          exitCode: null,
          duration: Date.now() - startTime,
          command,
          timestamp: new Date()
        };
      }

      // Wait for command to complete
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(createTerminalError('TIMEOUT_ERROR', `Command timed out after ${timeout}ms`));
        }, timeout);

        const checkOutput = () => {
          const output = sessionData.outputBuffer.substring(startBuffer.length);
          
          // Simple heuristic: command is done if we see a new prompt
          // This is basic and might need refinement based on shell type
          if (output.includes('$ ') || output.includes('# ') || output.includes('> ') || 
              output.includes('% ') || output.includes('❯ ')) {
            clearTimeout(timeoutId);
            resolve({
              output: output.trim(),
              exitCode: null, // PTY doesn't easily provide exit codes for individual commands
              duration: Date.now() - startTime,
              command,
              timestamp: new Date()
            });
          } else {
            setTimeout(checkOutput, 100);
          }
        };

        setTimeout(checkOutput, 100);
      });
    } catch (error) {
      throw handleError(error, `Failed to execute command: ${command}`);
    }
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      sessionData.ptyProcess.write(input);
      sessionData.session.lastActivity = new Date();
    } catch (error) {
      throw handleError(error, `Failed to send input to session ${sessionId}`);
    }
  }

  async getTerminalState(sessionId: string): Promise<TerminalState> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    // This is a simplified version - in a real implementation,
    // you might want to parse ANSI sequences for cursor position and formatting
    return {
      content: sessionData.outputBuffer,
      cursor: {
        x: 0,
        y: 0,
        visible: true
      },
      dimensions: {
        cols: sessionData.session.cols,
        rows: sessionData.session.rows
      },
      attributes: [] // Would parse ANSI formatting in real implementation
    };
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      sessionData.ptyProcess.resize(cols, rows);
      sessionData.session.cols = cols;
      sessionData.session.rows = rows;
      sessionData.session.lastActivity = new Date();
    } catch (error) {
      throw handleError(error, `Failed to resize session ${sessionId}`);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      sessionData.ptyProcess.kill();
      this.sessions.delete(sessionId);
    } catch (error) {
      throw handleError(error, `Failed to close session ${sessionId}`);
    }
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map(data => data.session);
  }

  async cleanup(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(sessionId => 
      this.closeSession(sessionId).catch(console.error)
    );
    await Promise.all(promises);
  }
}