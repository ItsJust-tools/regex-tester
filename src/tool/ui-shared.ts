import { FLAG_INFO, REGEX_FLAGS, type RegexFlag, type ToolState } from './types';

/** Display metadata for each regex flag. */
export const FLAGS = REGEX_FLAGS.map((flag) => ({ value: flag, ...FLAG_INFO[flag] }));

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.pattern === 'string' && typeof v.testText === 'string' && Array.isArray(v.flags);
}
