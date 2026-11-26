'use client';

import React from 'react';
import { evaluateRegex, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="regex-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Flags</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>g — find every match, not just the first</li>
          <li>i — ignore case</li>
          <li>m — ^ and $ match at every line boundary</li>
          <li>s — dot matches newlines too</li>
          <li>u — full Unicode matching</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Statistics</h3>
        <ul
          className="space-y-1 text-xs text-gray-600 dark:text-gray-300"
          data-testid="sidebar-stats"
        >
          <li>
            Pattern: /{state.pattern}/{evaluation.flagString || '—'}
          </li>
          <li>Matches: {evaluation.stats.matches}</li>
          <li>Capture groups declared: {evaluation.stats.groups}</li>
          <li>Capture groups filled: {evaluation.stats.participatingGroups}</li>
          <li>Zero-width matches: {evaluation.stats.zeroWidthMatches}</li>
          <li>
            Coverage: {Math.round(evaluation.stats.coverage * 100)}% of{' '}
            {evaluation.stats.textLength} characters
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>C</kbd> — Copy results
          </li>
          <li>
            <kbd>R</kbd> — Save to history
          </li>
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current pattern, flags and
          test string; open it to restore this session.
        </p>
      </div>
      <button
        type="button"
        data-testid="sidebar-clear-history"
        onClick={() => onChange({ ...state, history: [] })}
        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Clear history
      </button>
    </div>
  );
};
