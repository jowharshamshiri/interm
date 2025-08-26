import { AccessibilityInfo, TerminalState } from './types.js';
import { createTerminalError } from './utils/error-utils.js';

export interface ScreenReaderEvent {
  type: 'focus_changed' | 'content_changed' | 'selection_changed' | 'key_pressed';
  target?: string;
  content?: string;
  announcement?: string;
  timestamp: Date;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
  parameters?: Record<string, any>;
  timestamp: Date;
}

export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  magnificationLevel: number;
  voiceInputEnabled: boolean;
  keyboardNavigationOnly: boolean;
  announceChanges: boolean;
  speechRate: number;
  speechVolume: number;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private settings: AccessibilitySettings;
  private screenReaderEvents: ScreenReaderEvent[] = [];
  private voiceCommands: VoiceCommand[] = [];
  private currentFocus: string | null = null;
  private lastAnnouncedContent: string = '';
  
  private constructor() {
    this.settings = {
      screenReaderEnabled: false,
      highContrastEnabled: false,
      magnificationLevel: 1.0,
      voiceInputEnabled: false,
      keyboardNavigationOnly: false,
      announceChanges: true,
      speechRate: 1.0,
      speechVolume: 0.8
    };
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  /**
   * Initialize accessibility features based on system capabilities
   */
  async initialize(): Promise<AccessibilityInfo> {
    try {
      // Detect system accessibility features
      const info = await this.detectAccessibilityFeatures();
      
      // Auto-enable features if detected
      if (info.screenReaderActive) {
        this.settings.screenReaderEnabled = true;
        this.settings.announceChanges = true;
      }
      
      if (info.highContrastMode) {
        this.settings.highContrastEnabled = true;
      }
      
      if (info.magnificationLevel && info.magnificationLevel > 1.0) {
        this.settings.magnificationLevel = info.magnificationLevel;
      }
      
      return info;
    } catch (error) {
      throw createTerminalError('RESOURCE_ERROR', `Failed to initialize accessibility: ${error}`);
    }
  }

  /**
   * Detect system accessibility features
   */
  private async detectAccessibilityFeatures(): Promise<AccessibilityInfo> {
    const platform = process.platform;
    
    // Platform-specific accessibility detection
    let screenReaderActive = false;
    let highContrastMode = false;
    let voiceInputActive = false;
    let eyeTrackingActive = false;
    let magnificationLevel = 1.0;

    if (platform === 'darwin') {
      // macOS accessibility detection
      screenReaderActive = await this.detectMacOSScreenReader();
      highContrastMode = await this.detectMacOSHighContrast();
      voiceInputActive = await this.detectMacOSVoiceControl();
      magnificationLevel = await this.detectMacOSZoom();
    } else if (platform === 'win32') {
      // Windows accessibility detection
      screenReaderActive = await this.detectWindowsNarrator();
      highContrastMode = await this.detectWindowsHighContrast();
      voiceInputActive = await this.detectWindowsSpeechRecognition();
    } else if (platform === 'linux') {
      // Linux accessibility detection
      screenReaderActive = await this.detectLinuxScreenReader();
      highContrastMode = await this.detectLinuxHighContrast();
    }

    return {
      screenReaderActive,
      highContrastMode,
      voiceInputActive,
      eyeTrackingActive,
      magnificationLevel
    };
  }

  /**
   * macOS accessibility detection methods
   */
  private async detectMacOSScreenReader(): Promise<boolean> {
    try {
      // Check for VoiceOver or other screen readers
      const { execSync } = await import('child_process');
      const result = execSync('defaults read com.apple.universalaccess voiceOverOnOffKey 2>/dev/null || echo "false"', { encoding: 'utf8' });
      return result.trim() !== 'false';
    } catch {
      return false;
    }
  }

  private async detectMacOSHighContrast(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('defaults read com.apple.universalaccess increaseContrast 2>/dev/null || echo "0"', { encoding: 'utf8' });
      return result.trim() === '1';
    } catch {
      return false;
    }
  }

  private async detectMacOSVoiceControl(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('defaults read com.apple.speech.voice.prefs VoiceOverUsesAppleVoice 2>/dev/null || echo "false"', { encoding: 'utf8' });
      return result.trim() === 'true';
    } catch {
      return false;
    }
  }

  private async detectMacOSZoom(): Promise<number> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('defaults read com.apple.universalaccess closeViewScrollWheelToggle 2>/dev/null || echo "0"', { encoding: 'utf8' });
      return result.trim() === '1' ? 2.0 : 1.0;
    } catch {
      return 1.0;
    }
  }

  /**
   * Windows accessibility detection methods
   */
  private async detectWindowsNarrator(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('tasklist /fi "imagename eq narrator.exe" 2>nul | find /i "narrator.exe"', { encoding: 'utf8' });
      return result.includes('narrator.exe');
    } catch {
      return false;
    }
  }

  private async detectWindowsHighContrast(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme 2>nul', { encoding: 'utf8' });
      return result.includes('0x0');
    } catch {
      return false;
    }
  }

  private async detectWindowsSpeechRecognition(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('tasklist /fi "imagename eq speechruntime.exe" 2>nul | find /i "speechruntime.exe"', { encoding: 'utf8' });
      return result.includes('speechruntime.exe');
    } catch {
      return false;
    }
  }

  /**
   * Linux accessibility detection methods
   */
  private async detectLinuxScreenReader(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('pgrep -f "orca|espeak|festival" 2>/dev/null || echo ""', { encoding: 'utf8' });
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async detectLinuxHighContrast(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const result = execSync('gsettings get org.gnome.desktop.a11y.interface high-contrast 2>/dev/null || echo "false"', { encoding: 'utf8' });
      return result.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Announce content changes to screen readers
   */
  announceToScreenReader(content: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.settings.screenReaderEnabled || !this.settings.announceChanges) {
      return;
    }

    // Avoid duplicate announcements
    if (content === this.lastAnnouncedContent) {
      return;
    }

    this.lastAnnouncedContent = content;

    const event: ScreenReaderEvent = {
      type: 'content_changed',
      content,
      announcement: this.processContentForSpeech(content),
      timestamp: new Date()
    };

    this.screenReaderEvents.push(event);
    
    // Limit event history
    if (this.screenReaderEvents.length > 1000) {
      this.screenReaderEvents = this.screenReaderEvents.slice(-500);
    }

    // Platform-specific screen reader announcement
    this.performScreenReaderAnnouncement(event.announcement!, priority);
  }

  /**
   * Process content for speech synthesis
   */
  private processContentForSpeech(content: string): string {
    // Remove ANSI escape sequences
    let processed = content.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Convert common symbols to speech
    processed = processed
      .replace(/\$/g, 'dollar ')
      .replace(/#/g, 'hash ')
      .replace(/&/g, 'and ')
      .replace(/\*/g, 'asterisk ')
      .replace(/\+/g, 'plus ')
      .replace(/-/g, 'dash ')
      .replace(/\//g, 'slash ')
      .replace(/\\/g, 'backslash ')
      .replace(/\|/g, 'pipe ')
      .replace(/~/g, 'tilde ');

    // Limit length for speech
    if (processed.length > 200) {
      processed = processed.substring(0, 197) + '...';
    }

    return processed.trim();
  }

  /**
   * Perform platform-specific screen reader announcement
   */
  private performScreenReaderAnnouncement(text: string, priority: 'polite' | 'assertive'): void {
    const platform = process.platform;
    
    try {
      if (platform === 'darwin') {
        // Use macOS say command
        const { spawn } = require('child_process');
        const rate = Math.round(this.settings.speechRate * 200);
        spawn('say', ['-r', rate.toString(), text], { stdio: 'ignore' });
      } else if (platform === 'win32') {
        // Use Windows SAPI
        const { spawn } = require('child_process');
        const script = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')`;
        spawn('powershell', ['-Command', script], { stdio: 'ignore' });
      } else if (platform === 'linux') {
        // Use espeak or festival
        const { spawn } = require('child_process');
        const rate = Math.round(this.settings.speechRate * 200);
        spawn('espeak', ['-s', rate.toString(), text], { stdio: 'ignore' });
      }
    } catch (error) {
      console.warn('Screen reader announcement failed:', error);
    }
  }

  /**
   * Process voice command
   */
  processVoiceCommand(audioData: Buffer): Promise<VoiceCommand | null> {
    if (!this.settings.voiceInputEnabled) {
      return Promise.resolve(null);
    }

    // Placeholder for voice recognition implementation
    // In a real implementation, this would integrate with speech recognition APIs
    return Promise.resolve(null);
  }

  /**
   * Generate high contrast terminal output
   */
  applyHighContrastFiltering(terminalState: TerminalState): TerminalState {
    if (!this.settings.highContrastEnabled) {
      return terminalState;
    }

    // Apply high contrast color modifications
    const highContrastState = { ...terminalState };
    
    // Convert colors to high contrast equivalents
    if (highContrastState.attributes) {
      highContrastState.attributes = highContrastState.attributes.map(attr => ({
        ...attr,
        foregroundColor: this.convertToHighContrastColor(attr.foregroundColor, true),
        backgroundColor: this.convertToHighContrastColor(attr.backgroundColor, false)
      }));
    }

    return highContrastState;
  }

  /**
   * Convert colors to high contrast equivalents
   */
  private convertToHighContrastColor(color: string, isForeground: boolean): string {
    const highContrastMap: Record<string, { fg: string, bg: string }> = {
      'black': { fg: '#FFFFFF', bg: '#000000' },
      'red': { fg: '#FF0000', bg: '#000000' },
      'green': { fg: '#00FF00', bg: '#000000' },
      'yellow': { fg: '#FFFF00', bg: '#000000' },
      'blue': { fg: '#0000FF', bg: '#FFFFFF' },
      'magenta': { fg: '#FF00FF', bg: '#000000' },
      'cyan': { fg: '#00FFFF', bg: '#000000' },
      'white': { fg: '#000000', bg: '#FFFFFF' },
      'default': { fg: '#FFFFFF', bg: '#000000' }
    };

    const mapping = highContrastMap[color.toLowerCase()] || highContrastMap['default'];
    return isForeground ? mapping.fg : mapping.bg;
  }

  /**
   * Get current accessibility settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Update accessibility settings
   */
  updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
  }

  /**
   * Get screen reader event history
   */
  getScreenReaderEvents(limit: number = 100): ScreenReaderEvent[] {
    return this.screenReaderEvents.slice(-limit);
  }

  /**
   * Get voice command history
   */
  getVoiceCommands(limit: number = 50): VoiceCommand[] {
    return this.voiceCommands.slice(-limit);
  }

  /**
   * Clear accessibility history
   */
  clearHistory(): void {
    this.screenReaderEvents = [];
    this.voiceCommands = [];
  }

  /**
   * Generate accessibility report
   */
  generateAccessibilityReport(): {
    systemInfo: AccessibilityInfo;
    settings: AccessibilitySettings;
    eventStats: {
      screenReaderEvents: number;
      voiceCommands: number;
      lastActivity: Date | null;
    };
  } {
    return {
      systemInfo: {
        screenReaderActive: this.settings.screenReaderEnabled,
        highContrastMode: this.settings.highContrastEnabled,
        voiceInputActive: this.settings.voiceInputEnabled,
        eyeTrackingActive: false, // Not yet implemented
        magnificationLevel: this.settings.magnificationLevel
      },
      settings: this.getSettings(),
      eventStats: {
        screenReaderEvents: this.screenReaderEvents.length,
        voiceCommands: this.voiceCommands.length,
        lastActivity: this.screenReaderEvents.length > 0 
          ? this.screenReaderEvents[this.screenReaderEvents.length - 1].timestamp 
          : null
      }
    };
  }

  /**
   * Handle focus changes for screen reader navigation
   */
  handleFocusChange(newFocus: string, content?: string): void {
    if (!this.settings.screenReaderEnabled) {
      return;
    }

    this.currentFocus = newFocus;
    
    const event: ScreenReaderEvent = {
      type: 'focus_changed',
      target: newFocus,
      content,
      announcement: `Focus moved to ${newFocus}${content ? `: ${content}` : ''}`,
      timestamp: new Date()
    };

    this.screenReaderEvents.push(event);
    this.performScreenReaderAnnouncement(event.announcement!, 'assertive');
  }

  /**
   * Provide keyboard navigation hints
   */
  getKeyboardNavigationHints(): string[] {
    return [
      'Tab: Move to next focusable element',
      'Shift+Tab: Move to previous focusable element',
      'Enter: Activate focused element',
      'Escape: Cancel current operation',
      'Arrow Keys: Navigate within content',
      'Ctrl+Home: Go to beginning',
      'Ctrl+End: Go to end',
      'Ctrl+A: Select all content'
    ];
  }
}