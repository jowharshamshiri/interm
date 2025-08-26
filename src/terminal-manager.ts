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
    dataListener?: (data: string) => void;
    exitListener?: (data: { exitCode: number; signal?: number }) => void;
  }>();

  private constructor() {
    // Set up cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

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
        lastOutput: '',
        dataListener: undefined as ((data: string) => void) | undefined,
        exitListener: undefined as ((data: { exitCode: number; signal?: number }) => void) | undefined
      };

      // Set up data handler
      const dataListener = (data: string) => {
        sessionData.outputBuffer += data;
        sessionData.lastOutput = data;
        sessionData.session.lastActivity = new Date();
      };
      sessionData.dataListener = dataListener;
      ptyProcess.onData(dataListener);

      // Set up exit handler
      const exitListener = ({ exitCode }: { exitCode: number; signal?: number }) => {
        console.log(`Terminal session ${id} exited with code ${exitCode}`);
        this.cleanupSessionListeners(id);
        this.sessions.delete(id);
      };
      sessionData.exitListener = exitListener;
      ptyProcess.onExit(exitListener);

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
    timeout: number = 60000,
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

      // For interactive commands (like boxmux), don't wait for completion
      if (this.isInteractiveCommand(command)) {
        // Wait a short time to capture initial output, then return
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          output: sessionData.outputBuffer.trim(),
          exitCode: null,
          duration: Date.now() - startTime,
          command,
          timestamp: new Date(),
          isInteractive: true
        };
      }

      // Wait for command to complete
      return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null;
        
        // Only set timeout if specified (0 means no timeout)
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            reject(createTerminalError('TIMEOUT_ERROR', `Command timed out after ${timeout}ms`));
          }, timeout);
        }

        const checkOutput = () => {
          const output = sessionData.outputBuffer.substring(startBuffer.length);
          
          // Simple heuristic: command is done if we see a new prompt
          // This is basic and might need refinement based on shell type
          if (output.includes('$ ') || output.includes('# ') || output.includes('> ') || 
              output.includes('% ') || output.includes('❯ ')) {
            if (timeoutId) clearTimeout(timeoutId);
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

  private isInteractiveCommand(command: string): boolean {
    // List of commands that are typically interactive/long-running
    const interactiveCommands = [
      'boxmux', 'tmux', 'screen', 'vim', 'emacs', 'nano', 'htop', 'top',
      'less', 'more', 'man', 'ssh', 'telnet', 'docker run', 'kubectl'
    ];
    
    return interactiveCommands.some(cmd => command.trim().startsWith(cmd));
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

  async getTerminalContent(
    sessionId: string, 
    options: {
      lastNLines?: number;
      maxTokens?: number;
      includeFormatting?: boolean;
    } = {}
  ): Promise<{ content: string; truncated: boolean; totalLines: number }> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    let content = sessionData.outputBuffer;
    const lines = content.split('\n');
    const totalLines = lines.length;
    let truncated = false;

    // Apply line limit if specified
    if (options.lastNLines && options.lastNLines < lines.length) {
      content = lines.slice(-options.lastNLines).join('\n');
      truncated = true;
    }

    // Apply token limit if specified (rough estimate: 4 chars per token)
    const maxTokens = options.maxTokens || 20000;
    const estimatedTokens = content.length / 4;
    
    if (estimatedTokens > maxTokens) {
      const maxChars = maxTokens * 4;
      content = content.slice(-maxChars);
      truncated = true;
    }

    // Strip ANSI sequences if formatting not requested
    if (!options.includeFormatting) {
      content = this.stripAnsiSequences(content);
    }

    return {
      content,
      truncated,
      totalLines
    };
  }

  private stripAnsiSequences(text: string): string {
    // Remove ANSI escape sequences
    return text
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // Standard ANSI escape sequences
      .replace(/\x1b\][0-9]*;[^\x07]*\x07/g, '') // OSC sequences
      .replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '') // String terminators
      .replace(/\x1b./g, ''); // Any remaining escape sequences
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
      this.cleanupSessionListeners(sessionId);
      sessionData.ptyProcess.kill();
      this.sessions.delete(sessionId);
    } catch (error) {
      throw handleError(error, `Failed to close session ${sessionId}`);
    }
  }

  async recoverSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      // Send interrupt to stop any stuck processes
      sessionData.ptyProcess.write('\x03'); // Ctrl+C
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear the buffer to start fresh
      sessionData.outputBuffer = '';
      sessionData.lastOutput = '';
      
      // Send a newline to get a fresh prompt
      sessionData.ptyProcess.write('\r');
      
      console.log(`Session ${sessionId} recovered successfully`);
    } catch (error) {
      throw handleError(error, `Failed to recover session ${sessionId}`);
    }
  }

  private cleanupSessionListeners(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      // Clear listener references to prevent memory leaks
      // Note: node-pty doesn't expose removeListener, so we just clear references
      sessionData.dataListener = undefined;
      sessionData.exitListener = undefined;
    }
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map(data => data.session);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.sessions.size} terminal sessions...`);
    const promises = Array.from(this.sessions.keys()).map(sessionId => 
      this.closeSession(sessionId).catch(console.error)
    );
    await Promise.all(promises);
    console.log('Terminal cleanup complete');
  }
}