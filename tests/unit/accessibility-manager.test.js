import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { AccessibilityManager } from '../../src/accessibility-manager.js';
import { TerminalManager } from '../../src/terminal-manager.js';

describe('AccessibilityManager - F00084-F00091', () => {
  let accessibilityManager;
  let terminalManager;
  let testSession;

  beforeEach(async () => {
    accessibilityManager = AccessibilityManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session for accessibility operations
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
    
    // Clean up accessibility state
    accessibilityManager.cleanup();
  });

  test('should be a singleton instance', () => {
    const manager1 = AccessibilityManager.getInstance();
    const manager2 = AccessibilityManager.getInstance();
    strictEqual(manager1, manager2);
  });

  // F00084: Screen Reader Support
  test('should provide screen reader integration', async () => {
    const result = await accessibilityManager.configureScreenReader(testSession.id, {
      enabled: true,
      announceChanges: true,
      verbosity: 'medium'
    });
    
    ok(result.success);
    strictEqual(result.screenReader.enabled, true);
    ok(result.screenReader.capabilities);
    
    const statusResult = await accessibilityManager.getScreenReaderStatus(testSession.id);
    ok(statusResult.success);
    ok(statusResult.isActive !== undefined);
  });

  // F00085: Voice Input Recognition  
  test('should handle voice input recognition', async () => {
    const result = await accessibilityManager.enableVoiceInput(testSession.id, {
      language: 'en-US',
      sensitivity: 0.7,
      commandMode: true
    });
    
    ok(result.success);
    strictEqual(result.voiceInput.language, 'en-US');
    
    const commandResult = await accessibilityManager.processVoiceCommand(testSession.id, {
      command: 'navigate to end',
      confidence: 0.9
    });
    
    ok(commandResult.success);
    ok(commandResult.action);
  });

  // F00086: Eye Tracking Input
  test('should support eye tracking integration', async () => {
    const result = await accessibilityManager.configureEyeTracking(testSession.id, {
      enabled: true,
      dwellTime: 1000,
      cursorMode: 'gaze'
    });
    
    ok(result.success);
    strictEqual(result.eyeTracking.dwellTime, 1000);
    
    const calibrationResult = await accessibilityManager.calibrateEyeTracking(testSession.id);
    ok(calibrationResult.success);
    ok(calibrationResult.calibrationData);
  });

  // F00087: Switch Input Support
  test('should handle switch input devices', async () => {
    const result = await accessibilityManager.configureSwitchInput(testSession.id, {
      switchCount: 2,
      scanMode: 'automatic',
      scanRate: 2000
    });
    
    ok(result.success);
    strictEqual(result.switchInput.switchCount, 2);
    
    const switchResult = await accessibilityManager.processSwitchInput(testSession.id, {
      switchId: 1,
      action: 'press',
      duration: 500
    });
    
    ok(switchResult.success);
    ok(switchResult.action);
  });

  // F00088: Sticky Keys Emulation
  test('should emulate sticky keys functionality', async () => {
    const result = await accessibilityManager.enableStickyKeys(testSession.id, {
      enabled: true,
      lockModifiers: true,
      audioFeedback: false
    });
    
    ok(result.success);
    strictEqual(result.stickyKeys.enabled, true);
    
    const modifierResult = await accessibilityManager.processStickyModifier(testSession.id, {
      modifier: 'ctrl',
      action: 'activate'
    });
    
    ok(modifierResult.success);
    ok(modifierResult.activeModifiers);
  });

  // F00089: High Contrast Mode
  test('should provide high contrast mode', async () => {
    const result = await accessibilityManager.enableHighContrast(testSession.id, {
      enabled: true,
      theme: 'yellow-on-black',
      boldText: true
    });
    
    ok(result.success);
    strictEqual(result.highContrast.enabled, true);
    strictEqual(result.highContrast.theme, 'yellow-on-black');
    
    const themeResult = await accessibilityManager.getContrastTheme(testSession.id);
    ok(themeResult.success);
    ok(themeResult.colors);
  });

  // F00090: Magnification Support
  test('should handle screen magnification', async () => {
    const result = await accessibilityManager.enableMagnification(testSession.id, {
      enabled: true,
      magnificationLevel: 2.0,
      followFocus: true
    });
    
    ok(result.success);
    strictEqual(result.magnification.level, 2.0);
    
    const zoomResult = await accessibilityManager.adjustMagnification(testSession.id, {
      level: 1.5,
      centerPoint: { x: 40, y: 12 }
    });
    
    ok(zoomResult.success);
    strictEqual(zoomResult.newLevel, 1.5);
  });

  // F00091: Input Method Editors
  test('should support input method editors', async () => {
    const result = await accessibilityManager.configureIME(testSession.id, {
      language: 'ja-JP',
      inputMode: 'hiragana',
      enabled: true
    });
    
    ok(result.success);
    strictEqual(result.ime.language, 'ja-JP');
    
    const conversionResult = await accessibilityManager.processIMEInput(testSession.id, {
      input: 'konnichiwa',
      conversionType: 'phonetic'
    });
    
    ok(conversionResult.success);
    ok(conversionResult.converted);
  });

  // Integration test
  test('should handle multiple accessibility features simultaneously', async () => {
    const screenReaderResult = await accessibilityManager.configureScreenReader(testSession.id, { enabled: true });
    const highContrastResult = await accessibilityManager.enableHighContrast(testSession.id, { enabled: true });
    const magnificationResult = await accessibilityManager.enableMagnification(testSession.id, { enabled: true, level: 1.5 });
    
    ok(screenReaderResult.success);
    ok(highContrastResult.success);
    ok(magnificationResult.success);
    
    const statusResult = await accessibilityManager.getAccessibilityStatus(testSession.id);
    ok(statusResult.success);
    ok(statusResult.activeFeatures.length >= 3);
  });

  test('should detect platform accessibility capabilities', async () => {
    const result = await accessibilityManager.getPlatformCapabilities();
    
    ok(result.success);
    ok(result.platform);
    ok(result.capabilities);
    ok(typeof result.capabilities.screenReader === 'boolean');
    ok(typeof result.capabilities.voiceInput === 'boolean');
    ok(typeof result.capabilities.eyeTracking === 'boolean');
  });

  test('should handle accessibility errors gracefully', async () => {
    try {
      await accessibilityManager.configureScreenReader('invalid-session-id', { enabled: true });
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message.includes('Session not found') || error.message.includes('invalid'));
    }
  });
});