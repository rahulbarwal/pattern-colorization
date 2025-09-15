# Pattern Colorization - VS Code Extension

A powerful VS Code extension that enables users to highlight up to eight distinct words or patterns in any text file using carefully chosen muted background colors. Perfect for analyzing log files, code reviews, and data analysis.

## Demo

[Extension demo](./extension-intro.gif)

## Features

- 🎨 **Eight Color Highlighting**: Highlight up to 8 different patterns with distinct muted background colors
- 🌓 **Theme Aware**: Automatically adapts colors for light and dark VS Code themes
- 📁 **Explorer Integration**: Dedicated panel in VS Code Explorer for easy pattern management
- ⚡ **Real-time Updates**: Instant highlighting as you add/modify patterns
- 🔍 **Flexible Matching**: Case-sensitive and whole-word matching options
- 📊 **Statistics View**: Interactive panel showing pattern usage and statistics
- ⌨️ **Keyboard Shortcuts**: Quick access to common operations
- ♿ **Accessibility**: Full screen reader support and keyboard navigation
- 🔄 **Import/Export**: Save and share pattern configurations
- 🎯 **Smart Navigation**: Jump between pattern occurrences with intelligent cursor detection

## Usage

### Getting Started

1. **Open the Pattern Panel**: Look for the "Pattern Colorization" panel in the VS Code Explorer sidebar (activity bar icon: 🎨)
2. **Add Your First Pattern**: Click the "+" button in the panel or select text in your editor and right-click → "Add to Pattern Colorization"
3. **Choose a Color**: Select from 8 carefully chosen muted colors that work with both light and dark themes
4. **Watch the Magic**: Your pattern is immediately highlighted across all open files!

### Pattern Management

#### Adding Patterns

- **From Panel**: Click the "+" button in the Pattern Colorization panel for inline editing
- **From Selection**: Select text in the editor, right-click, and choose "Add to Pattern Colorization"
- **Command Palette**: Use `Ctrl+Shift+P` → "Pattern Colorization: Add Pattern"
- **Smart Detection**: Extension automatically detects if you're on a word and offers to use it as a pattern

#### Editing Patterns

- **Inline Editing**: Click on any pattern in the panel to edit its text directly
- **Color Changes**: Right-click any pattern → "Change Pattern Color" to pick a different color
- **Descriptions**: Add optional descriptions when creating patterns for better organization

#### Managing Patterns

- **Toggle Individual**: Click the eye icon next to any pattern to enable/disable it
- **Toggle All**: Use the eye icon in the panel header to enable/disable all highlighting
- **Delete**: Right-click any pattern → "Delete Pattern" or use the trash icon
- **Clear All**: Use "Clear All Patterns" to remove everything at once (with export option)

### Navigation & Keyboard Shortcuts

#### Default Key Bindings

- `F3` (Win/Linux) / `Cmd+G` (Mac) - Jump to next occurrence of any pattern
- `Shift+F3` (Win/Linux) / `Cmd+Shift+G` (Mac) - Jump to previous occurrence of any pattern

#### Smart Pattern Navigation

The extension includes intelligent navigation that detects which pattern is under your cursor:

- **Pattern-Specific Navigation**: When your cursor is on a highlighted pattern, navigation commands will only jump between occurrences of that specific pattern
- **Fallback Behavior**: If no pattern is detected at the cursor, the extension uses the first available pattern
- **Visual Feedback**: Shows current position (e.g., "Pattern 'error': 3/7") in the status bar

#### Optional Key Bindings (User Configurable)

Add these commands in VS Code's Keyboard Shortcuts settings (`Cmd+K Cmd+S`):

**Jump to next occurrence of selected pattern:**

- Command: `patternColorization.jumpToNextSelectedPattern`
- Suggested shortcut: `Ctrl+Shift+F3` (Win/Linux) / `Cmd+Option+G` (Mac)

**Jump to previous occurrence of selected pattern:**

- Command: `patternColorization.jumpToPreviousSelectedPattern`
- Suggested shortcut: `Ctrl+Shift+F2` (Win/Linux) / `Cmd+Option+Shift+G` (Mac)

**To add these shortcuts:**

1. Open VS Code Keyboard Shortcuts (`Cmd+K Cmd+S`)
2. Click the "+" icon to add a new keybinding
3. Enter the command name and desired key combination

### Color Palette

The extension provides 8 carefully chosen muted colors that work well with both light and dark themes:

1. **Soft Blue** - Perfect for keywords and important terms
2. **Soft Green** - Great for success messages and positive indicators
3. **Soft Yellow** - Suitable for notes and annotations
4. **Soft Orange** - Ideal for warnings and attention-grabbing content
5. **Soft Purple** - Excellent for categorization and grouping
6. **Soft Pink** - Nice for highlighting names and identifiers
7. **Soft Teal** - Good for URLs and links
8. **Soft Gray** - Perfect for errors and critical information

### Import & Export

#### Export Patterns

- **From Panel**: Click the export icon (📤) in the Pattern Colorization panel
- **Command Palette**: Use `Ctrl+Shift+P` → "Pattern Colorization: Export Patterns"
- **Format**: Exports to JSON format for easy sharing and backup

#### Import Patterns

- **From Panel**: Click the import icon (📥) in the Pattern Colorization panel
- **Command Palette**: Use `Ctrl+Shift+P` → "Pattern Colorization: Import Patterns"
- **Format**: Imports from JSON files created by the export function
- **Smart Merge**: New patterns are added to existing ones without conflicts

### Statistics & Analytics

#### View Statistics

- **From Panel**: Click the statistics icon (📊) in the Pattern Colorization panel
- **Command Palette**: Use `Ctrl+Shift+P` → "Pattern Colorization: Show Statistics"
- **Interactive Dashboard**: Opens a webview with comprehensive pattern analytics

#### Statistics Include:

- **Total Patterns**: Number of patterns created
- **Active Patterns**: Currently enabled patterns
- **Active Highlights**: Number of text matches found across all files
- **Global Status**: Whether highlighting is enabled/disabled
- **Pattern Details**: Individual pattern status and color information
- **Configuration**: Current settings (case sensitivity, whole word matching)

## Settings

Access extension settings through VS Code preferences (`Ctrl+,`) and search for "Pattern Colorization":

- **Case Sensitive Matching**: Enable/disable case-sensitive pattern matching
- **Whole Word Matching**: Only match complete words (not partial matches)
- **Global Highlighting**: Enable/disable all pattern highlighting

## Available Commands

All commands are available through the Command Palette (`Ctrl+Shift+P`):

### Pattern Management

- `Pattern Colorization: Add Pattern` - Add a new pattern to highlight
- `Pattern Colorization: Add from Selection` - Add selected text as pattern
- `Pattern Colorization: Clear All Patterns` - Remove all patterns
- `Pattern Colorization: Toggle Highlighting` - Enable/disable all highlighting
- `Pattern Colorization: Refresh Patterns` - Refresh pattern decorations

### Navigation

- `Pattern Colorization: Jump to Next Highlight` - Navigate to next occurrence of any pattern
- `Pattern Colorization: Jump to Previous Highlight` - Navigate to previous occurrence of any pattern
- `Pattern Colorization: Jump to Next Selected Pattern Occurrence` - Navigate only between occurrences of the pattern under cursor
- `Pattern Colorization: Jump to Previous Selected Pattern Occurrence` - Navigate only between occurrences of the pattern under cursor

### Data Management

- `Pattern Colorization: Export Patterns` - Export patterns to JSON file
- `Pattern Colorization: Import Patterns` - Import patterns from JSON file
- `Pattern Colorization: Show Statistics` - Open interactive statistics dashboard

## Tips and Best Practices

### For Log File Analysis

- Use different colors for different log levels (ERROR, WARN, INFO, DEBUG)
- Highlight IP addresses, user IDs, or transaction IDs with distinct colors
- Use warm colors (orange, gray) for errors and cool colors (blue, green) for normal operations

### For Code Review

- Highlight TODO comments in yellow
- Use gray for FIXME or bug-related comments
- Highlight function names or class names in blue
- Use green for recently added code markers

### Performance Tips

- Patterns are matched efficiently, but avoid overly broad patterns in very large files
- Use whole-word matching when possible to improve performance
- Disable patterns you're not actively using instead of deleting them
- Export your patterns before clearing them for easy restoration

## Troubleshooting

### Patterns Not Highlighting

1. Check that the extension is enabled (look for the eye icon in the panel)
2. Verify the pattern text matches exactly (check case sensitivity settings)
3. Try refreshing patterns using the refresh button in the panel

### Performance Issues

1. Reduce the number of active patterns if experiencing slowdowns
2. Use more specific patterns instead of very broad ones
3. Consider disabling the extension for very large files (>10MB)

### Extension Not Working

1. Try reloading VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
2. Check VS Code's Developer Console (`Help > Developer Tools`) for errors
3. Verify the extension is properly installed in the Extensions panel

---

**Enjoy enhanced text analysis with Pattern Colorization!** 🎨
