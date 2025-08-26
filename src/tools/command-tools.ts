import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const commandTools: Tool[] = [
  {
    name: 'execute_command',
    description: 'Execute a command in a terminal session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        command: {
          type: 'string',
          description: 'Command to execute'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (0 for no timeout)',
          default: 60000,
          minimum: 0,
          maximum: 0
        },
        expectOutput: {
          type: 'boolean',
          description: 'Whether to wait for and capture output',
          default: true
        },
        workingDirectory: {
          type: 'string',
          description: 'Working directory for command execution'
        },
        environment: {
          type: 'object',
          description: 'Environment variables for command',
          additionalProperties: {
            type: 'string'
          }
        }
      },
      required: ['sessionId', 'command']
    }
  },
  {
    name: 'send_input',
    description: 'Send input to a terminal session (for interactive commands)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        input: {
          type: 'string',
          description: 'Input to send to the terminal'
        }
      },
      required: ['sessionId', 'input']
    }
  },
  {
    name: 'send_keys',
    description: 'Send special keys or key combinations to terminal',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        keys: {
          type: 'string',
          description: 'Keys to send (e.g., "ctrl+c", "enter", "tab", "arrow_up")',
          enum: [
            'enter', 'tab', 'space', 'backspace', 'delete',
            'arrow_up', 'arrow_down', 'arrow_left', 'arrow_right',
            'home', 'end', 'page_up', 'page_down',
            'ctrl+c', 'ctrl+d', 'ctrl+z', 'ctrl+l',
            'escape', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6',
            'f7', 'f8', 'f9', 'f10', 'f11', 'f12'
          ]
        }
      },
      required: ['sessionId', 'keys']
    }
  },
  {
    name: 'interrupt_command',
    description: 'Send interrupt signal (Ctrl+C) to running command',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        }
      },
      required: ['sessionId']
    }
  }
];