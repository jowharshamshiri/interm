import { test, describe } from 'node:test';
import { strictEqual, ok, throws } from 'node:assert';
import { 
  createTerminalError, 
  handleError, 
  safeJsonStringify,
  isValidShell
} from '../../dist/utils/error-utils.js';
import { TerminalAutomationError } from '../../dist/types.js';

describe('Error Utils', () => {
  test('createTerminalError creates proper error object', () => {
    const error = createTerminalError('SESSION_NOT_FOUND', 'Test message', { sessionId: '123' });
    
    ok(error instanceof TerminalAutomationError);
    strictEqual(error.type, 'SESSION_NOT_FOUND');
    strictEqual(error.message, 'Test message');
    strictEqual(error.details.sessionId, '123');
    strictEqual(error.name, 'TerminalAutomationError');
  });

  test('handleError preserves TerminalAutomationError', () => {
    const originalError = createTerminalError('TIMEOUT_ERROR', 'Original message');
    const handled = handleError(originalError, 'Context');
    
    strictEqual(handled, originalError);
  });

  test('handleError maps ENOENT to SESSION_NOT_FOUND', () => {
    const systemError = new Error('ENOENT: no such file');
    const handled = handleError(systemError, 'Test context');
    
    ok(handled instanceof TerminalAutomationError);
    strictEqual(handled.type, 'SESSION_NOT_FOUND');
    ok(handled.message.includes('Test context'));
  });

  test('handleError maps EACCES to PERMISSION_DENIED', () => {
    const systemError = new Error('EACCES: permission denied');
    const handled = handleError(systemError, 'Test context');
    
    strictEqual(handled.type, 'PERMISSION_DENIED');
  });

  test('handleError maps timeout to TIMEOUT_ERROR', () => {
    const timeoutError = new Error('Operation timeout exceeded');
    const handled = handleError(timeoutError, 'Test context');
    
    strictEqual(handled.type, 'TIMEOUT_ERROR');
  });

  test('handleError handles unknown Error objects', () => {
    const unknownError = new Error('Some random error');
    const handled = handleError(unknownError, 'Test context');
    
    strictEqual(handled.type, 'UNKNOWN_ERROR');
    ok(handled.message.includes('Test context'));
    ok(handled.details.originalError);
  });

  test('handleError handles non-Error objects', () => {
    const weirdError = { weird: 'object' };
    const handled = handleError(weirdError, 'Test context');
    
    strictEqual(handled.type, 'UNKNOWN_ERROR');
    ok(handled.message.includes('Test context'));
    strictEqual(handled.details.error, '[object Object]');
  });

  test('safeJsonStringify handles normal objects', () => {
    const obj = { test: 'value', number: 42 };
    const result = safeJsonStringify(obj);
    
    strictEqual(result, '{\n  "test": "value",\n  "number": 42\n}');
  });

  test('safeJsonStringify handles circular references', () => {
    const obj = { test: 'value' };
    obj.circular = obj;
    
    const result = safeJsonStringify(obj);
    strictEqual(result, '[Unable to serialize object]');
  });

  test('isValidShell accepts common valid shells', () => {
    const validShells = [
      '/bin/bash',
      '/bin/zsh',
      '/bin/sh',
      '/bin/fish',
      '/usr/bin/bash',
      '/usr/bin/zsh',
      'bash',
      'zsh',
      'sh',
      'fish',
      'powershell',
      'cmd'
    ];

    for (const shell of validShells) {
      ok(isValidShell(shell), `${shell} should be valid`);
    }
  });

  test('isValidShell accepts paths ending with valid shell names', () => {
    ok(isValidShell('/usr/local/bin/bash'));
    ok(isValidShell('/opt/homebrew/bin/fish'));
    ok(isValidShell('C:\\Windows\\System32\\cmd.exe'));
  });

  test('isValidShell rejects invalid shells', () => {
    const invalidShells = [
      '/bin/invalid',
      'python',
      'node',
      '/usr/bin/vim',
      'malicious_shell',
      ''
    ];

    for (const shell of invalidShells) {
      ok(!isValidShell(shell), `${shell} should be invalid`);
    }
  });

  test('isValidShell handles empty and null values', () => {
    ok(!isValidShell(''));
    ok(!isValidShell(null));
    ok(!isValidShell(undefined));
  });
});