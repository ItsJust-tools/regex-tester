/** Supported regular-expression flags. */
export type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u';

/** Canonical flag order used for display, storage, and share URLs. */
export const REGEX_FLAGS: readonly RegexFlag[] = ['g', 'i', 'm', 's', 'u'];

/** Human-readable meaning of each flag. */
export const FLAG_INFO: Record<RegexFlag, { label: string; description: string }> = {
  g: { label: 'Global', description: 'Find every match, not just the first one' },
  i: { label: 'Ignore case', description: 'Match letters regardless of case' },
  m: { label: 'Multiline', description: '^ and $ match at the start and end of every line' },
  s: { label: 'Dot all', description: 'Let . match newline characters too' },
  u: { label: 'Unicode', description: 'Enable full Unicode matching and escapes' },
};

/** Serializable state of the regex tester. Plain JSON so it can be shared and restored. */
export interface ToolState {
  /** The regular expression source, without delimiters. */
  pattern: string;
  /** Enabled flags, stored in canonical order. */
  flags: RegexFlag[];
  /** The text the pattern is tested against. */
  testText: string;
  /** Replacement text for replace mode ($1 etc. supported). */
  replacement: string;
  /** Whether the replace preview is shown. */
  replaceMode: boolean;
  /** Most recent evaluations, newest first. */
  history: HistoryEntry[];
}

/** A completed evaluation stored in the history. */
export interface HistoryEntry {
  /** Short human-readable description of the evaluation. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export const DEFAULT_STATE: ToolState = {
  pattern: '\\b(\\w+)@(\\w+\\.\\w{2,})\\b',
  flags: ['g', 'i'],
  testText: 'Contact us at hello@itsjust.tools or sales@example.com.\nNot an email: @nope.',
  replacement: '[$1 at $2]',
  replaceMode: false,
  history: [],
};

export const MAX_HISTORY = 20;

/** Normalize flags into canonical order and drop duplicates. */
export function normalizeFlags(flags: readonly string[]): RegexFlag[] {
  return REGEX_FLAGS.filter((flag) => flags.includes(flag as RegexFlag));
}

/** Ordered, de-duplicated flag string such as "gi". */
export function flagsToString(flags: readonly RegexFlag[]): string {
  return normalizeFlags(flags).join('');
}

/** Toggle one flag, keeping canonical order. */
export function toggleFlag(flags: readonly RegexFlag[], flag: RegexFlag): RegexFlag[] {
  const set = new Set(flags);
  if (set.has(flag)) {
    set.delete(flag);
  } else {
    set.add(flag);
  }
  return normalizeFlags([...set]);
}

export type CompileResult =
  { ok: true; regex: RegExp; flagString: string } | { ok: false; error: string };

/** Compile a pattern, returning a structured error instead of throwing. */
export function compileRegex(pattern: string, flags: readonly RegexFlag[]): CompileResult {
  const flagString = flagsToString(flags);
  if (pattern === '') {
    return { ok: false, error: 'Pattern is empty' };
  }
  try {
    return { ok: true, regex: new RegExp(pattern, flagString), flagString };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid regular expression',
    };
  }
}

/** One capture slot inside a match. Index 0 is the whole match. */
export interface CaptureGroup {
  index: number;
  name: string | null;
  value: string | null;
}

/** A single match with its capture-group breakdown. */
export interface RegexMatch {
  /** 0-based offset in the test string. */
  index: number;
  value: string;
  zeroWidth: boolean;
  groups: CaptureGroup[];
}

/** Aggregate statistics for one evaluation. */
export interface RegexStats {
  matches: number;
  groups: number;
  participatingGroups: number;
  zeroWidthMatches: number;
  charactersMatched: number;
  textLength: number;
  coverage: number;
}

/** Outcome of running a pattern against a test string. Never throws. */
export interface RegexEvaluation {
  status: 'empty' | 'invalid' | 'ok';
  error: string | null;
  matches: RegexMatch[];
  flagString: string;
  stats: RegexStats;
}

const EMPTY_STATS: RegexStats = {
  matches: 0,
  groups: 0,
  participatingGroups: 0,
  zeroWidthMatches: 0,
  charactersMatched: 0,
  textLength: 0,
  coverage: 0,
};

/** Parse named capture-group openers ( (?<name>…) ) in source order. */
export function listCaptureGroups(pattern: string): Array<{ index: number; name: string | null }> {
  const groups: Array<{ index: number; name: string | null }> = [];
  let inClass = false;
  let escaped = false;
  let groupIndex = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (inClass) {
      if (char === ']') inClass = false;
      continue;
    }
    if (char === '[') {
      inClass = true;
      continue;
    }
    if (char !== '(') continue;
    if (
      pattern[i + 1] === '?' &&
      pattern[i + 2] === '<' &&
      pattern[i + 3] !== '=' &&
      pattern[i + 3] !== '!'
    ) {
      const close = pattern.indexOf('>', i + 3);
      if (close !== -1) {
        groupIndex += 1;
        groups.push({ index: groupIndex, name: pattern.slice(i + 3, close) || null });
      }
    } else if (pattern[i + 1] !== '?') {
      groupIndex += 1;
      groups.push({ index: groupIndex, name: null });
    }
  }
  return groups;
}

function groupAt(pattern: string, position: number): { index: number; name: string | null } | null {
  return listCaptureGroups(pattern)[position - 1] ?? null;
}

function toMatch(pattern: string, match: RegExpExecArray): RegexMatch {
  const groups: CaptureGroup[] = [{ index: 0, name: null, value: match[0] }];
  for (let i = 1; i < match.length; i++) {
    const declared = groupAt(pattern, i);
    groups.push({
      index: i,
      name: declared?.name ?? null,
      value: typeof match[i] === 'string' ? (match[i] as string) : null,
    });
  }
  return {
    index: match.index,
    value: match[0],
    zeroWidth: match[0].length === 0,
    groups,
  };
}

/** Hard cap on collected matches, to keep the UI responsive. */
export const MAX_MATCHES = 2000;

/** Run a pattern against the test string, collecting matches plus metrics. */
export function evaluateRegex(
  pattern: string,
  flags: readonly RegexFlag[],
  text: string
): RegexEvaluation {
  const flagString = flagsToString(flags);
  if (pattern === '') {
    return {
      status: 'empty',
      error: null,
      matches: [],
      flagString,
      stats: { ...EMPTY_STATS, textLength: text.length },
    };
  }
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) {
    return {
      status: 'invalid',
      error: compiled.error,
      matches: [],
      flagString,
      stats: { ...EMPTY_STATS, textLength: text.length },
    };
  }
  const { regex } = compiled;
  const matches: RegexMatch[] = [];
  if (!regex.global) {
    const single = regex.exec(text);
    if (single) matches.push(toMatch(pattern, single));
  } else {
    let guard = 0;
    let current = regex.exec(text);
    while (current) {
      matches.push(toMatch(pattern, current));
      if (matches.length >= MAX_MATCHES) break;
      if (current[0].length === 0) {
        regex.lastIndex += 1;
        if (regex.lastIndex > text.length) break;
      }
      guard += 1;
      if (guard > MAX_MATCHES * 4) break;
      current = regex.exec(text);
    }
  }
  let charactersMatched = 0;
  let zeroWidthMatches = 0;
  let participatingGroups = 0;
  for (const match of matches) {
    charactersMatched += match.value.length;
    if (match.zeroWidth) zeroWidthMatches += 1;
    for (const group of match.groups) {
      if (group.index > 0 && group.value !== null) participatingGroups += 1;
    }
  }
  const stats: RegexStats = {
    matches: matches.length,
    groups: matches.reduce((sum, m) => sum + Math.max(0, m.groups.length - 1), 0),
    participatingGroups,
    zeroWidthMatches,
    charactersMatched,
    textLength: text.length,
    coverage: text.length === 0 ? 0 : Math.min(1, charactersMatched / text.length),
  };
  return { status: 'ok', error: null, matches, flagString, stats };
}

/** A contiguous run of the test string, either a match or plain text. */
export interface HighlightSegment {
  text: string;
  matchIndex: number | null;
  start: number;
}

/** Split the test string into plain and matched runs for highlighting. */
export function highlightSegments(
  text: string,
  matches: readonly RegexMatch[]
): HighlightSegment[] {
  if (text === '') return [];
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  matches.forEach((match, matchIndex) => {
    if (match.zeroWidth) return;
    const start = Math.max(0, Math.min(match.index, text.length));
    const end = Math.max(start, Math.min(match.index + match.value.length, text.length));
    if (end <= cursor) return;
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), matchIndex: null, start: cursor });
    }
    segments.push({ text: text.slice(start, end), matchIndex, start });
    cursor = end;
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matchIndex: null, start: cursor });
  }
  return segments;
}

/** Build the replacement preview, or null when the pattern is invalid/empty. */
export function replacePreview(
  pattern: string,
  flags: readonly RegexFlag[],
  text: string,
  replacement: string
): string | null {
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) return null;
  try {
    return text.replace(compiled.regex, replacement);
  } catch {
    return null;
  }
}

/** Short summary line for status bar and history entries. */
export function summaryText(state: ToolState): string {
  const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
  switch (evaluation.status) {
    case 'empty':
      return 'Enter a pattern to test';
    case 'invalid':
      return `Invalid pattern: ${evaluation.error ?? 'error'}`;
    case 'ok': {
      const count = evaluation.stats.matches;
      const label = count === 1 ? 'match' : 'matches';
      const base = `${count} ${label} · /${evaluation.flagString || '—'}/`;
      if (!state.replaceMode) return base;
      const preview = replacePreview(state.pattern, state.flags, state.testText, state.replacement);
      return preview === null ? base : `${base} · replace preview ready`;
    }
  }
}

export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.pattern === 'string' && typeof v.testText === 'string' && Array.isArray(v.flags);
}
