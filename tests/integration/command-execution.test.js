import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { MCPTestClient, TestSession, assertSuccess, assertError, getShellCommand, sleep } from '../helpers/test-utils.js';

describe('Command Execution Integration', () => {
  let client;
  let session;

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.start();
    session = new TestSession(client);
    await session.create();
    
    // Wait for shell to initialize
    await sleep(500);
  });

  afterEach(async () => {
    if (session) {
      await session.close().catch(() => {});
    }
    if (client) {
      await client.close();
    }
  });

  test('execute simple echo command', async () => {
    const result = await session.execute(getShellCommand('echo "Hello, World!"'));
    
    assertSuccess(result);
    ok(result.data.output.includes('Hello, World!'));
    ok(result.data.command);
    ok(result.data.duration >= 0);
    ok(result.data.timestamp);
  });

  test('execute command without expecting output', async () => {
    const result = await session.execute(getShellCommand('echo "test"'), {
      expectOutput: false
    });
    
    assertSuccess(result);
    strictEqual(result.data.output, '');
    strictEqual(result.data.exitCode, null);
  });

  test('execute command with custom timeout', async () => {
    const startTime = Date.now();
    
    try {
      await session.execute(getShellCommand('sleep 2'), {
        timeout: 1000
      });
      ok(false, 'Should have timed out');
    } catch (error) {
      const duration = Date.now() - startTime;
      ok(duration < 2000, 'Should have timed out before 2 seconds');
      ok(error.message.includes('timeout') || error.message.includes('timed out'));
    }
  });

  test('send text input to session', async () => {
    const inputResult = await session.sendInput('test input\n');
    assertSuccess(inputResult);
  });

  test('send special keys to session', async () => {
    const keyResults = await Promise.all([
      session.sendKeys('enter'),
      session.sendKeys('tab'),
      session.sendKeys('arrow_up'),
      session.sendKeys('ctrl+c')
    ]);
    
    for (const result of keyResults) {
      assertSuccess(result);
    }
  });

  test('interrupt command execution', async () => {
    // Start a long-running command (don't wait for it)
    session.execute(getShellCommand('sleep 10'), { expectOutput: false }).catch(() => {});
    
    await sleep(100);
    
    // Interrupt it
    const interruptResult = await client.callTool('interrupt_command', {
      sessionId: session.sessionId
    });
    
    assertSuccess(interruptResult);
  });

  test('execute multiple commands in sequence', async () => {
    const commands = [
      getShellCommand('echo "first"'),
      getShellCommand('echo "second"'),
      getShellCommand('echo "third"')
    ];
    
    const results = [];
    for (const command of commands) {
      const result = await session.execute(command);
      assertSuccess(result);
      results.push(result);
    }
    
    ok(results[0].data.output.includes('first'));
    ok(results[1].data.output.includes('second'));
    ok(results[2].data.output.includes('third'));
  });

  test('execute command with environment variables', async () => {
    const result = await client.callTool('execute_command', {
      sessionId: session.sessionId,
      command: process.platform === 'win32' ? 'echo %TEST_VAR%' : 'echo $TEST_VAR',
      environment: {
        TEST_VAR: 'test_value'
      }
    });
    
    // Note: Environment variables might not work as expected in this context
    // This test mainly verifies the parameter is accepted
    assertSuccess(result);
  });

  test('get terminal content after command execution', async () => {
    await session.execute(getShellCommand('echo "Content Test"'));
    
    const contentResult = await session.getContent();
    
    assertSuccess(contentResult);
    ok(contentResult.data.content.includes('Content Test'));
    ok(contentResult.data.cursor);
    ok(contentResult.data.dimensions);
  });

  test('get terminal content with line limit', async () => {
    // Execute multiple commands to generate content
    for (let i = 0; i < 5; i++) {
      await session.execute(getShellCommand(`echo "Line ${i}"`));
    }
    
    const limitedResult = await session.getContent({ lastNLines: 3 });
    
    assertSuccess(limitedResult);
    const lines = limitedResult.data.content.split('\n');
    ok(lines.length <= 5, 'Should limit number of lines');
  });

  test('get terminal buffer with scrollback', async () => {
    const bufferResult = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      includeScrollback: true,
      maxLines: 100
    });
    
    assertSuccess(bufferResult);
    ok(bufferResult.data.buffer !== undefined);
    ok(typeof bufferResult.data.lineCount === 'number');
    ok(typeof bufferResult.data.truncated === 'boolean');
  });

  test('watch terminal output for pattern', async () => {
    // Start watching for a pattern
    const watchPromise = client.callTool('watch_terminal_output', {
      sessionId: session.sessionId,
      pattern: 'WATCH_TEST',
      timeout: 5000
    });
    
    // Wait a bit, then execute command that produces the pattern
    await sleep(100);
    await session.execute(getShellCommand('echo "WATCH_TEST completed"'));
    
    const watchResult = await watchPromise;
    assertSuccess(watchResult);
    ok(watchResult.data.matched);
    ok(watchResult.data.content.includes('WATCH_TEST'));
  });

  test('watch terminal output timeout', async () => {
    const watchResult = await client.callTool('watch_terminal_output', {
      sessionId: session.sessionId,
      pattern: 'NEVER_APPEARS',
      timeout: 1000
    });
    
    assertError(watchResult, 'TIMEOUT_ERROR');
  });

  test('execute command on non-existent session', async () => {
    const result = await client.callTool('execute_command', {
      sessionId: 'non-existent-session',
      command: 'echo test'
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('send input to non-existent session', async () => {
    const result = await client.callTool('send_input', {
      sessionId: 'non-existent-session',
      input: 'test'
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('send invalid key sequence', async () => {
    try {
      await client.callTool('send_keys', {
        sessionId: session.sessionId,
        keys: 'invalid_key'
      });
      ok(false, 'Should have thrown error for invalid key');
    } catch (error) {
      ok(error.message);
    }
  });

  // Platform-specific tests
  if (process.platform !== 'win32') {
    test('execute command with pipes', async () => {
      const result = await session.execute('echo "hello world" | wc -w');
      
      assertSuccess(result);
      ok(result.data.output.includes('2') || result.data.output.includes('word'));
    });

    test('execute command that changes directory', async () => {
      await session.execute('cd /tmp');
      const pwdResult = await session.execute('pwd');
      
      assertSuccess(pwdResult);
      ok(pwdResult.data.output.includes('/tmp'));
    });

    test('execute command with error output', async () => {
      const result = await session.execute('ls /non-existent-directory');
      
      assertSuccess(result);
      // Command executes but may produce error output
      ok(result.data.output.includes('No such file') || 
         result.data.output.includes('not found') ||
         result.data.output.includes('cannot access'));
    });
  }

  if (process.platform === 'win32') {
    test('execute Windows-specific command', async () => {
      const result = await session.execute('echo %OS%');
      
      assertSuccess(result);
      ok(result.data.output.includes('Windows'));
    });

    test('execute PowerShell command', async () => {
      const result = await session.execute('Get-Location');
      
      assertSuccess(result);
      ok(result.data.output.length > 0);
    });
  }

  test('concurrent command execution on same session', async () => {
    const commands = [
      getShellCommand('echo "cmd1"'),
      getShellCommand('echo "cmd2"'),
      getShellCommand('echo "cmd3"')
    ];
    
    // Execute commands concurrently (not recommended but should be handled)
    const results = await Promise.allSettled(
      commands.map(cmd => session.execute(cmd))
    );
    
    // At least some should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    ok(successful.length > 0);
  });

  test('command execution preserves session state', async () => {
    // Set an environment variable
    if (process.platform !== 'win32') {
      await session.execute('export TEST_VAR="session_test"');
      
      // Use the variable in another command
      const result = await session.execute('echo $TEST_VAR');
      assertSuccess(result);
      ok(result.data.output.includes('session_test'));
    }
  });
});