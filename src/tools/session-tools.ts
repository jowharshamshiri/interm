import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const sessionTools: Tool[] = [
  {
    name: 'create_terminal_session',
    description: 'Create a new terminal session with specified dimensions and shell',
    inputSchema: {
      type: 'object',
      properties: {
        cols: {
          type: 'number',
          description: 'Terminal width in columns',
          default: 80,
          minimum: 20,
          maximum: 300
        },
        rows: {
          type: 'number', 
          description: 'Terminal height in rows',
          default: 24,
          minimum: 10,
          maximum: 100
        },
        shell: {
          type: 'string',
          description: 'Shell to use (bash, zsh, fish, etc.)',
          default: 'bash'
        },
        workingDirectory: {
          type: 'string',
          description: 'Initial working directory'
        }
      }
    }
  },
  {
    name: 'list_terminal_sessions',
    description: 'List all active terminal sessions',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_terminal_session',
    description: 'Get details of a specific terminal session',
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
  },
  {
    name: 'close_terminal_session',
    description: 'Close a terminal session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID to close'
        }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'resize_terminal',
    description: 'Resize a terminal session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Terminal session ID'
        },
        cols: {
          type: 'number',
          description: 'New width in columns',
          minimum: 20,
          maximum: 300
        },
        rows: {
          type: 'number',
          description: 'New height in rows', 
          minimum: 10,
          maximum: 100
        }
      },
      required: ['sessionId', 'cols', 'rows']
    }
  }
];