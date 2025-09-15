import * as vscode from "vscode";
import { PatternManager } from "../services/patternManager";
import { DecorationManager } from "../services/decorationManager";
import { PatternTreeProvider } from "../views/patternTreeProvider";
import { MAX_PATTERNS } from "../constants/colors";
import { Pattern, PatternConfig } from "../models/pattern";

/**
 * Registers and handles all pattern-related commands
 */
export class PatternCommands {
  constructor(
    private patternManager: PatternManager,
    private decorationManager: DecorationManager,
    private treeProvider: PatternTreeProvider,
    private context: vscode.ExtensionContext
  ) {
    this.registerCommands();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Commands are automatically disposed when context.subscriptions is disposed
    // This method is here for consistency and future cleanup needs
  }

  /**
   * Register all pattern commands
   */
  private registerCommands(): void {
    // Check if commands are already registered to prevent duplicate registration
    const commandIds = [
      "patternColorization.addPattern",
      "patternColorization.deletePattern",
      "patternColorization.clearPatterns",
      "patternColorization.refreshPatterns",
      "patternColorization.toggleHighlighting",
      "patternColorization.togglePattern",
      "patternColorization.editPattern",
      "patternColorization.addFromSelection",
      "patternColorization.importPatterns",
      "patternColorization.exportPatterns",
      "patternColorization.showStats",
      "patternColorization.jumpToNext",
      "patternColorization.jumpToPrevious",
      "patternColorization.jumpToNextSelectedPattern",
      "patternColorization.jumpToPreviousSelectedPattern",
      "patternColorization.changePatternColor",
    ];

    // Only register commands that aren't already registered
    const commands = commandIds
      .map((commandId) => {
        try {
          return vscode.commands.registerCommand(commandId, (...args) => {
            // Route to appropriate handler based on command ID
            switch (commandId) {
              case "patternColorization.addPattern":
                return this.addPattern();
              case "patternColorization.deletePattern":
                return this.deletePattern(args[0]);
              case "patternColorization.clearPatterns":
                return this.clearPatterns();
              case "patternColorization.refreshPatterns":
                return this.refreshPatterns();
              case "patternColorization.toggleHighlighting":
                return this.toggleHighlighting();
              case "patternColorization.togglePattern":
                return this.togglePattern(
                  typeof args[0] === "string" ? args[0] : args[0]?.id
                );
              case "patternColorization.editPattern":
                return this.editPattern(args[0]);
              case "patternColorization.addFromSelection":
                return this.addPatternFromSelection();
              case "patternColorization.importPatterns":
                return this.importPatterns();
              case "patternColorization.exportPatterns":
                return this.exportPatterns();
              case "patternColorization.showStats":
                return this.showStats();
              case "patternColorization.jumpToNext":
                return this.jumpToNextHighlight();
              case "patternColorization.jumpToPrevious":
                return this.jumpToPreviousHighlight();
              case "patternColorization.jumpToNextSelectedPattern":
                return this.jumpToNextSelectedPatternOccurrence();
              case "patternColorization.jumpToPreviousSelectedPattern":
                return this.jumpToPreviousSelectedPatternOccurrence();
              case "patternColorization.changePatternColor":
                return this.changePatternColor(args[0]);
              default:
                console.warn(`Unknown command: ${commandId}`);
            }
          });
        } catch (error) {
          console.warn(`Failed to register command ${commandId}:`, error);
          return null;
        }
      })
      .filter((command) => command !== null);

    commands.forEach((command) => {
      if (command) {
        this.context.subscriptions.push(command);
      }
    });
  }

  /**
   * Add a new pattern with inline editing support
   */
  private async addPattern(): Promise<void> {
    try {
      const patterns = this.patternManager.getPatterns();
      if (patterns.length >= MAX_PATTERNS) {
        return;
      }

      // Start true inline editing in the tree view
      this.treeProvider.startInlineAdd();
    } catch (error) {
      console.error("Failed to start inline pattern addition:", error);
    }
  }

  /**
   * Create pattern from inline input
   */
  public async createPatternFromInline(
    text: string,
    description?: string
  ): Promise<void> {
    try {
      const patterns = this.patternManager.getPatterns();
      if (patterns.length >= MAX_PATTERNS) {
        return;
      }

      if (!text || !text.trim()) {
        return;
      }

      const trimmedText = text.trim();
      if (trimmedText.length < 2) {
        return;
      }

      // Check for duplicates
      const existing = patterns.find(
        (p) => p.text.toLowerCase() === trimmedText.toLowerCase()
      );
      if (existing) {
        return;
      }

      if (trimmedText.length > 100) {
        return;
      }

      // Create the pattern silently
      await this.patternManager.addPattern(trimmedText, description);
    } catch (error) {
      console.error("Failed to create pattern from inline:", error);
    }
  }

  /**
   * Add pattern from current selection
   */
  private async addPatternFromSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window
        .showWarningMessage(
          "📝 No active editor found. Please open a file and select text to highlight.",
          "Open File"
        )
        .then((selection) => {
          if (selection === "Open File") {
            vscode.commands.executeCommand("workbench.action.files.openFile");
          }
        });
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      // Offer to select current word if no selection
      const wordRange = editor.document.getWordRangeAtPosition(selection.start);
      if (wordRange) {
        const word = editor.document.getText(wordRange);
        const result = await vscode.window.showInformationMessage(
          `No text selected. Use current word "${word}" as pattern?`,
          "Yes",
          "No",
          "Select Text"
        );

        if (result === "Yes") {
          editor.selection = new vscode.Selection(
            wordRange.start,
            wordRange.end
          );
          return this.addPatternFromSelection();
        } else if (result === "Select Text") {
          vscode.window.showInformationMessage(
            "Select text in the editor, then use this command again."
          );
        }
      } else {
        vscode.window
          .showInformationMessage(
            "🔍 Please select text in the editor to create a pattern.",
            "Learn More"
          )
          .then((selection) => {
            if (selection === "Learn More") {
              vscode.commands.executeCommand("patternColorization.showStats");
            }
          });
      }
      return;
    }

    const selectedText = editor.document.getText(selection).trim();
    if (!selectedText) {
      vscode.window.showWarningMessage(
        "⚠️ Selected text is empty or contains only whitespace"
      );
      return;
    }

    if (selectedText.length > 100) {
      vscode.window
        .showWarningMessage(
          `⚠️ Selected text is too long (${selectedText.length} characters). Maximum allowed is 100 characters.`,
          "Shorten Selection",
          "Cancel"
        )
        .then((selection) => {
          if (selection === "Shorten Selection") {
            vscode.window.showInformationMessage(
              "Please select a shorter text snippet and try again."
            );
          }
        });
      return;
    }

    // Check if pattern already exists
    const patterns = this.patternManager.getPatterns();
    const existing = patterns.find(
      (p) => p.text.toLowerCase() === selectedText.toLowerCase()
    );

    if (existing) {
      const colorName = this.patternManager.getColorForPattern(existing).name;
      vscode.window
        .showWarningMessage(
          `📋 Pattern "${selectedText}" already exists with ${colorName} highlighting.`,
          "View Pattern",
          "Toggle Pattern"
        )
        .then((selection) => {
          if (selection === "View Pattern") {
            vscode.commands.executeCommand("patternColorizationView.focus");
          } else if (selection === "Toggle Pattern") {
            this.patternManager.togglePattern(existing.id);
          }
        });
      return;
    }

    if (patterns.length >= MAX_PATTERNS) {
      vscode.window
        .showWarningMessage(
          `⚠️ Maximum of ${MAX_PATTERNS} patterns allowed. Please remove some patterns first.`,
          "Manage Patterns",
          "Show All"
        )
        .then((selection) => {
          if (selection === "Manage Patterns") {
            vscode.commands.executeCommand("patternColorizationView.focus");
          } else if (selection === "Show All") {
            vscode.commands.executeCommand("patternColorization.showStats");
          }
        });
      return;
    }

    try {
      // Show confirmation with preview
      const shouldAdd = await vscode.window.showInformationMessage(
        `Create pattern for "${selectedText}"?`,
        { modal: false },
        "Create Pattern",
        "Create with Description",
        "Cancel"
      );

      if (!shouldAdd || shouldAdd === "Cancel") {
        return;
      }

      let description: string | undefined;
      if (shouldAdd === "Create with Description") {
        description = await vscode.window.showInputBox({
          title: "Pattern Description",
          prompt: `Add a description for "${selectedText}"`,
          placeHolder: "e.g., Error markers, Important notes, Debug points",
          ignoreFocusOut: true,
        });

        if (description === undefined) {
          return; // User cancelled
        }
      }

      // Create pattern with progress indicator
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Creating pattern from selection...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 30,
            message: "Adding to pattern collection",
          });
          const pattern = await this.patternManager.addPattern(
            selectedText,
            description
          );

          if (pattern) {
            progress.report({ increment: 70, message: "Complete!" });
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          return pattern;
        }
      );
    } catch (error) {
      vscode.window
        .showErrorMessage(
          `❌ Failed to create pattern from selection: ${error}`,
          "Retry",
          "Manual Add"
        )
        .then((selection) => {
          if (selection === "Retry") {
            this.addPatternFromSelection();
          } else if (selection === "Manual Add") {
            this.addPattern();
          }
        });
    }
  }

  /**
   * Delete a pattern
   */
  private async deletePattern(item?: any): Promise<void> {
    try {
      let patternId: string;

      if (item && item.id) {
        patternId = item.id;
      } else {
        // Show quick pick to select pattern
        const patterns = this.patternManager.getPatterns();
        if (patterns.length === 0) {
          vscode.window.showInformationMessage("No patterns to delete");
          return;
        }

        const items = patterns.map((pattern) => ({
          label: pattern.text,
          description: pattern.description,
          id: pattern.id,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select pattern to delete",
        });

        if (!selected) {
          return;
        }

        patternId = selected.id;
      }

      const pattern = this.patternManager
        .getPatterns()
        .find((p) => p.id === patternId);
      if (!pattern) {
        vscode.window.showErrorMessage("Pattern not found");
        return;
      }

      const confirmed = await vscode.window.showWarningMessage(
        `Delete pattern "${pattern.text}"?`,
        { modal: true },
        "Delete"
      );

      if (confirmed === "Delete") {
        await this.patternManager.removePattern(patternId);
        // Pattern deleted silently
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete pattern: ${error}`);
    }
  }

  /**
   * Clear all patterns
   */
  private async clearPatterns(): Promise<void> {
    try {
      const patterns = this.patternManager.getPatterns();

      if (patterns.length === 0) {
        vscode.window
          .showInformationMessage("📋 No patterns to clear", "Add Pattern")
          .then((selection) => {
            if (selection === "Add Pattern") {
              this.addPattern();
            }
          });
        return;
      }

      // Enhanced confirmation dialog
      const choice = await vscode.window.showWarningMessage(
        `⚠️ Clear all ${patterns.length} pattern${
          patterns.length !== 1 ? "s" : ""
        }?`,
        {
          modal: true,
          detail:
            "This action cannot be undone. All highlighting will be removed from your files.",
        },
        "Clear All",
        "Export First",
        "Cancel"
      );

      if (choice === "Export First") {
        await this.exportPatterns();
        // Ask again after export
        const secondChoice = await vscode.window.showWarningMessage(
          "Patterns exported. Clear all patterns now?",
          { modal: true },
          "Clear All",
          "Cancel"
        );
        if (secondChoice !== "Clear All") {
          return;
        }
      } else if (choice !== "Clear All") {
        return; // User cancelled
      }

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Clearing patterns...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 50, message: "Removing patterns" });
          await this.patternManager.clearPatterns();

          progress.report({ increment: 50, message: "Updating display" });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      );

      // Patterns cleared silently
    } catch (error) {
      vscode.window
        .showErrorMessage(`❌ Failed to clear patterns: ${error}`, "Retry")
        .then((selection) => {
          if (selection === "Retry") {
            this.clearPatterns();
          }
        });
    }
  }

  /**
   * Refresh patterns and decorations
   */
  private async refreshPatterns(): Promise<void> {
    try {
      // Show progress for visual feedback
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing patterns...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 25, message: "Updating decorations" });
          this.decorationManager.updateAllEditors();

          progress.report({ increment: 50, message: "Refreshing tree view" });
          this.treeProvider.refresh();

          progress.report({ increment: 25, message: "Complete!" });
          // Small delay for visual feedback
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      );

      // Patterns refreshed silently
    } catch (error) {
      vscode.window
        .showErrorMessage(
          `❌ Failed to refresh patterns: ${error}`,
          "Retry",
          "Reset Extension"
        )
        .then((selection) => {
          if (selection === "Retry") {
            this.refreshPatterns();
          } else if (selection === "Reset Extension") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
    }
  }

  /**
   * Toggle highlighting on/off
   */
  private async toggleHighlighting(): Promise<void> {
    try {
      const config = this.patternManager.getConfig();
      const newState = !config.enabled;

      // Show immediate feedback with appropriate icon
      const icon = newState ? "$(eye)" : "$(eye-closed)";
      const action = newState ? "Enabling" : "Disabling";
      const statusBarMessage = vscode.window.setStatusBarMessage(
        `${icon} ${action} pattern highlighting...`
      );

      this.decorationManager.toggleHighlighting();
      this.treeProvider.refresh();

      // Clear status bar message
      statusBarMessage.dispose();

      // Show final state with appropriate feedback
      const finalIcon = newState ? "$(eye)" : "$(eye-closed)";
      const finalState = newState ? "enabled" : "disabled";
      vscode.window.setStatusBarMessage(
        `${finalIcon} Pattern highlighting ${finalState}`,
        2000
      );
    } catch (error) {
      vscode.window
        .showErrorMessage(
          `❌ Failed to toggle highlighting: ${error}`,
          "Retry",
          "Report Issue"
        )
        .then((selection) => {
          if (selection === "Retry") {
            this.toggleHighlighting();
          } else if (selection === "Report Issue") {
            vscode.env.openExternal(
              vscode.Uri.parse("https://github.com/your-repo/issues")
            );
          }
        });
    }
  }

  /**
   * Toggle a specific pattern on/off
   */
  private async togglePattern(patternId: string | undefined): Promise<void> {
    try {
      if (!patternId) {
        vscode.window.showErrorMessage("Pattern ID not provided");
        return;
      }

      const success = await this.patternManager.togglePattern(patternId);
      if (!success) {
        vscode.window.showErrorMessage("Pattern not found");
        console.error(
          "Failed to toggle pattern - pattern not found:",
          patternId
        );
      } else {
        // Provide feedback on toggle
        const pattern = this.patternManager
          .getPatterns()
          .find((p) => p.id === patternId);
        if (pattern) {
          vscode.window.setStatusBarMessage(
            `$(${pattern.enabled ? "eye" : "eye-closed"}) Pattern "${
              pattern.text
            }" ${pattern.enabled ? "enabled" : "disabled"}`,
            2000
          );
        }
      }
    } catch (error) {
      console.error("Error in togglePattern:", error);
      vscode.window.showErrorMessage(`Failed to toggle pattern: ${error}`);
    }
  }

  /**
   * Edit a pattern using direct input dialog
   */
  private async editPattern(item?: any): Promise<void> {
    try {
      let patternId: string;

      if (item && item.id) {
        patternId = item.id;
      } else {
        // Show quick pick to select pattern
        const patterns = this.patternManager.getPatterns();
        if (patterns.length === 0) {
          vscode.window.showInformationMessage("No patterns to edit");
          return;
        }

        const items = patterns.map((pattern) => ({
          label: pattern.text,
          description: pattern.description,
          id: pattern.id,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select pattern to edit",
        });

        if (!selected) {
          return;
        }

        patternId = selected.id;
      }

      const pattern = this.patternManager
        .getPatterns()
        .find((p) => p.id === patternId);
      if (!pattern) {
        vscode.window.showErrorMessage("Pattern not found");
        return;
      }

      // Use direct input for editing - no confusing "inline" behavior
      await this.treeProvider.startInlineEdit(patternId);
    } catch (error) {
      console.error("Failed to edit pattern:", error);
      vscode.window.showErrorMessage("Failed to edit pattern");
    }
  }

  /**
   * Import patterns from JSON file
   */
  private async importPatterns(): Promise<void> {
    try {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          "JSON files": ["json"],
          "All files": ["*"],
        },
        openLabel: "Import Patterns",
      });

      if (!fileUri || fileUri.length === 0) {
        return;
      }

      const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
      const jsonString = Buffer.from(fileContent).toString("utf8");
      const patternsData = JSON.parse(jsonString);

      if (!Array.isArray(patternsData)) {
        vscode.window.showErrorMessage(
          "Invalid file format: Expected array of patterns"
        );
        return;
      }

      await this.patternManager.importPatterns(patternsData);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import patterns: ${error}`);
    }
  }

  /**
   * Export patterns to JSON file
   */
  private async exportPatterns(): Promise<void> {
    try {
      const patterns = this.patternManager.getPatterns();
      if (patterns.length === 0) {
        vscode.window.showInformationMessage("No patterns to export");
        return;
      }

      const fileUri = await vscode.window.showSaveDialog({
        filters: {
          "JSON files": ["json"],
        },
        defaultUri: vscode.Uri.file("patterns.json"),
        saveLabel: "Export Patterns",
      });

      if (!fileUri) {
        return;
      }

      const patternsData = this.patternManager.exportPatterns();
      const jsonString = JSON.stringify(patternsData, null, 2);
      const buffer = Buffer.from(jsonString, "utf8");

      await vscode.workspace.fs.writeFile(fileUri, buffer);
      // Patterns exported silently
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export patterns: ${error}`);
    }
  }

  /**
   * Show statistics about patterns and highlighting
   */
  private showStats(): void {
    try {
      const patterns = this.patternManager.getPatterns();
      const config = this.patternManager.getConfig();
      const stats = this.decorationManager.getStats();

      const panel = vscode.window.createWebviewPanel(
        "patternStats",
        "Pattern Colorization Statistics",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [],
        }
      );

      // Update webview content with better theming and interactivity
      panel.webview.html = this.getStatsWebviewContent(patterns, config, stats);

      // Handle messages from webview (for future interactivity)
      panel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case "refresh":
              const newStats = this.decorationManager.getStats();
              panel.webview.postMessage({
                command: "updateStats",
                data: {
                  patterns: this.patternManager.getPatterns(),
                  config: this.patternManager.getConfig(),
                  stats: newStats,
                },
              });
              break;
            case "togglePattern":
              this.patternManager.togglePattern(message.patternId);
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );

      // Auto-refresh when patterns change
      const disposable = this.patternManager.onDidChangePatterns(() => {
        if (panel.visible) {
          const newStats = this.decorationManager.getStats();
          panel.webview.postMessage({
            command: "updateStats",
            data: {
              patterns: this.patternManager.getPatterns(),
              config: this.patternManager.getConfig(),
              stats: newStats,
            },
          });
        }
      });

      panel.onDidDispose(() => {
        disposable.dispose();
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to show statistics: ${error}`);
    }
  }

  /**
   * Generate webview content for statistics
   */
  private getStatsWebviewContent(
    patterns: any[],
    config: any,
    stats: any
  ): string {
    const patternsJson = JSON.stringify(patterns);
    const configJson = JSON.stringify(config);
    const statsJson = JSON.stringify(stats);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
        <title>Pattern Statistics</title>
        <style>
            :root {
                --vscode-font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
                --vscode-font-size: var(--vscode-font-size, 13px);
            }
            
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
                line-height: 1.6;
            }
            
            .header {
                display: flex;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                color: var(--vscode-textLink-foreground);
            }
            
            .refresh-btn {
                margin-left: auto;
                padding: 6px 12px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            }
            
            .refresh-btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .stat-card {
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 16px;
                transition: border-color 0.2s;
            }
            
            .stat-card:hover {
                border-color: var(--vscode-focusBorder);
            }
            
            .stat-card h3 {
                margin: 0 0 8px 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--vscode-textLink-foreground);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: var(--vscode-foreground);
                margin: 4px 0;
            }
            
            .stat-description {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-top: 4px;
            }
            
            .patterns-section {
                margin-top: 24px;
            }
            
            .patterns-section h2 {
                margin: 0 0 16px 0;
                font-size: 18px;
                font-weight: 600;
                color: var(--vscode-textLink-foreground);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .pattern-item {
                display: flex;
                align-items: center;
                padding: 12px;
                margin-bottom: 8px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                transition: all 0.2s;
            }
            
            .pattern-item:hover {
                border-color: var(--vscode-focusBorder);
                background: var(--vscode-list-hoverBackground);
            }
            
            .pattern-color {
                width: 16px;
                height: 16px;
                border-radius: 4px;
                margin-right: 12px;
                border: 1px solid var(--vscode-panel-border);
            }
            
            .pattern-text {
                flex: 1;
                font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
                font-size: 13px;
                font-weight: 500;
            }
            
            .pattern-status {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .status-active {
                background: var(--vscode-testing-iconPassed);
                color: var(--vscode-editor-background);
            }
            
            .status-inactive {
                background: var(--vscode-testing-iconFailed);
                color: var(--vscode-editor-background);
            }
            
            .empty-state {
                text-align: center;
                padding: 48px 24px;
                color: var(--vscode-descriptionForeground);
            }
            
            .empty-state h3 {
                margin-bottom: 8px;
                color: var(--vscode-foreground);
            }
            
            .settings-section {
                margin-top: 24px;
                padding: 16px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
            }
            
            .settings-section h3 {
                margin: 0 0 12px 0;
                font-size: 16px;
                color: var(--vscode-textLink-foreground);
            }
            
            .setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                font-size: 13px;
            }
            
            .setting-value {
                font-weight: 600;
                color: var(--vscode-textLink-foreground);
            }
            
            @media (max-width: 600px) {
                body {
                    padding: 12px;
                }
                
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .header h1 {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Pattern Statistics</h1>
            <button class="refresh-btn" onclick="refreshStats()">🔄 Refresh</button>
        </div>
        
        <div class="stats-grid" id="statsGrid"></div>
        
        <div class="patterns-section" id="patternsSection"></div>
        
        <div class="settings-section" id="settingsSection"></div>

        <script>
            let currentData = {
                patterns: ${patternsJson},
                config: ${configJson},
                stats: ${statsJson}
            };
            
            function refreshStats() {
                if (window.acquireVsCodeApi) {
                    const vscode = window.acquireVsCodeApi();
                    vscode.postMessage({ command: 'refresh' });
                }
            }
            
            function renderStats(data) {
                const { patterns, config, stats } = data;
                
                // Render stats cards
                const statsGrid = document.getElementById('statsGrid');
                statsGrid.innerHTML = \`
                    <div class="stat-card">
                        <h3>📝 Total Patterns</h3>
                        <div class="stat-value">\${stats.totalPatterns}</div>
                        <div class="stat-description">Patterns created</div>
                    </div>
                    <div class="stat-card">
                        <h3>✅ Active Patterns</h3>
                        <div class="stat-value">\${stats.enabledPatterns}</div>
                        <div class="stat-description">Currently highlighting</div>
                    </div>
                    <div class="stat-card">
                        <h3>🎨 Active Highlights</h3>
                        <div class="stat-value">\${stats.activeDecorations}</div>
                        <div class="stat-description">Text matches found</div>
                    </div>
                    <div class="stat-card">
                        <h3>⚡ Status</h3>
                        <div class="stat-value">\${config.enabled ? '🟢 ON' : '🔴 OFF'}</div>
                        <div class="stat-description">Global highlighting</div>
                    </div>
                \`;
                
                // Render patterns
                const patternsSection = document.getElementById('patternsSection');
                if (patterns.length === 0) {
                    patternsSection.innerHTML = \`
                        <h2>🎨 Patterns</h2>
                        <div class="empty-state">
                            <h3>No patterns defined</h3>
                            <p>Create your first pattern to start highlighting text</p>
                        </div>
                    \`;
                } else {
                    const patternsHtml = patterns.map(pattern => {
                        const colorIndex = pattern.colorIndex;
                        const colors = [
                            { bg: '#E3F2FD', border: '#BBDEFB' },
                            { bg: '#E8F5E8', border: '#C8E6C9' },
                            { bg: '#FFF9C4', border: '#F0F4C3' },
                            { bg: '#FFE0B2', border: '#FFCC02' },
                            { bg: '#F3E5F5', border: '#E1BEE7' },
                            { bg: '#FCE4EC', border: '#F8BBD9' },
                            { bg: '#E0F2F1', border: '#B2DFDB' },
                            { bg: '#F5F5F5', border: '#E0E0E0' }
                        ];
                        const color = colors[colorIndex] || colors[0];
                        const isActive = config.enabled && pattern.enabled;
                        
                        return \`
                            <div class="pattern-item">
                                <div class="pattern-color" style="background-color: \${color.bg}; border-color: \${color.border}"></div>
                                <div class="pattern-text">\${pattern.text}</div>
                                <div class="pattern-status \${isActive ? 'status-active' : 'status-inactive'}">
                                    \${isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                        \`;
                    }).join('');
                    
                    patternsSection.innerHTML = \`
                        <h2>🎨 Patterns (\${patterns.length})</h2>
                        \${patternsHtml}
                    \`;
                }
                
                // Render settings
                const settingsSection = document.getElementById('settingsSection');
                settingsSection.innerHTML = \`
                    <h3>⚙️ Configuration</h3>
                    <div class="setting-item">
                        <span>Global Highlighting</span>
                        <span class="setting-value">\${config.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div class="setting-item">
                        <span>Case Sensitive</span>
                        <span class="setting-value">\${config.caseSensitive ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div class="setting-item">
                        <span>Whole Word Match</span>
                        <span class="setting-value">\${config.wholeWord ? '✅ Yes' : '❌ No'}</span>
                    </div>
                \`;
            }
            
            // Handle messages from extension
            if (window.acquireVsCodeApi) {
                const vscode = window.acquireVsCodeApi();
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updateStats') {
                        currentData = message.data;
                        renderStats(currentData);
                    }
                });
            }
            
            // Initial render
            renderStats(currentData);
        </script>
    </body>
    </html>`;
  }

  /**
   * Jump to the next highlight in the active editor
   */
  private jumpToNextHighlight(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const highlights = this.getHighlightRanges(editor);
    if (highlights.length === 0) {
      return;
    }

    const currentPosition = editor.selection.active;
    let nextHighlight: vscode.Range | undefined;

    // Find the next highlight after the current cursor position
    for (const highlight of highlights) {
      if (highlight.start.isAfter(currentPosition)) {
        nextHighlight = highlight;
        break;
      }
    }

    // If no next highlight found, wrap to the first one
    if (!nextHighlight && highlights.length > 0) {
      nextHighlight = highlights[0];
    }

    if (nextHighlight) {
      this.revealRange(editor, nextHighlight);
    }
  }

  /**
   * Jump to the previous highlight in the active editor
   */
  private jumpToPreviousHighlight(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const highlights = this.getHighlightRanges(editor);
    if (highlights.length === 0) {
      return;
    }

    const currentPosition = editor.selection.active;
    let previousHighlight: vscode.Range | undefined;

    // Find the previous highlight before the current cursor position (search backwards)
    for (let i = highlights.length - 1; i >= 0; i--) {
      if (highlights[i].end.isBefore(currentPosition)) {
        previousHighlight = highlights[i];
        break;
      }
    }

    // If no previous highlight found, wrap to the last one
    if (!previousHighlight && highlights.length > 0) {
      previousHighlight = highlights[highlights.length - 1];
    }

    if (previousHighlight) {
      this.revealRange(editor, previousHighlight);
    }
  }

  /**
   * Get all highlight ranges in the active editor
   */
  private getHighlightRanges(editor: vscode.TextEditor): vscode.Range[] {
    const patterns = this.patternManager.getEnabledPatterns();
    const config = this.patternManager.getConfig();
    const ranges: vscode.Range[] = [];

    if (!config.enabled) {
      return ranges;
    }

    patterns.forEach((pattern) => {
      const patternRanges = this.findPatternRanges(
        editor.document,
        pattern,
        config
      );
      ranges.push(...patternRanges);
    });

    // Sort ranges by position in the document
    return ranges.sort((a, b) => {
      if (a.start.line !== b.start.line) {
        return a.start.line - b.start.line;
      }
      return a.start.character - b.start.character;
    });
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
    const searchText = config.caseSensitive
      ? pattern.text
      : pattern.text.toLowerCase();
    const documentText = config.caseSensitive ? text : text.toLowerCase();

    let index = 0;
    while (true) {
      let foundIndex = documentText.indexOf(searchText, index);
      if (foundIndex === -1) {
        break;
      }

      // Check whole word matching if enabled
      if (config.wholeWord) {
        const beforeChar = foundIndex > 0 ? documentText[foundIndex - 1] : " ";
        const afterChar =
          foundIndex + searchText.length < documentText.length
            ? documentText[foundIndex + searchText.length]
            : " ";

        if (
          this.isWordCharacter(beforeChar) ||
          this.isWordCharacter(afterChar)
        ) {
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
   * Reveal a range in the editor and select it
   */
  private revealRange(editor: vscode.TextEditor, range: vscode.Range): void {
    // Move cursor to the range and select it
    editor.selection = new vscode.Selection(range.start, range.end);

    // Reveal the range in the editor
    editor.revealRange(
      range,
      vscode.TextEditorRevealType.InCenterIfOutsideViewport
    );
  }

  /**
   * Get the pattern at the current cursor position
   */
  private getPatternAtCursor(editor: vscode.TextEditor): any | null {
    const position = editor.selection.active;
    const patterns = this.patternManager.getEnabledPatterns();
    const config = this.patternManager.getConfig();

    if (!config.enabled || patterns.length === 0) {
      return null;
    }

    // Check each pattern to see if cursor is within one of its ranges
    for (const pattern of patterns) {
      const ranges = this.findPatternRanges(editor.document, pattern, config);
      for (const range of ranges) {
        if (range.contains(position)) {
          return pattern;
        }
      }
    }

    return null;
  }

  /**
   * Jump to the next occurrence of the selected/focused pattern only
   */
  private jumpToNextSelectedPatternOccurrence(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("No active editor found");
      return;
    }

    // Detect which pattern is under the cursor
    const selectedPattern = this.getPatternAtCursor(editor);

    if (!selectedPattern) {
      // Fallback: use the first available pattern or show message
      const enabledPatterns = this.patternManager.getEnabledPatterns();
      if (enabledPatterns.length === 0) {
        vscode.window.showInformationMessage(
          "No patterns available for navigation"
        );
        return;
      }

      // Use the first pattern as fallback
      const fallbackPattern = enabledPatterns[0];
      vscode.window.showInformationMessage(
        `No pattern detected at cursor. Using pattern: "${fallbackPattern.text}"`
      );
      this.navigateToNextPatternOccurrence(editor, fallbackPattern);
      return;
    }

    this.navigateToNextPatternOccurrence(editor, selectedPattern);
  }

  /**
   * Jump to the previous occurrence of the selected/focused pattern only
   */
  private jumpToPreviousSelectedPatternOccurrence(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("No active editor found");
      return;
    }

    // Detect which pattern is under the cursor
    const selectedPattern = this.getPatternAtCursor(editor);

    if (!selectedPattern) {
      // Fallback: use the first available pattern or show message
      const enabledPatterns = this.patternManager.getEnabledPatterns();
      if (enabledPatterns.length === 0) {
        vscode.window.showInformationMessage(
          "No patterns available for navigation"
        );
        return;
      }

      // Use the first pattern as fallback
      const fallbackPattern = enabledPatterns[0];
      vscode.window.showInformationMessage(
        `No pattern detected at cursor. Using pattern: "${fallbackPattern.text}"`
      );
      this.navigateToPreviousPatternOccurrence(editor, fallbackPattern);
      return;
    }

    this.navigateToPreviousPatternOccurrence(editor, selectedPattern);
  }

  /**
   * Navigate to the next occurrence of a specific pattern
   */
  private navigateToNextPatternOccurrence(
    editor: vscode.TextEditor,
    pattern: any
  ): void {
    const config = this.patternManager.getConfig();
    const ranges = this.findPatternRanges(editor.document, pattern, config);

    if (ranges.length === 0) {
      vscode.window.showInformationMessage(
        `No occurrences found for pattern: "${pattern.text}"`
      );
      return;
    }

    const currentPosition = editor.selection.active;
    let nextRange: vscode.Range | undefined;

    // Find the next occurrence after the current cursor position
    for (const range of ranges) {
      if (range.start.isAfter(currentPosition)) {
        nextRange = range;
        break;
      }
    }

    // If no next occurrence found, wrap to the first one
    if (!nextRange && ranges.length > 0) {
      nextRange = ranges[0];
      vscode.window.showInformationMessage(
        `Wrapped to first occurrence of "${pattern.text}"`
      );
    }

    if (nextRange) {
      this.revealRange(editor, nextRange);

      // Show status message
      const currentIndex = ranges.findIndex((r) => r.isEqual(nextRange!)) + 1;
      vscode.window.setStatusBarMessage(
        `Pattern "${pattern.text}": ${currentIndex}/${ranges.length}`,
        3000
      );
    }
  }

  /**
   * Navigate to the previous occurrence of a specific pattern
   */
  private navigateToPreviousPatternOccurrence(
    editor: vscode.TextEditor,
    pattern: any
  ): void {
    const config = this.patternManager.getConfig();
    const ranges = this.findPatternRanges(editor.document, pattern, config);

    if (ranges.length === 0) {
      vscode.window.showInformationMessage(
        `No occurrences found for pattern: "${pattern.text}"`
      );
      return;
    }

    const currentPosition = editor.selection.active;
    let previousRange: vscode.Range | undefined;

    // Find the previous occurrence before the current cursor position (search backwards)
    for (let i = ranges.length - 1; i >= 0; i--) {
      if (ranges[i].end.isBefore(currentPosition)) {
        previousRange = ranges[i];
        break;
      }
    }

    // If no previous occurrence found, wrap to the last one
    if (!previousRange && ranges.length > 0) {
      previousRange = ranges[ranges.length - 1];
      vscode.window.showInformationMessage(
        `Wrapped to last occurrence of "${pattern.text}"`
      );
    }

    if (previousRange) {
      this.revealRange(editor, previousRange);

      // Show status message
      const currentIndex =
        ranges.findIndex((r) => r.isEqual(previousRange!)) + 1;
      vscode.window.setStatusBarMessage(
        `Pattern "${pattern.text}": ${currentIndex}/${ranges.length}`,
        3000
      );
    }
  }

  /**
   * Get current highlighting state (for dynamic UI updates)
   */
  public getHighlightingState(): { enabled: boolean; icon: string; tooltip: string } {
    const config = this.patternManager.getConfig();
    return {
      enabled: config.enabled,
      icon: config.enabled ? "$(eye)" : "$(eye-closed)",
      tooltip: config.enabled ? "Disable pattern highlighting" : "Enable pattern highlighting"
    };
  }

  // Removed confusing inline add and select color methods - functionality moved to direct input

  /**
   * Change pattern color from context menu
   */
  private async changePatternColor(item?: any): Promise<void> {
    try {
      let patternId: string;

      if (item && item.id) {
        patternId = item.id;
      } else {
        // Show quick pick to select pattern
        const patterns = this.patternManager.getPatterns();
        if (patterns.length === 0) {
          vscode.window.showInformationMessage(
            "No patterns to change color for"
          );
          return;
        }

        const items = patterns.map((pattern) => ({
          label: `${pattern.text}`,
          description: `Current color: ${
            this.patternManager.getColorForPattern(pattern).name
          }`,
          id: pattern.id,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select pattern to change color",
        });

        if (!selected) {
          return;
        }

        patternId = selected.id;
      }

      await this.treeProvider.showColorSelection(patternId);
    } catch (error) {
      console.error("Failed to change pattern color:", error);
      vscode.window.showErrorMessage("Failed to change pattern color");
    }
  }
}
