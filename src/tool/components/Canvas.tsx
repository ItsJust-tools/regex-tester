'use client';

import React from 'react';
import { evaluateRegex, highlightSegments, replacePreview } from '../types';
import { flagsToString, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
  const segments = highlightSegments(state.testText, evaluation.matches);
  const preview =
    state.replaceMode && evaluation.status === 'ok'
      ? replacePreview(state.pattern, state.flags, state.testText, state.replacement)
      : null;

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="regex-canvas">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Pattern
        <input
          type="text"
          value={state.pattern}
          onChange={(e) => update({ pattern: e.target.value })}
          data-testid="input-pattern"
          placeholder="Enter a regular expression, e.g. \b\w+\b"
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Test string
        <textarea
          value={state.testText}
          onChange={(e) => update({ testText: e.target.value })}
          data-testid="input-test-text"
          rows={6}
          className={inputClass}
        />
      </label>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Matches
        </span>
        {evaluation.status === 'invalid' ? (
          <span className="block text-sm text-red-600 dark:text-red-400" data-testid="regex-error">
            {evaluation.error}
          </span>
        ) : evaluation.status === 'empty' ? (
          <span
            className="block text-sm text-gray-500 dark:text-gray-400"
            data-testid="regex-empty"
          >
            Enter a pattern to test.
          </span>
        ) : (
          <span className="block font-mono text-3xl font-bold" data-testid="match-count">
            {evaluation.stats.matches}
          </span>
        )}
        <span
          className="mt-1 block text-xs text-gray-500 dark:text-gray-400"
          data-testid="match-summary"
        >
          /{flagsToString(state.flags) || '—'}/ · {evaluation.stats.participatingGroups} group
          {evaluation.stats.participatingGroups === 1 ? '' : 's'} filled
          {evaluation.stats.zeroWidthMatches > 0
            ? ` · ${evaluation.stats.zeroWidthMatches} zero-width`
            : ''}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Highlighted
        </h3>
        <div
          className="whitespace-pre-wrap break-words font-mono text-sm"
          data-testid="highlight-view"
        >
          {segments.length === 0 ? (
            <span className="text-gray-500 dark:text-gray-400">Nothing to highlight yet.</span>
          ) : (
            segments.map((segment, i) =>
              segment.matchIndex === null ? (
                <span key={i}>{segment.text}</span>
              ) : (
                <mark
                  key={i}
                  data-testid="highlight-match"
                  className="rounded bg-violet-100 text-violet-900 dark:bg-violet-900/60 dark:text-violet-100"
                  title={`Match ${segment.matchIndex + 1}`}
                >
                  {segment.text}
                </mark>
              )
            )
          )}
        </div>
      </div>

      {evaluation.matches.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Matches and capture groups
          </h3>
          <ol className="space-y-2 text-xs" data-testid="match-list">
            {evaluation.matches.slice(0, 200).map((match, i) => (
              <li
                key={`${match.index}-${i}`}
                className="rounded-md border border-gray-200 p-2 dark:border-gray-800"
              >
                <span
                  className="font-mono text-gray-800 dark:text-gray-200"
                  data-testid={`match-${i}-value`}
                >
                  #{i + 1} @ {match.index}: &quot;{match.value}&quot;
                </span>
                <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-gray-400">
                  {match.groups.map((group) => (
                    <li
                      key={group.index}
                      className="font-mono"
                      data-testid={`match-${i}-group-${group.index}`}
                    >
                      ${group.index}
                      {group.name ? ` (${group.name})` : ''}:{' '}
                      {group.value === null ? '—' : `"${group.value}"`}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {state.replaceMode ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Replace preview
          </h3>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Replacement ($1, $&lt;name&gt; supported)
            <input
              type="text"
              value={state.replacement}
              onChange={(e) => update({ replacement: e.target.value })}
              data-testid="input-replacement"
              className={inputClass}
            />
          </label>
          <pre
            className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:bg-gray-900/60 dark:text-gray-200"
            data-testid="replace-preview"
          >
            {preview ?? 'Fix the pattern to see a replacement preview.'}
          </pre>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved evaluations yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <button
                  type="button"
                  aria-label="Copy history entry"
                  data-testid={`btn-copy-history-${i}`}
                  onClick={() =>
                    void navigator.clipboard.writeText(entry.text).catch(() => undefined)
                  }
                  className="rounded border border-gray-300 px-2 py-0.5 dark:border-gray-700"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          data-testid="btn-save-history"
          onClick={() =>
            onSaveHistory?.(
              `${state.pattern} → ${evaluation.stats.matches} ${
                evaluation.stats.matches === 1 ? 'match' : 'matches'
              }`
            )
          }
          className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Save to history
        </button>
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Everything runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
