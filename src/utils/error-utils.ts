import { TerminalAutomationError, TerminalErrorType } from '../types.js';

export function createTerminalError(
  type: TerminalErrorType,
  message: string,
  details?: Record<string, unknown>
): TerminalAutomationError {
  return new TerminalAutomationError(type, message, details);
}

export function handleError(error: unknown, context: string): TerminalAutomationError {
  if (error instanceof TerminalAutomationError) {
    return error;
  }

  if (error instanceof Error) {
    // Map common Node.js errors to terminal error types
    if (error.message.includes('ENOENT')) {
      return createTerminalError('SESSION_NOT_FOUND', `${context}: ${error.message}`);
    }
    if (error.message.includes('EACCES')) {
      return createTerminalError('PERMISSION_DENIED', `${context}: ${error.message}`);
    }
    if (error.message.includes('timeout')) {
      return createTerminalError('TIMEOUT_ERROR', `${context}: ${error.message}`);
    }
    
    return createTerminalError('UNKNOWN_ERROR', `${context}: ${error.message}`, {
      originalError: error.message,
      stack: error.stack
    });
  }

  return createTerminalError('UNKNOWN_ERROR', `${context}: Unknown error occurred`, {
    error: String(error)
  });
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '[Unable to serialize object]';
  }
}

export function isValidShell(shell: string): boolean {
  if (!shell || typeof shell !== 'string') {
    return false;
  }

  const validShells = [
    '/bin/bash',
    '/bin/zsh', 
    '/bin/sh',
    '/bin/fish',
    '/usr/bin/bash',
    '/usr/bin/zsh',
    '/usr/bin/fish',
    'bash',
    'zsh',
    'sh',
    'fish',
    'powershell',
    'powershell.exe',
    'cmd',
    'cmd.exe'
  ];
  
  return validShells.some(validShell => 
    shell === validShell || 
    shell.endsWith(`/${validShell}`) ||
    shell.endsWith(`\\${validShell}`)
  );
}