import sharp from 'sharp';
import { ScreenshotOptions, TerminalState } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export class TerminalScreenshot {
  private static readonly DEFAULT_THEME = {
    dark: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      colors: {
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      }
    },
    light: {
      background: '#ffffff',
      foreground: '#383a42',
      colors: {
        black: '#383a42',
        red: '#e45649',
        green: '#50a14f',
        yellow: '#c18401',
        blue: '#0184bc',
        magenta: '#a626a4',
        cyan: '#0997b3',
        white: '#fafafa',
        brightBlack: '#4f525e',
        brightRed: '#e45649',
        brightGreen: '#50a14f',
        brightYellow: '#c18401',
        brightBlue: '#0184bc',
        brightMagenta: '#a626a4',
        brightCyan: '#0997b3',
        brightWhite: '#ffffff'
      }
    }
  };

  static async captureTerminal(
    terminalState: TerminalState,
    options: ScreenshotOptions = {}
  ): Promise<Buffer> {
    try {
      const {
        format = 'png',
        quality = 90,
        fontSize = 14,
        fontFamily = 'monospace',
        theme = 'dark',
        background
      } = options;

      const selectedTheme = this.DEFAULT_THEME[theme];
      const bgColor = background || selectedTheme.background;
      
      // Calculate image dimensions based on terminal size
      const charWidth = Math.ceil(fontSize * 0.6); // Approximate monospace character width
      const lineHeight = Math.ceil(fontSize * 1.2); // Line height with spacing
      
      const width = terminalState.dimensions.cols * charWidth + 40; // Add padding
      const height = terminalState.dimensions.rows * lineHeight + 40;

      // Create SVG representation of terminal content
      const svg = this.createTerminalSVG(terminalState, {
        width,
        height,
        fontSize,
        fontFamily,
        theme: selectedTheme,
        background: bgColor
      });

      // Convert SVG to image using Sharp
      let image = sharp(Buffer.from(svg))
        .resize(width, height);

      if (format === 'jpeg') {
        image = image.jpeg({ quality });
      } else {
        image = image.png();
      }

      return await image.toBuffer();

    } catch (error) {
      throw createTerminalError('SCREENSHOT_ERROR', `Failed to capture terminal screenshot: ${error}`);
    }
  }

  private static createTerminalSVG(
    terminalState: TerminalState,
    options: {
      width: number;
      height: number;
      fontSize: number;
      fontFamily: string;
      theme: any;
      background: string;
    }
  ): string {
    const { width, height, fontSize, fontFamily, theme, background } = options;
    const charWidth = Math.ceil(fontSize * 0.6);
    const lineHeight = Math.ceil(fontSize * 1.2);
    const padding = 20;

    // Split content into lines
    const lines = terminalState.content.split('\n');
    const maxLines = Math.min(lines.length, terminalState.dimensions.rows);

    let textElements = '';
    
    for (let i = 0; i < maxLines; i++) {
      const line = lines[i] || '';
      const y = padding + (i + 1) * lineHeight;
      
      // Simple text rendering - in a real implementation, you'd parse ANSI codes
      const escapedLine = this.escapeXml(line);
      textElements += `<text x="${padding}" y="${y}" fill="${theme.foreground}" font-size="${fontSize}" font-family="${fontFamily}">${escapedLine}</text>\n`;
    }

    // Add cursor if visible
    if (terminalState.cursor.visible) {
      const cursorX = padding + terminalState.cursor.x * charWidth;
      const cursorY = padding + terminalState.cursor.y * lineHeight;
      textElements += `<rect x="${cursorX}" y="${cursorY - fontSize}" width="${charWidth}" height="${lineHeight}" fill="${theme.foreground}" opacity="0.7"/>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${textElements}
</svg>`;
  }

  private static escapeXml(text: string): string {
    // First, remove ANSI escape sequences that cause XML parsing issues
    const cleanText = this.stripAnsiSequences(text);
    
    return cleanText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // Remove any remaining control characters that could corrupt XML
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private static stripAnsiSequences(text: string): string {
    // Remove ANSI escape sequences: ESC[...m (colors), ESC[...J (clear), ESC[...H (cursor), etc.
    return text
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // Standard ANSI escape sequences
      .replace(/\x1b\][0-9]*;[^\x07]*\x07/g, '') // OSC sequences
      .replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '') // String terminators
      .replace(/\x1b./g, ''); // Any remaining escape sequences
  }
}