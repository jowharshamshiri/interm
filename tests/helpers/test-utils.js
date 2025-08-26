import { spawn } from 'child_process';
import { strictEqual, ok } from 'assert';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class MCPTestClient {
  constructor() {
    this.server = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/server.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id && this.pendingRequests.has(response.id)) {
              const { resolve: resolveRequest } = this.pendingRequests.get(response.id);
              this.pendingRequests.delete(response.id);
              resolveRequest(response);
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON output
          }
        }
      });

      this.server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.server.on('error', reject);
      
      // Wait a bit for server to start
      setTimeout(() => resolve(), 500);
    });
  }

  async request(method, params = {}) {
    if (!this.server) {
      throw new Error('Server not started');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.server.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 10000);
    });
  }

  async callTool(name, args = {}) {
    const response = await this.request('tools/call', {
      name,
      arguments: args
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    const content = response.result?.content?.[0];
    if (content?.type === 'text') {
      try {
        return JSON.parse(content.text);
      } catch (e) {
        return { text: content.text };
      }
    }

    return response.result;
  }

  async listTools() {
    const response = await this.request('tools/list');
    if (response.error) {
      throw new Error(`List tools failed: ${response.error.message}`);
    }
    return response.result;
  }

  async close() {
    if (this.server) {
      this.server.kill('SIGTERM');
      await new Promise((resolve) => {
        this.server.on('exit', resolve);
        setTimeout(() => {
          this.server.kill('SIGKILL');
          resolve();
        }, 2000);
      });
      this.server = null;
    }
  }
}

export class TestSession {
  constructor(client) {
    this.client = client;
    this.sessionId = null;
  }

  async create(options = {}) {
    const defaults = {
      cols: 80,
      rows: 24,
      shell: process.platform === 'win32' ? 'powershell.exe' : 'bash'
    };

    const result = await this.client.callTool('create_terminal_session', {
      ...defaults,
      ...options
    });

    if (!result.success) {
      throw new Error(`Session creation failed: ${result.error?.message}`);
    }

    this.sessionId = result.data.id;
    return result.data;
  }

  async execute(command, options = {}) {
    if (!this.sessionId) {
      throw new Error('Session not created');
    }

    return await this.client.callTool('execute_command', {
      sessionId: this.sessionId,
      command,
      timeout: 5000,
      ...options
    });
  }

  async sendInput(input) {
    if (!this.sessionId) {
      throw new Error('Session not created');
    }

    return await this.client.callTool('send_input', {
      sessionId: this.sessionId,
      input
    });
  }

  async sendKeys(keys) {
    if (!this.sessionId) {
      throw new Error('Session not created');
    }

    return await this.client.callTool('send_keys', {
      sessionId: this.sessionId,
      keys
    });
  }

  async getContent(options = {}) {
    if (!this.sessionId) {
      throw new Error('Session not created');
    }

    return await this.client.callTool('get_terminal_content', {
      sessionId: this.sessionId,
      ...options
    });
  }

  async screenshot(options = {}) {
    if (!this.sessionId) {
      throw new Error('Session not created');
    }

    return await this.client.callTool('screenshot_terminal', {
      sessionId: this.sessionId,
      format: 'png',
      ...options
    });
  }

  async close() {
    if (this.sessionId) {
      await this.client.callTool('close_terminal_session', {
        sessionId: this.sessionId
      });
      this.sessionId = null;
    }
  }
}

export function getShellCommand(command) {
  if (process.platform === 'win32') {
    return `powershell -Command "${command}"`;
  }
  return command;
}

export function getDefaultShell() {
  return process.platform === 'win32' ? 'powershell.exe' : 'bash';
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function assertSuccess(result, message = 'Operation should succeed') {
  if (!result.success) {
    throw new Error(`${message}: ${result.error?.message || 'Unknown error'}`);
  }
}

export function assertError(result, expectedType = null, message = 'Operation should fail') {
  if (result.success) {
    throw new Error(`${message}: Expected failure but got success`);
  }
  
  if (expectedType && result.error?.type !== expectedType) {
    throw new Error(`${message}: Expected error type '${expectedType}' but got '${result.error?.type}'`);
  }
}

export async function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}