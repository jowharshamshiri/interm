import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok, throws, rejects } from 'node:assert';
import { TerminalManager } from '../../dist/terminal-manager.js';
import { TerminalAutomationError } from '../../dist/types.js';

describe('TerminalManager', () => {
  let manager;

  beforeEach(() => {
    manager = TerminalManager.getInstance();
  });

  afterEach(async () => {
    // Clean up any sessions created during tests
    const sessions = manager.getAllSessions();
    for (const session of sessions) {
      try {
        await manager.closeSession(session.id);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('getInstance returns singleton instance', () => {
    const manager1 = TerminalManager.getInstance();
    const manager2 = TerminalManager.getInstance();
    
    strictEqual(manager1, manager2);
  });

  test('createSession creates session with default parameters', async () => {
    const session = await manager.createSession();
    
    ok(session.id);
    ok(session.pid > 0);
    strictEqual(session.cols, 80);
    strictEqual(session.rows, 24);
    ok(session.shell);
    ok(session.workingDirectory);
    ok(session.createdAt instanceof Date);
    ok(session.lastActivity instanceof Date);
  });

  test('createSession creates session with custom parameters', async () => {
    const session = await manager.createSession(120, 30, 'bash', '/tmp');
    
    strictEqual(session.cols, 120);
    strictEqual(session.rows, 30);
    strictEqual(session.shell, 'bash');
    strictEqual(session.workingDirectory, '/tmp');
  });

  test('createSession rejects invalid shell', async () => {
    await rejects(
      manager.createSession(80, 24, 'invalid_shell'),
      TerminalAutomationError
    );
  });

  test('getSession returns session by ID', async () => {
    const created = await manager.createSession();
    const retrieved = manager.getSession(created.id);
    
    strictEqual(retrieved.id, created.id);
  });

  test('getSession returns undefined for non-existent session', () => {
    const result = manager.getSession('non-existent-id');
    strictEqual(result, undefined);
  });

  test('getAllSessions returns all active sessions', async () => {
    const session1 = await manager.createSession();
    const session2 = await manager.createSession();
    
    const allSessions = manager.getAllSessions();
    
    ok(allSessions.length >= 2);
    ok(allSessions.some(s => s.id === session1.id));
    ok(allSessions.some(s => s.id === session2.id));
  });

  test('resizeSession updates session dimensions', async () => {
    const session = await manager.createSession();
    
    await manager.resizeSession(session.id, 100, 50);
    
    const updated = manager.getSession(session.id);
    strictEqual(updated.cols, 100);
    strictEqual(updated.rows, 50);
  });

  test('resizeSession throws for non-existent session', async () => {
    await rejects(
      manager.resizeSession('non-existent', 100, 50),
      TerminalAutomationError
    );
  });

  test('sendInput throws for non-existent session', async () => {
    await rejects(
      manager.sendInput('non-existent', 'test'),
      TerminalAutomationError
    );
  });

  test('executeCommand throws for non-existent session', async () => {
    await rejects(
      manager.executeCommand('non-existent', 'echo test'),
      TerminalAutomationError
    );
  });

  test('getTerminalState throws for non-existent session', async () => {
    await rejects(
      manager.getTerminalState('non-existent'),
      TerminalAutomationError
    );
  });

  test('closeSession removes session from manager', async () => {
    const session = await manager.createSession();
    
    await manager.closeSession(session.id);
    
    const retrieved = manager.getSession(session.id);
    strictEqual(retrieved, undefined);
  });

  test('closeSession throws for non-existent session', async () => {
    await rejects(
      manager.closeSession('non-existent'),
      TerminalAutomationError
    );
  });

  test('executeCommand with expectOutput=false returns immediately', async () => {
    const session = await manager.createSession();
    
    const result = await manager.executeCommand(session.id, 'echo test', 1000, false);
    
    ok(result.command === 'echo test');
    strictEqual(result.output, '');
    strictEqual(result.exitCode, null);
    ok(result.duration >= 0);
    ok(result.timestamp instanceof Date);
  });

  test('sendInput updates session lastActivity', async () => {
    const session = await manager.createSession();
    const originalActivity = session.lastActivity;
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await manager.sendInput(session.id, 'test input');
    
    const updated = manager.getSession(session.id);
    ok(updated.lastActivity > originalActivity);
  });

  test('getTerminalState returns terminal state structure', async () => {
    const session = await manager.createSession();
    
    const state = await manager.getTerminalState(session.id);
    
    ok(typeof state.content === 'string');
    ok(state.cursor);
    ok(typeof state.cursor.x === 'number');
    ok(typeof state.cursor.y === 'number');
    ok(typeof state.cursor.visible === 'boolean');
    ok(state.dimensions);
    strictEqual(state.dimensions.cols, session.cols);
    strictEqual(state.dimensions.rows, session.rows);
    ok(Array.isArray(state.attributes));
  });

  test('cleanup closes all sessions', async () => {
    await manager.createSession();
    await manager.createSession();
    
    const beforeCleanup = manager.getAllSessions().length;
    ok(beforeCleanup >= 2);
    
    await manager.cleanup();
    
    const afterCleanup = manager.getAllSessions().length;
    strictEqual(afterCleanup, 0);
  });

  // Platform-specific tests
  if (process.platform !== 'win32') {
    test('createSession with bash executes basic command', async () => {
      const session = await manager.createSession(80, 24, 'bash');
      
      // Give shell time to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await manager.executeCommand(session.id, 'echo "hello"', 5000, true);
      
      ok(result.output.includes('hello'));
    });

    test('executeCommand times out for long-running commands', async () => {
      const session = await manager.createSession(80, 24, 'bash');
      
      await rejects(
        manager.executeCommand(session.id, 'sleep 10', 1000, true),
        TerminalAutomationError
      );
    });
  }
});