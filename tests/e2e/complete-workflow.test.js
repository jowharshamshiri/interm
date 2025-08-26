import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { MCPTestClient, TestSession, assertSuccess, getShellCommand, sleep } from '../helpers/test-utils.js';

describe('Complete Workflow E2E Tests', () => {
  let client;

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.start();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  test('complete terminal session workflow', async () => {
    // 1. List tools
    const toolsList = await client.listTools();
    ok(toolsList.tools.length === 13);

    // 2. Create session
    const session = new TestSession(client);
    const sessionData = await session.create({
      cols: 100,
      rows: 30,
      shell: process.platform === 'win32' ? 'powershell.exe' : 'bash'
    });
    
    ok(sessionData.id);
    strictEqual(sessionData.cols, 100);
    strictEqual(sessionData.rows, 30);

    // 3. Wait for shell initialization
    await sleep(500);

    // 4. Execute basic command
    const echoResult = await session.execute(getShellCommand('echo "Hello, InTerm!"'));
    assertSuccess(echoResult);
    ok(echoResult.data.output.includes('Hello, InTerm!'));

    // 5. Get terminal content
    const contentResult = await session.getContent();
    assertSuccess(contentResult);
    ok(contentResult.data.content.includes('Hello, InTerm!'));

    // 6. Take screenshot
    const screenshotResult = await session.screenshot({
      format: 'png',
      theme: 'dark'
    });
    assertSuccess(screenshotResult);
    ok(screenshotResult.data.screenshot);

    // 7. Execute interactive command simulation
    await session.execute(getShellCommand('echo "Enter your name:"'), { expectOutput: false });
    await session.sendInput('TestUser\n');

    // 8. Send special keys
    await session.sendKeys('arrow_up');
    await session.sendKeys('ctrl+c');

    // 9. Get final content
    const finalContent = await session.getContent();
    assertSuccess(finalContent);

    // 10. List sessions (should include our session)
    const sessionsList = await client.callTool('list_terminal_sessions');
    assertSuccess(sessionsList);
    ok(sessionsList.data.sessions.some(s => s.id === sessionData.id));

    // 11. Close session
    await session.close();

    // 12. Verify session is closed
    const finalSessionsList = await client.callTool('list_terminal_sessions');
    assertSuccess(finalSessionsList);
    ok(!finalSessionsList.data.sessions.some(s => s.id === sessionData.id));
  });

  test('TUI development simulation workflow', async () => {
    const session = new TestSession(client);
    await session.create({ cols: 120, rows: 40 });
    await sleep(500);

    // Simulate TUI development workflow
    
    // 1. Start a simple TUI-like interface simulation
    if (process.platform !== 'win32') {
      // Create a simple menu-like interface
      await session.execute('clear');
      await session.execute('echo "=== TUI Application ==="');
      await session.execute('echo "1. Option One"');
      await session.execute('echo "2. Option Two"');
      await session.execute('echo "3. Exit"');
      await session.execute('echo -n "Select option: "');
      
      // Take screenshot of the "TUI"
      const tuiScreenshot = await session.screenshot();
      assertSuccess(tuiScreenshot);
      
      // Simulate user interaction
      await session.sendInput('1\n');
      
      // Simulate response
      await session.execute('echo "You selected Option One"');
      
      // Take another screenshot
      const responseScreenshot = await session.screenshot();
      assertSuccess(responseScreenshot);
      
      // Screenshots should be different
      ok(tuiScreenshot.data.screenshot !== responseScreenshot.data.screenshot);
    }
    
    await session.close();
  });

  test('CLI application testing workflow', async () => {
    const session = new TestSession(client);
    await session.create();
    await sleep(500);

    // Simulate CLI application testing workflow

    // 1. Test a CLI app (using built-in commands)
    if (process.platform !== 'win32') {
      // Test ls command with different options
      const lsBasic = await session.execute('ls -la');
      assertSuccess(lsBasic);
      
      const lsHelp = await session.execute('ls --help');
      assertSuccess(lsHelp);
      ok(lsHelp.data.output.includes('Usage') || lsHelp.data.output.includes('usage'));
    } else {
      // Test dir command on Windows
      const dirBasic = await session.execute('dir');
      assertSuccess(dirBasic);
      
      const dirHelp = await session.execute('dir /?');
      assertSuccess(dirHelp);
    }

    // 2. Capture terminal state after each test
    const terminalState = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      maxLines: 100
    });
    assertSuccess(terminalState);

    // 3. Test error conditions
    const errorResult = await session.execute('nonexistentcommand123');
    assertSuccess(errorResult);
    // Command executes but produces error output

    await session.close();
  });

  test('multi-session concurrent operations', async () => {
    const sessions = [];

    try {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const session = new TestSession(client);
        await session.create({
          cols: 80 + i * 10,
          rows: 24 + i * 5
        });
        sessions.push(session);
      }

      await sleep(500);

      // Execute different commands in each session concurrently
      const commands = [
        getShellCommand('echo "Session 1 output"'),
        getShellCommand('echo "Session 2 output"'),
        getShellCommand('echo "Session 3 output"')
      ];

      const executionPromises = sessions.map((session, i) =>
        session.execute(commands[i])
      );

      const results = await Promise.all(executionPromises);

      // All should succeed with different outputs
      for (let i = 0; i < results.length; i++) {
        assertSuccess(results[i]);
        ok(results[i].data.output.includes(`Session ${i + 1} output`));
      }

      // Take screenshots of all sessions
      const screenshotPromises = sessions.map(session => session.screenshot());
      const screenshots = await Promise.all(screenshotPromises);

      for (const screenshot of screenshots) {
        assertSuccess(screenshot);
        ok(screenshot.data.screenshot);
      }

      // Verify sessions are independent
      const sessionsList = await client.callTool('list_terminal_sessions');
      assertSuccess(sessionsList);
      ok(sessionsList.data.sessions.length >= 3);

    } finally {
      // Clean up all sessions
      for (const session of sessions) {
        await session.close().catch(() => {});
      }
    }
  });

  test('terminal automation with patterns', async () => {
    const session = new TestSession(client);
    await session.create();
    await sleep(500);

    // Start watching for a specific pattern
    const watchPromise = client.callTool('watch_terminal_output', {
      sessionId: session.sessionId,
      pattern: 'AUTOMATION_COMPLETE',
      timeout: 10000
    });

    // Execute a series of commands that eventually produce the pattern
    await session.execute(getShellCommand('echo "Starting automation..."'));
    await sleep(100);
    
    await session.execute(getShellCommand('echo "Step 1 complete"'));
    await sleep(100);
    
    await session.execute(getShellCommand('echo "Step 2 complete"'));
    await sleep(100);
    
    await session.execute(getShellCommand('echo "AUTOMATION_COMPLETE"'));

    // Wait for pattern match
    const watchResult = await watchPromise;
    assertSuccess(watchResult);
    ok(watchResult.data.matched);
    ok(watchResult.data.content.includes('AUTOMATION_COMPLETE'));

    await session.close();
  });

  test('terminal resize and adaptation workflow', async () => {
    const session = new TestSession(client);
    await session.create({ cols: 80, rows: 24 });
    await sleep(500);

    // Initial command
    await session.execute(getShellCommand('echo "Initial size test"'));
    
    // Take screenshot at original size
    const originalScreenshot = await session.screenshot();
    assertSuccess(originalScreenshot);

    // Resize terminal
    const resizeResult = await client.callTool('resize_terminal', {
      sessionId: session.sessionId,
      cols: 120,
      rows: 40
    });
    assertSuccess(resizeResult);

    // Execute command in resized terminal
    await session.execute(getShellCommand('echo "Resized terminal test"'));

    // Take screenshot at new size
    const resizedScreenshot = await session.screenshot();
    assertSuccess(resizedScreenshot);

    // Screenshots should be different sizes
    ok(originalScreenshot.data.size !== resizedScreenshot.data.size);

    // Get terminal content and verify dimensions
    const content = await session.getContent();
    assertSuccess(content);
    strictEqual(content.data.dimensions.cols, 120);
    strictEqual(content.data.dimensions.rows, 40);

    await session.close();
  });

  test('error handling and recovery workflow', async () => {
    const session = new TestSession(client);
    await session.create();
    await sleep(500);

    // Test various error conditions and recovery

    // 1. Execute invalid command
    const invalidResult = await session.execute('thisisnotavalidcommand123');
    assertSuccess(invalidResult); // Command executes but may produce error output

    // 2. Try operations on non-existent session
    const nonExistentResult = await client.callTool('get_terminal_session', {
      sessionId: 'non-existent-id'
    });
    ok(!nonExistentResult.success);

    // 3. Session should still be functional after errors
    const recoveryResult = await session.execute(getShellCommand('echo "Recovery test"'));
    assertSuccess(recoveryResult);
    ok(recoveryResult.data.output.includes('Recovery test'));

    // 4. Take screenshot to verify terminal is still functional
    const finalScreenshot = await session.screenshot();
    assertSuccess(finalScreenshot);

    await session.close();
  });

  test('comprehensive feature coverage workflow', async () => {
    const session = new TestSession(client);
    await session.create({ cols: 100, rows: 30 });
    await sleep(500);

    // Test every major feature in sequence

    // 1. Basic command execution
    await session.execute(getShellCommand('echo "Feature test starting"'));

    // 2. Text input
    await session.sendInput('manual input\n');

    // 3. Special keys
    const specialKeys = ['enter', 'tab', 'arrow_up', 'arrow_down'];
    for (const key of specialKeys) {
      await session.sendKeys(key);
    }

    // 4. Content capture with different options
    const basicContent = await session.getContent();
    const formattedContent = await session.getContent({ includeFormatting: true });
    const limitedContent = await session.getContent({ lastNLines: 5 });

    assertSuccess(basicContent);
    assertSuccess(formattedContent);
    assertSuccess(limitedContent);

    // 5. Buffer operations
    const fullBuffer = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      includeScrollback: true
    });
    const limitedBuffer = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      maxLines: 10
    });

    assertSuccess(fullBuffer);
    assertSuccess(limitedBuffer);

    // 6. Screenshots with different formats and options
    const pngScreenshot = await session.screenshot({ format: 'png' });
    const jpegScreenshot = await session.screenshot({ format: 'jpeg', quality: 80 });
    const themedScreenshot = await session.screenshot({ theme: 'light' });

    assertSuccess(pngScreenshot);
    assertSuccess(jpegScreenshot);
    assertSuccess(themedScreenshot);

    // 7. Session management operations
    const sessionInfo = await client.callTool('get_terminal_session', {
      sessionId: session.sessionId
    });
    assertSuccess(sessionInfo);

    const sessionsList = await client.callTool('list_terminal_sessions');
    assertSuccess(sessionsList);

    // 8. Resize operation
    await client.callTool('resize_terminal', {
      sessionId: session.sessionId,
      cols: 90,
      rows: 25
    });

    // 9. Final verification
    const finalContent = await session.getContent();
    assertSuccess(finalContent);
    strictEqual(finalContent.data.dimensions.cols, 90);
    strictEqual(finalContent.data.dimensions.rows, 25);

    await session.close();
  });
});