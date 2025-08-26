import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok, notStrictEqual } from 'node:assert';
import { MCPTestClient, TestSession, assertSuccess, assertError, getDefaultShell } from '../helpers/test-utils.js';

describe('Session Management Integration', () => {
  let client;
  let sessions = [];

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.start();
    sessions = [];
  });

  afterEach(async () => {
    // Clean up sessions
    for (const session of sessions) {
      try {
        await session.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (client) {
      await client.close();
    }
  });

  test('create session with default parameters', async () => {
    const session = new TestSession(client);
    const result = await session.create();
    sessions.push(session);
    
    ok(result.id);
    ok(result.pid > 0);
    strictEqual(result.cols, 80);
    strictEqual(result.rows, 24);
    ok(result.shell);
    ok(result.createdAt);
    ok(result.lastActivity);
  });

  test('create session with custom parameters', async () => {
    const session = new TestSession(client);
    const result = await session.create({
      cols: 120,
      rows: 40,
      shell: getDefaultShell()
    });
    sessions.push(session);
    
    strictEqual(result.cols, 120);
    strictEqual(result.rows, 40);
  });

  test('create multiple concurrent sessions', async () => {
    const sessionPromises = Array(3).fill(null).map(() => {
      const session = new TestSession(client);
      sessions.push(session);
      return session.create();
    });
    
    const results = await Promise.all(sessionPromises);
    
    strictEqual(results.length, 3);
    
    // All sessions should have unique IDs
    const ids = results.map(r => r.id);
    const uniqueIds = [...new Set(ids)];
    strictEqual(uniqueIds.length, 3);
  });

  test('list sessions returns all active sessions', async () => {
    // Create multiple sessions
    const session1 = new TestSession(client);
    const session2 = new TestSession(client);
    await session1.create();
    await session2.create();
    sessions.push(session1, session2);
    
    const result = await client.callTool('list_terminal_sessions');
    
    assertSuccess(result);
    ok(result.data.sessions.length >= 2);
    
    const sessionIds = result.data.sessions.map(s => s.id);
    ok(sessionIds.includes(session1.sessionId));
    ok(sessionIds.includes(session2.sessionId));
  });

  test('get session returns correct session details', async () => {
    const session = new TestSession(client);
    const created = await session.create({ cols: 100, rows: 25 });
    sessions.push(session);
    
    const result = await client.callTool('get_terminal_session', {
      sessionId: created.id
    });
    
    assertSuccess(result);
    strictEqual(result.data.id, created.id);
    strictEqual(result.data.cols, 100);
    strictEqual(result.data.rows, 25);
  });

  test('get non-existent session returns error', async () => {
    const result = await client.callTool('get_terminal_session', {
      sessionId: 'non-existent-id'
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('resize session updates dimensions', async () => {
    const session = new TestSession(client);
    await session.create();
    sessions.push(session);
    
    const resizeResult = await client.callTool('resize_terminal', {
      sessionId: session.sessionId,
      cols: 90,
      rows: 35
    });
    
    assertSuccess(resizeResult);
    
    // Verify the resize took effect
    const getResult = await client.callTool('get_terminal_session', {
      sessionId: session.sessionId
    });
    
    assertSuccess(getResult);
    strictEqual(getResult.data.cols, 90);
    strictEqual(getResult.data.rows, 35);
  });

  test('resize non-existent session returns error', async () => {
    const result = await client.callTool('resize_terminal', {
      sessionId: 'non-existent-id',
      cols: 100,
      rows: 30
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('close session removes it from active sessions', async () => {
    const session = new TestSession(client);
    await session.create();
    const sessionId = session.sessionId;
    
    // Verify session exists
    let listResult = await client.callTool('list_terminal_sessions');
    ok(listResult.data.sessions.some(s => s.id === sessionId));
    
    // Close session
    const closeResult = await client.callTool('close_terminal_session', {
      sessionId
    });
    assertSuccess(closeResult);
    
    // Verify session is removed
    listResult = await client.callTool('list_terminal_sessions');
    ok(!listResult.data.sessions.some(s => s.id === sessionId));
  });

  test('close non-existent session returns error', async () => {
    const result = await client.callTool('close_terminal_session', {
      sessionId: 'non-existent-id'
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('session metadata is preserved across operations', async () => {
    const session = new TestSession(client);
    const created = await session.create({
      cols: 85,
      rows: 28,
      shell: getDefaultShell()
    });
    sessions.push(session);
    
    // Perform some operations
    await session.sendInput('test input');
    
    // Check that metadata is preserved
    const getResult = await client.callTool('get_terminal_session', {
      sessionId: created.id
    });
    
    assertSuccess(getResult);
    strictEqual(getResult.data.cols, 85);
    strictEqual(getResult.data.rows, 28);
    strictEqual(getResult.data.shell, getDefaultShell());
    
    // lastActivity should have been updated
    ok(new Date(getResult.data.lastActivity) > new Date(getResult.data.createdAt));
  });

  test('invalid session creation parameters return errors', async () => {
    // Test invalid shell
    try {
      const session = new TestSession(client);
      await session.create({ shell: 'invalid_shell' });
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message.includes('INVALID_SHELL') || error.message.includes('failed'));
    }
  });

  test('session PIDs are valid process IDs', async () => {
    const session = new TestSession(client);
    const result = await session.create();
    sessions.push(session);
    
    ok(result.pid > 0);
    ok(Number.isInteger(result.pid));
    
    // On Unix systems, we can check if the process exists
    if (process.platform !== 'win32') {
      try {
        process.kill(result.pid, 0); // Signal 0 checks if process exists
        ok(true, 'Process should exist');
      } catch (error) {
        if (error.code === 'ESRCH') {
          ok(false, 'Process should exist');
        }
        // EPERM is fine, means process exists but we don't have permission
      }
    }
  });

  test('concurrent session operations are thread-safe', async () => {
    const session = new TestSession(client);
    await session.create();
    sessions.push(session);
    
    // Perform multiple operations concurrently
    const operations = [
      session.sendInput('input1'),
      client.callTool('get_terminal_session', { sessionId: session.sessionId }),
      session.sendInput('input2'),
      client.callTool('resize_terminal', { sessionId: session.sessionId, cols: 90, rows: 30 }),
      session.sendInput('input3')
    ];
    
    const results = await Promise.all(operations);
    
    // All operations should succeed
    for (const result of results) {
      if (result.success !== undefined) {
        assertSuccess(result);
      }
    }
  });
});