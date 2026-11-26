import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  compileRegex,
  evaluateRegex,
  flagsToString,
  highlightSegments,
  listCaptureGroups,
  normalizeFlags,
  replacePreview,
  summaryText,
  toggleFlag,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  regexTesterTool,
  roundTrips,
  withHistory,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('normalizeFlags', () => {
  it('orders flags canonically and drops duplicates', () => {
    expect(normalizeFlags(['u', 'g', 'g', 'i'])).toEqual(['g', 'i', 'u']);
    expect(normalizeFlags([])).toEqual([]);
    expect(normalizeFlags(['x' as string])).toEqual([]);
  });
});

describe('flagsToString', () => {
  it('joins ordered flags', () => {
    expect(flagsToString(['g', 'i'])).toBe('gi');
    expect(flagsToString([])).toBe('');
  });
});

describe('toggleFlag', () => {
  it('adds and removes flags while staying canonical', () => {
    expect(toggleFlag([], 'm')).toEqual(['m']);
    expect(toggleFlag(['g', 'm'], 'g')).toEqual(['m']);
    expect(toggleFlag(['m'], 'i')).toEqual(['i', 'm']);
  });
});

describe('compileRegex', () => {
  it('compiles a valid pattern', () => {
    const result = compileRegex('\\d+', ['g']);
    expect(result.ok).toBe(true);
  });

  it('reports invalid patterns without throwing', () => {
    const result = compileRegex('([unclosed', []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it('rejects an empty pattern', () => {
    expect(compileRegex('', []).ok).toBe(false);
  });
});

describe('evaluateRegex', () => {
  it('counts all matches with the global flag', () => {
    const result = evaluateRegex('a', ['g'], 'aXaXa');
    expect(result.status).toBe('ok');
    expect(result.stats.matches).toBe(3);
  });

  it('returns only the first match without the global flag', () => {
    const result = evaluateRegex('a', [], 'aXaXa');
    expect(result.stats.matches).toBe(1);
  });

  it('reports an empty pattern as empty status', () => {
    const result = evaluateRegex('', ['g'], 'text');
    expect(result.status).toBe('empty');
    expect(result.matches).toEqual([]);
  });

  it('reports invalid patterns with an error message', () => {
    const result = evaluateRegex('+x', ['g'], 'text');
    expect(result.status).toBe('invalid');
    expect(result.error).toBeTruthy();
  });

  it('applies the ignore-case flag', () => {
    expect(evaluateRegex('a', [], 'aAa').stats.matches).toBe(1);
    expect(evaluateRegex('a', ['g', 'i'], 'aAa').stats.matches).toBe(3);
  });

  it('applies the multiline flag to anchors', () => {
    expect(evaluateRegex('^b', ['g', 'm'], 'ab\nb').stats.matches).toBe(1);
    expect(evaluateRegex('^b', ['g', 'm'], 'b\nb').stats.matches).toBe(2);
  });

  it('applies the dot-all flag', () => {
    expect(evaluateRegex('a.c', [], 'a\nc').stats.matches).toBe(0);
    expect(evaluateRegex('a.c', ['s'], 'a\nc').stats.matches).toBe(1);
  });

  it('tracks zero-width matches without looping forever', () => {
    const result = evaluateRegex('a*', ['g'], 'bab');
    expect(result.status).toBe('ok');
    expect(result.stats.zeroWidthMatches).toBeGreaterThan(0);
  });

  it('records capture groups including named groups', () => {
    const result = evaluateRegex('(?<user>\\w+)@(\\w+)', ['g'], 'mail: bob@site.com, ann@x.org');
    expect(result.stats.matches).toBe(2);
    expect(result.stats.participatingGroups).toBe(4);
    const first = result.matches[0];
    expect(first?.groups[1]?.name).toBe('user');
    expect(first?.groups[1]?.value).toBe('bob');
    expect(first?.groups[2]?.value).toBe('site');
  });

  it('reports non-participating groups as null', () => {
    const result = evaluateRegex('(a)|(z)', ['g'], 'aa');
    expect(result.status).toBe('ok');
    expect(result.matches[0]?.groups[2]?.value).toBeNull();
  });

  it('computes coverage stats', () => {
    const result = evaluateRegex('\\d+', ['g'], 'ab12cd34');
    expect(result.stats.charactersMatched).toBe(4);
    expect(result.stats.textLength).toBe(8);
    expect(result.stats.coverage).toBeCloseTo(0.5);
  });
});

describe('listCaptureGroups', () => {
  it('skips non-capturing groups and character classes', () => {
    const groups = listCaptureGroups('(?:x)[(]*(a)(?<name>b)');
    expect(groups).toEqual([
      { index: 1, name: null },
      { index: 2, name: 'name' },
    ]);
  });

  it('ignores escaped parens and lookbehind syntax', () => {
    expect(listCaptureGroups('\\( \\) (?<=a)(?<n>x)')).toEqual([{ index: 1, name: 'n' }]);
  });
});

describe('highlightSegments', () => {
  it('splits plain text and matches', () => {
    const evaluation = evaluateRegex('b', ['g'], 'abcbe');
    const segments = highlightSegments('abcbe', evaluation.matches);
    expect(segments).toEqual([
      { text: 'a', matchIndex: null, start: 0 },
      { text: 'b', matchIndex: 0, start: 1 },
      { text: 'c', matchIndex: null, start: 2 },
      { text: 'b', matchIndex: 1, start: 3 },
      { text: 'e', matchIndex: null, start: 4 },
    ]);
  });

  it('returns empty for empty text', () => {
    expect(highlightSegments('', [])).toEqual([]);
  });
});

describe('replacePreview', () => {
  it('substitutes with capture references', () => {
    const result = replacePreview('(\\w+)@(\\S+)', ['g'], 'bob@x.com', '$2/$1');
    expect(result).toBe('x.com/bob');
  });

  it('handles named group references', () => {
    const result = replacePreview('(?<a>x)', ['g'], 'xx', '<$<a>>');
    expect(result).toBe('<x><x>');
  });

  it('returns null for invalid patterns', () => {
    expect(replacePreview('([', [], 'text', 'x')).toBeNull();
  });
});

describe('serialize/deserialize', () => {
  it('serializes to JSON text containing inputs', () => {
    const s = serializeState(state({ pattern: 'a+', testText: 'zaa', replaceMode: true }));
    expect(s).toContain('"pattern":"a+"');
    expect(s).toContain('"replaceMode":true');
  });

  it('round-trips a full state', () => {
    const original = state({ replacement: '[$1]', replaceMode: true, flags: ['i', 'm'] });
    expect(roundTrips(original)).toBe(true);
  });

  it('validates garbage payloads as errors', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
  });

  it('repairs partial payloads with defaults', () => {
    const result = deserializeState({ pattern: 'q', testText: 'qq' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pattern).toBe('q');
      expect(result.data.flags).toEqual([]);
      expect(result.data.replaceMode).toBe(false);
      expect(result.data.history).toEqual([]);
    }
  });

  it('caps restored history at MAX_HISTORY', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      text: `entry ${i}`,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));
    const result = deserializeState({ ...DEFAULT_STATE, history: entries });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.history).toHaveLength(MAX_HISTORY);
  });

  it('exposes the tool definition with id from tool.config', () => {
    expect(regexTesterTool.id).toBe('regex-tester');
    expect(regexTesterTool.name).toBe('Regex Tester');
    expect(regexTesterTool.initialState.pattern).toBe(DEFAULT_STATE.pattern);
    expect(regexTesterTool.serialize(DEFAULT_STATE)).toBe(serializeState(DEFAULT_STATE));
  });
});

describe('withHistory', () => {
  it('prepends entries and caps the list', () => {
    let s: ToolState = state();
    for (let i = 0; i < 25; i++) {
      s = withHistory(s, `run ${i}`, new Date(0));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe('run 24');
  });
});

describe('summaryText', () => {
  it('describes match counts and flags', () => {
    expect(summaryText(state({ pattern: 'a', flags: ['g'], testText: 'aa' }))).toBe(
      '2 matches · /g/'
    );
    expect(summaryText(state({ pattern: 'a', flags: [], testText: 'x' }))).toBe('0 matches · /—/');
    expect(summaryText(state({ pattern: 'a', flags: ['g'], testText: 'a' }))).toBe('1 match · /g/');
  });

  it('flags invalid patterns', () => {
    const text = summaryText(state({ pattern: '([', testText: 'x' }));
    expect(text).toContain('Invalid pattern');
  });

  it('mentions replace preview in replace mode', () => {
    const text = summaryText(
      state({ pattern: 'a', flags: ['g'], testText: 'aa', replaceMode: true, replacement: 'b' })
    );
    expect(text).toContain('replace preview ready');
  });
});
