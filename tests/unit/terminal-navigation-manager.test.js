import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok, notStrictEqual } from 'node:assert';
import { TerminalNavigationManager } from '../../src/terminal-navigation-manager.js';
import { TerminalManager } from '../../src/terminal-manager.js';

describe('TerminalNavigationManager - F00059-F00068', () => {
  let navManager;
  let terminalManager;
  let testSession;

  beforeEach(async () => {
    navManager = TerminalNavigationManager.getInstance();
    terminalManager = TerminalManager.getInstance();
    
    // Create a test session for navigation operations
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
    
    // Clean up navigation state
    navManager.cleanup();
  });

  test('should be a singleton instance', () => {
    const manager1 = TerminalNavigationManager.getInstance();
    const manager2 = TerminalNavigationManager.getInstance();
    strictEqual(manager1, manager2);
  });

  // F00059: Dynamic Terminal Resizing
  test('should manage terminal dimensions dynamically', async () => {
    const initialCols = testSession.cols;
    const initialRows = testSession.rows;
    
    const result = await navManager.dynamicResize(testSession.id, {
      targetCols: 100,
      targetRows: 30,
      maintainAspectRatio: true
    });
    
    ok(result.success);
    ok(result.newDimensions.cols >= 80); // Should be adjusted
    ok(result.newDimensions.rows >= 24); // Should be adjusted
    notStrictEqual(result.newDimensions.cols, initialCols);
    notStrictEqual(result.newDimensions.rows, initialRows);
  });

  // F00060: Proportional Resizing
  test('should maintain aspect ratios during resize', async () => {
    const result = await navManager.proportionalResize(testSession.id, {
      scaleFactor: 1.5,
      maintainMinimumSize: true
    });
    
    ok(result.success);
    ok(result.aspectRatio > 0);
    ok(result.newDimensions.cols > testSession.cols);
    ok(result.newDimensions.rows > testSession.rows);
  });

  // F00061: Fullscreen Mode Toggle
  test('should toggle fullscreen mode', async () => {
    const enterResult = await navManager.toggleFullscreen(testSession.id, true);
    ok(enterResult.success);
    strictEqual(enterResult.fullscreen, true);
    ok(enterResult.originalDimensions.cols);
    ok(enterResult.originalDimensions.rows);
    
    const exitResult = await navManager.toggleFullscreen(testSession.id, false);
    ok(exitResult.success);
    strictEqual(exitResult.fullscreen, false);
  });

  // F00062: Split Screen Support
  test('should manage split screen panes', async () => {
    const splitResult = await navManager.splitPane(testSession.id, {
      direction: 'horizontal',
      ratio: 0.5
    });
    
    ok(splitResult.success);
    ok(splitResult.paneId);
    ok(splitResult.layout.panes);
    strictEqual(splitResult.layout.panes.length, 2);
  });

  // F00063: Tab Management
  test('should manage terminal tabs', async () => {
    const createResult = await navManager.createTab(testSession.id, {
      title: 'Test Tab',
      shell: 'bash'
    });
    
    ok(createResult.success);
    ok(createResult.tabId);
    strictEqual(createResult.title, 'Test Tab');
    
    const listResult = await navManager.listTabs(testSession.id);
    ok(listResult.success);
    ok(listResult.tabs.length >= 1);
  });

  // F00064: Terminal Focus Control
  test('should manage terminal focus', async () => {
    // Create a second tab first
    const tabResult = await navManager.createTab(testSession.id, { title: 'Tab 2' });
    
    const focusResult = await navManager.setFocus(testSession.id, {
      target: 'tab',
      targetId: tabResult.tabId
    });
    
    ok(focusResult.success);
    strictEqual(focusResult.focusedTarget, tabResult.tabId);
    
    const statusResult = await navManager.getFocusStatus(testSession.id);
    ok(statusResult.success);
    ok(statusResult.currentFocus);
  });

  // F00065: Viewport Scrolling
  test('should control viewport scrolling', async () => {
    const scrollResult = await navManager.scrollViewport(testSession.id, {
      direction: 'up',
      amount: 5,
      unit: 'lines'
    });
    
    ok(scrollResult.success);
    strictEqual(scrollResult.direction, 'up');
    strictEqual(scrollResult.scrolledLines, 5);
    
    const positionResult = await navManager.getScrollPosition(testSession.id);
    ok(positionResult.success);
    ok(typeof positionResult.position === 'number');
  });

  // F00066: Zoom Level Control
  test('should manage zoom levels', async () => {
    const zoomResult = await navManager.setZoomLevel(testSession.id, {
      level: 1.5,
      centerContent: true
    });
    
    ok(zoomResult.success);
    strictEqual(zoomResult.zoomLevel, 1.5);
    ok(zoomResult.effectiveDimensions.cols);
    ok(zoomResult.effectiveDimensions.rows);
    
    const resetResult = await navManager.resetZoom(testSession.id);
    ok(resetResult.success);
    strictEqual(resetResult.zoomLevel, 1.0);
  });

  // F00067: Terminal Positioning
  test('should manage terminal positioning', async () => {
    const positionResult = await navManager.setPosition(testSession.id, {
      x: 100,
      y: 200,
      coordinate: 'absolute'
    });
    
    ok(positionResult.success);
    strictEqual(positionResult.position.x, 100);
    strictEqual(positionResult.position.y, 200);
    
    const getResult = await navManager.getPosition(testSession.id);
    ok(getResult.success);
    ok(getResult.position.x >= 0);
    ok(getResult.position.y >= 0);
  });

  // F00068: Terminal Opacity
  test('should control terminal opacity', async () => {
    const opacityResult = await navManager.setOpacity(testSession.id, {
      opacity: 0.8,
      backgroundOnly: false
    });
    
    ok(opacityResult.success);
    strictEqual(opacityResult.opacity, 0.8);
    
    const getResult = await navManager.getOpacity(testSession.id);
    ok(getResult.success);
    ok(getResult.opacity >= 0 && getResult.opacity <= 1);
  });

  // Integration test
  test('should handle complex navigation workflows', async () => {
    // Create tab, split pane, set zoom, adjust opacity
    const tabResult = await navManager.createTab(testSession.id, { title: 'Complex Test' });
    const splitResult = await navManager.splitPane(testSession.id, { direction: 'vertical' });
    const zoomResult = await navManager.setZoomLevel(testSession.id, { level: 1.2 });
    const opacityResult = await navManager.setOpacity(testSession.id, { opacity: 0.9 });
    
    ok(tabResult.success);
    ok(splitResult.success);
    ok(zoomResult.success);
    ok(opacityResult.success);
    
    const statusResult = await navManager.getNavigationStatus(testSession.id);
    ok(statusResult.success);
    ok(statusResult.tabs.length >= 1);
    ok(statusResult.layout.panes.length >= 2);
    strictEqual(statusResult.zoom.level, 1.2);
    strictEqual(statusResult.opacity, 0.9);
  });

  test('should handle navigation errors gracefully', async () => {
    try {
      await navManager.dynamicResize('invalid-session-id', { targetCols: 100 });
      ok(false, 'Should have thrown error');
    } catch (error) {
      ok(error.message.includes('Session not found') || error.message.includes('invalid'));
    }
  });
});