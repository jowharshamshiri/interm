import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import { TerminalSession, TerminalState, TerminalAutomationError, CommandResult } from './types.js';
import { createTerminalError, handleError, isValidShell } from './utils/error-utils.js';
import { EnvironmentManager } from './environment-manager.js';

export class SessionManager {
  private static instance: SessionManager;
  private sessions = new Map<string, {
    session: TerminalSession;
    ptyProcess: pty.IPty;
    outputBuffer: string;
    lastOutput: string;
    history: string[];
    bookmarks: Map<string, { content: string; cursor: { x: number; y: number }; timestamp: Date }>;
  }>();
  private environmentManager: EnvironmentManager;

  private constructor() {
    this.environmentManager = EnvironmentManager.getInstance();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async createSession(
    cols: number = 80,
    rows: number = 24,
    shell: string = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash',
    workingDirectory: string = process.cwd(),
    environment?: Record<string, string>,
    title?: string
  ): Promise<TerminalSession> {
    try {
      if (!isValidShell(shell)) {
        throw createTerminalError('INVALID_SHELL', `Invalid shell: ${shell}`);
      }

      const id = uuidv4();
      const sessionEnv = { ...process.env, ...(environment || {}) };

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols,
        rows,
        cwd: workingDirectory,
        env: sessionEnv as { [key: string]: string }
      });

      const session: TerminalSession = {
        id,
        pid: ptyProcess.pid,
        cols,
        rows,
        shell,
        workingDirectory,
        createdAt: new Date(),
        lastActivity: new Date(),
        environment,
        title
      };

      const sessionData = {
        session,
        ptyProcess,
        outputBuffer: '',
        lastOutput: '',
        history: [] as string[],
        bookmarks: new Map<string, { content: string; cursor: { x: number; y: number }; timestamp: Date }>()
      };

      // Set up data handler
      ptyProcess.onData((data: string) => {
        sessionData.outputBuffer += data;
        sessionData.lastOutput = data;
        sessionData.session.lastActivity = new Date();
        
        // Add to history if it looks like a command completion
        if (data.includes('\n') && (data.includes('$ ') || data.includes('> ') || data.includes('% '))) {
          sessionData.history.push(data);
          // Keep history manageable
          if (sessionData.history.length > 1000) {
            sessionData.history = sessionData.history.slice(-500);
          }
        }
      });

      // Set up exit handler
      ptyProcess.onExit(({ exitCode }) => {
        console.log(`Terminal session ${id} exited with code ${exitCode}`);
        this.environmentManager.clearSessionEnvironment(id);
        this.sessions.delete(id);
      });

      this.sessions.set(id, sessionData);

      // Set initial environment variables if provided
      if (environment) {
        await this.environmentManager.mergeEnvironments(id, environment);
      }

      // Set terminal title if provided
      if (title) {
        await this.setTerminalTitle(id, title);
      }
      
      // Wait a moment for shell to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return session;
    } catch (error) {
      throw handleError(error, 'Failed to create terminal session');
    }
  }

  async saveBookmark(sessionId: string, name: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      const terminalState = await this.getTerminalState(sessionId);
      sessionData.bookmarks.set(name, {
        content: terminalState.content,
        cursor: terminalState.cursor,
        timestamp: new Date()
      });
    } catch (error) {
      throw handleError(error, `Failed to save bookmark ${name}`);
    }
  }

  async restoreBookmark(sessionId: string, name: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const bookmark = sessionData.bookmarks.get(name);
    if (!bookmark) {
      throw createTerminalError('RESOURCE_ERROR', `Bookmark ${name} not found`);
    }

    try {
      // Clear current content and restore bookmark content
      await this.sendInput(sessionId, '\u001b[2J\u001b[H'); // Clear screen and move to home
      await this.sendInput(sessionId, bookmark.content);
    } catch (error) {
      throw handleError(error, `Failed to restore bookmark ${name}`);
    }
  }

  getSessionHistory(sessionId: string, limit?: number): string[] {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const history = sessionData.history;
    return limit ? history.slice(-limit) : history;
  }

  searchHistory(sessionId: string, pattern: string, isRegex: boolean = false): string[] {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      const searchRegex = isRegex ? new RegExp(pattern, 'gi') : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return sessionData.history.filter(entry => searchRegex.test(entry));
    } catch (error) {
      throw handleError(error, 'Invalid search pattern');
    }
  }

  async setTerminalTitle(sessionId: string, title: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      // Send ANSI escape sequence to set terminal title
      const titleSequence = `\u001b]0;${title}\u0007`;
      sessionData.ptyProcess.write(titleSequence);
      sessionData.session.title = title;
      sessionData.session.lastActivity = new Date();
    } catch (error) {
      throw handleError(error, `Failed to set terminal title to ${title}`);
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

      // Wait for command to complete with improved timeout handling
      return new Promise((resolve, reject) => {
        let resolved = false;
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(createTerminalError('TIMEOUT_ERROR', `Command timed out after ${timeout}ms`));
          }
        }, timeout);

        const checkOutput = () => {
          if (resolved) return;
          
          const output = sessionData.outputBuffer.substring(startBuffer.length);
          
          // Improved prompt detection
          if (output.includes('$ ') || output.includes('# ') || output.includes('> ') || 
              output.includes('% ') || output.includes('❯ ') || 
              output.match(/\n.*[@$#%>]\s*$/)) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              output: output.trim(),
              exitCode: null,
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
      attributes: []
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
      await this.environmentManager.clearSessionEnvironment(sessionId);
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

  getBookmarks(sessionId: string): Array<{ name: string; timestamp: Date }> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    return Array.from(sessionData.bookmarks.entries()).map(([name, bookmark]) => ({
      name,
      timestamp: bookmark.timestamp
    }));
  }

  async cleanup(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(sessionId => 
      this.closeSession(sessionId).catch(console.error)
    );
    await Promise.all(promises);
    await this.environmentManager.cleanup();
  }
}