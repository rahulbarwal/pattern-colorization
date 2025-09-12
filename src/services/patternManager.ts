import * as vscode from "vscode";
import {
  Pattern,
  PatternConfig,
  PatternChangeEvent,
  PatternEventType,
} from "../models/pattern";
import {
  COLOR_PALETTE,
  MAX_PATTERNS,
  DEFAULT_CONFIG,
  STORAGE_KEYS,
} from "../constants/colors";

/**
 * Manages pattern storage, CRUD operations, and state persistence
 */
export class PatternManager {
  private patterns: Pattern[] = [];
  private config: PatternConfig = { ...DEFAULT_CONFIG };
  private lastColorIndex: number = 0;
  private readonly _onDidChangePatterns =
    new vscode.EventEmitter<PatternChangeEvent>();

  /**
   * Event fired when patterns change
   */
  public readonly onDidChangePatterns = this._onDidChangePatterns.event;

  constructor(private context: vscode.ExtensionContext) {
    this.loadState();
  }

  /**
   * Get all patterns
   */
  public getPatterns(): Pattern[] {
    return [...this.patterns];
  }

  /**
   * Get enabled patterns only
   */
  public getEnabledPatterns(): Pattern[] {
    return this.patterns.filter((p) => p.enabled);
  }

  /**
   * Get pattern configuration
   */
  public getConfig(): PatternConfig {
    return { ...this.config };
  }

  /**
   * Add a new pattern
   */
  public async addPattern(
    text: string,
    description?: string
  ): Promise<Pattern | null> {
    if (this.patterns.length >= MAX_PATTERNS) {
      return null;
    }

    if (!text.trim()) {
      vscode.window.showErrorMessage("Pattern text cannot be empty");
      return null;
    }

    // Check for duplicate patterns
    const existingPattern = this.patterns.find(
      (p) => p.text.toLowerCase() === text.toLowerCase()
    );

    if (existingPattern) {
      return null;
    }

    const pattern: Pattern = {
      id: this.generateId(),
      text: text.trim(),
      colorIndex: this.getNextColorIndex(),
      enabled: true,
      createdAt: Date.now(),
      description: description?.trim(),
    };

    this.patterns.push(pattern);
    await this.saveState();

    this._onDidChangePatterns.fire({
      type: PatternEventType.ADDED,
      pattern,
    });

    return pattern;
  }

  /**
   * Remove a pattern by ID
   */
  public async removePattern(id: string): Promise<boolean> {
    const index = this.patterns.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }

    const pattern = this.patterns[index];
    this.patterns.splice(index, 1);
    await this.saveState();

    this._onDidChangePatterns.fire({
      type: PatternEventType.REMOVED,
      pattern,
    });

    return true;
  }

  /**
   * Update a pattern
   */
  public async updatePattern(
    id: string,
    updates: Partial<Pattern>
  ): Promise<boolean> {
    const pattern = this.patterns.find((p) => p.id === id);
    if (!pattern) {
      return false;
    }

    Object.assign(pattern, updates);
    await this.saveState();

    this._onDidChangePatterns.fire({
      type: PatternEventType.UPDATED,
      pattern,
    });

    return true;
  }

  /**
   * Toggle pattern enabled state
   */
  public async togglePattern(id: string): Promise<boolean> {
    const pattern = this.patterns.find((p) => p.id === id);
    if (!pattern) {
      return false;
    }

    pattern.enabled = !pattern.enabled;
    await this.saveState();

    this._onDidChangePatterns.fire({
      type: PatternEventType.TOGGLED,
      pattern,
    });

    return true;
  }

  /**
   * Clear all patterns
   */
  public async clearPatterns(): Promise<void> {
    if (this.patterns.length === 0) {
      return;
    }

    this.patterns = [];
    this.lastColorIndex = 0;
    await this.saveState();

    this._onDidChangePatterns.fire({
      type: PatternEventType.CLEARED,
    });
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: Partial<PatternConfig>): Promise<void> {
    Object.assign(this.config, config);
    await this.saveState();

    // Trigger refresh of all patterns
    this._onDidChangePatterns.fire({
      type: PatternEventType.UPDATED,
      patterns: this.patterns,
    });
  }

  /**
   * Get color definition for a pattern
   */
  public getColorForPattern(pattern: Pattern) {
    return COLOR_PALETTE[pattern.colorIndex] || COLOR_PALETTE[0];
  }

  /**
   * Import patterns from JSON
   */
  public async importPatterns(patternsData: any[]): Promise<void> {
    try {
      const validPatterns: Pattern[] = [];

      for (const data of patternsData) {
        if (data.text && typeof data.text === "string") {
          const pattern: Pattern = {
            id: data.id || this.generateId(),
            text: data.text.trim(),
            colorIndex: Math.min(
              Math.max(data.colorIndex || 0, 0),
              COLOR_PALETTE.length - 1
            ),
            enabled: data.enabled !== false,
            createdAt: data.createdAt || Date.now(),
            description: data.description,
          };
          validPatterns.push(pattern);
        }
      }

      this.patterns = validPatterns.slice(0, MAX_PATTERNS);
      await this.saveState();

      this._onDidChangePatterns.fire({
        type: PatternEventType.UPDATED,
        patterns: this.patterns,
      });

      // Patterns imported silently
    } catch (error) {
      vscode.window.showErrorMessage(
        "Failed to import patterns: Invalid format"
      );
    }
  }

  /**
   * Export patterns to JSON
   */
  public exportPatterns(): any[] {
    return this.patterns.map((pattern) => ({
      id: pattern.id,
      text: pattern.text,
      colorIndex: pattern.colorIndex,
      enabled: pattern.enabled,
      createdAt: pattern.createdAt,
      description: pattern.description,
    }));
  }

  /**
   * Generate unique ID for pattern
   */
  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get next available color index
   */
  private getNextColorIndex(): number {
    // Find the next unused color index
    const usedIndices = new Set(this.patterns.map((p) => p.colorIndex));

    for (let i = 0; i < COLOR_PALETTE.length; i++) {
      if (!usedIndices.has(i)) {
        this.lastColorIndex = i;
        return i;
      }
    }

    // If all colors are used, cycle through them
    this.lastColorIndex = (this.lastColorIndex + 1) % COLOR_PALETTE.length;
    return this.lastColorIndex;
  }

  /**
   * Load state from VS Code workspace storage
   */
  private loadState(): void {
    try {
      const storedPatterns = this.context.workspaceState.get<Pattern[]>(
        STORAGE_KEYS.PATTERNS
      );
      const storedConfig = this.context.workspaceState.get<PatternConfig>(
        STORAGE_KEYS.CONFIG
      );
      const storedLastColorIndex = this.context.workspaceState.get<number>(
        STORAGE_KEYS.LAST_COLOR_INDEX
      );

      console.log("PatternManager: Loading state from storage");
      console.log("PatternManager: Stored patterns:", storedPatterns);
      console.log("PatternManager: Stored config:", storedConfig);

      this.patterns = storedPatterns || [];
      this.config = { ...DEFAULT_CONFIG, ...storedConfig };
      this.lastColorIndex = storedLastColorIndex || 0;

      // Validate patterns
      this.patterns = this.patterns
        .filter((p) => p.text && typeof p.text === "string")
        .slice(0, MAX_PATTERNS);

      console.log(
        "PatternManager: Loaded patterns after validation:",
        this.patterns.length,
        this.patterns
      );
    } catch (error) {
      console.error("Failed to load pattern state:", error);
      this.patterns = [];
      this.config = { ...DEFAULT_CONFIG };
      this.lastColorIndex = 0;
    }
  }

  /**
   * Save state to VS Code workspace storage
   */
  private async saveState(): Promise<void> {
    try {
      await Promise.all([
        this.context.workspaceState.update(
          STORAGE_KEYS.PATTERNS,
          this.patterns
        ),
        this.context.workspaceState.update(STORAGE_KEYS.CONFIG, this.config),
        this.context.workspaceState.update(
          STORAGE_KEYS.LAST_COLOR_INDEX,
          this.lastColorIndex
        ),
      ]);
    } catch (error) {
      console.error("Failed to save pattern state:", error);
      vscode.window.showErrorMessage("Failed to save pattern configuration");
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this._onDidChangePatterns.dispose();
  }
}
