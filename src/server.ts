#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { TerminalManager } from './terminal-manager.js';
import { SessionManager } from './session-manager.js';
import { TerminalNavigationManager } from './terminal-navigation-manager.js';
import { AdvancedMouseManager } from './advanced-mouse-manager.js';
import { InteractionReplayManager } from './interaction-replay-manager.js';
import { TerminalScreenshot } from './screenshot.js';
import { KeyboardManager } from './keyboard-manager.js';
import { MouseManager } from './mouse-manager.js';
import { ClipboardManager } from './clipboard-manager.js';
import { TouchManager } from './touch-manager.js';
import { AccessibilityManager } from './accessibility-manager.js';
import { InputProcessingManager } from './input-processing-manager.js';
import { EnvironmentManager } from './environment-manager.js';
import { registerTools } from './tools/index.js';
import { handleError, safeJsonStringify } from './utils/error-utils.js';
import { ToolResult } from './types.js';

export class InterMServer {
  private server: Server;
  private terminalManager: TerminalManager;
  private sessionManager: SessionManager;
  private navigationManager: TerminalNavigationManager;
  private advancedMouseManager: AdvancedMouseManager;
  private interactionReplayManager: InteractionReplayManager;
  private keyboardManager: KeyboardManager;
  private mouseManager: MouseManager;
  private clipboardManager: ClipboardManager;
  private touchManager: TouchManager;
  private accessibilityManager: AccessibilityManager;
  private inputProcessingManager: InputProcessingManager;
  private environmentManager: EnvironmentManager;

  constructor() {
    this.server = new Server(
      {
        name: 'interm',
        version: '0.1.0',
        description: 'MCP server for terminal applications and TUIs'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.terminalManager = TerminalManager.getInstance();
    this.sessionManager = SessionManager.getInstance();
    this.navigationManager = TerminalNavigationManager.getInstance();
    this.advancedMouseManager = AdvancedMouseManager.getInstance();
    this.interactionReplayManager = InteractionReplayManager.getInstance();
    this.keyboardManager = KeyboardManager.getInstance();
    this.mouseManager = MouseManager.getInstance();
    this.clipboardManager = ClipboardManager.getInstance();
    this.touchManager = TouchManager.getInstance();
    this.accessibilityManager = AccessibilityManager.getInstance();
    this.inputProcessingManager = InputProcessingManager.getInstance();
    this.environmentManager = EnvironmentManager.getInstance();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: registerTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.handleToolCall(name, args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(result)
            }
          ]
        };
      } catch (error) {
        const handledError = handleError(error, `Tool call failed: ${name}`);
        
        throw new McpError(
          ErrorCode.InternalError,
          `${handledError.message}\n\nDetails: ${safeJsonStringify(handledError.details)}`
        );
      }
    });
  }

  private async handleToolCall(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    // Add timeout wrapper for all tool calls
    return Promise.race([
      this.executeToolCall(name, args),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error('Tool call timeout')), 60000)
      )
    ]);
  }

  private async executeToolCall(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      // Session management tools
      case 'create_terminal_session':
        return this.createTerminalSession(args);
      case 'list_terminal_sessions':
        return this.listTerminalSessions();
      case 'get_terminal_session':
        return this.getTerminalSession(args);
      case 'close_terminal_session':
        return this.closeTerminalSession(args);
      case 'resize_terminal':
        return this.resizeTerminal(args);

      // Command execution tools
      case 'execute_command':
        return this.executeCommand(args);
      case 'send_input':
        return this.sendInput(args);
      case 'send_keys':
        return this.sendKeys(args);
      case 'interrupt_command':
        return this.interruptCommand(args);

      // Capture tools
      case 'get_terminal_content':
        return this.getTerminalContent(args);
      case 'screenshot_terminal':
        return this.screenshotTerminal(args);
      case 'get_terminal_buffer':
        return this.getTerminalBuffer(args);
      case 'watch_terminal_output':
        return this.watchTerminalOutput(args);

      // Keyboard interaction tools
      case 'send_function_keys':
        return this.sendFunctionKeys(args);
      case 'send_modifier_combination':
        return this.sendModifierCombination(args);
      case 'send_navigation_keys':
        return this.sendNavigationKeys(args);
      case 'send_editing_shortcuts':
        return this.sendEditingShortcuts(args);
      case 'send_key_sequence':
        return this.sendKeySequence(args);
      case 'send_simultaneous_keys':
        return this.sendSimultaneousKeys(args);
      case 'send_key_with_hold':
        return this.sendKeyWithHold(args);
      case 'send_unicode_input':
        return this.sendUnicodeInput(args);

      // Mouse interaction tools
      case 'mouse_move':
        return this.mouseMove(args);
      case 'mouse_click':
        return this.mouseClick(args);
      case 'mouse_drag':
        return this.mouseDrag(args);
      case 'mouse_scroll':
        return this.mouseScroll(args);
      case 'mouse_hover':
        return this.mouseHover(args);
      case 'mouse_gesture':
        return this.mouseGesture(args);
      case 'mouse_multi_button':
        return this.mouseMultiButton(args);
      case 'get_mouse_position':
        return this.getMousePosition(args);

      // Clipboard tools
      case 'clipboard_read':
        return this.clipboardRead(args);
      case 'clipboard_write':
        return this.clipboardWrite(args);
      case 'text_select':
        return this.textSelect(args);
      case 'text_copy':
        return this.textCopy(args);
      case 'text_paste':
        return this.textPaste(args);
      case 'clipboard_history':
        return this.clipboardHistory(args);
      case 'multi_select':
        return this.multiSelect(args);
      case 'selection_info':
        return this.selectionInfo(args);

      // Touch interaction tools
      case 'touch_input':
        return this.touchInput(args);
      case 'detect_gesture':
        return this.detectGesture(args);
      case 'get_touch_capabilities':
        return this.getTouchCapabilities(args);
      case 'get_active_touches':
        return this.getActiveTouches(args);
      case 'get_touch_history':
        return this.getTouchHistory(args);
      case 'get_gesture_history':
        return this.getGestureHistory(args);
      case 'configure_touch_gestures':
        return this.configureTouchGestures(args);
      case 'clear_touch_state':
        return this.clearTouchState(args);

      // Advanced touch tools
      case 'simulate_multi_touch':
        return this.simulateMultiTouch(args);
      case 'detect_touch_drag':
        return this.detectTouchDrag(args);
      case 'get_haptic_capabilities':
        return this.getHapticCapabilities(args);
      case 'recognize_complex_gesture':
        return this.recognizeComplexGesture(args);
      case 'configure_advanced_touch':
        return this.configureAdvancedTouch(args);

      // Accessibility tools
      case 'initialize_accessibility':
        return this.initializeAccessibility(args);
      case 'announce_to_screen_reader':
        return this.announceToScreenReader(args);
      case 'apply_high_contrast':
        return this.applyHighContrast(args);
      case 'configure_accessibility':
        return this.configureAccessibility(args);
      case 'handle_focus_change':
        return this.handleFocusChange(args);
      case 'get_accessibility_status':
        return this.getAccessibilityStatus(args);
      case 'get_keyboard_navigation_hints':
        return this.getKeyboardNavigationHints(args);
      case 'get_screen_reader_events':
        return this.getScreenReaderEvents(args);

      // Input processing tools
      case 'queue_input_event':
        return this.queueInputEvent(args);
      case 'start_input_recording':
        return this.startInputRecording(args);
      case 'stop_input_recording':
        return this.stopInputRecording(args);
      case 'playback_input_recording':
        return this.playbackInputRecording(args);
      case 'detect_input_devices':
        return this.detectInputDevices(args);
      case 'add_input_filter':
        return this.addInputFilter(args);
      case 'remove_input_filter':
        return this.removeInputFilter(args);
      case 'get_input_analytics':
        return this.getInputAnalytics(args);
      case 'optimize_input_latency':
        return this.optimizeInputLatency(args);
      case 'get_input_history':
        return this.getInputHistory(args);

      // Environment tools
      case 'set_environment_variable':
        return this.setEnvironmentVariable(args);
      case 'get_environment_variable':
        return this.getEnvironmentVariable(args);
      case 'list_environment_variables':
        return this.listEnvironmentVariables(args);
      case 'unset_environment_variable':
        return this.unsetEnvironmentVariable(args);
      case 'change_working_directory':
        return this.changeWorkingDirectory(args);
      case 'send_process_signal':
        return this.sendProcessSignal(args);
      case 'set_terminal_title':
        return this.setTerminalTitle(args);
      case 'control_job':
        return this.controlJob(args);

      // Session state tools
      case 'save_session_bookmark':
        return this.saveSessionBookmark(args);
      case 'restore_session_bookmark':
        return this.restoreSessionBookmark(args);
      case 'get_session_history':
        return this.getSessionHistory(args);
      case 'search_session_history':
        return this.searchSessionHistory(args);
      case 'list_session_bookmarks':
        return this.listSessionBookmarks(args);
      case 'serialize_session_state':
        return this.serializeSessionState(args);
      case 'undo_last_command':
        return this.undoLastCommand(args);
      case 'auto_save_session':
        return this.autoSaveSession(args);

      // Terminal control tools
      case 'send_terminal_bell':
        return this.sendTerminalBell(args);
      case 'set_cursor_style':
        return this.setCursorStyle(args);
      case 'switch_terminal_mode':
        return this.switchTerminalMode(args);

      // Terminal navigation tools
      case 'dynamic_terminal_resize':
        return this.dynamicTerminalResize(args);
      case 'toggle_fullscreen_mode':
        return this.toggleFullscreenMode(args);
      case 'create_terminal_tab':
        return this.createTerminalTab(args);
      case 'switch_terminal_tab':
        return this.switchTerminalTab(args);
      case 'split_terminal_pane':
        return this.splitTerminalPane(args);
      case 'focus_terminal_pane':
        return this.focusTerminalPane(args);
      case 'set_zoom_level':
        return this.setZoomLevel(args);
      case 'scroll_viewport':
        return this.scrollViewport(args);
      case 'set_terminal_opacity':
        return this.setTerminalOpacity(args);
      case 'get_navigation_status':
        return this.getNavigationStatus(args);

      // Advanced mouse tools
      case 'configure_mouse_acceleration':
        return this.configureMouseAcceleration(args);
      case 'configure_pressure_sensitivity':
        return this.configurePressureSensitivity(args);
      case 'track_multi_click_sequence':
        return this.trackMultiClickSequence(args);
      case 'configure_focus_follow_mouse':
        return this.configureFocusFollowMouse(args);
      case 'set_mouse_event_filter':
        return this.setMouseEventFilter(args);
      case 'get_advanced_mouse_status':
        return this.getAdvancedMouseStatus(args);

      // Interaction replay tools
      case 'start_interaction_recording':
        return this.startInteractionRecording(args);
      case 'stop_interaction_recording':
        return this.stopInteractionRecording(args);
      case 'replay_interaction_sequence':
        return this.replayInteractionSequence(args);
      case 'list_interaction_recordings':
        return this.listInteractionRecordings(args);
      case 'create_state_snapshot':
        return this.createStateSnapshot(args);
      case 'generate_state_diff':
        return this.generateStateDiff(args);
      case 'list_state_snapshots':
        return this.listStateSnapshots(args);
      case 'list_state_diffs':
        return this.listStateDiffs(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Session management methods
  private async createTerminalSession(args: Record<string, unknown>): Promise<ToolResult> {
    const cols = (args.cols as number) || 80;
    const rows = (args.rows as number) || 24;
    const shell = (args.shell as string) || undefined;
    const workingDirectory = args.workingDirectory as string;

    const session = await this.terminalManager.createSession(cols, rows, shell, workingDirectory);
    
    return {
      success: true,
      data: session
    };
  }

  private async listTerminalSessions(): Promise<ToolResult> {
    const sessions = this.terminalManager.getAllSessions();
    return {
      success: true,
      data: { sessions }
    };
  }

  private async getTerminalSession(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const session = this.terminalManager.getSession(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: {
          type: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`
        }
      };
    }

    return {
      success: true,
      data: session
    };
  }

  private async closeTerminalSession(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    await this.terminalManager.closeSession(sessionId);
    
    return {
      success: true,
      data: { message: `Session ${sessionId} closed` }
    };
  }

  private async resizeTerminal(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const cols = args.cols as number;
    const rows = args.rows as number;
    
    await this.terminalManager.resizeSession(sessionId, cols, rows);
    
    return {
      success: true,
      data: { sessionId, cols, rows }
    };
  }

  // Command execution methods
  private async executeCommand(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const command = args.command as string;
    const timeout = (args.timeout as number) || 30000;
    const expectOutput = args.expectOutput !== false;

    const result = await this.terminalManager.executeCommand(sessionId, command, timeout, expectOutput);
    
    return {
      success: true,
      data: result
    };
  }

  private async sendInput(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const input = args.input as string;
    
    await this.terminalManager.sendInput(sessionId, input);
    
    return {
      success: true,
      data: { message: 'Input sent' }
    };
  }

  private async sendKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const keys = args.keys as string;
    
    // Map key names to actual key sequences
    const keyMap: Record<string, string> = {
      'enter': '\r',
      'tab': '\t',
      'space': ' ',
      'backspace': '\b',
      'delete': '\x7f',
      'escape': '\x1b',
      'ctrl+c': '\x03',
      'ctrl+d': '\x04',
      'ctrl+z': '\x1a',
      'ctrl+l': '\x0c',
      'arrow_up': '\x1b[A',
      'arrow_down': '\x1b[B',
      'arrow_right': '\x1b[C',
      'arrow_left': '\x1b[D',
      'home': '\x1b[H',
      'end': '\x1b[F',
      'page_up': '\x1b[5~',
      'page_down': '\x1b[6~',
      'f1': '\x1bOP',
      'f2': '\x1bOQ',
      'f3': '\x1bOR',
      'f4': '\x1bOS'
    };

    const keySequence = keyMap[keys] || keys;
    await this.terminalManager.sendInput(sessionId, keySequence);
    
    return {
      success: true,
      data: { message: `Keys sent: ${keys}` }
    };
  }

  private async interruptCommand(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    
    await this.terminalManager.sendInput(sessionId, '\x03'); // Ctrl+C
    
    return {
      success: true,
      data: { message: 'Interrupt signal sent' }
    };
  }

  // Capture methods
  private async getTerminalContent(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const includeFormatting = args.includeFormatting as boolean;
    const lastNLines = args.lastNLines as number;
    
    const state = await this.terminalManager.getTerminalState(sessionId);
    
    let content = state.content;
    if (lastNLines) {
      const lines = content.split('\n');
      content = lines.slice(-lastNLines).join('\n');
    }
    
    return {
      success: true,
      data: {
        content,
        cursor: state.cursor,
        dimensions: state.dimensions,
        ...(includeFormatting && { attributes: state.attributes })
      }
    };
  }

  private async screenshotTerminal(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const format = (args.format as 'png' | 'jpeg') || 'png';
    const theme = (args.theme as 'dark' | 'light') || 'dark';
    const fontSize = (args.fontSize as number) || 14;
    const fontFamily = (args.fontFamily as string) || 'monospace';
    const background = args.background as string;
    
    const state = await this.terminalManager.getTerminalState(sessionId);
    const screenshot = await TerminalScreenshot.captureTerminal(state, {
      format,
      theme,
      fontSize,
      fontFamily,
      background
    });
    
    return {
      success: true,
      data: {
        screenshot: screenshot.toString('base64'),
        format,
        size: screenshot.length
      }
    };
  }

  private async getTerminalBuffer(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const includeScrollback = args.includeScrollback !== false;
    const maxLines = (args.maxLines as number) || 1000;
    
    const state = await this.terminalManager.getTerminalState(sessionId);
    
    let lines = state.content.split('\n');
    if (!includeScrollback) {
      lines = lines.slice(-state.dimensions.rows);
    }
    if (lines.length > maxLines) {
      lines = lines.slice(-maxLines);
    }
    
    return {
      success: true,
      data: {
        buffer: lines.join('\n'),
        lineCount: lines.length,
        truncated: state.content.split('\n').length > maxLines
      }
    };
  }

  private async watchTerminalOutput(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const pattern = args.pattern as string;
    const timeout = (args.timeout as number) || 30000;
    
    // This is a simplified implementation
    // In a real implementation, you'd set up proper event listeners
    const startTime = Date.now();
    const regex = pattern ? new RegExp(pattern) : null;
    
    return new Promise((resolve) => {
      const checkOutput = async () => {
        const state = await this.terminalManager.getTerminalState(sessionId);
        
        if (!pattern || !regex || regex.test(state.content)) {
          resolve({
            success: true,
            data: {
              matched: !!pattern,
              pattern,
              content: state.content,
              timestamp: new Date()
            }
          });
          return;
        }
        
        if (Date.now() - startTime >= timeout) {
          resolve({
            success: false,
            error: {
              type: 'TIMEOUT_ERROR',
              message: `Watch timeout after ${timeout}ms`
            }
          });
          return;
        }
        
        setTimeout(checkOutput, 100);
      };
      
      checkOutput();
    });
  }

  // Keyboard interaction methods
  private async sendFunctionKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const functionKey = args.functionKey as string;

    try {
      const keySequence = this.keyboardManager.getFunctionKeySequence(functionKey);
      await this.terminalManager.sendInput(sessionId, keySequence);

      return {
        success: true,
        data: { message: `Function key sent: ${functionKey}` }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send function key: ${error}`
        }
      };
    }
  }

  private async sendModifierCombination(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const modifiers = args.modifiers as string[];
    const key = args.key as string;

    try {
      const keySequence = this.keyboardManager.buildModifierCombination(modifiers, key);
      await this.terminalManager.sendInput(sessionId, keySequence);

      return {
        success: true,
        data: { message: `Modifier combination sent: ${modifiers.join('+')}+${key}` }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send modifier combination: ${error}`
        }
      };
    }
  }

  private async sendNavigationKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const navigationKey = args.navigationKey as string;

    try {
      const keySequence = this.keyboardManager.getFunctionKeySequence(navigationKey);
      await this.terminalManager.sendInput(sessionId, keySequence);

      return {
        success: true,
        data: { message: `Navigation key sent: ${navigationKey}` }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send navigation key: ${error}`
        }
      };
    }
  }

  private async sendEditingShortcuts(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const editingAction = args.editingAction as string;
    const platform = (args.platform as string) || 'auto';

    try {
      const keySequence = this.keyboardManager.getFunctionKeySequence(`edit_${editingAction}`);
      await this.terminalManager.sendInput(sessionId, keySequence);

      return {
        success: true,
        data: { message: `Editing shortcut sent: ${editingAction}` }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send editing shortcut: ${error}`
        }
      };
    }
  }

  private async sendKeySequence(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const sequence = args.sequence as Array<{type: string, value?: string, delay?: number}>;
    const repeatCount = (args.repeatCount as number) || 1;

    try {
      for (let i = 0; i < repeatCount; i++) {
        const keySequence = this.keyboardManager.buildKeySequence(sequence);
        await this.terminalManager.sendInput(sessionId, keySequence);
        
        if (i < repeatCount - 1) {
          // Brief delay between repetitions
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return {
        success: true,
        data: { message: `Key sequence sent ${repeatCount} time(s)` }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send key sequence: ${error}`
        }
      };
    }
  }

  private async sendSimultaneousKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const keys = args.keys as string[];
    const holdDuration = (args.holdDuration as number) || 100;

    try {
      // For simultaneous keys, we'll send them in rapid succession
      // In a real implementation, this would need lower-level keyboard handling
      for (const key of keys) {
        const keySequence = this.keyboardManager.getFunctionKeySequence(key) || key;
        await this.terminalManager.sendInput(sessionId, keySequence);
      }

      return {
        success: true,
        data: { message: `Simultaneous keys sent: ${keys.join(', ')}` }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send simultaneous keys: ${error}`
        }
      };
    }
  }

  private async sendKeyWithHold(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const key = args.key as string;
    const holdDuration = args.holdDuration as number;
    const repeatRate = (args.repeatRate as number) || 10;

    try {
      const keySequences = this.keyboardManager.simulateKeyHold(key, holdDuration, repeatRate);
      
      for (const keySequence of keySequences) {
        await this.terminalManager.sendInput(sessionId, keySequence);
        await new Promise(resolve => setTimeout(resolve, 1000 / repeatRate));
      }

      return {
        success: true,
        data: { 
          message: `Key hold sent: ${key}`, 
          duration: holdDuration,
          repeatCount: keySequences.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send key hold: ${error}`
        }
      };
    }
  }

  private async sendUnicodeInput(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const text = args.text as string;
    const inputMethod = (args.inputMethod as string) || 'direct';
    const locale = args.locale as string;

    try {
      const processedText = this.keyboardManager.processUnicodeInput(text, inputMethod);
      await this.terminalManager.sendInput(sessionId, processedText);

      return {
        success: true,
        data: { 
          message: `Unicode input sent`,
          text: processedText,
          inputMethod,
          locale
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to send unicode input: ${error}`
        }
      };
    }
  }

  // Mouse interaction methods
  private async mouseMove(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const x = args.x as number;
    const y = args.y as number;
    const relative = (args.relative as boolean) || false;
    const smooth = (args.smooth as boolean) || false;
    const duration = (args.duration as number) || 200;

    try {
      let targetX = x, targetY = y;
      if (relative) {
        const currentPos = this.mouseManager.getCurrentPosition();
        targetX = currentPos.x + x;
        targetY = currentPos.y + y;
      }

      const sequences = this.mouseManager.generateMoveSequence(targetX, targetY, smooth, duration);
      
      for (const sequence of sequences) {
        await this.terminalManager.sendInput(sessionId, sequence);
        if (smooth) {
          await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
        }
      }

      return {
        success: true,
        data: { 
          message: `Mouse moved to (${targetX}, ${targetY})`,
          position: { x: targetX, y: targetY }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to move mouse: ${error}`
        }
      };
    }
  }

  private async mouseClick(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const button = (args.button as string) || 'left';
    const x = args.x as number;
    const y = args.y as number;
    const clickCount = (args.clickCount as number) || 1;
    const modifiers = (args.modifiers as string[]) || [];
    const pressure = (args.pressure as number) || 0.5;

    try {
      let targetX, targetY;
      if (x !== undefined && y !== undefined) {
        targetX = x;
        targetY = y;
      } else {
        const currentPos = this.mouseManager.getCurrentPosition();
        targetX = currentPos.x;
        targetY = currentPos.y;
      }

      const actualClickCount = clickCount > 1 ? 
        this.mouseManager.detectMultiClick(targetX, targetY) : 1;
      
      const sequence = this.mouseManager.generateMouseSequence(sessionId, button, targetX, targetY, clickCount);
      await this.terminalManager.sendInput(sessionId, sequence);

      return {
        success: true,
        data: { 
          message: `Mouse ${button} clicked ${clickCount} time(s) at (${targetX}, ${targetY})`,
          position: { x: targetX, y: targetY },
          button,
          clickCount: actualClickCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to click mouse: ${error}`
        }
      };
    }
  }

  private async mouseDrag(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const startX = args.startX as number;
    const startY = args.startY as number;
    const endX = args.endX as number;
    const endY = args.endY as number;
    const button = (args.button as string) || 'left';
    const smooth = (args.smooth as boolean) ?? true;
    const duration = (args.duration as number) || 500;

    try {
      const sequences = this.mouseManager.generateDragSequence(startX, startY, endX, endY, button, smooth);
      
      for (let i = 0; i < sequences.length; i++) {
        await this.terminalManager.sendInput(sessionId, sequences[i]);
        if (smooth && i < sequences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, duration / sequences.length));
        }
      }

      return {
        success: true,
        data: { 
          message: `Mouse dragged from (${startX}, ${startY}) to (${endX}, ${endY})`,
          startPosition: { x: startX, y: startY },
          endPosition: { x: endX, y: endY },
          button
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to drag mouse: ${error}`
        }
      };
    }
  }

  private async mouseScroll(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const direction = args.direction as string;
    const amount = (args.amount as number) || 3;
    const x = args.x as number;
    const y = args.y as number;
    const precision = (args.precision as boolean) || false;

    try {
      let targetX, targetY;
      if (x !== undefined && y !== undefined) {
        targetX = x;
        targetY = y;
      } else {
        const currentPos = this.mouseManager.getCurrentPosition();
        targetX = currentPos.x;
        targetY = currentPos.y;
      }

      const sequence = this.mouseManager.generateScrollSequence(direction, amount, targetX, targetY, precision);
      await this.terminalManager.sendInput(sessionId, sequence);

      return {
        success: true,
        data: { 
          message: `Mouse scrolled ${direction} ${amount} units at (${targetX}, ${targetY})`,
          position: { x: targetX, y: targetY },
          direction,
          amount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to scroll mouse: ${error}`
        }
      };
    }
  }

  private async mouseHover(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const x = args.x as number;
    const y = args.y as number;
    const duration = (args.duration as number) || 1000;

    try {
      // Move to position
      const moveSequences = this.mouseManager.generateMoveSequence(x, y);
      for (const sequence of moveSequences) {
        await this.terminalManager.sendInput(sessionId, sequence);
      }

      // Wait for hover duration
      await new Promise(resolve => setTimeout(resolve, duration));

      return {
        success: true,
        data: { 
          message: `Mouse hovered at (${x}, ${y}) for ${duration}ms`,
          position: { x, y },
          duration
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to hover mouse: ${error}`
        }
      };
    }
  }

  private async mouseGesture(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const gestureType = args.gestureType as string;
    const startX = args.startX as number;
    const startY = args.startY as number;
    const size = (args.size as number) || 50;
    const speed = (args.speed as number) || 3;

    try {
      const sequences = this.mouseManager.generateGestureSequence(gestureType, startX, startY, size);
      const delay = Math.max(10, 200 / speed);

      for (const sequence of sequences) {
        await this.terminalManager.sendInput(sessionId, sequence);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return {
        success: true,
        data: { 
          message: `Mouse gesture executed: ${gestureType}`,
          gestureType,
          startPosition: { x: startX, y: startY },
          size,
          speed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to execute mouse gesture: ${error}`
        }
      };
    }
  }

  private async mouseMultiButton(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const buttons = args.buttons as string[];
    const x = args.x as number;
    const y = args.y as number;
    const holdDuration = (args.holdDuration as number) || 100;

    try {
      let targetX, targetY;
      if (x !== undefined && y !== undefined) {
        targetX = x;
        targetY = y;
      } else {
        const currentPos = this.mouseManager.getCurrentPosition();
        targetX = currentPos.x;
        targetY = currentPos.y;
      }

      const sequence = this.mouseManager.generateMultiButtonSequence(buttons, targetX, targetY, holdDuration);
      await this.terminalManager.sendInput(sessionId, sequence);

      return {
        success: true,
        data: { 
          message: `Multiple mouse buttons pressed: ${buttons.join(', ')}`,
          position: { x: targetX, y: targetY },
          buttons,
          holdDuration
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to press multiple mouse buttons: ${error}`
        }
      };
    }
  }

  private async getMousePosition(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const position = this.mouseManager.getCurrentPosition();

      return {
        success: true,
        data: { 
          position,
          sessionId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_ERROR',
          message: `Failed to get mouse position: ${error}`
        }
      };
    }
  }

  // Clipboard methods
  private async clipboardRead(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const format = (args.format as string) || 'text';

    try {
      const entry = await this.clipboardManager.readClipboard(format);

      return {
        success: true,
        data: { 
          content: entry?.content || '',
          format: entry?.format || format,
          timestamp: entry?.timestamp || new Date(),
          source: entry?.source || 'unknown'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'RESOURCE_ERROR',
          message: `Failed to read clipboard: ${error}`
        }
      };
    }
  }

  private async clipboardWrite(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const content = args.content as string;
    const format = (args.format as string) || 'text';

    try {
      await this.clipboardManager.writeClipboard(content, format, 'api');

      return {
        success: true,
        data: { 
          message: 'Content written to clipboard',
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          format
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'RESOURCE_ERROR',
          message: `Failed to write clipboard: ${error}`
        }
      };
    }
  }

  private async textSelect(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const method = args.method as string;

    try {
      const terminalState = await this.terminalManager.getTerminalState(sessionId);
      let selection;

      switch (method) {
        case 'coordinates':
          selection = this.clipboardManager.createTextSelection(
            sessionId,
            args.startX as number,
            args.startY as number,
            args.endX as number,
            args.endY as number,
            'rectangle'
          );
          break;
        case 'word':
          selection = this.clipboardManager.selectWord(
            terminalState.content,
            terminalState.dimensions.cols,
            args.wordX as number,
            args.wordY as number
          );
          break;
        case 'line':
          selection = this.clipboardManager.selectLine(
            terminalState.content,
            terminalState.dimensions.cols,
            args.wordY as number
          );
          break;
        case 'all':
          selection = this.clipboardManager.selectAll(
            terminalState.content,
            terminalState.dimensions.cols,
            terminalState.dimensions.rows
          );
          break;
        case 'pattern':
          const selections = this.clipboardManager.selectByPattern(
            terminalState.content,
            args.pattern as string
          );
          return {
            success: true,
            data: { 
              message: `Pattern selection created: ${selections.length} matches`,
              selections,
              method
            }
          };
        default:
          throw new Error(`Unknown selection method: ${method}`);
      }

      return {
        success: true,
        data: { 
          message: `Text selected using ${method} method`,
          selection,
          method
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to select text: ${error}`
        }
      };
    }
  }

  private async textCopy(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const source = (args.source as string) || 'selection';

    try {
      const terminalState = await this.terminalManager.getTerminalState(sessionId);
      let content = '';

      switch (source) {
        case 'selection':
          const selections = this.clipboardManager.getSelections(sessionId);
          if (selections.length > 0) {
            content = this.clipboardManager.extractSelectionContent(terminalState.content, selections[0]);
          }
          break;
        case 'screen':
          content = terminalState.content;
          break;
        case 'coordinates':
          const selection = this.clipboardManager.createTextSelection(
            sessionId,
            args.startX as number,
            args.startY as number,
            args.endX as number,
            args.endY as number
          );
          content = this.clipboardManager.extractSelectionContent(terminalState.content, selection);
          break;
        default:
          throw new Error(`Unknown copy source: ${source}`);
      }

      if (content) {
        await this.clipboardManager.writeClipboard(content, 'text', 'copy');
      }

      return {
        success: true,
        data: { 
          message: `Text copied from ${source}`,
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          length: content.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to copy text: ${error}`
        }
      };
    }
  }

  private async textPaste(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const source = (args.source as string) || 'clipboard';
    const processing = (args.processing as string) || 'raw';
    const chunkSize = (args.chunkSize as number) || 0;
    const chunkDelay = (args.chunkDelay as number) || 10;

    try {
      let content = '';

      switch (source) {
        case 'clipboard':
          const entry = await this.clipboardManager.readClipboard('text');
          content = entry?.content || '';
          break;
        case 'text':
          content = args.text as string;
          break;
        case 'history':
          const historyEntry = this.clipboardManager.getHistoryEntry(args.historyIndex as number);
          content = historyEntry?.content || '';
          break;
        default:
          throw new Error(`Unknown paste source: ${source}`);
      }

      // Process the text
      const processedContent = this.clipboardManager.processTextForPasting(content, processing);

      // Handle chunked pasting
      if (chunkSize > 0) {
        const chunks = this.clipboardManager.chunkText(processedContent, chunkSize);
        for (const chunk of chunks) {
          await this.terminalManager.sendInput(sessionId, chunk);
          await new Promise(resolve => setTimeout(resolve, chunkDelay));
        }
      } else {
        await this.terminalManager.sendInput(sessionId, processedContent);
      }

      return {
        success: true,
        data: { 
          message: `Text pasted from ${source}`,
          length: processedContent.length,
          processing,
          chunked: chunkSize > 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to paste text: ${error}`
        }
      };
    }
  }

  private async clipboardHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const action = args.action as string;

    try {
      switch (action) {
        case 'list':
          const history = this.clipboardManager.getHistory();
          return {
            success: true,
            data: { 
              history: history.map(entry => ({
                ...entry,
                content: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '')
              }))
            }
          };

        case 'get':
          const entry = this.clipboardManager.getHistoryEntry(args.index as number);
          return {
            success: true,
            data: { entry }
          };

        case 'add':
          await this.clipboardManager.writeClipboard(args.content as string, 'text', 'api');
          return {
            success: true,
            data: { message: 'Entry added to clipboard history' }
          };

        case 'remove':
          const removed = this.clipboardManager.removeFromHistory(args.index as number);
          return {
            success: true,
            data: { message: removed ? 'Entry removed' : 'Entry not found' }
          };

        case 'clear':
          this.clipboardManager.clearHistory();
          return {
            success: true,
            data: { message: 'Clipboard history cleared' }
          };

        default:
          throw new Error(`Unknown clipboard history action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to manage clipboard history: ${error}`
        }
      };
    }
  }

  private async multiSelect(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const selections = args.selections as Array<{startX: number, startY: number, endX: number, endY: number, type?: string}>;
    const operation = (args.operation as string) || 'select';

    try {
      const textSelections = selections.map(sel => 
        this.clipboardManager.createTextSelection(
          sessionId, 
          sel.startX, 
          sel.startY, 
          sel.endX, 
          sel.endY, 
          sel.type || 'rectangle'
        )
      );

      this.clipboardManager.addMultipleSelections(sessionId, textSelections);

      if (operation === 'copy') {
        const terminalState = await this.terminalManager.getTerminalState(sessionId);
        const contents = textSelections.map(sel => 
          this.clipboardManager.extractSelectionContent(terminalState.content, sel)
        );
        const combinedContent = contents.join('\n');
        await this.clipboardManager.writeClipboard(combinedContent, 'text', 'copy');
      }

      return {
        success: true,
        data: { 
          message: `Multi-selection created: ${textSelections.length} regions`,
          selections: textSelections,
          operation
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to create multi-selection: ${error}`
        }
      };
    }
  }

  private async selectionInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const includeContent = (args.includeContent as boolean) ?? true;

    try {
      const selections = this.clipboardManager.getSelections(sessionId);
      const result: any = {
        count: selections.length,
        selections: selections.map(sel => ({
          startX: sel.startX,
          startY: sel.startY,
          endX: sel.endX,
          endY: sel.endY,
          type: sel.type
        }))
      };

      if (includeContent && selections.length > 0) {
        const terminalState = await this.terminalManager.getTerminalState(sessionId);
        result.selections = selections.map(sel => ({
          ...sel,
          content: this.clipboardManager.extractSelectionContent(terminalState.content, sel)
        }));
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get selection info: ${error}`
        }
      };
    }
  }

  // Touch interaction tool implementations
  private async touchInput(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const type = args.type as 'touch' | 'move' | 'release' | 'cancel';
    const x = args.x as number;
    const y = args.y as number;
    const touchId = (args.touchId as number) || 1;
    const pressure = (args.pressure as number) || 1.0;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Validate coordinates
      if (x < 0 || y < 0) {
        throw new Error('Touch coordinates must be non-negative');
      }

      // Create touch event
      const touchEvent = {
        type,
        x,
        y,
        pressure,
        touchId,
        timestamp: new Date()
      };

      // Process touch event and detect gestures
      const gesture = this.touchManager.processTouchEvent(touchEvent);

      return {
        success: true,
        data: {
          touchEvent,
          gesture,
          activeTouches: this.touchManager.getActiveTouches().length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to process touch input: ${error}`
        }
      };
    }
  }

  private async detectGesture(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const touchSequence = args.touchSequence as Array<any>;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const detectedGestures = [];
      
      // Process each touch event in sequence
      for (const touchData of touchSequence) {
        const touchEvent = {
          type: touchData.type,
          x: touchData.x,
          y: touchData.y,
          touchId: touchData.touchId,
          pressure: touchData.pressure || 1.0,
          timestamp: touchData.timestamp ? new Date(touchData.timestamp) : new Date()
        };

        const gesture = this.touchManager.processTouchEvent(touchEvent);
        if (gesture) {
          detectedGestures.push(gesture);
        }
      }

      return {
        success: true,
        data: {
          gestures: detectedGestures,
          totalEvents: touchSequence.length,
          gesturesDetected: detectedGestures.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to detect gestures: ${error}`
        }
      };
    }
  }

  private async getTouchCapabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const capabilities = this.touchManager.getCapabilities();

      return {
        success: true,
        data: {
          capabilities,
          activeTouches: this.touchManager.getActiveTouches().length,
          platform: process.platform
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get touch capabilities: ${error}`
        }
      };
    }
  }

  private async getActiveTouches(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const activeTouches = this.touchManager.getActiveTouches();

      return {
        success: true,
        data: {
          activeTouches,
          count: activeTouches.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get active touches: ${error}`
        }
      };
    }
  }

  private async getTouchHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const limit = (args.limit as number) || 100;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const touchHistory = this.touchManager.getTouchHistory(limit);

      return {
        success: true,
        data: {
          touchHistory,
          count: touchHistory.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get touch history: ${error}`
        }
      };
    }
  }

  private async getGestureHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const limit = (args.limit as number) || 50;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const gestureHistory = this.touchManager.getGestureHistory(limit);

      return {
        success: true,
        data: {
          gestureHistory,
          count: gestureHistory.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get gesture history: ${error}`
        }
      };
    }
  }

  private async configureTouchGestures(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const {
      swipeMinDistance,
      swipeMaxTime,
      tapMaxDuration,
      longPressMinDuration,
      pinchMinDistance
    } = args;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Filter out undefined values
      const thresholds = Object.fromEntries(
        Object.entries({
          swipeMinDistance,
          swipeMaxTime,
          tapMaxDuration,
          longPressMinDuration,
          pinchMinDistance
        }).filter(([, value]) => value !== undefined)
      );

      this.touchManager.configureThresholds(thresholds);

      return {
        success: true,
        data: {
          message: 'Touch gesture thresholds configured successfully',
          updatedParameters: thresholds
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to configure touch gestures: ${error}`
        }
      };
    }
  }

  private async clearTouchState(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      // Validate session exists
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      this.touchManager.clearState();

      return {
        success: true,
        data: {
          message: 'Touch state cleared successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to clear touch state: ${error}`
        }
      };
    }
  }

  // Advanced touch interaction tool implementations
  private async simulateMultiTouch(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const touchPoints = args.touchPoints as Array<{x: number, y: number, pressure?: number}>;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!Array.isArray(touchPoints) || touchPoints.length === 0) {
        throw new Error('Touch points array is required and must not be empty');
      }

      const events = this.touchManager.simulateMultiTouch(touchPoints);

      return {
        success: true,
        data: {
          touchEvents: events,
          fingersSimulated: touchPoints.length,
          activeTouches: this.touchManager.getActiveTouches().length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to simulate multi-touch: ${error}`
        }
      };
    }
  }

  private async detectTouchDrag(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const { startX, startY, endX, endY, pressure = 1.0 } = args;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const startPoint = {
        id: 1,
        x: startX as number,
        y: startY as number,
        pressure: pressure as number,
        timestamp: new Date(),
        isActive: true
      };

      const endPoint = {
        id: 1,
        x: endX as number,
        y: endY as number,
        pressure: pressure as number,
        timestamp: new Date(),
        isActive: true
      };

      const isDrag = this.touchManager.detectTouchDrag(startPoint, endPoint);
      const distance = Math.sqrt(Math.pow((endX as number) - (startX as number), 2) + Math.pow((endY as number) - (startY as number), 2));

      return {
        success: true,
        data: {
          isDrag,
          distance,
          threshold: 15,
          startPosition: { x: startX, y: startY },
          endPosition: { x: endX, y: endY }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to detect touch drag: ${error}`
        }
      };
    }
  }

  private async getHapticCapabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const hapticCapabilities = this.touchManager.getHapticCapabilities();

      return {
        success: true,
        data: {
          hapticCapabilities,
          platform: process.platform,
          supported: hapticCapabilities.available
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get haptic capabilities: ${error}`
        }
      };
    }
  }

  private async recognizeComplexGesture(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const gestureData = args.gestureData as any;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const { touchSequence, minConfidence = 0.7 } = gestureData;
      
      if (!Array.isArray(touchSequence) || touchSequence.length === 0) {
        throw new Error('Touch sequence is required and must not be empty');
      }

      const recognizedGestures = [];
      const gestureConfidence = new Map<string, number>();

      for (const touchData of touchSequence) {
        const touchEvent = {
          type: touchData.type,
          x: touchData.x,
          y: touchData.y,
          touchId: touchData.touchId,
          pressure: touchData.pressure || 1.0,
          timestamp: touchData.timestamp ? new Date(touchData.timestamp) : new Date()
        };

        const gesture = this.touchManager.processTouchEvent(touchEvent);
        if (gesture) {
          recognizedGestures.push(gesture);
          
          const confidenceKey = `${gesture.type}_${gesture.fingers}`;
          const currentConfidence = gestureConfidence.get(confidenceKey) || 0;
          gestureConfidence.set(confidenceKey, Math.min(1.0, currentConfidence + 0.2));
        }
      }

      const highConfidenceGestures = recognizedGestures.filter(gesture => {
        const confidenceKey = `${gesture.type}_${gesture.fingers}`;
        return (gestureConfidence.get(confidenceKey) || 0) >= minConfidence;
      });

      return {
        success: true,
        data: {
          allGestures: recognizedGestures,
          highConfidenceGestures,
          confidenceScores: Object.fromEntries(gestureConfidence),
          totalEvents: touchSequence.length,
          gesturesRecognized: recognizedGestures.length,
          highConfidenceCount: highConfidenceGestures.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to recognize complex gesture: ${error}`
        }
      };
    }
  }

  private async configureAdvancedTouch(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const configuration = (args.configuration || {}) as any;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const {
        palmRejectionEnabled = true,
        touchSensitivity = 1.0,
        gestureRecognitionAccuracy = 'medium',
        multiTouchEnabled = true
      } = configuration;

      const thresholdAdjustments: any = {};
      
      if (gestureRecognitionAccuracy === 'high') {
        thresholdAdjustments.swipeMinDistance = 30;
        thresholdAdjustments.tapMaxDuration = 150;
        thresholdAdjustments.longPressMinDuration = 1000;
      } else if (gestureRecognitionAccuracy === 'low') {
        thresholdAdjustments.swipeMinDistance = 80;
        thresholdAdjustments.tapMaxDuration = 300;
        thresholdAdjustments.longPressMinDuration = 600;
      }

      if (touchSensitivity !== 1.0) {
        Object.keys(thresholdAdjustments).forEach(key => {
          if (thresholdAdjustments[key]) {
            thresholdAdjustments[key] = Math.round(thresholdAdjustments[key] / touchSensitivity);
          }
        });
      }

      this.touchManager.configureThresholds(thresholdAdjustments);

      return {
        success: true,
        data: {
          configuration: {
            palmRejectionEnabled,
            touchSensitivity,
            gestureRecognitionAccuracy,
            multiTouchEnabled
          },
          appliedThresholds: thresholdAdjustments,
          message: 'Advanced touch configuration applied successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to configure advanced touch: ${error}`
        }
      };
    }
  }

  // Accessibility tool implementations
  private async initializeAccessibility(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const accessibilityInfo = await this.accessibilityManager.initialize();

      return {
        success: true,
        data: {
          accessibilityInfo,
          message: 'Accessibility features initialized successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to initialize accessibility: ${error}`
        }
      };
    }
  }

  private async announceToScreenReader(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const content = args.content as string;
    const priority = (args.priority as 'polite' | 'assertive') || 'polite';

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!content || typeof content !== 'string') {
        throw new Error('Content must be a non-empty string');
      }

      this.accessibilityManager.announceToScreenReader(content, priority);

      return {
        success: true,
        data: {
          content,
          priority,
          message: 'Content announced to screen reader'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to announce to screen reader: ${error}`
        }
      };
    }
  }

  private async applyHighContrast(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const enabled = (args.enabled as boolean) ?? true;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const currentSettings = this.accessibilityManager.getSettings();
      this.accessibilityManager.updateSettings({
        ...currentSettings,
        highContrastEnabled: enabled
      });

      const terminalState = await this.terminalManager.getTerminalState(sessionId);
      const filteredState = this.accessibilityManager.applyHighContrastFiltering(terminalState);

      return {
        success: true,
        data: {
          enabled,
          filteredState,
          message: `High contrast mode ${enabled ? 'enabled' : 'disabled'}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to apply high contrast: ${error}`
        }
      };
    }
  }

  private async configureAccessibility(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const settings = (args.settings || {}) as any;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      this.accessibilityManager.updateSettings(settings);
      const updatedSettings = this.accessibilityManager.getSettings();

      return {
        success: true,
        data: {
          settings: updatedSettings,
          message: 'Accessibility settings updated successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to configure accessibility: ${error}`
        }
      };
    }
  }

  private async handleFocusChange(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const newFocus = args.newFocus as string;
    const content = args.content as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!newFocus || typeof newFocus !== 'string') {
        throw new Error('New focus target must be a non-empty string');
      }

      this.accessibilityManager.handleFocusChange(newFocus, content);

      return {
        success: true,
        data: {
          newFocus,
          content,
          message: 'Focus change handled successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to handle focus change: ${error}`
        }
      };
    }
  }

  private async getAccessibilityStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const report = this.accessibilityManager.generateAccessibilityReport();

      return {
        success: true,
        data: {
          ...report,
          platform: process.platform
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get accessibility status: ${error}`
        }
      };
    }
  }

  private async getKeyboardNavigationHints(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const hints = this.accessibilityManager.getKeyboardNavigationHints();

      return {
        success: true,
        data: {
          hints,
          count: hints.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get keyboard navigation hints: ${error}`
        }
      };
    }
  }

  private async getScreenReaderEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const limit = (args.limit as number) || 100;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const events = this.accessibilityManager.getScreenReaderEvents(limit);

      return {
        success: true,
        data: {
          events,
          count: events.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get screen reader events: ${error}`
        }
      };
    }
  }

  // Input processing tool implementations
  private async queueInputEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const eventType = args.eventType as string;
    const eventData = args.eventData as any;
    const priority = (args.priority as 'low' | 'normal' | 'high' | 'critical') || 'normal';

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!eventData || typeof eventData !== 'object') {
        throw new Error('Event data must be a valid object');
      }

      const eventId = this.inputProcessingManager.queueEvent({
        type: eventType as any,
        timestamp: new Date(),
        data: eventData,
        priority
      });

      return {
        success: true,
        data: {
          eventId,
          eventType,
          priority,
          queueSize: this.inputProcessingManager.getQueueSize(),
          message: 'Input event queued successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to queue input event: ${error}`
        }
      };
    }
  }

  private async startInputRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const recordingName = args.recordingName as string;
    const description = args.description as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const recordingId = this.inputProcessingManager.startRecording(recordingName, description);

      return {
        success: true,
        data: {
          recordingId,
          recordingName,
          description,
          startTime: new Date(),
          message: 'Input recording started successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to start input recording: ${error}`
        }
      };
    }
  }

  private async stopInputRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const recording = this.inputProcessingManager.stopRecording();

      if (!recording) {
        throw new Error('No active recording found');
      }

      return {
        success: true,
        data: {
          recording,
          eventCount: recording.events.length,
          duration: recording.duration,
          message: 'Input recording stopped successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to stop input recording: ${error}`
        }
      };
    }
  }

  private async playbackInputRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const recordingId = args.recordingId as string;
    const speed = (args.speed as number) || 1.0;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      await this.inputProcessingManager.playbackRecording(recordingId, speed);

      return {
        success: true,
        data: {
          recordingId,
          speed,
          message: 'Input recording playback completed successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to playback input recording: ${error}`
        }
      };
    }
  }

  private async detectInputDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const devices = await this.inputProcessingManager.detectDevices();

      return {
        success: true,
        data: {
          devices,
          deviceCount: devices.length,
          platform: process.platform,
          message: 'Input device detection completed'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to detect input devices: ${error}`
        }
      };
    }
  }

  private async addInputFilter(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const filter = args.filter as any;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const inputFilter = {
        id: filter.id,
        name: filter.name,
        type: filter.type,
        enabled: filter.enabled ?? true,
        maxRate: filter.maxRate,
        condition: (event: any) => {
          if (filter.conditions?.eventType && event.type !== filter.conditions.eventType) {
            return false;
          }
          if (filter.conditions?.pattern) {
            const regex = new RegExp(filter.conditions.pattern);
            return regex.test(JSON.stringify(event.data));
          }
          return true;
        }
      };

      this.inputProcessingManager.addFilter(inputFilter);

      return {
        success: true,
        data: {
          filter: inputFilter,
          message: 'Input filter added successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to add input filter: ${error}`
        }
      };
    }
  }

  private async removeInputFilter(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const filterId = args.filterId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const removed = this.inputProcessingManager.removeFilter(filterId);

      if (!removed) {
        throw new Error(`Filter ${filterId} not found`);
      }

      return {
        success: true,
        data: {
          filterId,
          message: 'Input filter removed successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to remove input filter: ${error}`
        }
      };
    }
  }

  private async getInputAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const analytics = this.inputProcessingManager.getAnalytics();

      return {
        success: true,
        data: {
          analytics,
          queueSize: this.inputProcessingManager.getQueueSize(),
          connectedDevices: this.inputProcessingManager.getDevices().length,
          activeRecordings: this.inputProcessingManager.getRecordings().length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get input analytics: ${error}`
        }
      };
    }
  }

  private async optimizeInputLatency(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const enabled = (args.enabled as boolean) ?? true;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (enabled) {
        this.inputProcessingManager.optimizeLatency();
      } else {
        this.inputProcessingManager.resetOptimizations();
      }

      return {
        success: true,
        data: {
          enabled,
          message: `Input latency optimization ${enabled ? 'enabled' : 'disabled'}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to optimize input latency: ${error}`
        }
      };
    }
  }

  private async getInputHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.sessionId as string;
    const limit = (args.limit as number) || 100;

    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const history = this.inputProcessingManager.getEventHistory(limit);

      return {
        success: true,
        data: {
          history,
          count: history.length,
          totalProcessed: this.inputProcessingManager.getAnalytics().totalEvents
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'COMMAND_FAILED',
          message: `Failed to get input history: ${error}`
        }
      };
    }
  }

  private setupErrorHandling(): void {
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  // Environment tool implementations
  private async setEnvironmentVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSetEnvironmentVariable } = await import('./tools/environment-tools.js');
    return handleSetEnvironmentVariable(args);
  }

  private async getEnvironmentVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleGetEnvironmentVariable } = await import('./tools/environment-tools.js');
    return handleGetEnvironmentVariable(args);
  }

  private async listEnvironmentVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleListEnvironmentVariables } = await import('./tools/environment-tools.js');
    return handleListEnvironmentVariables(args);
  }

  private async unsetEnvironmentVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleUnsetEnvironmentVariable } = await import('./tools/environment-tools.js');
    return handleUnsetEnvironmentVariable(args);
  }

  private async changeWorkingDirectory(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleChangeWorkingDirectory } = await import('./tools/environment-tools.js');
    return handleChangeWorkingDirectory(args);
  }

  private async sendProcessSignal(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSendProcessSignal } = await import('./tools/environment-tools.js');
    return handleSendProcessSignal(args);
  }

  private async setTerminalTitle(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSetTerminalTitle } = await import('./tools/environment-tools.js');
    return handleSetTerminalTitle(args);
  }

  private async controlJob(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleControlJob } = await import('./tools/environment-tools.js');
    return handleControlJob(args);
  }

  // Session state tool implementations
  private async saveSessionBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSaveSessionBookmark } = await import('./tools/session-state-tools.js');
    return handleSaveSessionBookmark(args);
  }

  private async restoreSessionBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleRestoreSessionBookmark } = await import('./tools/session-state-tools.js');
    return handleRestoreSessionBookmark(args);
  }

  private async getSessionHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleGetSessionHistory } = await import('./tools/session-state-tools.js');
    return handleGetSessionHistory(args);
  }

  private async searchSessionHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSearchSessionHistory } = await import('./tools/session-state-tools.js');
    return handleSearchSessionHistory(args);
  }

  private async listSessionBookmarks(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleListSessionBookmarks } = await import('./tools/session-state-tools.js');
    return handleListSessionBookmarks(args);
  }

  private async serializeSessionState(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSerializeSessionState } = await import('./tools/session-state-tools.js');
    return handleSerializeSessionState(args);
  }

  private async undoLastCommand(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleUndoLastCommand } = await import('./tools/session-state-tools.js');
    return handleUndoLastCommand(args);
  }

  private async autoSaveSession(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleAutoSaveSession } = await import('./tools/session-state-tools.js');
    return handleAutoSaveSession(args);
  }

  // Terminal control tool implementations
  private async sendTerminalBell(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSendTerminalBell } = await import('./tools/terminal-control-tools.js');
    return handleSendTerminalBell(args);
  }

  private async setCursorStyle(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSetCursorStyle } = await import('./tools/terminal-control-tools.js');
    return handleSetCursorStyle(args);
  }

  private async switchTerminalMode(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSwitchTerminalMode } = await import('./tools/terminal-control-tools.js');
    return handleSwitchTerminalMode(args);
  }

  // Terminal navigation tool implementations
  private async dynamicTerminalResize(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleDynamicTerminalResize } = await import('./tools/terminal-navigation-tools.js');
    return handleDynamicTerminalResize(args);
  }

  private async toggleFullscreenMode(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleToggleFullscreenMode } = await import('./tools/terminal-navigation-tools.js');
    return handleToggleFullscreenMode(args);
  }

  private async createTerminalTab(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleCreateTerminalTab } = await import('./tools/terminal-navigation-tools.js');
    return handleCreateTerminalTab(args);
  }

  private async switchTerminalTab(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSwitchTerminalTab } = await import('./tools/terminal-navigation-tools.js');
    return handleSwitchTerminalTab(args);
  }

  private async splitTerminalPane(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSplitTerminalPane } = await import('./tools/terminal-navigation-tools.js');
    return handleSplitTerminalPane(args);
  }

  private async focusTerminalPane(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleFocusTerminalPane } = await import('./tools/terminal-navigation-tools.js');
    return handleFocusTerminalPane(args);
  }

  private async setZoomLevel(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSetZoomLevel } = await import('./tools/terminal-navigation-tools.js');
    return handleSetZoomLevel(args);
  }

  private async scrollViewport(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleScrollViewport } = await import('./tools/terminal-navigation-tools.js');
    return handleScrollViewport(args);
  }

  private async setTerminalOpacity(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSetTerminalOpacity } = await import('./tools/terminal-navigation-tools.js');
    return handleSetTerminalOpacity(args);
  }

  private async getNavigationStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleGetNavigationStatus } = await import('./tools/terminal-navigation-tools.js');
    return handleGetNavigationStatus(args);
  }

  // Advanced mouse tool implementations
  private async configureMouseAcceleration(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleConfigureMouseAcceleration } = await import('./tools/advanced-mouse-tools.js');
    return handleConfigureMouseAcceleration(args);
  }

  private async configurePressureSensitivity(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleConfigurePressureSensitivity } = await import('./tools/advanced-mouse-tools.js');
    return handleConfigurePressureSensitivity(args);
  }

  private async trackMultiClickSequence(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleTrackMultiClickSequence } = await import('./tools/advanced-mouse-tools.js');
    return handleTrackMultiClickSequence(args);
  }

  private async configureFocusFollowMouse(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleConfigureFocusFollowMouse } = await import('./tools/advanced-mouse-tools.js');
    return handleConfigureFocusFollowMouse(args);
  }

  private async setMouseEventFilter(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleSetMouseEventFilter } = await import('./tools/advanced-mouse-tools.js');
    return handleSetMouseEventFilter(args);
  }

  private async getAdvancedMouseStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleGetAdvancedMouseStatus } = await import('./tools/advanced-mouse-tools.js');
    return handleGetAdvancedMouseStatus(args);
  }

  // Interaction replay tool implementations
  private async startInteractionRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleStartInteractionRecording } = await import('./tools/interaction-replay-tools.js');
    return handleStartInteractionRecording(args);
  }

  private async stopInteractionRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleStopInteractionRecording } = await import('./tools/interaction-replay-tools.js');
    return handleStopInteractionRecording(args);
  }

  private async replayInteractionSequence(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleReplayInteractionSequence } = await import('./tools/interaction-replay-tools.js');
    return handleReplayInteractionSequence(args);
  }

  private async listInteractionRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleListInteractionRecordings } = await import('./tools/interaction-replay-tools.js');
    return handleListInteractionRecordings(args);
  }

  private async createStateSnapshot(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleCreateStateSnapshot } = await import('./tools/interaction-replay-tools.js');
    return handleCreateStateSnapshot(args);
  }

  private async generateStateDiff(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleGenerateStateDiff } = await import('./tools/interaction-replay-tools.js');
    return handleGenerateStateDiff(args);
  }

  private async listStateSnapshots(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleListStateSnapshots } = await import('./tools/interaction-replay-tools.js');
    return handleListStateSnapshots(args);
  }

  private async listStateDiffs(args: Record<string, unknown>): Promise<ToolResult> {
    const { handleListStateDiffs } = await import('./tools/interaction-replay-tools.js');
    return handleListStateDiffs();
  }

  private async cleanup(): Promise<void> {
    await this.terminalManager.cleanup();
    await this.sessionManager.cleanup();
    await this.navigationManager.cleanup();
    await this.advancedMouseManager.cleanup();
    await this.interactionReplayManager.cleanup();
    await this.environmentManager.cleanup();
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Export factory function for CLI usage
export function createServer(): InterMServer {
  return new InterMServer();
}

// Run server if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new InterMServer();
  server.run().catch(console.error);
}