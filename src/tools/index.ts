import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sessionTools } from './session-tools.js';
import { commandTools } from './command-tools.js';
import { captureTools } from './capture-tools.js';
import { keyboardTools } from './keyboard-tools.js';
import { mouseTools } from './mouse-tools.js';
import { clipboardTools } from './clipboard-tools.js';
import { touchTools } from './touch-tools.js';
import { advancedTouchTools } from './advanced-touch-tools.js';
import { accessibilityTools } from './accessibility-tools.js';
import { inputProcessingTools } from './input-processing-tools.js';
import { 
  setEnvironmentVariable,
  getEnvironmentVariable,
  listEnvironmentVariables,
  unsetEnvironmentVariable,
  changeWorkingDirectory,
  sendProcessSignal,
  setTerminalTitle,
  controlJob
} from './environment-tools.js';
import {
  saveSessionBookmark,
  restoreSessionBookmark,
  getSessionHistory,
  searchSessionHistory,
  listSessionBookmarks,
  serializeSessionState,
  undoLastCommand,
  autoSaveSession
} from './session-state-tools.js';
import {
  sendTerminalBell,
  setCursorStyle,
  switchTerminalMode
} from './terminal-control-tools.js';
import {
  dynamicTerminalResize,
  toggleFullscreenMode,
  createTerminalTab,
  switchTerminalTab,
  splitTerminalPane,
  focusTerminalPane,
  setZoomLevel,
  scrollViewport,
  setTerminalOpacity,
  getNavigationStatus
} from './terminal-navigation-tools.js';
import {
  configureMouseAcceleration,
  configurePressureSensitivity,
  trackMultiClickSequence,
  configureFocusFollowMouse,
  setMouseEventFilter,
  getAdvancedMouseStatus
} from './advanced-mouse-tools.js';
import {
  startInteractionRecording,
  stopInteractionRecording,
  replayInteractionSequence,
  listInteractionRecordings,
  createStateSnapshot,
  generateStateDiff,
  listStateSnapshots,
  listStateDiffs
} from './interaction-replay-tools.js';

export const environmentTools = [
  setEnvironmentVariable,
  getEnvironmentVariable,
  listEnvironmentVariables,
  unsetEnvironmentVariable,
  changeWorkingDirectory,
  sendProcessSignal,
  setTerminalTitle,
  controlJob
];

export const sessionStateTools = [
  saveSessionBookmark,
  restoreSessionBookmark,
  getSessionHistory,
  searchSessionHistory,
  listSessionBookmarks,
  serializeSessionState,
  undoLastCommand,
  autoSaveSession
];

export const terminalControlTools = [
  sendTerminalBell,
  setCursorStyle,
  switchTerminalMode
];

export const terminalNavigationTools = [
  dynamicTerminalResize,
  toggleFullscreenMode,
  createTerminalTab,
  switchTerminalTab,
  splitTerminalPane,
  focusTerminalPane,
  setZoomLevel,
  scrollViewport,
  setTerminalOpacity,
  getNavigationStatus
];

export const advancedMouseTools = [
  configureMouseAcceleration,
  configurePressureSensitivity,
  trackMultiClickSequence,
  configureFocusFollowMouse,
  setMouseEventFilter,
  getAdvancedMouseStatus
];

export const interactionReplayTools = [
  startInteractionRecording,
  stopInteractionRecording,
  replayInteractionSequence,
  listInteractionRecordings,
  createStateSnapshot,
  generateStateDiff,
  listStateSnapshots,
  listStateDiffs
];

export function registerTools(): Tool[] {
  return [
    ...sessionTools,
    ...commandTools,
    ...captureTools,
    ...keyboardTools,
    ...mouseTools,
    ...clipboardTools,
    ...touchTools,
    ...advancedTouchTools,
    ...accessibilityTools,
    ...inputProcessingTools,
    ...environmentTools,
    ...sessionStateTools,
    ...terminalControlTools,
    ...terminalNavigationTools,
    ...advancedMouseTools,
    ...interactionReplayTools
  ];
}

export { 
  sessionTools, 
  commandTools, 
  captureTools, 
  keyboardTools, 
  mouseTools, 
  clipboardTools,
  touchTools,
  advancedTouchTools,
  accessibilityTools,
  inputProcessingTools
};