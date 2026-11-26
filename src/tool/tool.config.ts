import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'regex-tester',
  name: 'Regex Tester',
  description:
    'Test regular expressions with live match highlighting, capture-group inspection, replace mode with preview, shareable URL state and result export.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentSubtle: 'rgba(139, 92, 246, 0.12)',
    brand: 'Regex Tester',
    icon: '•',
  },
  shortcuts: [
    {
      title: 'Regex Tester',
      shortcuts: [
        {
          keys: 'C',
          label: 'Copy results',
          description: 'copy matches and replacement preview to the clipboard',
        },
        {
          keys: 'R',
          label: 'Save to history',
          description: 'pin the current evaluation to the history list',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
