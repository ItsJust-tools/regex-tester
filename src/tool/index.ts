export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  regexTesterTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { FLAGS } from './ui-shared';
export {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_MATCHES,
  REGEX_FLAGS,
  FLAG_INFO,
  compileRegex,
  evaluateRegex,
  flagsToString,
  highlightSegments,
  listCaptureGroups,
  normalizeFlags,
  replacePreview,
  summaryText,
  toggleFlag,
  isState,
} from './types';
export type {
  CaptureGroup,
  CompileResult,
  HighlightSegment,
  HistoryEntry,
  RegexEvaluation,
  RegexFlag,
  RegexMatch,
  RegexStats,
  ToolState,
} from './types';
