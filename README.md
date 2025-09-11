# Pattern Colorization - VS Code Extension

A powerful VS Code extension that enables users to highlight up to eight distinct words or patterns in any text file using carefully chosen muted background colors. Perfect for analyzing log files, code reviews, and data analysis.

## Features

- 🎨 **Eight Color Highlighting**: Highlight up to 8 different patterns with distinct muted background colors
- 🌓 **Theme Aware**: Automatically adapts colors for light and dark VS Code themes  
- 📁 **Explorer Integration**: Dedicated panel in VS Code Explorer for easy pattern management
- ⚡ **Real-time Updates**: Instant highlighting as you add/modify patterns
- 🔍 **Flexible Matching**: Case-sensitive and whole-word matching options
- 📊 **Statistics View**: Interactive panel showing pattern usage and statistics
- ⌨️ **Keyboard Shortcuts**: Quick access to common operations
- ♿ **Accessibility**: Full screen reader support and keyboard navigation

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd pattern-colorization
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Open in VS Code and press `F5` to run the extension in a new Extension Development Host window.

### Package for Installation

1. Install VSCE (VS Code Extension Manager):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the generated `.vsix` file:
   ```bash
   code --install-extension pattern-colorization-1.0.0.vsix
   ```

## Usage

### Getting Started

1. Open any text file in VS Code
2. Look for the "Pattern Colorization" panel in the Explorer sidebar
3. Click the "+" button to add your first pattern
4. Enter a word or pattern to highlight
5. Choose from one of the 8 available colors
6. Watch as the pattern is immediately highlighted in your file!

### Managing Patterns

#### Add Patterns
- **From Panel**: Click the "+" button in the Pattern Colorization panel
- **From Selection**: Select text in the editor, right-click, and choose "Add to Pattern Colorization"
- **Command Palette**: Use `Ctrl+Shift+P` → "Pattern Colorization: Add Pattern"

#### Edit Patterns
- Click on any pattern in the panel to edit its text or color
- Use context menu options for quick actions

#### Delete Patterns
- Click the "×" button next to any pattern
- Use "Clear All Patterns" to remove everything at once

#### Toggle Patterns
- Click the eye icon to temporarily enable/disable a pattern
- Use "Toggle Pattern Colorization" to enable/disable the entire extension

### Keyboard Shortcuts

#### Default Key Bindings
- `F3` (Win/Linux) / `Cmd+G` (Mac) - Jump to next occurrence of any pattern
- `Shift+F3` (Win/Linux) / `Cmd+Shift+G` (Mac) - Jump to previous occurrence of any pattern

#### Optional Key Bindings (User Configurable)

Users can manually add these keybindings in VS Code's Keyboard Shortcuts settings (`Cmd+K Cmd+S`):

**Jump to next occurrence of selected pattern:**
- Command: `patternColorization.jumpToNextSelectedPattern`
- Suggested shortcut: `Ctrl+Shift+F3` (Win/Linux) / `Cmd+Option+G` (Mac)

**Jump to previous occurrence of selected pattern:**
- Command: `patternColorization.jumpToPreviousSelectedPattern`
- Suggested shortcut: `Ctrl+Shift+F2` (Win/Linux) / `Cmd+Option+Shift+G` (Mac)

To add these shortcuts:
1. Open VS Code Keyboard Shortcuts (`Cmd+K Cmd+S`)
2. Click the "+" icon to add a new keybinding  
3. Enter the command name and desired key combination

### Color Options

The extension provides 8 carefully chosen muted colors that work well with both light and dark themes:

1. **Soft Blue** - Perfect for keywords and important terms
2. **Gentle Green** - Great for success messages and positive indicators  
3. **Warm Orange** - Ideal for warnings and attention-grabbing content
4. **Subtle Purple** - Excellent for categorization and grouping
5. **Muted Pink** - Nice for highlighting names and identifiers
6. **Light Cyan** - Good for URLs and links
7. **Pale Yellow** - Suitable for notes and annotations
8. **Soft Red** - Perfect for errors and critical information

## Settings

Access extension settings through VS Code preferences (`Ctrl+,`) and search for "Pattern Colorization":

- **Case Sensitive Matching**: Enable/disable case-sensitive pattern matching
- **Whole Word Matching**: Only match complete words (not partial matches)
- **Auto-save Patterns**: Automatically save patterns between VS Code sessions
- **Show Statistics**: Display pattern usage statistics in the panel

## Commands

All commands are available through the Command Palette (`Ctrl+Shift+P`):

### Pattern Management
- `Pattern Colorization: Add Pattern` - Add a new pattern to highlight
- `Pattern Colorization: Clear All Patterns` - Remove all patterns
- `Pattern Colorization: Toggle Extension` - Enable/disable highlighting
- `Pattern Colorization: Show Statistics` - Open statistics panel
- `Pattern Colorization: Export Patterns` - Export patterns to JSON file
- `Pattern Colorization: Import Patterns` - Import patterns from JSON file
- `Pattern Colorization: Add from Selection` - Add selected text as pattern

### Navigation Commands
- `Pattern Colorization: Jump to Next Highlight` - Navigate to next occurrence of any pattern
- `Pattern Colorization: Jump to Previous Highlight` - Navigate to previous occurrence of any pattern
- `Pattern Colorization: Jump to Next Selected Pattern Occurrence` - Navigate only between occurrences of the pattern under cursor
- `Pattern Colorization: Jump to Previous Selected Pattern Occurrence` - Navigate only between occurrences of the pattern under cursor

#### Selected Pattern Navigation
The selected pattern navigation feature allows you to jump between occurrences of only the pattern that's currently under your cursor:

1. **Smart Pattern Detection**: Place your cursor on any highlighted text
2. **Pattern-Specific Navigation**: Use the selected pattern navigation commands to jump only between occurrences of that specific pattern
3. **Fallback Behavior**: If no pattern is detected at the cursor position, the extension will use the first available pattern
4. **Visual Feedback**: Shows current position (e.g., "Pattern 'error': 3/7") in the status bar

This is particularly useful when working with multiple patterns and you want to focus on reviewing only one specific pattern at a time.

## Tips and Best Practices

### For Log File Analysis
- Use different colors for different log levels (ERROR, WARN, INFO, DEBUG)
- Highlight IP addresses, user IDs, or transaction IDs with distinct colors
- Use warm colors (orange, red) for errors and cool colors (blue, green) for normal operations

### for Code Review
- Highlight TODO comments in yellow
- Use red for FIXME or bug-related comments  
- Highlight function names or class names in blue
- Use green for recently added code markers

### Performance Tips
- Patterns are matched efficiently, but avoid overly broad patterns in very large files
- Use whole-word matching when possible to improve performance
- Disable patterns you're not actively using instead of deleting them

## Troubleshooting

### Patterns Not Highlighting
1. Check that the extension is enabled (look for the eye icon in the panel)
2. Verify the pattern text matches exactly (check case sensitivity settings)
3. Try refreshing the editor by switching to another file and back

### Extension Not Loading
1. Check VS Code's Developer Console (`Help > Developer Tools`) for errors
2. Try reloading VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
3. Verify the extension is properly installed in the Extensions panel

### Performance Issues
1. Reduce the number of active patterns if experiencing slowdowns
2. Use more specific patterns instead of very broad ones
3. Consider disabling the extension for very large files (>10MB)

## Development

### Project Structure
```
src/
├── extension.ts              # Main extension entry point
├── commands/
│   └── patternCommands.ts   # Command handlers
├── models/
│   └── pattern.ts           # Data models and interfaces
├── services/
│   ├── patternManager.ts    # Pattern CRUD operations
│   └── decorationManager.ts # Text highlighting system
├── views/
│   └── patternTreeProvider.ts # Explorer panel UI
└── constants/
    └── colors.ts            # Color definitions
```

### Building from Source

1. **Prerequisites**: Node.js 16+ and npm
2. **Install dependencies**: `npm install`
3. **Compile**: `npm run compile`
4. **Watch mode**: `npm run watch` (for development)
5. **Package**: `vsce package`

### Contributing

This extension follows VS Code extension development best practices:

- TypeScript for type safety
- Event-driven architecture for performance
- Accessibility-first design
- Comprehensive error handling
- Theme-aware styling

## License

MIT License - feel free to use and modify as needed.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Look for similar issues in VS Code extension documentation
3. Create an issue with detailed reproduction steps

---

**Enjoy enhanced text analysis with Pattern Colorization!** 🎨