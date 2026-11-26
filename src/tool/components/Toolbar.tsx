'use client';

import React from 'react';
import { FLAG_INFO, REGEX_FLAGS, type RegexFlag, type ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const toggleFlag = (flag: RegexFlag) => {
    const set = new Set(state.flags);
    if (set.has(flag)) {
      set.delete(flag);
    } else {
      set.add(flag);
    }
    onChange({ ...state, flags: REGEX_FLAGS.filter((f) => set.has(f)) });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Regex flag toggles">
        {REGEX_FLAGS.map((flag) => {
          const active = state.flags.includes(flag);
          return (
            <button
              key={flag}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`flag-${flag}`}
              title={FLAG_INFO[flag].description}
              onClick={() => toggleFlag(flag)}
              className={`h-7 w-7 rounded-md border text-xs font-mono font-medium ${
                active
                  ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {flag}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={state.replaceMode}
          data-testid="btn-replace-mode"
          onClick={() => onChange({ ...state, replaceMode: !state.replaceMode })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            state.replaceMode
              ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          Replace mode
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy results
          </button>
        ) : null}
      </div>
    </div>
  );
};
