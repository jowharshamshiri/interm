// Test configuration for InTerm MCP Server

export const TEST_CONFIG = {
  // Global test timeouts
  timeouts: {
    unit: 5000,           // 5 seconds for unit tests
    integration: 30000,   // 30 seconds for integration tests  
    e2e: 60000,          // 60 seconds for e2e tests
    server_start: 5000,   // 5 seconds to start server
    command_execution: 10000 // 10 seconds for command execution
  },

  // Default session parameters for tests
  defaultSession: {
    cols: 80,
    rows: 24,
    shell: process.platform === 'win32' ? 'powershell.exe' : 'bash'
  },

  // Platform-specific test configuration
  platform: {
    skipOnWindows: [
      'unix-specific-shell-tests',
      'bash-only-tests'
    ],
    skipOnUnix: [
      'powershell-tests',
      'windows-cmd-tests'
    ],
    windowsShell: 'powershell.exe',
    unixShells: ['bash', 'zsh', 'sh']
  },

  // Test data
  testCommands: {
    simple: {
      unix: 'echo "test"',
      windows: 'echo "test"'
    },
    multiline: {
      unix: 'echo -e "line1\\nline2\\nline3"',
      windows: 'echo "line1"; echo "line2"; echo "line3"'
    },
    error: {
      unix: 'ls /nonexistent',
      windows: 'dir C:\\nonexistent'
    },
    slow: {
      unix: 'sleep 2',
      windows: 'timeout 2'
    }
  },

  // Screenshot test configuration
  screenshot: {
    formats: ['png', 'jpeg'],
    themes: ['dark', 'light'],
    fontSizes: [8, 12, 16, 20],
    testContent: 'Screenshot test content with special chars: àáâãäåæç 🚀🎉'
  },

  // Error conditions to test
  errorConditions: [
    {
      name: 'non-existent-session',
      sessionId: 'non-existent-session-id',
      expectedError: 'SESSION_NOT_FOUND'
    },
    {
      name: 'invalid-shell',
      shell: 'invalid-shell-executable',
      expectedError: 'INVALID_SHELL'
    }
  ],

  // Performance test parameters
  performance: {
    maxConcurrentSessions: 5,
    commandExecutionBenchmark: 100, // ms
    screenshotGenerationBenchmark: 2000, // ms
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB
  }
};

// Helper functions for test configuration
export function getTestCommand(commandName) {
  const commands = TEST_CONFIG.testCommands[commandName];
  if (!commands) {
    throw new Error(`Unknown test command: ${commandName}`);
  }
  
  return process.platform === 'win32' ? commands.windows : commands.unix;
}

export function shouldSkipTest(testName) {
  const platform = TEST_CONFIG.platform;
  
  if (process.platform === 'win32') {
    return platform.skipOnWindows.includes(testName);
  } else {
    return platform.skipOnUnix.includes(testName);
  }
}

export function getDefaultShellForPlatform() {
  return process.platform === 'win32' 
    ? TEST_CONFIG.platform.windowsShell 
    : TEST_CONFIG.platform.unixShells[0];
}