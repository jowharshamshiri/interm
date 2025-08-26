// Tests for Advanced Interaction Systems - F00053-F00068, F00084-F00115
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AdvancedMouseManager } from '../../dist/advanced-mouse-manager.js';
import { TerminalNavigationManager } from '../../dist/terminal-navigation-manager.js';
import { AccessibilityManager } from '../../dist/accessibility-manager.js';
import { InputProcessingManager } from '../../dist/input-processing-manager.js';
import { EnvironmentManager } from '../../dist/environment-manager.js';
import { SessionManager } from '../../dist/session-manager.js';
import { InteractionReplayManager } from '../../dist/interaction-replay-manager.js';
import { TerminalManager } from '../../dist/terminal-manager.js';

describe('AdvancedMouseManager - F00053-F00056, F00058 ✅', () => {
  let advancedMouseManager;
  let terminalManager;
  let testSessionId;

  beforeEach(async () => {
    AdvancedMouseManager.instance = null;
    TerminalManager.instance = null;
    advancedMouseManager = AdvancedMouseManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session
    const session = await terminalManager.createSession(80, 24);
    testSessionId = session.id;
  });
  
  afterEach(async () => {
    if (testSessionId) {
      await terminalManager.closeSession(testSessionId);
    }
    await terminalManager.cleanup();
  });

  it('should be a singleton instance', () => {
    const instance1 = AdvancedMouseManager.getInstance();
    const instance2 = AdvancedMouseManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  it('should configure mouse acceleration', async () => {
    const config = {
      enabled: true,
      sensitivity: 1.5,
      threshold: 10,
      maxSpeed: 3.0
    };
    
    await advancedMouseManager.configureAcceleration(testSessionId, config);
    const currentConfig = advancedMouseManager.getAccelerationSettings(testSessionId);
    
    assert.strictEqual(currentConfig.enabled, true);
    assert.strictEqual(currentConfig.sensitivity, 1.5);
  });

  it('should handle pressure sensitivity', async () => {
    const pressureConfig = {
      enabled: true,
      threshold: 0.5,
      maxPressure: 1.0
    };
    
    await advancedMouseManager.configurePressureSensitivity(testSessionId, pressureConfig);
    const config = advancedMouseManager.getPressureSettings(testSessionId);
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.threshold, 0.5);
  });

  it('should track multi-click sequences', async () => {
    const clickCount = await advancedMouseManager.trackMultiClick(testSessionId, 100, 100, 5);
    assert.strictEqual(clickCount, 1);
    
    const status = advancedMouseManager.getMultiClickStatus(testSessionId);
    assert.strictEqual(status.count, 1);
    assert.strictEqual(status.maxClicks, 5);
  });

  it('should configure focus-follow-mouse', async () => {
    const focusConfig = {
      enabled: true,
      delay: 200,
      zones: [
        { x: 0, y: 0, width: 400, height: 300, sessionId: testSessionId },
        { x: 400, y: 0, width: 400, height: 300, sessionId: testSessionId }
      ]
    };
    
    await advancedMouseManager.configureFocusFollowMouse(testSessionId, focusConfig);
    const config = advancedMouseManager.getFocusSettings(testSessionId);
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.zones.length, 2);
  });

  it('should filter mouse events', async () => {
    const debounceMs = 50;
    
    await advancedMouseManager.setEventFilter(testSessionId, debounceMs);
    const filter = advancedMouseManager.getEventFilter(testSessionId);
    
    assert.strictEqual(filter.debounceMs, 50);
  });

  it('should provide advanced status information', () => {
    // Test that we can get settings (will be null if not configured)
    const acceleration = advancedMouseManager.getAccelerationSettings(testSessionId);
    const pressure = advancedMouseManager.getPressureSettings(testSessionId);
    const focus = advancedMouseManager.getFocusSettings(testSessionId);
    
    // These should be null initially
    assert.strictEqual(acceleration, null);
    assert.strictEqual(pressure, null);
    assert.strictEqual(focus, null);
  });
});

describe('TerminalNavigationManager - F00059-F00068 ✅', () => {
  let navigationManager;
  let terminalManager;
  let testSessionId;

  beforeEach(async () => {
    TerminalNavigationManager.instance = null;
    TerminalManager.instance = null;
    navigationManager = TerminalNavigationManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session
    const session = await terminalManager.createSession(80, 24);
    testSessionId = session.id;
  });
  
  afterEach(async () => {
    if (testSessionId) {
      await terminalManager.closeSession(testSessionId);
    }
    await terminalManager.cleanup();
  });

  it('should manage terminal dimensions dynamically', async () => {
    await navigationManager.dynamicResize(testSessionId, 120, 40, true);
    
    // Verify the session was resized
    const session = terminalManager.getSession(testSessionId);
    assert.strictEqual(session.cols, 120);
    assert.strictEqual(session.rows, 40);
  });

  it('should toggle fullscreen mode', async () => {
    const isFullscreen = await navigationManager.toggleFullscreen(testSessionId);
    
    assert.strictEqual(typeof isFullscreen, 'boolean');
    assert.strictEqual(isFullscreen, true);
    
    // Toggle back
    const isNotFullscreen = await navigationManager.toggleFullscreen(testSessionId);
    assert.strictEqual(isNotFullscreen, false);
  });

  it('should manage terminal tabs', async () => {
    const tabId = await navigationManager.createTab('Test Tab', testSessionId);
    
    assert.strictEqual(typeof tabId, 'string');
    assert.ok(tabId.startsWith('tab_'));
    
    const tabs = navigationManager.getAllTabs();
    assert.ok(Array.isArray(tabs));
    assert.ok(tabs.length > 0);
    assert.strictEqual(tabs[0].title, 'Test Tab');
  });

  it('should switch between tabs', async () => {
    const tab1Id = await navigationManager.createTab('Tab 1', testSessionId);
    const tab2Id = await navigationManager.createTab('Tab 2');
    
    await navigationManager.switchTab(tab2Id);
    
    const currentActive = navigationManager.getActiveTab();
    assert.strictEqual(currentActive.id, tab2Id);
    assert.strictEqual(currentActive.title, 'Tab 2');
  });

  it('should split terminal panes', async () => {
    // First create a tab to get panes
    const tabId = await navigationManager.createTab('Test Tab', testSessionId);
    const tab = navigationManager.getAllTabs().find(t => t.id === tabId);
    const mainPaneId = tab.panes[0].id;
    
    // Split the pane
    const newPaneId = await navigationManager.splitPane(mainPaneId, 'horizontal');
    
    assert.strictEqual(typeof newPaneId, 'string');
    
    const newPane = navigationManager.getPane(newPaneId);
    assert.strictEqual(typeof newPane, 'object');
    assert.strictEqual(newPane.id, newPaneId);
  });

  it('should manage pane focus', async () => {
    // Create a tab and get a pane
    const tabId = await navigationManager.createTab('Focus Test', testSessionId);
    const tab = navigationManager.getAllTabs().find(t => t.id === tabId);
    const paneId = tab.panes[0].id;
    
    await navigationManager.focusPane(paneId);
    
    const focusedPane = navigationManager.getPane(paneId);
    assert.strictEqual(focusedPane.active, true);
  });

  it('should control zoom levels', async () => {
    await navigationManager.setZoomLevel(testSessionId, 1.5);
    
    const zoomLevel = navigationManager.getZoomLevel(testSessionId);
    assert.strictEqual(zoomLevel, 1.5);
  });

  it('should scroll viewport', async () => {
    await navigationManager.scrollViewport(testSessionId, 'up', 5);
    
    const viewport = navigationManager.getViewport(testSessionId);
    // Viewport should be created and modified
    assert.strictEqual(typeof viewport, 'object');
    assert.strictEqual(typeof viewport.scrollTop, 'number');
  });

  it('should set terminal opacity', async () => {
    await navigationManager.setOpacity(testSessionId, 0.8);
    
    // Opacity setting doesn't return a value but should not throw
    // This is primarily a control sequence sender
    assert.ok(true); // Test passes if no error thrown
  });

  it('should provide navigation status', () => {
    const tabs = navigationManager.getAllTabs();
    const activeTab = navigationManager.getActiveTab();
    
    assert.ok(Array.isArray(tabs));
    // activeTab can be null if no tabs exist
    assert.ok(activeTab === null || typeof activeTab === 'object');
  });
});

describe('AccessibilityManager - F00084-F00091 ✅', () => {
  let accessibilityManager;

  beforeEach(() => {
    AccessibilityManager.instance = null;
    accessibilityManager = AccessibilityManager.getInstance();
  });

  it('should detect screen reader support', () => {
    const screenReaderInfo = accessibilityManager.getScreenReaderInfo();
    
    assert.strictEqual(typeof screenReaderInfo, 'object');
    assert.ok('available' in screenReaderInfo);
    assert.ok('type' in screenReaderInfo);
    assert.ok('platform' in screenReaderInfo);
  });

  it('should configure speech synthesis', () => {
    const voiceConfig = {
      enabled: true,
      voice: 'default',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8
    };
    
    accessibilityManager.configureSpeechSynthesis(voiceConfig);
    const config = accessibilityManager.getSpeechSynthesisConfig();
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.rate, 1.0);
  });

  it('should handle high contrast mode', () => {
    const contrastConfig = {
      enabled: true,
      scheme: 'high-contrast-dark',
      increaseContrast: 1.5,
      adjustColors: true
    };
    
    accessibilityManager.configureHighContrast(contrastConfig);
    const config = accessibilityManager.getHighContrastConfig();
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.scheme, 'high-contrast-dark');
  });

  it('should manage focus for accessibility', () => {
    const focusConfig = {
      sessionId: 'accessible-session',
      element: 'terminal-content',
      announceChanges: true
    };
    
    const focusResult = accessibilityManager.manageFocus(focusConfig);
    
    assert.strictEqual(typeof focusResult, 'object');
    assert.strictEqual(focusResult.sessionId, 'accessible-session');
    assert.strictEqual(focusResult.announceChanges, true);
  });

  it('should provide accessibility status', () => {
    const status = accessibilityManager.getAccessibilityStatus();
    
    assert.strictEqual(typeof status, 'object');
    assert.ok('screenReader' in status);
    assert.ok('speechSynthesis' in status);
    assert.ok('highContrast' in status);
    assert.ok('platform' in status);
  });
});

describe('InputProcessingManager - F00092-F00099 ✅', () => {
  let inputManager;

  beforeEach(() => {
    InputProcessingManager.instance = null;
    inputManager = InputProcessingManager.getInstance();
  });

  it('should queue input events with priorities', () => {
    const event1 = { type: 'keyboard', data: 'a', priority: 'normal' };
    const event2 = { type: 'mouse', data: 'click', priority: 'high' };
    
    inputManager.queueEvent(event1);
    inputManager.queueEvent(event2);
    
    const queueStatus = inputManager.getQueueStatus();
    assert.strictEqual(typeof queueStatus, 'object');
    assert.ok(queueStatus.totalEvents >= 2);
  });

  it('should process events in priority order', () => {
    const events = [
      { type: 'keyboard', data: 'low', priority: 'low' },
      { type: 'mouse', data: 'high', priority: 'high' },
      { type: 'keyboard', data: 'normal', priority: 'normal' }
    ];
    
    events.forEach(event => inputManager.queueEvent(event));
    
    const processedEvent = inputManager.processNextEvent();
    assert.strictEqual(typeof processedEvent, 'object');
    // High priority events should be processed first
    assert.strictEqual(processedEvent.priority, 'high');
  });

  it('should apply input filters', () => {
    const filterConfig = {
      enableRateLimit: true,
      maxEventsPerSecond: 100,
      enableSpamFilter: true,
      duplicateThreshold: 50
    };
    
    inputManager.configureFilters(filterConfig);
    const config = inputManager.getFilterConfig();
    
    assert.strictEqual(config.enableRateLimit, true);
    assert.strictEqual(config.maxEventsPerSecond, 100);
  });

  it('should record input for playback', () => {
    const recordingConfig = {
      sessionId: 'test-session',
      includeTimestamps: true,
      includeSystemEvents: false
    };
    
    inputManager.startRecording(recordingConfig);
    
    // Simulate some input events
    inputManager.queueEvent({ type: 'keyboard', data: 'test', priority: 'normal' });
    inputManager.queueEvent({ type: 'mouse', data: 'click', priority: 'normal' });
    
    const recording = inputManager.stopRecording();
    
    assert.strictEqual(typeof recording, 'object');
    assert.strictEqual(recording.sessionId, 'test-session');
    assert.ok(Array.isArray(recording.events));
  });

  it('should detect input devices', () => {
    const devices = inputManager.detectInputDevices();
    
    assert.strictEqual(typeof devices, 'object');
    assert.ok('keyboard' in devices);
    assert.ok('mouse' in devices);
    assert.ok('touch' in devices);
  });

  it('should provide analytics on input patterns', () => {
    // Generate some input events for analysis
    for (let i = 0; i < 10; i++) {
      inputManager.queueEvent({ type: 'keyboard', data: `key${i}`, priority: 'normal' });
    }
    
    const analytics = inputManager.getInputAnalytics();
    
    assert.strictEqual(typeof analytics, 'object');
    assert.ok('eventCounts' in analytics);
    assert.ok('patterns' in analytics);
    assert.ok('performance' in analytics);
  });
});

describe('EnvironmentManager - F00100-F00105 ✅', () => {
  let environmentManager;

  beforeEach(() => {
    EnvironmentManager.instance = null;
    environmentManager = EnvironmentManager.getInstance();
  });

  it('should manage environment variables', () => {
    environmentManager.setVariable('TEST_VAR', 'test_value', 'test-session');
    const value = environmentManager.getVariable('TEST_VAR', 'test-session');
    
    assert.strictEqual(value, 'test_value');
  });

  it('should list environment variables', () => {
    environmentManager.setVariable('VAR1', 'value1', 'session1');
    environmentManager.setVariable('VAR2', 'value2', 'session1');
    
    const variables = environmentManager.listVariables('session1');
    
    assert.strictEqual(typeof variables, 'object');
    assert.strictEqual(variables['VAR1'], 'value1');
    assert.strictEqual(variables['VAR2'], 'value2');
  });

  it('should unset environment variables', () => {
    environmentManager.setVariable('TEMP_VAR', 'temp_value', 'test-session');
    const unsetResult = environmentManager.unsetVariable('TEMP_VAR', 'test-session');
    
    assert.strictEqual(unsetResult.success, true);
    assert.strictEqual(unsetResult.variable, 'TEMP_VAR');
    
    const value = environmentManager.getVariable('TEMP_VAR', 'test-session');
    assert.strictEqual(value, null);
  });

  it('should change working directory', () => {
    const changeResult = environmentManager.changeDirectory('/tmp', 'test-session');
    
    assert.strictEqual(typeof changeResult, 'object');
    assert.strictEqual(changeResult.success, true);
    assert.ok('newDirectory' in changeResult);
  });

  it('should send process signals', () => {
    const signalConfig = {
      sessionId: 'test-session',
      signal: 'SIGTERM',
      processId: 12345
    };
    
    const signalResult = environmentManager.sendSignal(signalConfig);
    
    assert.strictEqual(typeof signalResult, 'object');
    assert.strictEqual(signalResult.signal, 'SIGTERM');
    assert.strictEqual(signalResult.processId, 12345);
  });

  it('should set terminal title', () => {
    const titleResult = environmentManager.setTitle('Custom Title', 'test-session');
    
    assert.strictEqual(typeof titleResult, 'object');
    assert.strictEqual(titleResult.title, 'Custom Title');
    assert.strictEqual(titleResult.sessionId, 'test-session');
  });
});

describe('SessionManager - F00108-F00112, F00115 ✅', () => {
  let sessionManager;

  beforeEach(() => {
    SessionManager.instance = null;
    sessionManager = SessionManager.getInstance();
  });

  it('should save and restore bookmarks', () => {
    const bookmark = {
      sessionId: 'test-session',
      name: 'checkpoint1',
      description: 'Test checkpoint',
      position: { line: 100, column: 0 }
    };
    
    const saveResult = sessionManager.saveBookmark(bookmark);
    assert.strictEqual(saveResult.success, true);
    assert.strictEqual(saveResult.bookmarkId, bookmark.name);
    
    const restoreResult = sessionManager.restoreBookmark('test-session', 'checkpoint1');
    assert.strictEqual(typeof restoreResult, 'object');
    assert.strictEqual(restoreResult.name, 'checkpoint1');
  });

  it('should track session history', () => {
    sessionManager.addHistoryEntry('test-session', 'ls -la', 'directory listing');
    sessionManager.addHistoryEntry('test-session', 'pwd', 'current directory');
    
    const history = sessionManager.getHistory('test-session');
    
    assert.ok(Array.isArray(history));
    assert.ok(history.length >= 2);
    assert.strictEqual(history[0].command, 'pwd'); // Most recent first
  });

  it('should search session history', () => {
    sessionManager.addHistoryEntry('test-session', 'git status', 'git command');
    sessionManager.addHistoryEntry('test-session', 'git commit -m "test"', 'git command');
    sessionManager.addHistoryEntry('test-session', 'ls -la', 'directory listing');
    
    const searchResults = sessionManager.searchHistory('test-session', 'git');
    
    assert.ok(Array.isArray(searchResults));
    assert.ok(searchResults.length >= 2);
    assert.ok(searchResults.every(result => result.command.includes('git')));
  });

  it('should serialize session state', () => {
    const stateData = {
      sessionId: 'test-session',
      currentDirectory: '/home/user',
      environment: { PATH: '/usr/bin' },
      history: [{ command: 'test', output: 'result' }]
    };
    
    const serialized = sessionManager.serializeState(stateData);
    
    assert.strictEqual(typeof serialized, 'object');
    assert.strictEqual(serialized.sessionId, 'test-session');
    assert.ok('serializedData' in serialized);
  });

  it('should handle undo operations', () => {
    const undoResult = sessionManager.undoLastCommand('test-session');
    
    assert.strictEqual(typeof undoResult, 'object');
    assert.ok('success' in undoResult);
    assert.ok('action' in undoResult);
  });

  it('should configure auto-save', () => {
    const autoSaveConfig = {
      sessionId: 'test-session',
      enabled: true,
      interval: 30000, // 30 seconds
      includeHistory: true,
      includeBookmarks: true
    };
    
    const configResult = sessionManager.configureAutoSave(autoSaveConfig);
    
    assert.strictEqual(configResult.success, true);
    assert.strictEqual(configResult.sessionId, 'test-session');
    assert.strictEqual(configResult.interval, 30000);
  });
});

describe('InteractionReplayManager - F00113-F00114 ✅', () => {
  let replayManager;
  let terminalManager;
  let testSessionId;

  beforeEach(async () => {
    InteractionReplayManager.instance = null;
    TerminalManager.instance = null;
    replayManager = InteractionReplayManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session
    const session = await terminalManager.createSession(80, 24);
    testSessionId = session.id;
  });
  
  afterEach(async () => {
    if (testSessionId) {
      await terminalManager.closeSession(testSessionId);
    }
    await terminalManager.cleanup();
  });

  it('should start and stop interaction recording', async () => {
    const recordingName = 'test-recording';
    const description = 'Test recording description';
    
    const recordingId = await replayManager.startRecording(testSessionId, recordingName, description);
    assert.strictEqual(typeof recordingId, 'string');
    assert.ok(recordingId.startsWith('rec_'));
    
    const recording = await replayManager.stopRecording(recordingId);
    assert.strictEqual(typeof recording, 'object');
    assert.strictEqual(recording.name, recordingName);
    assert.strictEqual(recording.sessionId, testSessionId);
  });

  it('should replay interaction sequences', async () => {
    // First create a recording to replay
    const recordingId = await replayManager.startRecording(testSessionId, 'test-replay');
    const recording = await replayManager.stopRecording(recordingId);
    
    // Test replay functionality (will work on empty recording)
    await replayManager.replayInteraction(recordingId, testSessionId, 1.0);
    
    // Verify recording exists
    const retrievedRecording = replayManager.getRecording(recordingId);
    assert.strictEqual(retrievedRecording.id, recordingId);
  });

  it('should list recorded interactions', () => {
    const recordings = replayManager.getAllRecordings();
    
    assert.ok(Array.isArray(recordings));
    // May be empty initially, but should be an array
  });

  it('should create state snapshots', async () => {
    const metadata = { name: 'snapshot1', type: 'manual' };
    
    const snapshotId = await replayManager.createStateSnapshot(testSessionId, metadata);
    
    assert.strictEqual(typeof snapshotId, 'string');
    assert.ok(snapshotId.startsWith('snap_'));
    
    const snapshot = replayManager.getSnapshot(snapshotId);
    assert.strictEqual(snapshot.sessionId, testSessionId);
    assert.strictEqual(snapshot.metadata.name, 'snapshot1');
  });

  it('should generate state diffs', async () => {
    // Create two snapshots
    const snapshot1Id = await replayManager.createStateSnapshot(testSessionId, { name: 'snapshot1' });
    const snapshot2Id = await replayManager.createStateSnapshot(testSessionId, { name: 'snapshot2' });
    
    const diffId = await replayManager.generateStateDiff(snapshot1Id, snapshot2Id);
    
    assert.strictEqual(typeof diffId, 'string');
    assert.ok(diffId.startsWith('diff_'));
    
    const diff = replayManager.getDiff(diffId);
    assert.strictEqual(diff.fromSnapshotId, snapshot1Id);
    assert.strictEqual(diff.toSnapshotId, snapshot2Id);
    assert.ok(Array.isArray(diff.changes));
  });

  it('should list snapshots and diffs', () => {
    const snapshots = replayManager.getAllSnapshots();
    const diffs = replayManager.getAllDiffs();
    
    assert.ok(Array.isArray(snapshots));
    assert.ok(Array.isArray(diffs));
  });
});