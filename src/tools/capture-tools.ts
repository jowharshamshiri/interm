import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const captureTools: Tool[] = [
  {
    name: 'get_terminal_content',
    description: 'Get the current terminal content and state',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        includeFormatting: {
          type: 'boolean',
          description: 'Include ANSI formatting information',
          default: false
        },
        lastNLines: {
          type: 'number',
          description: 'Only return the last N lines of output',
          minimum: 1,
          maximum: 1000
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'screenshot_terminal',
    description: 'Take a screenshot of the terminal session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        format: {
          type: 'string',
          description: 'Screenshot format',
          enum: ['png', 'jpeg'],
          default: 'png'
        },
        theme: {
          type: 'string',
          description: 'Terminal color theme',
          enum: ['dark', 'light', 'auto'],
          default: 'dark'
        },
        fontSize: {
          type: 'number',
          description: 'Font size for terminal text',
          default: 14,
          minimum: 8,
          maximum: 32
        },
        fontFamily: {
          type: 'string',
          description: 'Font family for terminal text',
          default: 'monospace'
        },
        background: {
          type: 'string',
          description: 'Background color (hex)',
          pattern: '^#[0-9A-Fa-f]{6}$'
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'get_terminal_buffer',
    description: 'Get raw terminal buffer with scrollback history',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        includeScrollback: {
          type: 'boolean',
          description: 'Include scrollback buffer',
          default: true
        },
        maxLines: {
          type: 'number',
          description: 'Maximum number of lines to return',
          default: 1000,
          minimum: 10,
          maximum: 10000
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'watch_terminal_output',
    description: 'Start watching terminal output for changes',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        pattern: {
          type: 'string',
          description: 'Regex pattern to watch for in output'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds',
          default: 30000,
          minimum: 1000,
          maximum: 300000
        }
      },
      required: ['sessionId']
    }
  }
];