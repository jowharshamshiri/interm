import { TerminalManager } from './terminal-manager.js';
import { createTerminalError, handleError } from './utils/error-utils.js';
import { TerminalAutomationError } from './types.js';

export interface TerminalViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollTop: number;
  scrollLeft: number;
}

export interface TerminalPane {
  id: string;
  sessionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  title?: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  sessionId: string;
  active: boolean;
  panes: TerminalPane[];
}

export class TerminalNavigationManager {
  private static instance: TerminalNavigationManager;
  private terminalManager: TerminalManager;
  private viewports = new Map<string, TerminalViewport>();
  private tabs = new Map<string, TerminalTab>();
  private panes = new Map<string, TerminalPane>();
  private activeTabId: string | null = null;
  private zoomLevels = new Map<string, number>();
  private fullscreenSessions = new Set<string>();

  private constructor() {
    this.terminalManager = TerminalManager.getInstance();
  }

  static getInstance(): TerminalNavigationManager {
    if (!TerminalNavigationManager.instance) {
      TerminalNavigationManager.instance = new TerminalNavigationManager();
    }
    return TerminalNavigationManager.instance;
  }

  async dynamicResize(sessionId: string, cols: number, rows: number, maintainAspectRatio: boolean = false): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      let finalCols = cols;
      let finalRows = rows;

      if (maintainAspectRatio) {
        const currentAspectRatio = session.cols / session.rows;
        if (cols / rows !== currentAspectRatio) {
          // Adjust rows to maintain aspect ratio
          finalRows = Math.round(cols / currentAspectRatio);
        }
      }

      // Ensure minimum dimensions
      finalCols = Math.max(finalCols, 20);
      finalRows = Math.max(finalRows, 5);

      // Ensure maximum dimensions for practical use
      finalCols = Math.min(finalCols, 300);
      finalRows = Math.min(finalRows, 100);

      await this.terminalManager.resizeSession(sessionId, finalCols, finalRows);

      // Update viewport if exists
      const viewport = this.viewports.get(sessionId);
      if (viewport) {
        viewport.width = finalCols;
        viewport.height = finalRows;
      }
    } catch (error) {
      throw handleError(error, `Failed to dynamically resize session ${sessionId}`);
    }
  }

  async toggleFullscreen(sessionId: string, enable?: boolean): Promise<boolean> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const isCurrentlyFullscreen = this.fullscreenSessions.has(sessionId);
      const shouldEnable = enable !== undefined ? enable : !isCurrentlyFullscreen;

      if (shouldEnable && !isCurrentlyFullscreen) {
        // Enter fullscreen mode
        this.fullscreenSessions.add(sessionId);
        // Send ANSI sequence to request fullscreen
        await this.terminalManager.sendInput(sessionId, '\u001b[?1049h');
        
        // Maximize terminal dimensions
        await this.dynamicResize(sessionId, 120, 40);
      } else if (!shouldEnable && isCurrentlyFullscreen) {
        // Exit fullscreen mode
        this.fullscreenSessions.delete(sessionId);
        // Send ANSI sequence to exit fullscreen
        await this.terminalManager.sendInput(sessionId, '\u001b[?1049l');
        
        // Restore normal dimensions
        await this.dynamicResize(sessionId, 80, 24);
      }

      return this.fullscreenSessions.has(sessionId);
    } catch (error) {
      throw handleError(error, `Failed to toggle fullscreen for session ${sessionId}`);
    }
  }

  async createTab(title: string, sessionId?: string): Promise<string> {
    try {
      let targetSessionId = sessionId;
      
      if (!targetSessionId) {
        // Create new session for the tab
        const session = await this.terminalManager.createSession();
        targetSessionId = session.id;
      }

      const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const tab: TerminalTab = {
        id: tabId,
        title,
        sessionId: targetSessionId,
        active: this.tabs.size === 0, // First tab is active
        panes: []
      };

      // Add tab to map first so createPane can find it
      this.tabs.set(tabId, tab);
      
      // Create default pane for the tab
      const paneId = await this.createPane(tabId, targetSessionId, 0, 0, 80, 24);
      
      if (tab.active) {
        this.activeTabId = tabId;
      }

      return tabId;
    } catch (error) {
      throw handleError(error, `Failed to create tab ${title}`);
    }
  }

  async switchTab(tabId: string): Promise<void> {
    try {
      const tab = this.tabs.get(tabId);
      if (!tab) {
        throw createTerminalError('RESOURCE_ERROR', `Tab ${tabId} not found`);
      }

      // Deactivate current active tab
      if (this.activeTabId) {
        const currentTab = this.tabs.get(this.activeTabId);
        if (currentTab) {
          currentTab.active = false;
        }
      }

      // Activate new tab
      tab.active = true;
      this.activeTabId = tabId;

      // Focus the active pane in the tab
      const activePanes = tab.panes.filter(p => p.active);
      if (activePanes.length > 0) {
        await this.focusPane(activePanes[0].id);
      }
    } catch (error) {
      throw handleError(error, `Failed to switch to tab ${tabId}`);
    }
  }

  async createPane(tabId: string, sessionId: string, x: number, y: number, width: number, height: number): Promise<string> {
    try {
      const tab = this.tabs.get(tabId);
      if (!tab) {
        throw createTerminalError('RESOURCE_ERROR', `Tab ${tabId} not found`);
      }

      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const paneId = `pane_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const pane: TerminalPane = {
        id: paneId,
        sessionId,
        x,
        y,
        width,
        height,
        active: tab.panes.length === 0, // First pane in tab is active
        title: session.title
      };

      tab.panes.push(pane);
      this.panes.set(paneId, pane);

      // Resize the session to fit the pane
      await this.terminalManager.resizeSession(sessionId, width, height);

      return paneId;
    } catch (error) {
      throw handleError(error, `Failed to create pane in tab ${tabId}`);
    }
  }

  async splitPane(paneId: string, direction: 'horizontal' | 'vertical', sessionId?: string): Promise<string> {
    try {
      const pane = this.panes.get(paneId);
      if (!pane) {
        throw createTerminalError('RESOURCE_ERROR', `Pane ${paneId} not found`);
      }

      const tab = Array.from(this.tabs.values()).find(t => t.panes.some(p => p.id === paneId));
      if (!tab) {
        throw createTerminalError('RESOURCE_ERROR', `Tab for pane ${paneId} not found`);
      }

      let newSessionId = sessionId;
      if (!newSessionId) {
        const newSession = await this.terminalManager.createSession();
        newSessionId = newSession.id;
      }

      let newX, newY, newWidth, newHeight, adjustedWidth, adjustedHeight;

      if (direction === 'horizontal') {
        // Split horizontally (side by side)
        adjustedWidth = Math.floor(pane.width / 2);
        newX = pane.x + adjustedWidth;
        newY = pane.y;
        newWidth = pane.width - adjustedWidth;
        newHeight = pane.height;
        adjustedHeight = pane.height;
      } else {
        // Split vertically (top and bottom)
        adjustedHeight = Math.floor(pane.height / 2);
        newX = pane.x;
        newY = pane.y + adjustedHeight;
        newWidth = pane.width;
        newHeight = pane.height - adjustedHeight;
        adjustedWidth = pane.width;
      }

      // Adjust original pane size
      pane.width = adjustedWidth || pane.width;
      pane.height = adjustedHeight || pane.height;
      
      // Resize original session
      await this.terminalManager.resizeSession(pane.sessionId, pane.width, pane.height);

      // Create new pane
      return await this.createPane(tab.id, newSessionId, newX, newY, newWidth, newHeight);
    } catch (error) {
      throw handleError(error, `Failed to split pane ${paneId}`);
    }
  }

  async focusPane(paneId: string): Promise<void> {
    try {
      const pane = this.panes.get(paneId);
      if (!pane) {
        throw createTerminalError('RESOURCE_ERROR', `Pane ${paneId} not found`);
      }

      const tab = Array.from(this.tabs.values()).find(t => t.panes.some(p => p.id === paneId));
      if (!tab) {
        throw createTerminalError('RESOURCE_ERROR', `Tab for pane ${paneId} not found`);
      }

      // Deactivate all panes in the tab
      tab.panes.forEach(p => p.active = false);
      
      // Activate the target pane
      pane.active = true;

      // Switch to the tab if not already active
      if (!tab.active) {
        await this.switchTab(tab.id);
      }
    } catch (error) {
      throw handleError(error, `Failed to focus pane ${paneId}`);
    }
  }

  async setZoomLevel(sessionId: string, zoomLevel: number): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      // Clamp zoom level between 0.5 and 3.0
      const clampedZoom = Math.max(0.5, Math.min(3.0, zoomLevel));
      this.zoomLevels.set(sessionId, clampedZoom);

      // Calculate new dimensions based on zoom
      const baseWidth = 80;
      const baseHeight = 24;
      const newWidth = Math.round(baseWidth / clampedZoom);
      const newHeight = Math.round(baseHeight / clampedZoom);

      // Send font size change sequence (if supported by terminal)
      const fontSizeSequence = `\u001b]50;FontSize=${Math.round(12 * clampedZoom)}\u0007`;
      await this.terminalManager.sendInput(sessionId, fontSizeSequence);

      // Adjust terminal dimensions to compensate for zoom
      await this.dynamicResize(sessionId, newWidth, newHeight);
    } catch (error) {
      throw handleError(error, `Failed to set zoom level for session ${sessionId}`);
    }
  }

  async scrollViewport(sessionId: string, direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end', amount: number = 1): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      let scrollSequence = '';
      
      switch (direction) {
        case 'up':
          scrollSequence = `\u001b[${amount}S`; // Scroll up
          break;
        case 'down':
          scrollSequence = `\u001b[${amount}T`; // Scroll down
          break;
        case 'left':
          // Horizontal scrolling (if supported)
          scrollSequence = `\u001b[${amount}D`;
          break;
        case 'right':
          scrollSequence = `\u001b[${amount}C`;
          break;
        case 'home':
          scrollSequence = '\u001b[H'; // Move to home
          break;
        case 'end':
          scrollSequence = '\u001b[F'; // Move to end
          break;
      }

      await this.terminalManager.sendInput(sessionId, scrollSequence);

      // Update viewport tracking
      let viewport = this.viewports.get(sessionId);
      if (!viewport) {
        viewport = {
          x: 0,
          y: 0,
          width: session.cols,
          height: session.rows,
          scrollTop: 0,
          scrollLeft: 0
        };
        this.viewports.set(sessionId, viewport);
      }

      switch (direction) {
        case 'up':
          viewport.scrollTop = Math.max(0, viewport.scrollTop - amount);
          break;
        case 'down':
          viewport.scrollTop += amount;
          break;
        case 'left':
          viewport.scrollLeft = Math.max(0, viewport.scrollLeft - amount);
          break;
        case 'right':
          viewport.scrollLeft += amount;
          break;
        case 'home':
          viewport.scrollTop = 0;
          viewport.scrollLeft = 0;
          break;
      }
    } catch (error) {
      throw handleError(error, `Failed to scroll viewport for session ${sessionId}`);
    }
  }

  async setOpacity(sessionId: string, opacity: number): Promise<void> {
    try {
      const session = this.terminalManager.getSession(sessionId);
      if (!session) {
        throw createTerminalError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      // Clamp opacity between 0.1 and 1.0
      const clampedOpacity = Math.max(0.1, Math.min(1.0, opacity));
      
      // This is a simplified implementation - actual opacity control would depend on the terminal emulator
      // Send a sequence that might be recognized by some terminals
      const opacitySequence = `\u001b]11;rgba(0,0,0,${clampedOpacity})\u0007`;
      await this.terminalManager.sendInput(sessionId, opacitySequence);
    } catch (error) {
      throw handleError(error, `Failed to set opacity for session ${sessionId}`);
    }
  }

  getActiveTab(): TerminalTab | null {
    return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
  }

  getAllTabs(): TerminalTab[] {
    return Array.from(this.tabs.values());
  }

  getPane(paneId: string): TerminalPane | null {
    return this.panes.get(paneId) || null;
  }

  getViewport(sessionId: string): TerminalViewport | null {
    return this.viewports.get(sessionId) || null;
  }

  getZoomLevel(sessionId: string): number {
    return this.zoomLevels.get(sessionId) || 1.0;
  }

  isFullscreen(sessionId: string): boolean {
    return this.fullscreenSessions.has(sessionId);
  }

  async closeTab(tabId: string): Promise<void> {
    try {
      const tab = this.tabs.get(tabId);
      if (!tab) {
        throw createTerminalError('RESOURCE_ERROR', `Tab ${tabId} not found`);
      }

      // Close all panes in the tab
      for (const pane of tab.panes) {
        await this.terminalManager.closeSession(pane.sessionId);
        this.panes.delete(pane.id);
      }

      this.tabs.delete(tabId);

      // If this was the active tab, activate another tab
      if (this.activeTabId === tabId) {
        this.activeTabId = null;
        const remainingTabs = Array.from(this.tabs.values());
        if (remainingTabs.length > 0) {
          await this.switchTab(remainingTabs[0].id);
        }
      }
    } catch (error) {
      throw handleError(error, `Failed to close tab ${tabId}`);
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Close all tabs (which closes all panes and sessions)
      const tabIds = Array.from(this.tabs.keys());
      for (const tabId of tabIds) {
        await this.closeTab(tabId);
      }

      this.viewports.clear();
      this.zoomLevels.clear();
      this.fullscreenSessions.clear();
      this.activeTabId = null;
    } catch (error) {
      console.error('Error during navigation manager cleanup:', error);
    }
  }
}