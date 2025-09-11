import { ColorDefinition } from '../models/pattern';

/**
 * Predefined color palette for pattern highlighting
 * Uses muted colors that work well with both light and dark themes
 */
export const COLOR_PALETTE: ColorDefinition[] = [
  {
    name: 'Soft Blue',
    light: '#E3F2FD',
    dark: '#1E3A8A',
    border: '#2196F3'
  },
  {
    name: 'Soft Green',
    light: '#E8F5E8',
    dark: '#166534',
    border: '#4CAF50'
  },
  {
    name: 'Soft Yellow',
    light: '#FFF9C4',
    dark: '#CA8A04',
    border: '#FFC107'
  },
  {
    name: 'Soft Orange',
    light: '#FFE0B2',
    dark: '#C2410C',
    border: '#FF9800'
  },
  {
    name: 'Soft Purple',
    light: '#F3E5F5',
    dark: '#7C3AED',
    border: '#9C27B0'
  },
  {
    name: 'Soft Pink',
    light: '#FCE4EC',
    dark: '#BE185D',
    border: '#E91E63'
  },
  {
    name: 'Soft Teal',
    light: '#E0F2F1',
    dark: '#0F766E',
    border: '#009688'
  },
  {
    name: 'Soft Gray',
    light: '#F5F5F5',
    dark: '#374151',
    border: '#757575'
  }
];

/**
 * Maximum number of patterns that can be active simultaneously
 */
export const MAX_PATTERNS = 8;

/**
 * Default pattern configuration
 */
export const DEFAULT_CONFIG = {
  caseSensitive: false,
  wholeWord: false,
  enabled: true
};

/**
 * Storage keys for VS Code workspace state
 */
export const STORAGE_KEYS = {
  PATTERNS: 'patternColorization.patterns',
  CONFIG: 'patternColorization.config',
  LAST_COLOR_INDEX: 'patternColorization.lastColorIndex'
} as const;