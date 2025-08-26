import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const clipboardTools: Tool[] = [
  {
    name: 'clipboard_read',
    description: 'Read content from system clipboard',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        format: {
          type: 'string',
          description: 'Format to read from clipboard',
          enum: ['text', 'html', 'rtf', 'image', 'files'],
          default: 'text'
        },
        encoding: {
          type: 'string',
          description: 'Text encoding',
          enum: ['utf-8', 'utf-16', 'ascii', 'latin1'],
          default: 'utf-8'
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'clipboard_write',
    description: 'Write content to system clipboard',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        content: {
          type: 'string',
          description: 'Content to write to clipboard'
        },
        format: {
          type: 'string',
          description: 'Format of content',
          enum: ['text', 'html', 'rtf'],
          default: 'text'
        },
        preserveFormatting: {
          type: 'boolean',
          description: 'Preserve text formatting',
          default: false
        }
      },
      required: ['sessionId', 'content']
    }
  },
  {
    name: 'text_select',
    description: 'Select text in terminal using various methods',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        method: {
          type: 'string',
          description: 'Selection method',
          enum: ['coordinates', 'word', 'line', 'paragraph', 'all', 'pattern']
        },
        startX: {
          type: 'number',
          description: 'Selection start X coordinate (for coordinates method)',
          minimum: 0
        },
        startY: {
          type: 'number',
          description: 'Selection start Y coordinate (for coordinates method)',
          minimum: 0
        },
        endX: {
          type: 'number',
          description: 'Selection end X coordinate (for coordinates method)',
          minimum: 0
        },
        endY: {
          type: 'number',
          description: 'Selection end Y coordinate (for coordinates method)',
          minimum: 0
        },
        pattern: {
          type: 'string',
          description: 'Regex pattern to select (for pattern method)'
        },
        wordX: {
          type: 'number',
          description: 'X coordinate for word selection',
          minimum: 0
        },
        wordY: {
          type: 'number',
          description: 'Y coordinate for word selection',
          minimum: 0
        },
        extend: {
          type: 'boolean',
          description: 'Extend current selection',
          default: false
        }
      },
      required: ['sessionId', 'method']
    }
  },
  {
    name: 'text_copy',
    description: 'Copy selected or specified text to clipboard',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        source: {
          type: 'string',
          description: 'Source of text to copy',
          enum: ['selection', 'screen', 'scrollback', 'coordinates'],
          default: 'selection'
        },
        startX: {
          type: 'number',
          description: 'Start X coordinate (for coordinates source)',
          minimum: 0
        },
        startY: {
          type: 'number',
          description: 'Start Y coordinate (for coordinates source)',
          minimum: 0
        },
        endX: {
          type: 'number',
          description: 'End X coordinate (for coordinates source)',
          minimum: 0
        },
        endY: {
          type: 'number',
          description: 'End Y coordinate (for coordinates source)',
          minimum: 0
        },
        includeFormatting: {
          type: 'boolean',
          description: 'Include ANSI formatting codes',
          default: false
        },
        stripWhitespace: {
          type: 'boolean',
          description: 'Strip trailing whitespace',
          default: true
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'text_paste',
    description: 'Paste text from clipboard to terminal',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        source: {
          type: 'string',
          description: 'Source of text to paste',
          enum: ['clipboard', 'history', 'text'],
          default: 'clipboard'
        },
        text: {
          type: 'string',
          description: 'Text to paste (for text source)'
        },
        historyIndex: {
          type: 'number',
          description: 'History index to paste from (for history source)',
          minimum: 0
        },
        processing: {
          type: 'string',
          description: 'Text processing options',
          enum: ['raw', 'escape_special', 'convert_newlines', 'strip_formatting'],
          default: 'raw'
        },
        confirmation: {
          type: 'boolean',
          description: 'Require confirmation for large pastes',
          default: true
        },
        chunkSize: {
          type: 'number',
          description: 'Characters to paste per chunk (0 = all at once)',
          default: 0,
          minimum: 0,
          maximum: 10000
        },
        chunkDelay: {
          type: 'number',
          description: 'Delay between chunks in milliseconds',
          default: 10,
          minimum: 1,
          maximum: 1000
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'clipboard_history',
    description: 'Manage clipboard history and multiple clipboard entries',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        action: {
          type: 'string',
          description: 'History action to perform',
          enum: ['list', 'get', 'add', 'remove', 'clear']
        },
        index: {
          type: 'number',
          description: 'History index (for get/remove actions)',
          minimum: 0
        },
        content: {
          type: 'string',
          description: 'Content to add (for add action)'
        },
        maxEntries: {
          type: 'number',
          description: 'Maximum history entries to maintain',
          default: 20,
          minimum: 1,
          maximum: 100
        }
      },
      required: ['sessionId', 'action']
    }
  },
  {
    name: 'multi_select',
    description: 'Create multiple non-contiguous text selections',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        selections: {
          type: 'array',
          description: 'Array of selection regions',
          items: {
            type: 'object',
            properties: {
              startX: { type: 'number', minimum: 0 },
              startY: { type: 'number', minimum: 0 },
              endX: { type: 'number', minimum: 0 },
              endY: { type: 'number', minimum: 0 },
              type: {
                type: 'string',
                enum: ['rectangle', 'line', 'word'],
                default: 'rectangle'
              }
            },
            required: ['startX', 'startY', 'endX', 'endY']
          },
          minItems: 1,
          maxItems: 10
        },
        operation: {
          type: 'string',
          description: 'Operation to perform on selections',
          enum: ['select', 'copy', 'highlight', 'clear'],
          default: 'select'
        }
      },
      required: ['sessionId', 'selections']
    }
  },
  {
    name: 'selection_info',
    description: 'Get information about current text selection',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        includeContent: {
          type: 'boolean',
          description: 'Include selected text content',
          default: true
        },
        includeFormatting: {
          type: 'boolean',
          description: 'Include formatting information',
          default: false
        }
      },
      required: ['sessionId']
    }
  }
];