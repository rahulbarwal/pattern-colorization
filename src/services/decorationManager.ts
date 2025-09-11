import * as vscode from 'vscode';
import { Pattern, PatternConfig } from '../models/pattern';
import { PatternManager } from './patternManager';
import { COLOR_PALETTE } from '../constants/colors';

/**
 * Manages text decorations for pattern highlighting across all editors
 */
export class DecorationManager {
  private decorationTypes: vscode.TextEditorDecorationType[] = [];
  private isEnabled: boolean = true;
  private updateTimeout: NodeJS.Timeout | undefined;

  constructor(
    private patternManager: PatternManager,
    private context: vscode.ExtensionContext
  ) {
    this.initializeDecorationTypes();
    this.setupEventHandlers();
    this.updateAllEditors();
  }

  /**
   * Initialize decoration types for each color in the palette
   */
  private initializeDecorationTypes(): void {
    this.disposeDecorationTypes();

    COLOR_PALETTE.forEach((_, index) => {
      const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor(`patternColorization.color${index}.background`),
        borderRadius: '3px',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: new vscode.ThemeColor(`patternColorization.color${index}.border`),
        overviewRulerColor: new vscode.ThemeColor(`patternColorization.color${index}.border`),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        
        // Enhanced accessibility and readability
        fontWeight: '500',
        textDecoration: 'none',
        
        // Better contrast - remove text shadow that can reduce readability
        color: new vscode.ThemeColor('editor.foreground'),
        
        // Add outline for better visibility on all themes
        outline: '1px solid',
        outlineColor: new vscode.ThemeColor(`patternColorization.color${index}.border`),
        
        // Improved cursor and selection behavior
        cursor: 'default',
        
        // Better integration with editor features
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        
        // Enhanced for better theme compatibility
        isWholeLine: false
      });

      this.decorationTypes[index] = decorationType;
      this.context.subscriptions.push(decorationType);
    });

    console.log(`Initialized ${this.decorationTypes.length} decoration types for pattern highlighting`);
  }




  /**
   * Setup event handlers for editor changes and pattern updates
   */
  private setupEventHandlers(): void {
    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.updateEditor(editor);
      }
    }, null, this.context.subscriptions);

    // Listen for text document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.visibleTextEditors.find(
        e => e.document === event.document
      );
      if (editor) {
        this.debounceUpdateEditor(editor);
      }
    }, null, this.context.subscriptions);

    // Listen for pattern changes
    this.patternManager.onDidChangePatterns(() => {
      this.updateAllEditors();
    }, null, this.context.subscriptions);

    // Listen for visible editors changes
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      editors.forEach(editor => this.updateEditor(editor));
    }, null, this.context.subscriptions);

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('patternColorization')) {
        this.updateConfiguration();
        this.updateAllEditors();
      }
    }, null, this.context.subscriptions);
  }

  /**
   * Update configuration from VS Code settings
   */
  private updateConfiguration(): void {
    const config = vscode.workspace.getConfiguration('patternColorization');
    const enabled = config.get<boolean>('enabled', true);
    const caseSensitive = config.get<boolean>('caseSensitive', false);
    const wholeWord = config.get<boolean>('wholeWord', false);

    this.isEnabled = enabled;
    this.patternManager.updateConfig({
      enabled,
      caseSensitive,
      wholeWord
    });
  }

  /**
   * Toggle highlighting on/off
   */
  public toggleHighlighting(): void {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      this.updateAllEditors();
    } else {
      this.clearAllDecorations();
    }

    // Update configuration
    vscode.workspace.getConfiguration('patternColorization').update(
      'enabled',
      this.isEnabled,
      vscode.ConfigurationTarget.Workspace
    );
  }

  /**
   * Update all visible editors
   */
  public updateAllEditors(): void {
    if (!this.isEnabled) {
      this.clearAllDecorations();
      return;
    }

    vscode.window.visibleTextEditors.forEach(editor => {
      this.updateEditor(editor);
    });
  }

  /**
   * Update decorations for a specific editor
   */
  public updateEditor(editor: vscode.TextEditor): void {
    if (!this.isEnabled) {
      this.clearEditorDecorations(editor);
      return;
    }

    const patterns = this.patternManager.getEnabledPatterns();
    const config = this.patternManager.getConfig();
    
    // Clear existing decorations first
    this.clearEditorDecorations(editor);

    if (patterns.length === 0) {
      return;
    }

    // Group ranges by color index for efficient decoration application
    const rangesByColor: { [colorIndex: number]: vscode.DecorationOptions[] } = {};
    let totalMatches = 0;

    patterns.forEach(pattern => {
      const ranges = this.findPatternRanges(editor.document, pattern, config);
      if (ranges.length > 0) {
        totalMatches += ranges.length;
        
        if (!rangesByColor[pattern.colorIndex]) {
          rangesByColor[pattern.colorIndex] = [];
        }
        
        // Create decoration options with hover information for accessibility
        const decorationOptions = ranges.map(range => {
          const hoveredText = editor.document.getText(range);
          const colorName = COLOR_PALETTE[pattern.colorIndex]?.name || 'Unknown';
          
          return {
            range,
            hoverMessage: new vscode.MarkdownString(
              `**Pattern Match:** \`${hoveredText}\`\n\n` +
              `**Color:** ${colorName}\n` +
              `**Pattern:** "${pattern.text}"` +
              (pattern.description ? `\n**Description:** ${pattern.description}` : '') +
              `\n\n*Click to navigate, right-click for options*`
            )
          };
        });
        
        rangesByColor[pattern.colorIndex].push(...decorationOptions);
      }
    });

    // Apply decorations with error handling
    Object.entries(rangesByColor).forEach(([colorIndex, decorationOptions]) => {
      const index = parseInt(colorIndex);
      if (this.decorationTypes[index] && decorationOptions.length > 0) {
        try {
          editor.setDecorations(this.decorationTypes[index], decorationOptions);
        } catch (error) {
          console.error(`Failed to apply decorations for color index ${index}:`, error);
        }
      }
    });
    
    // Log statistics for debugging
    if (totalMatches > 0) {
      console.log(`Applied ${totalMatches} pattern highlights across ${Object.keys(rangesByColor).length} colors in ${editor.document.fileName}`);
    }
  }

  /**
   * Find all ranges for a pattern in a document
   */
  private findPatternRanges(
    document: vscode.TextDocument,
    pattern: Pattern,
    config: PatternConfig
  ): vscode.Range[] {
    const ranges: vscode.Range[] = [];
    const text = document.getText();
    const searchText = config.caseSensitive ? pattern.text : pattern.text.toLowerCase();
    const documentText = config.caseSensitive ? text : text.toLowerCase();

    let index = 0;
    while (true) {
      let foundIndex = documentText.indexOf(searchText, index);
      if (foundIndex === -1) {
        break;
      }

      // Check whole word matching if enabled
      if (config.wholeWord) {
        const beforeChar = foundIndex > 0 ? documentText[foundIndex - 1] : ' ';
        const afterChar = foundIndex + searchText.length < documentText.length 
          ? documentText[foundIndex + searchText.length] 
          : ' ';

        if (this.isWordCharacter(beforeChar) || this.isWordCharacter(afterChar)) {
          index = foundIndex + 1;
          continue;
        }
      }

      const startPos = document.positionAt(foundIndex);
      const endPos = document.positionAt(foundIndex + searchText.length);
      const range = new vscode.Range(startPos, endPos);

      ranges.push(range);
      index = foundIndex + 1;
    }

    return ranges;
  }

  /**
   * Check if a character is a word character
   */
  private isWordCharacter(char: string): boolean {
    return /\w/.test(char);
  }

  /**
   * Debounce editor updates to improve performance
   */
  private debounceUpdateEditor(editor: vscode.TextEditor): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.updateEditor(editor);
    }, 300);
  }

  /**
   * Clear decorations for a specific editor
   */
  private clearEditorDecorations(editor: vscode.TextEditor): void {
    this.decorationTypes.forEach(decorationType => {
      if (decorationType) {
        editor.setDecorations(decorationType, []);
      }
    });
  }

  /**
   * Clear all decorations from all editors
   */
  private clearAllDecorations(): void {
    vscode.window.visibleTextEditors.forEach(editor => {
      this.clearEditorDecorations(editor);
    });
  }

  /**
   * Dispose all decoration types
   */
  private disposeDecorationTypes(): void {
    this.decorationTypes.forEach(decorationType => {
      if (decorationType) {
        decorationType.dispose();
      }
    });
    this.decorationTypes = [];
  }

  /**
   * Refresh all decorations (useful after theme changes)
   */
  public refresh(): void {
    this.initializeDecorationTypes();
    this.updateAllEditors();
  }

  /**
   * Get decoration statistics
   */
  public getStats(): { totalPatterns: number; enabledPatterns: number; activeDecorations: number } {
    const patterns = this.patternManager.getPatterns();
    const enabledPatterns = this.patternManager.getEnabledPatterns();
    
    let activeDecorations = 0;
    vscode.window.visibleTextEditors.forEach(editor => {
      enabledPatterns.forEach(pattern => {
        const config = this.patternManager.getConfig();
        const ranges = this.findPatternRanges(editor.document, pattern, config);
        activeDecorations += ranges.length;
      });
    });

    return {
      totalPatterns: patterns.length,
      enabledPatterns: enabledPatterns.length,
      activeDecorations
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.clearAllDecorations();
    this.disposeDecorationTypes();
  }
}