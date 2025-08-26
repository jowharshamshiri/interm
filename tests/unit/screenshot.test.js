import { test, describe } from 'node:test';
import { strictEqual, ok, throws, rejects } from 'node:assert';
import { TerminalScreenshot } from '../../dist/screenshot.js';

describe('TerminalScreenshot', () => {
  const mockTerminalState = {
    content: 'Hello, World!\nThis is a test terminal\n$ ',
    cursor: {
      x: 2,
      y: 2,
      visible: true
    },
    dimensions: {
      cols: 80,
      rows: 24
    },
    attributes: []
  };

  test('captureTerminal generates PNG by default', async () => {
    const buffer = await TerminalScreenshot.captureTerminal(mockTerminalState);
    
    ok(Buffer.isBuffer(buffer));
    ok(buffer.length > 0);
    
    // Check PNG signature
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    ok(buffer.subarray(0, 8).equals(pngSignature), 'Should generate valid PNG');
  });

  test('captureTerminal generates JPEG when requested', async () => {
    const buffer = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      format: 'jpeg',
      quality: 80
    });
    
    ok(Buffer.isBuffer(buffer));
    ok(buffer.length > 0);
    
    // Check JPEG signature
    const jpegSignature = Buffer.from([255, 216, 255]);
    ok(buffer.subarray(0, 3).equals(jpegSignature), 'Should generate valid JPEG');
  });

  test('captureTerminal respects font size option', async () => {
    const smallFont = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      fontSize: 8
    });
    
    const largeFont = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      fontSize: 24
    });
    
    ok(largeFont.length > smallFont.length, 'Larger font should produce larger image');
  });

  test('captureTerminal uses dark theme by default', async () => {
    const darkTheme = await TerminalScreenshot.captureTerminal(mockTerminalState);
    
    const lightTheme = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      theme: 'light'
    });
    
    ok(darkTheme.length !== lightTheme.length, 'Different themes should produce different images');
  });

  test('captureTerminal handles custom background color', async () => {
    const customBg = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      background: '#ff0000'
    });
    
    ok(Buffer.isBuffer(customBg));
    ok(customBg.length > 0);
  });

  test('captureTerminal handles custom font family', async () => {
    const customFont = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      fontFamily: 'Courier New'
    });
    
    ok(Buffer.isBuffer(customFont));
    ok(customFont.length > 0);
  });

  test('captureTerminal handles empty terminal content', async () => {
    const emptyState = {
      ...mockTerminalState,
      content: ''
    };
    
    const buffer = await TerminalScreenshot.captureTerminal(emptyState);
    
    ok(Buffer.isBuffer(buffer));
    ok(buffer.length > 0);
  });

  test('captureTerminal handles large terminal content', async () => {
    const largeContent = Array(1000).fill('This is line content').join('\n');
    const largeState = {
      ...mockTerminalState,
      content: largeContent,
      dimensions: { cols: 80, rows: 1000 }
    };
    
    const buffer = await TerminalScreenshot.captureTerminal(largeState);
    
    ok(Buffer.isBuffer(buffer));
    ok(buffer.length > 0);
  });

  test('captureTerminal handles special characters', async () => {
    const specialState = {
      ...mockTerminalState,
      content: 'Special chars: àáâãäåæçèéêë ñõ\n中文测试\n🚀🎉💻'
    };
    
    const buffer = await TerminalScreenshot.captureTerminal(specialState);
    
    ok(Buffer.isBuffer(buffer));
    ok(buffer.length > 0);
  });

  test('captureTerminal handles XML-unsafe characters', async () => {
    const unsafeState = {
      ...mockTerminalState,
      content: 'XML unsafe: <tag> & "quotes" \' apostrophes'
    };
    
    const buffer = await TerminalScreenshot.captureTerminal(unsafeState);
    
    ok(Buffer.isBuffer(buffer));
    ok(buffer.length > 0);
  });

  test('captureTerminal includes cursor when visible', async () => {
    const visibleCursor = await TerminalScreenshot.captureTerminal(mockTerminalState);
    
    const invisibleCursorState = {
      ...mockTerminalState,
      cursor: { ...mockTerminalState.cursor, visible: false }
    };
    const invisibleCursor = await TerminalScreenshot.captureTerminal(invisibleCursorState);
    
    ok(visibleCursor.length !== invisibleCursor.length, 'Cursor visibility should affect image');
  });

  test('captureTerminal handles different terminal dimensions', async () => {
    const wideState = {
      ...mockTerminalState,
      dimensions: { cols: 120, rows: 30 }
    };
    
    const narrowState = {
      ...mockTerminalState,
      dimensions: { cols: 40, rows: 10 }
    };
    
    const wideBuffer = await TerminalScreenshot.captureTerminal(wideState);
    const narrowBuffer = await TerminalScreenshot.captureTerminal(narrowState);
    
    ok(wideBuffer.length !== narrowBuffer.length, 'Different dimensions should produce different images');
  });

  test('captureTerminal validates quality parameter for JPEG', async () => {
    const highQuality = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      format: 'jpeg',
      quality: 95
    });
    
    const lowQuality = await TerminalScreenshot.captureTerminal(mockTerminalState, {
      format: 'jpeg',
      quality: 10
    });
    
    ok(highQuality.length > lowQuality.length, 'Higher quality should produce larger JPEG');
  });

  test('captureTerminal throws error for invalid options', async () => {
    await rejects(
      TerminalScreenshot.captureTerminal({
        ...mockTerminalState,
        content: null // Invalid content
      }),
      Error
    );
  });

  test('captureTerminal handles cursor at different positions', async () => {
    const topLeft = {
      ...mockTerminalState,
      cursor: { x: 0, y: 0, visible: true }
    };
    
    const bottomRight = {
      ...mockTerminalState,
      cursor: { x: 79, y: 23, visible: true }
    };
    
    const topLeftBuffer = await TerminalScreenshot.captureTerminal(topLeft);
    const bottomRightBuffer = await TerminalScreenshot.captureTerminal(bottomRight);
    
    ok(topLeftBuffer.length !== bottomRightBuffer.length, 'Cursor position should affect image');
  });
});