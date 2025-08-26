import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TerminalManager } from '../terminal-manager.js';
import { EnvironmentManager } from '../environment-manager.js';
import { ToolResult } from '../types.js';
import { handleError } from '../utils/error-utils.js';

const terminalManager = TerminalManager.getInstance();
const environmentManager = EnvironmentManager.getInstance();

// Set environment variable for a terminal session
export const setEnvironmentVariable: Tool = {
  name: 'set_environment_variable',
  description: 'Set an environment variable for a specific terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      name: {
        type: 'string',
        description: 'Environment variable name'
      },
      value: {
        type: 'string',
        description: 'Environment variable value'
      },
      export: {
        type: 'boolean',
        description: 'Whether to export the variable (default: true)',
        default: true
      }
    },
    required: ['sessionId', 'name', 'value']
  }
};

export async function handleSetEnvironmentVariable({ sessionId, name, value, export: exportVar = true }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    if (exportVar) {
      await environmentManager.exportVariable(sessionId, name, value);
      // Send export command to actual terminal
      await terminalManager.sendInput(sessionId, `export ${name}="${value}"\n`);
    } else {
      await environmentManager.setVariable(sessionId, name, value);
    }

    return {
      success: true,
      data: {
        sessionId,
        name,
        value,
        exported: exportVar,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to set environment variable').message,
        details: { sessionId, name, value }
      }
    };
  }
}

// Get environment variable from a terminal session
export const getEnvironmentVariable: Tool = {
  name: 'get_environment_variable',
  description: 'Get the value of an environment variable from a terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      name: {
        type: 'string',
        description: 'Environment variable name'
      }
    },
    required: ['sessionId', 'name']
  }
};

export async function handleGetEnvironmentVariable({ sessionId, name }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const variable = await environmentManager.getVariable(sessionId, name);
    
    return {
      success: true,
      data: {
        variable: variable,
        found: variable !== null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to get environment variable').message,
        details: { sessionId, name }
      }
    };
  }
}

// List all environment variables for a terminal session
export const listEnvironmentVariables: Tool = {
  name: 'list_environment_variables',
  description: 'List all environment variables for a terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      includeSystem: {
        type: 'boolean',
        description: 'Include system environment variables (default: false)',
        default: false
      }
    },
    required: ['sessionId']
  }
};

export async function handleListEnvironmentVariables({ sessionId, includeSystem = false }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const sessionVars = await environmentManager.getAllVariables(sessionId);
    let variables = sessionVars;

    if (includeSystem) {
      const systemVars = await environmentManager.getSystemEnvironment();
      variables = [...sessionVars, ...systemVars];
    }

    return {
      success: true,
      data: {
        variables,
        count: variables.length,
        sessionId,
        includeSystem
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to list environment variables').message,
        details: { sessionId }
      }
    };
  }
}

// Unset environment variable from a terminal session
export const unsetEnvironmentVariable: Tool = {
  name: 'unset_environment_variable',
  description: 'Remove an environment variable from a terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      name: {
        type: 'string',
        description: 'Environment variable name'
      }
    },
    required: ['sessionId', 'name']
  }
};

export async function handleUnsetEnvironmentVariable({ sessionId, name }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    const removed = await environmentManager.unsetVariable(sessionId, name);
    
    // Send unset command to actual terminal
    await terminalManager.sendInput(sessionId, `unset ${name}\n`);

    return {
      success: true,
      data: {
        sessionId,
        name,
        removed,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to unset environment variable').message,
        details: { sessionId, name }
      }
    };
  }
}

// Change working directory for a terminal session
export const changeWorkingDirectory: Tool = {
  name: 'change_working_directory',
  description: 'Change the current working directory for a terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      path: {
        type: 'string',
        description: 'New working directory path'
      }
    },
    required: ['sessionId', 'path']
  }
};

export async function handleChangeWorkingDirectory({ sessionId, path }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    // Send cd command to terminal
    await terminalManager.sendInput(sessionId, `cd "${path}"\n`);
    
    // Wait a moment for command to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      data: {
        sessionId,
        newPath: path,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to change working directory').message,
        details: { sessionId, path }
      }
    };
  }
}

// Send process signal to terminal session
export const sendProcessSignal: Tool = {
  name: 'send_process_signal',
  description: 'Send a Unix signal to a process in the terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      signal: {
        type: 'string',
        enum: ['SIGINT', 'SIGTERM', 'SIGKILL', 'SIGSTOP', 'SIGCONT', 'SIGUSR1', 'SIGUSR2', 'SIGHUP'],
        description: 'Signal name'
      },
      pid: {
        type: 'number',
        description: 'Process ID (default: current foreground process)'
      }
    },
    required: ['sessionId', 'signal']
  }
};

export async function handleSendProcessSignal({ sessionId, signal, pid }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    let signalSequence = '';
    
    // Map common signals to terminal control sequences
    switch (signal) {
      case 'SIGINT':
        signalSequence = '\u0003'; // Ctrl+C
        break;
      case 'SIGTERM':
        signalSequence = '\u0015'; // Ctrl+U (approximation)
        break;
      case 'SIGSTOP':
        signalSequence = '\u001A'; // Ctrl+Z
        break;
      case 'SIGCONT':
        await terminalManager.sendInput(sessionId, 'fg\n');
        break;
      default:
        if (pid) {
          await terminalManager.sendInput(sessionId, `kill -${signal} ${pid}\n`);
        } else {
          signalSequence = '\u0003'; // Default to interrupt
        }
    }

    if (signalSequence) {
      await terminalManager.sendInput(sessionId, signalSequence);
    }

    return {
      success: true,
      data: {
        sessionId,
        signal,
        pid,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to send process signal').message,
        details: { sessionId, signal, pid }
      }
    };
  }
}

// Set terminal title
export const setTerminalTitle: Tool = {
  name: 'set_terminal_title',
  description: 'Set the title of a terminal session window',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      title: {
        type: 'string',
        description: 'New terminal title'
      }
    },
    required: ['sessionId', 'title']
  }
};

export async function handleSetTerminalTitle({ sessionId, title }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    // Send ANSI escape sequence to set terminal title
    const titleSequence = `\u001b]0;${title}\u0007`;
    await terminalManager.sendInput(sessionId, titleSequence);

    return {
      success: true,
      data: {
        sessionId,
        title,
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to set terminal title').message,
        details: { sessionId, title }
      }
    };
  }
}

// Control job (background/foreground)
export const controlJob: Tool = {
  name: 'control_job',
  description: 'Control background and foreground jobs in terminal session',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Terminal session ID'
      },
      action: {
        type: 'string',
        enum: ['background', 'foreground', 'suspend', 'resume', 'list'],
        description: 'Job control action'
      },
      jobId: {
        type: 'number',
        description: 'Job ID (required for specific job actions)'
      }
    },
    required: ['sessionId', 'action']
  }
};

export async function handleControlJob({ sessionId, action, jobId }: any): Promise<ToolResult> {
  try {
    // Verify session exists
    const session = terminalManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Terminal session ${sessionId} not found`
        }
      };
    }

    let command = '';
    
    switch (action) {
      case 'background':
        command = jobId ? `bg %${jobId}\n` : 'bg\n';
        break;
      case 'foreground':
        command = jobId ? `fg %${jobId}\n` : 'fg\n';
        break;
      case 'suspend':
        command = '\u001A'; // Ctrl+Z
        break;
      case 'resume':
        command = jobId ? `fg %${jobId}\n` : 'fg\n';
        break;
      case 'list':
        command = 'jobs\n';
        break;
    }

    await terminalManager.sendInput(sessionId, command);

    return {
      success: true,
      data: {
        sessionId,
        action,
        jobId,
        command: command.trim(),
        timestamp: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'COMMAND_FAILED',
        message: handleError(error, 'Failed to control job').message,
        details: { sessionId, action, jobId }
      }
    };
  }
}