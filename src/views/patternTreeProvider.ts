import * as vscode from 'vscode';
import { Pattern, PatternTreeItem } from '../models/pattern';
import { PatternManager } from '../services/patternManager';
import { COLOR_PALETTE } from '../constants/colors';

/**
 * Tree data provider for the Pattern Colorization view in Explorer
 */
export class PatternTreeProvider implements vscode.TreeDataProvider<PatternTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<PatternTreeItem | undefined | null | void> = new vscode.EventEmitter<PatternTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PatternTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  private isInlineAdding: boolean = false;
  private inlineEditingPatternId: string | null = null;
  private colorSelectionPatternId: string | null = null;

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
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    
    // Set description with improved formatting
    item.description = this.formatDescription(element);
    item.tooltip = this.createTooltip(element);
    
    // Set context value for context menu
    item.contextValue = element.contextValue;
    
    // Set icon with better VS Code integration
    item.iconPath = this.getIconPath(element);
    
    // Add command for clicking on item
    if (element.contextValue === 'inlineAddItem') {
      // Inline add item - show input immediately
      item.command = {
        command: 'patternColorization.completeInlineAdd',
        title: 'Complete Inline Add',
        arguments: []
      };
    } else if (element.contextValue === 'colorPickerItem') {
      // Color picker item
      item.command = {
        command: 'patternColorization.selectPatternColor',
        title: 'Select Color',
        arguments: [element.id]
      };
    } else if (element.contextValue !== 'emptyItem') {
      item.command = {
        command: 'patternColorization.togglePattern',
        title: 'Toggle Pattern',
        arguments: [element.id]
      };
    }

    // Add accessibility properties
    item.accessibilityInformation = {
      label: this.getAccessibilityLabel(element),
      role: element.contextValue === 'emptyItem' ? 'text' : 'button'
    };

    return item;
  }

  /**
   * Get children of an element (patterns in this case)
   */
  public getChildren(element?: PatternTreeItem): vscode.ProviderResult<PatternTreeItem[]> {
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
    
    let items: PatternTreeItem[] = [];

    // Add inline adding item if in inline adding mode
    if (this.isInlineAdding) {
      items.push({
        id: 'inline-add',
        label: '$(edit) Type pattern text here...',
        description: 'Press Enter to save, Escape to cancel',
        colorIndex: 0,
        enabled: true,
        contextValue: 'inlineAddItem'
      });
    }

    // Add color picker item if in color selection mode
    if (this.colorSelectionPatternId) {
      const pattern = patterns.find(p => p.id === this.colorSelectionPatternId);
      if (pattern) {
        items.push({
          id: `color-picker-${pattern.id}`,
          label: `$(color-mode) Choose color for "${pattern.text}"`,
          description: 'Click to select a different color',
          colorIndex: pattern.colorIndex,
          enabled: true,
          contextValue: 'colorPickerItem'
        });
      }
    }
    
    if (patterns.length === 0 && !this.isInlineAdding) {
      return [{
        id: 'empty',
        label: 'No patterns defined',
        description: 'Use the + button above to add your first pattern',
        colorIndex: 0,
        enabled: false,
        contextValue: 'emptyItem'
      }];
    }

    // Sort patterns: enabled first, then by creation date
    const patternItems = patterns
      .sort((a, b) => {
        if (a.enabled !== b.enabled) {
          return a.enabled ? -1 : 1;
        }
        return a.createdAt - b.createdAt;
      })
      .map(pattern => this.createTreeItem(pattern, config.enabled));

    items.push(...patternItems);
    return items;
  }

  /**
   * Create a tree item from a pattern
   */
  private createTreeItem(pattern: Pattern, globalEnabled: boolean): PatternTreeItem {
    const color = COLOR_PALETTE[pattern.colorIndex];
    const isActive = globalEnabled && pattern.enabled;
    
    // Create a more readable label with color indicator
    const colorIcon = this.getColorIcon(pattern.colorIndex);
    let label = `${colorIcon} ${pattern.text}`;
    if (label.length > 30) {
      label = `${colorIcon} ${pattern.text.substring(0, 22)}...`;
    }
    
    const item: PatternTreeItem = {
      id: pattern.id,
      label: label,
      description: this.createPatternDescription(pattern, color, isActive),
      colorIndex: pattern.colorIndex,
      enabled: pattern.enabled,
      contextValue: 'patternItem'
    };
    
    return item;
  }

  /**
   * Create formatted description for a pattern
   */
  private createPatternDescription(pattern: Pattern, color: any, isActive: boolean): string {
    const parts: string[] = [];
    
    // Add color indicator
    parts.push(`${color.name}`);
    
    // Add user description if available
    if (pattern.description && pattern.description.length > 0) {
      let desc = pattern.description;
      if (desc.length > 30) {
        desc = desc.substring(0, 27) + '...';
      }
      parts.push(`• ${desc}`);
    }
    
    // Add click hint for color changing
    if (isActive && parts.length === 1) { // Only show if no other description
      parts.push('(right-click to change color)');
    }
    
    // Add status
    if (!isActive) {
      parts.push('(inactive)');
    }
    
    return parts.join(' ');
  }

  /**
   * Format description with better readability
   */
  private formatDescription(element: PatternTreeItem): string {
    if (element.contextValue === 'emptyItem') {
      return element.description;
    }
    
    return element.description;
  }

  /**
   * Get accessibility label for screen readers
   */
  private getAccessibilityLabel(element: PatternTreeItem): string {
    if (element.contextValue === 'emptyItem') {
      return 'No patterns defined. Use the add button to create your first pattern.';
    }
    
    const pattern = this.patternManager.getPatterns().find(p => p.id === element.id);
    if (!pattern) {
      return 'Pattern not found';
    }
    
    const config = this.patternManager.getConfig();
    const color = COLOR_PALETTE[pattern.colorIndex];
    const isActive = config.enabled && pattern.enabled;
    
    let label = `Pattern: ${pattern.text}. Color: ${color.name}.`;
    if (pattern.description) {
      label += ` Description: ${pattern.description}.`;
    }
    label += ` Status: ${isActive ? 'active' : 'inactive'}.`;
    label += ' Click to toggle, right-click for options.';
    
    return label;
  }

  /**
   * Create tooltip for a pattern item
   */
  private createTooltip(item: PatternTreeItem): vscode.MarkdownString {
    if (item.contextValue === 'emptyItem') {
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown('$(info) No patterns are currently defined\n\n');
      tooltip.appendMarkdown('**Quick Start:**\n');
      tooltip.appendMarkdown('- Click the $(add) button to add your first pattern\n');
      tooltip.appendMarkdown('- Select text and use "Add from Selection"\n');
      tooltip.appendMarkdown('- Import patterns from a JSON file\n\n');
      tooltip.appendMarkdown('*Patterns help you highlight important text across all your files*');
      return tooltip;
    }

    const pattern = this.patternManager.getPatterns().find(p => p.id === item.id);
    if (!pattern) {
      return new vscode.MarkdownString('$(error) Pattern not found');
    }

    const color = COLOR_PALETTE[pattern.colorIndex];
    const config = this.patternManager.getConfig();
    const isActive = config.enabled && pattern.enabled;
    
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    
    // Pattern info with icon
    tooltip.appendMarkdown(`$(${this.getTooltipIcon(item)}) **${pattern.text}**\n\n`);
    
    // Color information
    tooltip.appendMarkdown(`**Color:** ${color.name}\n`);
    
    // Status with clear indicators
    if (isActive) {
      tooltip.appendMarkdown('**Status:** $(check) Active\n');
    } else if (!config.enabled) {
      tooltip.appendMarkdown('**Status:** $(circle-slash) Highlighting disabled globally\n');
    } else {
      tooltip.appendMarkdown('**Status:** $(circle-outline) Pattern disabled\n');
    }
    
    // Description if available
    if (pattern.description) {
      tooltip.appendMarkdown(`**Description:** ${pattern.description}\n`);
    }
    
    tooltip.appendMarkdown('\n**Settings:**\n');
    tooltip.appendMarkdown(`- $(case-sensitive) Case Sensitive: ${config.caseSensitive ? 'Yes' : 'No'}\n`);
    tooltip.appendMarkdown(`- $(whole-word) Whole Word: ${config.wholeWord ? 'Yes' : 'No'}\n`);
    
    tooltip.appendMarkdown(`\n**Created:** ${new Date(pattern.createdAt).toLocaleString()}\n\n`);
    
    // Action hints
    tooltip.appendMarkdown('---\n');
    tooltip.appendMarkdown('$(mouse-pointer) *Click to toggle • Right-click for options*\n');
    tooltip.appendMarkdown('$(color-mode) *Right-click and select "Change Pattern Color" to pick a new color*');

    return tooltip;
  }

  /**
   * Get appropriate icon for tooltip based on pattern state
   */
  private getTooltipIcon(item: PatternTreeItem): string {
    const config = this.patternManager.getConfig();
    
    if (!config.enabled) {
      return 'circle-slash';
    }
    
    if (!item.enabled) {
      return 'circle-outline';
    }
    
    // Use different icons for different colors
    const icons = ['circle-filled', 'triangle-filled', 'diamond-filled', 'square-filled'];
    return icons[item.colorIndex % icons.length];
  }

  /**
   * Get appropriate icon for the pattern item
   */
  private getIconPath(item: PatternTreeItem): vscode.ThemeIcon {
    if (item.contextValue === 'emptyItem') {
      return new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('textLink.foreground'));
    }

    if (item.contextValue === 'inlineAddItem') {
      return new vscode.ThemeIcon('add', new vscode.ThemeColor('textLink.foreground'));
    }

    if (item.contextValue === 'colorPickerItem') {
      return new vscode.ThemeIcon('color-mode', new vscode.ThemeColor('textLink.foreground'));
    }

    const config = this.patternManager.getConfig();

    // Global highlighting disabled
    if (!config.enabled) {
      return new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('errorForeground'));
    }

    // Pattern disabled
    if (!item.enabled) {
      return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('disabledForeground'));
    }

    // Active pattern - use distinctive icons for better visual hierarchy with color coding
    const iconSets = [
      { icon: 'circle-filled', color: 'charts.blue' },        // Blue
      { icon: 'primitive-square', color: 'charts.green' },    // Green  
      { icon: 'triangle-up', color: 'charts.yellow' },        // Yellow
      { icon: 'diamond', color: 'charts.orange' },            // Orange
      { icon: 'circle-filled', color: 'charts.purple' },      // Purple
      { icon: 'heart', color: 'charts.red' },                 // Pink
      { icon: 'hexagon', color: 'terminal.ansiCyan' },        // Teal
      { icon: 'circle-filled', color: 'charts.foreground' }   // Gray
    ];

    const iconSet = iconSets[item.colorIndex % iconSets.length];
    return new vscode.ThemeIcon(iconSet.icon, new vscode.ThemeColor(iconSet.color));
  }


  /**
   * Get the pattern associated with a tree item
   */
  public getPatternFromItem(item: PatternTreeItem): Pattern | undefined {
    return this.patternManager.getPatterns().find(p => p.id === item.id);
  }

  /**
   * Reveal and select a pattern in the tree
   */
  public async revealPattern(patternId: string): Promise<void> {
    const patterns = this.patternManager.getPatterns();
    const pattern = patterns.find(p => p.id === patternId);
    
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
    const enabledCount = patterns.filter(p => p.enabled).length;
    const config = this.patternManager.getConfig();
    
    if (patterns.length === 0) {
      return 'Ready to highlight patterns';
    }
    
    let summary = '';
    
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
   * Start inline adding mode
   */
  public startInlineAdd(): void {
    this.isInlineAdding = true;
    this.refresh();
    
    // Show instructions for inline editing
    vscode.window.showInformationMessage(
      'Click on the "Type pattern text here..." item in the tree to add your pattern',
      { modal: false }
    );
  }

  /**
   * Start inline editing for a specific pattern
   */
  public startInlineEdit(patternId: string): void {
    this.inlineEditingPatternId = patternId;
    
    // Show input box immediately for existing patterns
    setTimeout(() => {
      this.showInlineInputBox(patternId);
    }, 100);
  }

  /**
   * Start color selection mode for a pattern
   */
  public startColorSelection(patternId: string): void {
    this.colorSelectionPatternId = patternId;
    this.refresh();
    
    // Show instructions
    const pattern = this.patternManager.getPatterns().find(p => p.id === patternId);
    if (pattern) {
      vscode.window.showInformationMessage(
        `Select a new color for pattern "${pattern.text}" from the color picker in the tree`,
        { modal: false }
      );
    }
  }

  /**
   * Complete inline addition with direct input
   */
  public async completeInlineAdd(): Promise<void> {
    await this.showInlineInputBox();
  }

  /**
   * Show input box for inline pattern editing
   */
  private async showInlineInputBox(patternId?: string): Promise<void> {
    const existingPattern = patternId ? this.patternManager.getPatterns().find(p => p.id === patternId) : null;
    const isEditing = !!existingPattern;
    
    const patternText = await vscode.window.showInputBox({
      title: isEditing ? 'Edit Pattern' : 'Add New Pattern',
      prompt: isEditing ? 'Edit the pattern text' : 'Enter the text pattern you want to highlight',
      value: existingPattern?.text || '',
      placeHolder: 'e.g., TODO, FIXME, BUG, or any word/phrase',
      ignoreFocusOut: false,
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Pattern text cannot be empty';
        }
        
        if (value.trim().length < 2) {
          return 'Pattern must be at least 2 characters long';
        }
        
        const patterns = this.patternManager.getPatterns();
        const existing = patterns.find(p => 
          p.id !== patternId && p.text.toLowerCase() === value.toLowerCase()
        );
        if (existing) {
          return `Pattern "${value}" already exists`;
        }
        
        if (value.length > 100) {
          return 'Pattern text too long (max 100 characters)';
        }
        
        return null;
      }
    });

    // Reset inline editing state
    this.isInlineAdding = false;
    this.inlineEditingPatternId = null;
    this.refresh();

    if (patternText) {
      if (isEditing && existingPattern) {
        // Update existing pattern
        await this.patternManager.updatePattern(existingPattern.id, {
          text: patternText.trim()
        });
      } else {
        // Create new pattern
        await this.patternManager.addPattern(patternText.trim());
      }
    }
  }

  /**
   * Check if currently in inline adding mode
   */
  public isInlineAddingMode(): boolean {
    return this.isInlineAdding;
  }

  /**
   * Check if a pattern is being inline edited
   */
  public isPatternInlineEditing(patternId: string): boolean {
    return this.inlineEditingPatternId === patternId;
  }

  /**
   * Get color icon for a color index
   */
  private getColorIcon(colorIndex: number): string {
    const icons = ['🔵', '🟢', '🟡', '🟠', '🟣', '🔴', '🟦', '⚫'];
    return icons[colorIndex] || '🔵';
  }

  /**
   * Show color selection dialog
   */
  public async showColorSelection(patternId: string): Promise<void> {
    const pattern = this.patternManager.getPatterns().find(p => p.id === patternId);
    if (!pattern) {
      return;
    }

    // Create color options
    const colorOptions = COLOR_PALETTE.map((color, index) => ({
      label: `${this.getColorIcon(index)} ${color.name}`,
      description: index === pattern.colorIndex ? '(current)' : '',
      colorIndex: index
    }));

    const selected = await vscode.window.showQuickPick(colorOptions, {
      placeHolder: `Select a color for pattern "${pattern.text}"`,
      ignoreFocusOut: true
    });

    if (selected && selected.colorIndex !== pattern.colorIndex) {
      await this.patternManager.updatePattern(patternId, {
        colorIndex: selected.colorIndex
      });
    }

    // Exit color selection mode
    this.colorSelectionPatternId = null;
    this.refresh();
  }

  /**
   * Reset all inline modes
   */
  public resetInlineModes(): void {
    this.isInlineAdding = false;
    this.inlineEditingPatternId = null;
    this.colorSelectionPatternId = null;
    this.refresh();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}