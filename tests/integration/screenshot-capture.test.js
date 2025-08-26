import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { MCPTestClient, TestSession, assertSuccess, assertError, getShellCommand, sleep } from '../helpers/test-utils.js';

describe('Screenshot and Capture Integration', () => {
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

  test('take PNG screenshot of terminal', async () => {
    // Add some content to screenshot
    await session.execute(getShellCommand('echo "Screenshot Test Content"'));
    
    const result = await session.screenshot({ format: 'png' });
    
    assertSuccess(result);
    ok(result.data.screenshot);
    strictEqual(result.data.format, 'png');
    ok(result.data.size > 0);
    
    // Verify it's a valid base64 PNG
    const buffer = Buffer.from(result.data.screenshot, 'base64');
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    ok(buffer.subarray(0, 8).equals(pngSignature), 'Should be valid PNG');
  });

  test('take JPEG screenshot of terminal', async () => {
    await session.execute(getShellCommand('echo "JPEG Screenshot Test"'));
    
    const result = await session.screenshot({
      format: 'jpeg',
      quality: 80
    });
    
    assertSuccess(result);
    ok(result.data.screenshot);
    strictEqual(result.data.format, 'jpeg');
    
    // Verify it's a valid base64 JPEG
    const buffer = Buffer.from(result.data.screenshot, 'base64');
    const jpegSignature = Buffer.from([255, 216, 255]);
    ok(buffer.subarray(0, 3).equals(jpegSignature), 'Should be valid JPEG');
  });

  test('screenshot with custom theme and font settings', async () => {
    await session.execute(getShellCommand('echo "Custom Theme Test"'));
    
    const lightResult = await session.screenshot({
      theme: 'light',
      fontSize: 16,
      fontFamily: 'Courier New'
    });
    
    const darkResult = await session.screenshot({
      theme: 'dark',
      fontSize: 12,
      fontFamily: 'monospace'
    });
    
    assertSuccess(lightResult);
    assertSuccess(darkResult);
    
    // Different themes should produce different images
    ok(lightResult.data.screenshot !== darkResult.data.screenshot);
  });

  test('screenshot with custom background color', async () => {
    await session.execute(getShellCommand('echo "Custom Background Test"'));
    
    const result = await session.screenshot({
      background: '#ff0000'
    });
    
    assertSuccess(result);
    ok(result.data.screenshot);
  });

  test('screenshot of empty terminal', async () => {
    // Don't execute any commands, screenshot empty terminal
    const result = await session.screenshot();
    
    assertSuccess(result);
    ok(result.data.screenshot);
    ok(result.data.size > 0);
  });

  test('screenshot after multiple commands', async () => {
    // Execute several commands to fill the terminal
    const commands = [
      'echo "Line 1: First command output"',
      'echo "Line 2: Second command output"',
      'echo "Line 3: Third command output"'
    ];
    
    for (const cmd of commands) {
      await session.execute(getShellCommand(cmd));
    }
    
    const result = await session.screenshot();
    
    assertSuccess(result);
    ok(result.data.screenshot);
  });

  test('get terminal content with formatting', async () => {
    await session.execute(getShellCommand('echo "Content with formatting test"'));
    
    const result = await session.getContent({ includeFormatting: true });
    
    assertSuccess(result);
    ok(result.data.content);
    ok(result.data.cursor);
    ok(typeof result.data.cursor.x === 'number');
    ok(typeof result.data.cursor.y === 'number');
    ok(typeof result.data.cursor.visible === 'boolean');
    ok(result.data.dimensions);
    strictEqual(typeof result.data.dimensions.cols, 'number');
    strictEqual(typeof result.data.dimensions.rows, 'number');
    ok(result.data.attributes);
  });

  test('get terminal content without formatting', async () => {
    await session.execute(getShellCommand('echo "Simple content test"'));
    
    const result = await session.getContent({ includeFormatting: false });
    
    assertSuccess(result);
    ok(result.data.content.includes('Simple content test'));
    ok(result.data.cursor);
    ok(result.data.dimensions);
    // Should not include attributes when formatting is disabled
    ok(!result.data.attributes);
  });

  test('get terminal buffer with different options', async () => {
    // Generate some content
    for (let i = 0; i < 10; i++) {
      await session.execute(getShellCommand(`echo "Buffer line ${i}"`));
    }
    
    const fullBufferResult = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      includeScrollback: true,
      maxLines: 1000
    });
    
    const limitedBufferResult = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      includeScrollback: false,
      maxLines: 5
    });
    
    assertSuccess(fullBufferResult);
    assertSuccess(limitedBufferResult);
    
    ok(fullBufferResult.data.lineCount >= limitedBufferResult.data.lineCount);
  });

  test('screenshot different terminal sizes', async () => {
    // Resize terminal and take screenshot
    await client.callTool('resize_terminal', {
      sessionId: session.sessionId,
      cols: 120,
      rows: 40
    });
    
    await session.execute(getShellCommand('echo "Large terminal screenshot"'));
    
    const largeResult = await session.screenshot();
    
    // Resize to smaller
    await client.callTool('resize_terminal', {
      sessionId: session.sessionId,
      cols: 60,
      rows: 20
    });
    
    await session.execute(getShellCommand('echo "Small terminal screenshot"'));
    
    const smallResult = await session.screenshot();
    
    assertSuccess(largeResult);
    assertSuccess(smallResult);
    
    // Larger terminal should produce larger image
    ok(largeResult.data.size > smallResult.data.size);
  });

  test('screenshot with special characters and unicode', async () => {
    const specialChars = 'Special: àáâãäåæçèéêë ñõ 中文测试 🚀🎉💻';
    await session.execute(getShellCommand(`echo "${specialChars}"`));
    
    const result = await session.screenshot();
    
    assertSuccess(result);
    ok(result.data.screenshot);
  });

  test('screenshot non-existent session fails', async () => {
    const result = await client.callTool('screenshot_terminal', {
      sessionId: 'non-existent-session'
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('get content from non-existent session fails', async () => {
    const result = await client.callTool('get_terminal_content', {
      sessionId: 'non-existent-session'
    });
    
    assertError(result, 'SESSION_NOT_FOUND');
  });

  test('concurrent screenshot operations', async () => {
    await session.execute(getShellCommand('echo "Concurrent screenshot test"'));
    
    const promises = Array(3).fill(null).map(() => session.screenshot());
    const results = await Promise.all(promises);
    
    for (const result of results) {
      assertSuccess(result);
      ok(result.data.screenshot);
    }
    
    // All screenshots should be identical (same content at same time)
    const screenshots = results.map(r => r.data.screenshot);
    ok(screenshots.every(s => s === screenshots[0]));
  });

  test('screenshot quality affects file size', async () => {
    await session.execute(getShellCommand('echo "Quality test content"'));
    
    const highQuality = await session.screenshot({
      format: 'jpeg',
      quality: 95
    });
    
    const lowQuality = await session.screenshot({
      format: 'jpeg',
      quality: 10
    });
    
    assertSuccess(highQuality);
    assertSuccess(lowQuality);
    
    // Higher quality should produce larger file
    ok(highQuality.data.size > lowQuality.data.size);
  });

  test('font size affects screenshot size', async () => {
    await session.execute(getShellCommand('echo "Font size test"'));
    
    const smallFont = await session.screenshot({ fontSize: 8 });
    const largeFont = await session.screenshot({ fontSize: 24 });
    
    assertSuccess(smallFont);
    assertSuccess(largeFont);
    
    // Larger font should produce larger image
    ok(largeFont.data.size > smallFont.data.size);
  });

  // Test error conditions
  test('screenshot with invalid format parameter', async () => {
    try {
      await session.screenshot({ format: 'invalid' });
      ok(false, 'Should have thrown error for invalid format');
    } catch (error) {
      ok(error.message);
    }
  });

  test('screenshot with invalid background color', async () => {
    try {
      await session.screenshot({ background: 'invalid-color' });
      ok(false, 'Should have thrown error for invalid color');
    } catch (error) {
      ok(error.message);
    }
  });

  test('content capture preserves line breaks', async () => {
    await session.execute(getShellCommand('echo -e "Line 1\\nLine 2\\nLine 3"'));
    
    const result = await session.getContent();
    
    assertSuccess(result);
    const lines = result.data.content.split('\n');
    ok(lines.length >= 3);
  });

  test('buffer capture with maxLines limitation', async () => {
    // Generate many lines
    for (let i = 0; i < 20; i++) {
      await session.execute(getShellCommand(`echo "Line ${i}"`));
    }
    
    const result = await client.callTool('get_terminal_buffer', {
      sessionId: session.sessionId,
      maxLines: 10
    });
    
    assertSuccess(result);
    ok(result.data.lineCount <= 10);
    strictEqual(typeof result.data.truncated, 'boolean');
  });
});