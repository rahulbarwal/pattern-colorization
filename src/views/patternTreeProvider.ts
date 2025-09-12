import * as vscode from "vscode";
import { Pattern, PatternTreeItem } from "../models/pattern";
import { PatternManager } from "../services/patternManager";
import { COLOR_PALETTE } from "../constants/colors";

/**
 * Tree data provider for the Pattern Colorization view in Explorer
 */
export class PatternTreeProvider
  implements vscode.TreeDataProvider<PatternTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    PatternTreeItem | undefined | null | void
  > = new vscode.EventEmitter<PatternTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    PatternTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor(private patternManager: PatternManager) {
    // Listen for pattern changes and refresh the tree
    this.patternManager.onDidChangePatterns(() => {
      this.refresh();
    });
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation
   */
  public getTreeItem(element: PatternTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.None
    );

    // Set description with improved formatting - no description for clean look
    item.description =
      element.contextValue === "emptyItem" ? element.description : undefined;
    item.tooltip = this.createTooltip(element);

    // Set context value for context menu
    item.contextValue = element.contextValue;

    // No icons for clean appearance - let inline actions handle visibility
    item.iconPath = this.getIconPath(element);

    // Add click behavior for pattern items
    if (element.contextValue === "emptyItem") {
      // Empty item shows help text but is not clickable
      item.command = undefined;
    } else if (element.contextValue === "patternItem") {
      // Pattern items are clickable to toggle visibility
      // Click on the item toggles pattern visibility
      item.command = {
        command: "patternColorization.togglePattern",
        title: "Toggle Pattern",
        arguments: [element.id],
      };
    }

    // Add visual styling for disabled patterns
    if (element.contextValue === "patternItem" && !element.enabled) {
      // Use a resource URI to apply subtle styling to disabled patterns
      item.resourceUri = vscode.Uri.parse(`disabled-pattern:${element.id}`);
    }

    // Add accessibility properties
    item.accessibilityInformation = {
      label: this.getAccessibilityLabel(element),
      role: element.contextValue === "emptyItem" ? "text" : "button",
    };

    return item;
  }

  /**
   * Get children of an element (patterns in this case)
   */
  public getChildren(
    element?: PatternTreeItem
  ): vscode.ProviderResult<PatternTreeItem[]> {
    if (!element) {
      // Return root level items (all patterns)
      return this.getPatternItems();
    }

    // No children for pattern items
    return [];
  }

  /**
   * Get pattern items for the tree
   */
  private getPatternItems(): PatternTreeItem[] {
    const patterns = this.patternManager.getPatterns();
    const config = this.patternManager.getConfig();

    // Debug: Log patterns being processed
    console.log(
      "TreeProvider: Processing patterns:",
      patterns.length,
      patterns
    );

    if (patterns.length === 0) {
      console.log("TreeProvider: No patterns found, showing empty state");
      return [
        {
          id: "empty",
          label: "No patterns defined",
          description: "Use the + button above to add your first pattern",
          colorIndex: 0,
          enabled: false,
          contextValue: "emptyItem",
        },
      ];
    }

    // Keep patterns in their original creation order - no dynamic sorting
    const patternItems = patterns
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((pattern) => this.createTreeItem(pattern, config.enabled));

    console.log(
      "TreeProvider: Created pattern items:",
      patternItems.length,
      patternItems
    );
    return patternItems;
  }

  /**
   * Create a tree item from a pattern
   */
  private createTreeItem(
    pattern: Pattern,
    _globalEnabled: boolean
  ): PatternTreeItem {
    // Clean pattern text without any symbols or indicators
    let patternText = pattern.text;
    if (patternText.length > 40) {
      patternText = pattern.text.substring(0, 37) + "...";
    }

    // Simple label with just the pattern text - no symbols
    const label = patternText;

    const item: PatternTreeItem = {
      id: pattern.id,
      label: label,
      description: "", // Empty description for clean look
      colorIndex: pattern.colorIndex,
      enabled: pattern.enabled,
      contextValue: "patternItem",
    };

    return item;
  }

  /**
   * Get accessibility label for screen readers
   */
  private getAccessibilityLabel(element: PatternTreeItem): string {
    if (element.contextValue === "emptyItem") {
      return "No patterns defined. Use the add button to create your first pattern.";
    }

    const pattern = this.patternManager
      .getPatterns()
      .find((p) => p.id === element.id);
    if (!pattern) {
      return "Pattern not found";
    }

    const config = this.patternManager.getConfig();
    const color = COLOR_PALETTE[pattern.colorIndex];
    const isActive = config.enabled && pattern.enabled;

    let label = `Pattern: ${pattern.text}. Uses ${color.name} highlighting color.`;
    if (pattern.description) {
      label += ` Description: ${pattern.description}.`;
    }
    label += ` Status: ${
      isActive ? "enabled and actively highlighting" : "disabled"
    }.`;
    label +=
      " Click to toggle, use eye button to enable/disable, right-click for more options.";

    return label;
  }

  /**
   * Create tooltip for a pattern item
   */
  private createTooltip(item: PatternTreeItem): vscode.MarkdownString {
    if (item.contextValue === "emptyItem") {
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown("$(info) No patterns are currently defined\n\n");
      tooltip.appendMarkdown("**Quick Start:**\n");
      tooltip.appendMarkdown(
        "- Click the $(add) button to add your first pattern\n"
      );
      tooltip.appendMarkdown('- Select text and use "Add from Selection"\n');
      tooltip.appendMarkdown("- Import patterns from a JSON file\n\n");
      tooltip.appendMarkdown(
        "*Patterns help you highlight important text across all your files*"
      );
      return tooltip;
    }

    const pattern = this.patternManager
      .getPatterns()
      .find((p) => p.id === item.id);
    if (!pattern) {
      return new vscode.MarkdownString("$(error) Pattern not found");
    }

    const color = COLOR_PALETTE[pattern.colorIndex];
    const config = this.patternManager.getConfig();
    const isActive = config.enabled && pattern.enabled;

    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;

    // Pattern info without color indicators
    tooltip.appendMarkdown(`**${pattern.text}**\n\n`);

    // Color information with visual context
    tooltip.appendMarkdown(`**Color:** ${color.name}\n`);
    tooltip.appendMarkdown(
      `*This pattern uses ${color.name.toLowerCase()} background highlighting in your files*\n\n`
    );

    // Status with clear indicators
    if (isActive) {
      tooltip.appendMarkdown(
        "**Status:** $(check) Active - Currently highlighting matches\n"
      );
    } else if (!config.enabled) {
      tooltip.appendMarkdown(
        "**Status:** $(circle-slash) Highlighting disabled globally\n"
      );
    } else {
      tooltip.appendMarkdown(
        "**Status:** $(eye-closed) Pattern disabled - Click eye button to enable\n"
      );
    }

    // Description if available
    if (pattern.description) {
      tooltip.appendMarkdown(`**Description:** ${pattern.description}\n`);
    }

    tooltip.appendMarkdown("\n**Settings:**\n");
    tooltip.appendMarkdown(
      `- $(case-sensitive) Case Sensitive: ${
        config.caseSensitive ? "Yes" : "No"
      }\n`
    );
    tooltip.appendMarkdown(
      `- $(whole-word) Whole Word: ${config.wholeWord ? "Yes" : "No"}\n`
    );

    tooltip.appendMarkdown(
      `\n**Created:** ${new Date(pattern.createdAt).toLocaleString()}\n\n`
    );

    // Action hints with new simplified interaction model
    tooltip.appendMarkdown("---\n");
    tooltip.appendMarkdown("**Actions:**\n");
    tooltip.appendMarkdown("• $(eye) **Eye Button** - Toggle pattern on/off\n");
    tooltip.appendMarkdown(
      "• $(mouse-pointer) **Click Pattern** - Toggle pattern visibility\n"
    );
    tooltip.appendMarkdown(
      "• $(menu) **Right-click** - Edit, delete, or change color\n"
    );

    return tooltip;
  }

  /**
   * Get appropriate icon for the pattern item
   */
  private getIconPath(item: PatternTreeItem): vscode.ThemeIcon | undefined {
    if (item.contextValue === "emptyItem") {
      return new vscode.ThemeIcon(
        "lightbulb",
        new vscode.ThemeColor("textLink.foreground")
      );
    }

    // For pattern items, only show colored circle when pattern is enabled
    if (item.contextValue === "patternItem") {
      if (item.enabled) {
        const colorIndex = item.colorIndex;
        return new vscode.ThemeIcon(
          "circle-filled",
          new vscode.ThemeColor(
            `patternColorization.color${colorIndex}.foreground`
          )
        );
      }
      // No icon for disabled patterns - provides clear visual feedback
      return undefined;
    }

    return undefined;
  }

  /**
   * Get the pattern associated with a tree item
   */
  public getPatternFromItem(item: PatternTreeItem): Pattern | undefined {
    return this.patternManager.getPatterns().find((p) => p.id === item.id);
  }

  /**
   * Reveal and select a pattern in the tree
   */
  public async revealPattern(patternId: string): Promise<void> {
    const patterns = this.patternManager.getPatterns();
    const pattern = patterns.find((p) => p.id === patternId);

    if (pattern) {
      // Note: In a real implementation, you would use vscode.window.createTreeView
      // and call reveal() method on the tree view instance
      this.refresh();
    }
  }

  /**
   * Get summary information for the tree view
   */
  public getSummary(): string {
    const patterns = this.patternManager.getPatterns();
    const enabledCount = patterns.filter((p) => p.enabled).length;
    const config = this.patternManager.getConfig();

    if (patterns.length === 0) {
      return "Ready to highlight patterns";
    }

    let summary = "";

    if (!config.enabled) {
      summary = `${patterns.length} patterns • highlighting off`;
    } else if (enabledCount === 0) {
      summary = `${patterns.length} patterns • none active`;
    } else if (enabledCount === patterns.length) {
      summary = `${patterns.length} patterns active`;
    } else {
      summary = `${enabledCount}/${patterns.length} patterns active`;
    }

    return summary;
  }

  /**
   * Start pattern addition by directly showing input box
   */
  public async startInlineAdd(): Promise<void> {
    await this.showInlineInputBox();
  }

  /**
   * Start editing for a specific pattern using direct input
   */
  public async startInlineEdit(patternId: string): Promise<void> {
    // Show input box immediately for existing patterns
    await this.showInlineInputBox(patternId);
  }

  // Color selection is now handled directly through the color picker command

  // Removed completeInlineAdd method - direct input is used instead

  /**
   * Show input box for pattern editing
   */
  private async showInlineInputBox(patternId?: string): Promise<void> {
    const existingPattern = patternId
      ? this.patternManager.getPatterns().find((p) => p.id === patternId)
      : null;
    const isEditing = !!existingPattern;

    const patternText = await vscode.window.showInputBox({
      title: isEditing ? "Edit Pattern" : "Add New Pattern",
      prompt: isEditing
        ? "Edit the pattern text"
        : "Enter the text pattern you want to highlight",
      value: existingPattern?.text || "",
      placeHolder: "e.g., TODO, FIXME, BUG, or any word/phrase",
      ignoreFocusOut: false,
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return "Pattern text cannot be empty";
        }

        if (value.trim().length < 2) {
          return "Pattern must be at least 2 characters long";
        }

        const patterns = this.patternManager.getPatterns();
        const existing = patterns.find(
          (p) =>
            p.id !== patternId && p.text.toLowerCase() === value.toLowerCase()
        );
        if (existing) {
          return `Pattern "${value}" already exists`;
        }

        if (value.length > 100) {
          return "Pattern text too long (max 100 characters)";
        }

        return null;
      },
    });

    if (patternText) {
      if (isEditing && existingPattern) {
        // Update existing pattern
        await this.patternManager.updatePattern(existingPattern.id, {
          text: patternText.trim(),
        });
        vscode.window.showInformationMessage(
          `Pattern updated to "${patternText.trim()}"`
        );
      } else {
        // Create new pattern
        await this.patternManager.addPattern(patternText.trim());
        vscode.window.showInformationMessage(
          `Pattern "${patternText.trim()}" added successfully`
        );
      }
    }
  }

  // Removed unused inline mode checking methods

  /**
   * Show color selection dialog
   */
  public async showColorSelection(patternId: string): Promise<void> {
    const pattern = this.patternManager
      .getPatterns()
      .find((p) => p.id === patternId);
    if (!pattern) {
      return;
    }

    // Create color options without color indicators
    const colorOptions = COLOR_PALETTE.map((color, index) => ({
      label: color.name,
      description: index === pattern.colorIndex ? "(current)" : "",
      colorIndex: index,
    }));

    const selected = await vscode.window.showQuickPick(colorOptions, {
      placeHolder: `Select a color for pattern "${pattern.text}"`,
      ignoreFocusOut: true,
    });

    if (selected && selected.colorIndex !== pattern.colorIndex) {
      await this.patternManager.updatePattern(patternId, {
        colorIndex: selected.colorIndex,
      });
    }

    // Color selection completed
    this.refresh();
  }

  // Inline modes removed - no longer needed

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
