/**
 * Represents a pattern to be highlighted with its associated color
 */
export interface Pattern {
  /** Unique identifier for the pattern */
  id: string;
  /** The text pattern to match */
  text: string;
  /** Color index (0-7) corresponding to one of 8 predefined colors */
  colorIndex: number;
  /** Whether this pattern is currently active */
  enabled: boolean;
  /** Timestamp when pattern was created */
  createdAt: number;
  /** Optional description for the pattern */
  description?: string;
}

/**
 * Configuration options for pattern matching
 */
export interface PatternConfig {
  /** Whether pattern matching should be case sensitive */
  caseSensitive: boolean;
  /** Whether to match whole words only */
  wholeWord: boolean;
  /** Whether highlighting is globally enabled */
  enabled: boolean;
}

/**
 * Color definition for highlighting
 */
export interface ColorDefinition {
  /** Light theme background color */
  light: string;
  /** Dark theme background color */
  dark: string;
  /** Optional border color */
  border?: string;
  /** Color name/description */
  name: string;
}

/**
 * Extension state that persists across sessions
 */
export interface ExtensionState {
  /** List of user-defined patterns */
  patterns: Pattern[];
  /** Configuration settings */
  config: PatternConfig;
  /** Last used color index for automatic assignment */
  lastColorIndex: number;
}

/**
 * Event types for pattern changes
 */
export enum PatternEventType {
  ADDED = 'added',
  REMOVED = 'removed',
  UPDATED = 'updated',
  CLEARED = 'cleared',
  TOGGLED = 'toggled'
}

/**
 * Event data for pattern change notifications
 */
export interface PatternChangeEvent {
  type: PatternEventType;
  pattern?: Pattern;
  patterns?: Pattern[];
}

/**
 * Tree item data for the Explorer view
 */
export interface PatternTreeItem {
  id: string;
  label: string;
  description: string;
  colorIndex: number;
  enabled: boolean;
  contextValue: string;
}