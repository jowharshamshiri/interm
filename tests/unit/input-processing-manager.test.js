import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { InputProcessingManager } from '../../src/input-processing-manager.js';
import { TerminalManager } from '../../src/terminal-manager.js';

describe('InputProcessingManager - F00092-F00099', () => {
  let inputManager;
  let terminalManager;
  let testSession;

  beforeEach(async () => {
    inputManager = InputProcessingManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session for input processing operations
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
    
    // Clean up input processing state
    inputManager.cleanup();
  });

  test('should be a singleton instance', () => {
    const manager1 = InputProcessingManager.getInstance();
    const manager2 = InputProcessingManager.getInstance();
    strictEqual(manager1, manager2);
  });

  // F00092: Input Event Queuing
  test('should manage input event queues', async () => {
    const result = await inputManager.configureEventQueue(testSession.id, {
      maxSize: 1000,
      priorityLevels: ['high', 'normal', 'low'],
      processingRate: 100
    });
    
    ok(result.success);
    strictEqual(result.queue.maxSize, 1000);
    ok(result.queue.priorityLevels.includes('high'));
    
    const queueResult = await inputManager.queueEvent(testSession.id, {
      type: 'keyboard',
      data: { key: 'a' },
      priority: 'normal'
    });
    
    ok(queueResult.success);
    ok(queueResult.eventId);
  });

  // F00093: Input Filtering & Validation
  test('should filter and validate input events', async () => {
    const filterResult = await inputManager.configureInputFilter(testSession.id, {
      enabled: true,
      rules: [
        { type: 'rate_limit', maxPerSecond: 100 },
        { type: 'content_filter', pattern: /malicious/i }
      ]
    });
    
    ok(filterResult.success);
    ok(filterResult.filter.rules.length >= 2);
    
    const validateResult = await inputManager.validateInput(testSession.id, {
      type: 'keyboard',
      data: { text: 'safe input' }
    });
    
    ok(validateResult.success);
    strictEqual(validateResult.valid, true);
  });

  // F00094: Input Recording & Playback
  test('should record and playback input sequences', async () => {
    const recordResult = await inputManager.startRecording(testSession.id, {
      name: 'test-sequence',
      includeTimings: true,
      captureAll: true
    });
    
    ok(recordResult.success);
    ok(recordResult.recordingId);
    
    // Simulate some input events
    await inputManager.recordEvent(testSession.id, { type: 'keyboard', key: 'h' });
    await inputManager.recordEvent(testSession.id, { type: 'keyboard', key: 'i' });
    
    const stopResult = await inputManager.stopRecording(testSession.id, recordResult.recordingId);
    ok(stopResult.success);
    ok(stopResult.recording.events.length >= 2);
    
    const playbackResult = await inputManager.playbackRecording(testSession.id, {
      recordingId: recordResult.recordingId,
      speed: 1.0,
      loop: false
    });
    
    ok(playbackResult.success);
    ok(playbackResult.playbackId);
  });

  // F00095: Simultaneous Input Sources
  test('should coordinate multiple input sources', async () => {
    const result = await inputManager.configureMultiInput(testSession.id, {
      sources: ['keyboard', 'mouse', 'touch'],
      coordinationMode: 'priority',
      conflictResolution: 'merge'
    });
    
    ok(result.success);
    ok(result.sources.includes('keyboard'));
    ok(result.sources.includes('mouse'));
    
    const simultaneousResult = await inputManager.processSimultaneousInput(testSession.id, {
      events: [
        { source: 'keyboard', type: 'keypress', key: 'a' },
        { source: 'mouse', type: 'move', x: 100, y: 200 }
      ]
    });
    
    ok(simultaneousResult.success);
    ok(simultaneousResult.processedEvents.length >= 2);
  });

  // F00096: Input Device Auto-Detection
  test('should auto-detect input devices', async () => {
    const scanResult = await inputManager.scanForDevices();
    
    ok(scanResult.success);
    ok(scanResult.devices);
    ok(Array.isArray(scanResult.devices));
    
    const deviceResult = await inputManager.getDeviceInfo(testSession.id, {
      includeCapabilities: true,
      includeStatus: true
    });
    
    ok(deviceResult.success);
    ok(deviceResult.devices);
    
    for (const device of deviceResult.devices) {
      ok(device.id);
      ok(device.type);
      ok(device.capabilities);
    }
  });

  // F00097: Custom Input Protocols
  test('should support custom input protocols', async () => {
    const protocolResult = await inputManager.registerCustomProtocol(testSession.id, {
      name: 'gamepad',
      type: 'controller',
      mappings: {
        'button_a': 'enter',
        'stick_left': 'navigate'
      }
    });
    
    ok(protocolResult.success);
    ok(protocolResult.protocol.name);
    
    const processResult = await inputManager.processCustomInput(testSession.id, {
      protocol: 'gamepad',
      input: { button: 'button_a', pressed: true }
    });
    
    ok(processResult.success);
    ok(processResult.mappedInput);
  });

  // F00098: Input Latency Optimization
  test('should optimize input latency', async () => {
    const optimizeResult = await inputManager.enableLatencyOptimization(testSession.id, {
      enabled: true,
      bufferSize: 64,
      predictionEnabled: true
    });
    
    ok(optimizeResult.success);
    strictEqual(optimizeResult.optimization.enabled, true);
    
    const benchmarkResult = await inputManager.benchmarkInputLatency(testSession.id, {
      sampleSize: 100,
      inputType: 'keyboard'
    });
    
    ok(benchmarkResult.success);
    ok(benchmarkResult.averageLatency >= 0);
    ok(benchmarkResult.minLatency >= 0);
    ok(benchmarkResult.maxLatency >= benchmarkResult.minLatency);
  });

  // F00099: Input Event Analytics
  test('should provide input event analytics', async () => {
    const analyticsResult = await inputManager.enableAnalytics(testSession.id, {
      trackingEnabled: true,
      metricsEnabled: true,
      aggregationPeriod: 60000
    });
    
    ok(analyticsResult.success);
    
    // Generate some events for analytics
    for (let i = 0; i < 10; i++) {
      await inputManager.trackEvent(testSession.id, {
        type: 'keyboard',
        timestamp: Date.now(),
        metadata: { key: String.fromCharCode(97 + i) }
      });
    }
    
    const metricsResult = await inputManager.getInputMetrics(testSession.id, {
      period: 'last_minute',
      includeBreakdown: true
    });
    
    ok(metricsResult.success);
    ok(metricsResult.metrics.totalEvents >= 10);
    ok(metricsResult.metrics.eventsByType);
    ok(metricsResult.metrics.eventsByType.keyboard >= 10);
  });

  // Integration test
  test('should handle complex input processing workflows', async () => {
    // Enable multiple input processing features
    const queueResult = await inputManager.configureEventQueue(testSession.id, { maxSize: 500 });
    const filterResult = await inputManager.configureInputFilter(testSession.id, { enabled: true });
    const recordResult = await inputManager.startRecording(testSession.id, { name: 'complex-test' });
    const analyticsResult = await inputManager.enableAnalytics(testSession.id, { trackingEnabled: true });
    
    ok(queueResult.success);
    ok(filterResult.success);
    ok(recordResult.success);
    ok(analyticsResult.success);
    
    // Process some complex input sequence
    const multiInputResult = await inputManager.processSimultaneousInput(testSession.id, {
      events: [
        { source: 'keyboard', type: 'keydown', key: 'ctrl' },
        { source: 'keyboard', type: 'keypress', key: 'c' },
        { source: 'mouse', type: 'click', x: 50, y: 100 }
      ]
    });
    
    ok(multiInputResult.success);
    
    const statusResult = await inputManager.getProcessingStatus(testSession.id);
    ok(statusResult.success);
    ok(statusResult.activeFeatures.length >= 4);
  });

  test('should handle input processing errors gracefully', async () => {
    try {
      await inputManager.configureEventQueue('invalid-session-id', { maxSize: 100 });
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message.includes('Session not found') || error.message.includes('invalid'));
    }
  });
});