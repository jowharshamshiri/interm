import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok, deepStrictEqual } from 'node:assert';
import { MCPTestClient } from '../helpers/test-utils.js';

describe('MCP Server Integration', () => {
  let client;

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.start();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  test('server starts and responds to ping', async () => {
    const response = await client.listTools();
    ok(response);
  });

  test('listTools returns all expected tools', async () => {
    const response = await client.listTools();
    
    ok(response.tools);
    ok(Array.isArray(response.tools));
    
    const toolNames = response.tools.map(t => t.name);
    
    // Session tools
    ok(toolNames.includes('create_terminal_session'));
    ok(toolNames.includes('list_terminal_sessions'));
    ok(toolNames.includes('get_terminal_session'));
    ok(toolNames.includes('close_terminal_session'));
    ok(toolNames.includes('resize_terminal'));
    
    // Command tools
    ok(toolNames.includes('execute_command'));
    ok(toolNames.includes('send_input'));
    ok(toolNames.includes('send_keys'));
    ok(toolNames.includes('interrupt_command'));
    
    // Capture tools
    ok(toolNames.includes('get_terminal_content'));
    ok(toolNames.includes('screenshot_terminal'));
    ok(toolNames.includes('get_terminal_buffer'));
    ok(toolNames.includes('watch_terminal_output'));
    
    strictEqual(toolNames.length, 13, 'Should have exactly 13 tools');
  });

  test('tools have proper schemas', async () => {
    const response = await client.listTools();
    
    for (const tool of response.tools) {
      ok(tool.name, 'Tool should have name');
      ok(tool.description, 'Tool should have description');
      ok(tool.inputSchema, 'Tool should have input schema');
      ok(tool.inputSchema.type === 'object', 'Input schema should be object type');
    }
  });

  test('create_terminal_session tool schema validation', async () => {
    const response = await client.listTools();
    const tool = response.tools.find(t => t.name === 'create_terminal_session');
    
    ok(tool);
    ok(tool.inputSchema.properties.cols);
    ok(tool.inputSchema.properties.rows);
    ok(tool.inputSchema.properties.shell);
    ok(tool.inputSchema.properties.workingDirectory);
    
    strictEqual(tool.inputSchema.properties.cols.type, 'number');
    strictEqual(tool.inputSchema.properties.rows.type, 'number');
    strictEqual(tool.inputSchema.properties.shell.type, 'string');
    strictEqual(tool.inputSchema.properties.workingDirectory.type, 'string');
  });

  test('execute_command tool schema validation', async () => {
    const response = await client.listTools();
    const tool = response.tools.find(t => t.name === 'execute_command');
    
    ok(tool);
    ok(tool.inputSchema.required.includes('sessionId'));
    ok(tool.inputSchema.required.includes('command'));
    
    ok(tool.inputSchema.properties.timeout);
    ok(tool.inputSchema.properties.expectOutput);
    ok(tool.inputSchema.properties.workingDirectory);
    ok(tool.inputSchema.properties.environment);
  });

  test('screenshot_terminal tool schema validation', async () => {
    const response = await client.listTools();
    const tool = response.tools.find(t => t.name === 'screenshot_terminal');
    
    ok(tool);
    ok(tool.inputSchema.required.includes('sessionId'));
    
    const formatProperty = tool.inputSchema.properties.format;
    ok(formatProperty);
    ok(formatProperty.enum.includes('png'));
    ok(formatProperty.enum.includes('jpeg'));
    
    const themeProperty = tool.inputSchema.properties.theme;
    ok(themeProperty);
    ok(themeProperty.enum.includes('dark'));
    ok(themeProperty.enum.includes('light'));
  });

  test('send_keys tool has proper key enum', async () => {
    const response = await client.listTools();
    const tool = response.tools.find(t => t.name === 'send_keys');
    
    ok(tool);
    const keysProperty = tool.inputSchema.properties.keys;
    ok(keysProperty);
    ok(Array.isArray(keysProperty.enum));
    
    // Check for essential keys
    ok(keysProperty.enum.includes('enter'));
    ok(keysProperty.enum.includes('tab'));
    ok(keysProperty.enum.includes('ctrl+c'));
    ok(keysProperty.enum.includes('arrow_up'));
    ok(keysProperty.enum.includes('arrow_down'));
    ok(keysProperty.enum.includes('arrow_left'));
    ok(keysProperty.enum.includes('arrow_right'));
    ok(keysProperty.enum.includes('escape'));
  });

  test('invalid tool call returns proper error', async () => {
    try {
      await client.callTool('non_existent_tool');
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message.includes('Unknown tool') || error.message.includes('Tool call failed'));
    }
  });

  test('tool call with invalid arguments returns proper error', async () => {
    try {
      await client.callTool('create_terminal_session', {
        cols: 'invalid_number' // Should be number
      });
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message);
    }
  });

  test('server handles multiple concurrent requests', async () => {
    const promises = Array(5).fill(null).map(() => client.listTools());
    
    const results = await Promise.all(promises);
    
    for (const result of results) {
      ok(result.tools);
      strictEqual(result.tools.length, 13);
    }
  });

  test('server maintains session state across requests', async () => {
    // Create session
    const createResult = await client.callTool('create_terminal_session', {
      cols: 100,
      rows: 30
    });
    
    ok(createResult.success);
    const sessionId = createResult.data.id;
    
    // List sessions
    const listResult = await client.callTool('list_terminal_sessions');
    
    ok(listResult.success);
    ok(listResult.data.sessions.some(s => s.id === sessionId));
    
    // Get specific session
    const getResult = await client.callTool('get_terminal_session', {
      sessionId
    });
    
    ok(getResult.success);
    strictEqual(getResult.data.id, sessionId);
    strictEqual(getResult.data.cols, 100);
    strictEqual(getResult.data.rows, 30);
  });

  test('server handles tool errors gracefully', async () => {
    const result = await client.callTool('get_terminal_session', {
      sessionId: 'non-existent-session'
    });
    
    ok(!result.success);
    ok(result.error);
    ok(result.error.type === 'SESSION_NOT_FOUND');
  });

  test('server response format is consistent', async () => {
    const successResult = await client.callTool('list_terminal_sessions');
    
    ok(typeof successResult.success === 'boolean');
    if (successResult.success) {
      ok(successResult.data !== undefined);
    } else {
      ok(successResult.error !== undefined);
      ok(successResult.error.type !== undefined);
      ok(successResult.error.message !== undefined);
    }
  });
});