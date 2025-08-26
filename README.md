# InTerm

A Model Context Protocol (MCP) server for terminal applications and TUI development. InTerm provides programmatic access to terminal sessions, command execution, and terminal state capture - similar to how InSite works with browsers but for terminal applications.

## Features

- **Terminal Session Management**: Create, manage, and control multiple terminal sessions
- **Command Execution**: Execute commands with timeout controls and output capture
- **Interactive Input**: Send input, special keys, and control sequences to running applications
- **State Capture**: Take screenshots and capture terminal content/state
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **TUI Development**: Perfect for developing and testing terminal user interfaces

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "interm": {
      "command": "node",
      "args": ["/path/to/interm/bin/interm.js"]
    }
  }
}
```

### Available Tools

#### Session Management
- `create_terminal_session` - Create new terminal session
- `list_terminal_sessions` - List active sessions  
- `get_terminal_session` - Get session details
- `close_terminal_session` - Close a session
- `resize_terminal` - Resize terminal dimensions

#### Command Execution  
- `execute_command` - Execute commands with output capture
- `send_input` - Send text input to terminal
- `send_keys` - Send special keys (Ctrl+C, arrows, etc.)
- `interrupt_command` - Send interrupt signal

#### State Capture
- `get_terminal_content` - Get current terminal content
- `screenshot_terminal` - Take visual screenshot
- `get_terminal_buffer` - Get raw terminal buffer
- `watch_terminal_output` - Watch for output patterns

## Examples

### Basic Terminal Session

```javascript
// Create a session
const session = await tools.create_terminal_session({
  cols: 80,
  rows: 24,
  shell: "bash"
});

// Execute a command
const result = await tools.execute_command({
  sessionId: session.id,
  command: "ls -la",
  timeout: 5000
});

// Get terminal content
const content = await tools.get_terminal_content({
  sessionId: session.id
});
```

### Interactive TUI Development

```javascript
// Start a TUI application
await tools.execute_command({
  sessionId: session.id,
  command: "htop",
  expectOutput: false
});

// Send navigation keys
await tools.send_keys({
  sessionId: session.id,
  keys: "arrow_down"
});

// Take screenshot
const screenshot = await tools.screenshot_terminal({
  sessionId: session.id,
  format: "png",
  theme: "dark"
});
```

### Testing CLI Applications

```javascript
// Run your CLI app
await tools.execute_command({
  sessionId: session.id,
  command: "./my-cli-app --interactive"
});

// Interact with prompts
await tools.send_input({
  sessionId: session.id,
  input: "yes\\n"
});

// Watch for specific output
const result = await tools.watch_terminal_output({
  sessionId: session.id,
  pattern: "Installation complete",
  timeout: 30000
});
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Architecture

InTerm is built with:

- **Node PTY**: For terminal session management
- **Sharp**: For screenshot generation
- **MCP SDK**: For Model Context Protocol integration
- **TypeScript**: For type safety and development experience

## Use Cases

- **TUI Development**: Build and test terminal user interfaces
- **CLI Testing**: Automate testing of command-line applications  
- **DevOps Automation**: Script complex terminal interactions
- **Documentation**: Generate terminal screenshots for docs
- **Education**: Create interactive terminal tutorials
- **Debugging**: Capture terminal state for troubleshooting

## License

MIT