import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const keyboardTools: Tool[] = [
  {
    name: 'send_function_keys',
    description: 'Send function keys F1-F24 and extended function keys',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        functionKey: {
          type: 'string',
          description: 'Function key to send',
          enum: [
            'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
            'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21', 'f22', 'f23', 'f24',
            'shift+f1', 'shift+f2', 'shift+f3', 'shift+f4', 'shift+f5', 'shift+f6',
            'shift+f7', 'shift+f8', 'shift+f9', 'shift+f10', 'shift+f11', 'shift+f12',
            'ctrl+f1', 'ctrl+f2', 'ctrl+f3', 'ctrl+f4', 'ctrl+f5', 'ctrl+f6',
            'ctrl+f7', 'ctrl+f8', 'ctrl+f9', 'ctrl+f10', 'ctrl+f11', 'ctrl+f12',
            'alt+f1', 'alt+f2', 'alt+f3', 'alt+f4', 'alt+f5', 'alt+f6',
            'alt+f7', 'alt+f8', 'alt+f9', 'alt+f10', 'alt+f11', 'alt+f12'
          ]
        }
      },
      required: ['sessionId', 'functionKey']
    }
  },
  {
    name: 'send_modifier_combination',
    description: 'Send complex modifier key combinations',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        modifiers: {
          type: 'array',
          description: 'List of modifier keys to hold',
          items: {
            type: 'string',
            enum: ['ctrl', 'alt', 'shift', 'meta', 'cmd']
          }
        },
        key: {
          type: 'string',
          description: 'Primary key to press with modifiers'
        }
      },
      required: ['sessionId', 'modifiers', 'key']
    }
  },
  {
    name: 'send_navigation_keys',
    description: 'Send navigation and editing keys with modifiers',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        navigationKey: {
          type: 'string',
          description: 'Navigation key to send',
          enum: [
            'home', 'end', 'page_up', 'page_down', 'insert', 'delete',
            'ctrl+home', 'ctrl+end', 'ctrl+page_up', 'ctrl+page_down',
            'shift+home', 'shift+end', 'shift+page_up', 'shift+page_down',
            'ctrl+shift+home', 'ctrl+shift+end', 'ctrl+shift+left', 'ctrl+shift+right',
            'alt+left', 'alt+right', 'alt+up', 'alt+down'
          ]
        }
      },
      required: ['sessionId', 'navigationKey']
    }
  },
  {
    name: 'send_editing_shortcuts',
    description: 'Send common editing shortcuts and sequences',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        editingAction: {
          type: 'string',
          description: 'Editing action to perform',
          enum: [
            'cut', 'copy', 'paste', 'select_all', 'undo', 'redo',
            'find', 'find_next', 'find_previous', 'replace',
            'save', 'new', 'open', 'close', 'quit',
            'bold', 'italic', 'underline'
          ]
        },
        platform: {
          type: 'string',
          description: 'Platform-specific shortcuts',
          enum: ['auto', 'windows', 'macos', 'linux'],
          default: 'auto'
        }
      },
      required: ['sessionId', 'editingAction']
    }
  },
  {
    name: 'send_key_sequence',
    description: 'Send a sequence of keys with timing control',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        sequence: {
          type: 'array',
          description: 'Sequence of keys/actions to send',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['key', 'text', 'delay', 'modifier_down', 'modifier_up']
              },
              value: {
                type: 'string',
                description: 'Key, text, or modifier name'
              },
              delay: {
                type: 'number',
                description: 'Delay in milliseconds (for delay type)',
                minimum: 0,
                maximum: 10000
              }
            },
            required: ['type']
          }
        },
        repeatCount: {
          type: 'number',
          description: 'Number of times to repeat the sequence',
          default: 1,
          minimum: 1,
          maximum: 100
        }
      },
      required: ['sessionId', 'sequence']
    }
  },
  {
    name: 'send_simultaneous_keys',
    description: 'Send multiple keys pressed simultaneously (chords)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        keys: {
          type: 'array',
          description: 'Keys to press simultaneously',
          items: {
            type: 'string'
          },
          minItems: 2,
          maxItems: 5
        },
        holdDuration: {
          type: 'number',
          description: 'Duration to hold keys in milliseconds',
          default: 100,
          minimum: 10,
          maximum: 5000
        }
      },
      required: ['sessionId', 'keys']
    }
  },
  {
    name: 'send_key_with_hold',
    description: 'Send key with specific hold duration for auto-repeat',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        key: {
          type: 'string',
          description: 'Key to hold and repeat'
        },
        holdDuration: {
          type: 'number',
          description: 'Duration to hold key in milliseconds',
          minimum: 100,
          maximum: 10000
        },
        repeatRate: {
          type: 'number',
          description: 'Key repeat rate (keys per second)',
          default: 10,
          minimum: 1,
          maximum: 50
        }
      },
      required: ['sessionId', 'key', 'holdDuration']
    }
  },
  {
    name: 'send_unicode_input',
    description: 'Send Unicode characters and international input',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        text: {
          type: 'string',
          description: 'Unicode text to input'
        },
        inputMethod: {
          type: 'string',
          description: 'Input method to use',
          enum: ['direct', 'compose', 'ime', 'alt_codes'],
          default: 'direct'
        },
        locale: {
          type: 'string',
          description: 'Locale for input method (e.g., ja-JP, zh-CN)',
          pattern: '^[a-z]{2}-[A-Z]{2}$'
        }
      },
      required: ['sessionId', 'text']
    }
  }
];