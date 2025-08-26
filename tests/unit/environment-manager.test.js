import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { EnvironmentManager } from '../../src/environment-manager.js';
import { TerminalManager } from '../../src/terminal-manager.js';

describe('EnvironmentManager - F00100-F00107', () => {
  let envManager;
  let terminalManager;
  let testSession;

  beforeEach(async () => {
    envManager = EnvironmentManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session for environment operations
    testSession = await terminalManager.createSession(80, 24);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up test session
    if (testSession) {
      try {
        await terminalManager.closeSession(testSession.id);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up environment state
    envManager.cleanup();
  });

  test('should be a singleton instance', () => {
    const manager1 = EnvironmentManager.getInstance();
    const manager2 = EnvironmentManager.getInstance();
    strictEqual(manager1, manager2);
  });

  // F00100: Environment Variable Input
  test('should manage environment variables', async () => {
    const setResult = await envManager.setEnvironmentVariable(testSession.id, {
      name: 'TEST_VAR',
      value: 'test_value',
      export: true
    });
    
    ok(setResult.success);
    strictEqual(setResult.variable.name, 'TEST_VAR');
    strictEqual(setResult.variable.value, 'test_value');
    
    const getResult = await envManager.getEnvironmentVariable(testSession.id, 'TEST_VAR');
    ok(getResult.success);
    strictEqual(getResult.value, 'test_value');
    
    const listResult = await envManager.listEnvironmentVariables(testSession.id);
    ok(listResult.success);
    ok(listResult.variables.some(v => v.name === 'TEST_VAR'));
  });

  // F00101: Working Directory Control
  test('should control working directory', async () => {
    const originalDir = await envManager.getCurrentDirectory(testSession.id);
    ok(originalDir.success);
    ok(originalDir.path);
    
    const changeResult = await envManager.changeWorkingDirectory(testSession.id, {
      path: '/tmp',
      createIfNotExists: false
    });
    
    ok(changeResult.success);
    strictEqual(changeResult.newPath, '/tmp');
    
    const currentResult = await envManager.getCurrentDirectory(testSession.id);
    ok(currentResult.success);
    ok(currentResult.path.includes('tmp'));
  });

  // F00102: Process Signal Handling
  test('should handle process signals', async () => {
    const signalResult = await envManager.sendProcessSignal(testSession.id, {
      signal: 'SIGTERM',
      pid: testSession.pid,
      timeout: 5000
    });
    
    // Note: This might not succeed on the test session, but should handle gracefully
    ok(signalResult.success !== undefined);
    
    const listResult = await envManager.listAvailableSignals();
    ok(listResult.success);
    ok(listResult.signals.includes('SIGTERM'));
    ok(listResult.signals.includes('SIGKILL'));
  });

  // F00103: Job Control Operations
  test('should manage job control', async () => {
    const jobResult = await envManager.startBackgroundJob(testSession.id, {
      command: 'sleep 10',
      name: 'test-job'
    });
    
    ok(jobResult.success);
    ok(jobResult.jobId);
    
    const listResult = await envManager.listJobs(testSession.id);
    ok(listResult.success);
    ok(listResult.jobs.some(j => j.name === 'test-job'));
    
    const controlResult = await envManager.controlJob(testSession.id, {
      jobId: jobResult.jobId,
      action: 'suspend'
    });
    
    ok(controlResult.success);
    strictEqual(controlResult.action, 'suspend');
  });

  // F00104: Terminal Bell Control
  test('should control terminal bell', async () => {
    const bellResult = await envManager.sendTerminalBell(testSession.id, {
      type: 'audible',
      duration: 200,
      frequency: 800
    });
    
    ok(bellResult.success);
    strictEqual(bellResult.type, 'audible');
    
    const visualResult = await envManager.sendTerminalBell(testSession.id, {
      type: 'visual',
      flashDuration: 100,
      color: '#FFFF00'
    });
    
    ok(visualResult.success);
    strictEqual(visualResult.type, 'visual');
    
    const configResult = await envManager.configureBell(testSession.id, {
      enabled: true,
      defaultType: 'visual',
      volume: 0.5
    });
    
    ok(configResult.success);
    strictEqual(configResult.config.enabled, true);
  });

  // F00105: Terminal Title Manipulation
  test('should manipulate terminal title', async () => {
    const setResult = await envManager.setTerminalTitle(testSession.id, {
      title: 'Test Terminal',
      icon: 'terminal',
      persist: true
    });
    
    ok(setResult.success);
    strictEqual(setResult.title, 'Test Terminal');
    
    const getResult = await envManager.getTerminalTitle(testSession.id);
    ok(getResult.success);
    strictEqual(getResult.title, 'Test Terminal');
    
    const resetResult = await envManager.resetTerminalTitle(testSession.id);
    ok(resetResult.success);
  });

  // F00106: Cursor Style Control
  test('should control cursor styles', async () => {
    const styleResult = await envManager.setCursorStyle(testSession.id, {
      shape: 'block',
      blinking: true,
      color: '#00FF00'
    });
    
    ok(styleResult.success);
    strictEqual(styleResult.style.shape, 'block');
    strictEqual(styleResult.style.blinking, true);
    
    const getResult = await envManager.getCursorStyle(testSession.id);
    ok(getResult.success);
    strictEqual(getResult.shape, 'block');
    
    const underlineResult = await envManager.setCursorStyle(testSession.id, {
      shape: 'underline',
      blinking: false
    });
    
    ok(underlineResult.success);
    strictEqual(underlineResult.style.shape, 'underline');
  });

  // F00107: Terminal Mode Switching
  test('should switch terminal modes', async () => {
    const rawResult = await envManager.switchTerminalMode(testSession.id, {
      mode: 'raw',
      echo: false,
      canonical: false
    });
    
    ok(rawResult.success);
    strictEqual(rawResult.mode, 'raw');
    
    const canonicalResult = await envManager.switchTerminalMode(testSession.id, {
      mode: 'canonical',
      echo: true,
      canonical: true
    });
    
    ok(canonicalResult.success);
    strictEqual(canonicalResult.mode, 'canonical');
    
    const statusResult = await envManager.getTerminalMode(testSession.id);
    ok(statusResult.success);
    ok(statusResult.currentMode);
    ok(typeof statusResult.echo === 'boolean');
  });

  // Integration test
  test('should handle complex environment workflows', async () => {
    // Set up complex environment
    const envResult = await envManager.setEnvironmentVariable(testSession.id, {
      name: 'COMPLEX_TEST',
      value: 'active'
    });
    
    const dirResult = await envManager.changeWorkingDirectory(testSession.id, {
      path: '/tmp'
    });
    
    const titleResult = await envManager.setTerminalTitle(testSession.id, {
      title: 'Complex Environment Test'
    });
    
    const cursorResult = await envManager.setCursorStyle(testSession.id, {
      shape: 'bar',
      blinking: true
    });
    
    ok(envResult.success);
    ok(dirResult.success);
    ok(titleResult.success);
    ok(cursorResult.success);
    
    const statusResult = await envManager.getEnvironmentStatus(testSession.id);
    ok(statusResult.success);
    ok(statusResult.workingDirectory.includes('tmp'));
    strictEqual(statusResult.title, 'Complex Environment Test');
    ok(statusResult.variables.some(v => v.name === 'COMPLEX_TEST'));
  });

  test('should handle environment errors gracefully', async () => {
    try {
      await envManager.setEnvironmentVariable('invalid-session-id', {
        name: 'TEST',
        value: 'value'
      });
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message.includes('Session not found') || error.message.includes('invalid'));
    }
  });

  test('should validate environment variable names', async () => {
    try {
      await envManager.setEnvironmentVariable(testSession.id, {
        name: '123INVALID',  // Invalid name starting with number
        value: 'test'
      });
      ok(false, 'Should have thrown error for invalid variable name');
    } catch (error) {
      ok(error.message.includes('Invalid variable name') || error.message.includes('validation'));
    }
  });
});