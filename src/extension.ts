import * as vscode from "vscode";
import { PatternManager } from "./services/patternManager";
import { DecorationManager } from "./services/decorationManager";
import { PatternTreeProvider } from "./views/patternTreeProvider";
import { PatternCommands } from "./commands/patternCommands";

/**
 * Main extension class that manages the lifecycle and coordination of all components
 */
class PatternColorizationExtension {
  private patternManager!: PatternManager;
  private decorationManager!: DecorationManager;
  private treeProvider!: PatternTreeProvider;
  private treeView!: vscode.TreeView<any>;
  private patternCommands!: PatternCommands;

  /**
   * Activate the extension
   */
  public activate(context: vscode.ExtensionContext): void {
    console.log("Pattern Colorization extension is activating...");

    try {
      // Initialize core services
      this.initializeServices(context);

      // Setup UI components
      this.setupUI(context);

      // Register commands
      this.registerCommands(context);

      // Setup event handlers
      this.setupEventHandlers(context);

      // Initial update
      this.decorationManager.updateAllEditors();

      console.log("Pattern Colorization extension activated successfully");
    } catch (error) {
      console.error(
        "Failed to activate Pattern Colorization extension:",
        error
      );
      vscode.window.showErrorMessage(
        `Failed to activate Pattern Colorization: ${error}`
      );
    }
  }

  /**
   * Deactivate the extension
   */
  public deactivate(): void {
    console.log("Pattern Colorization extension is deactivating...");

    try {
      // Dispose of all services and components
      if (this.patternCommands) {
        this.patternCommands.dispose();
      }

      if (this.decorationManager) {
        this.decorationManager.dispose();
      }

      if (this.treeProvider) {
        this.treeProvider.dispose();
      }

      if (this.patternManager) {
        this.patternManager.dispose();
      }

      if (this.treeView) {
        this.treeView.dispose();
      }

      console.log("Pattern Colorization extension deactivated successfully");
    } catch (error) {
      console.error("Error during extension deactivation:", error);
    }
  }

  /**
   * Initialize core services
   */
  private initializeServices(context: vscode.ExtensionContext): void {
    // Initialize pattern manager (must be first)
    this.patternManager = new PatternManager(context);

    // Initialize decoration manager
    this.decorationManager = new DecorationManager(
      this.patternManager,
      context
    );

    // Initialize tree provider
    this.treeProvider = new PatternTreeProvider(this.patternManager);
  }

  /**
   * Setup UI components
   */
  private setupUI(context: vscode.ExtensionContext): void {
    // Create tree view for Explorer with enhanced accessibility
    this.treeView = vscode.window.createTreeView("patternColorizationView", {
      treeDataProvider: this.treeProvider,
      showCollapseAll: false,
      canSelectMany: false,
      dragAndDropController: undefined, // Disable for now
      manageCheckboxStateManually: false,
    });

    // Set initial tree view properties for better UX
    this.treeView.title = "Pattern Colorization";
    this.treeView.badge = undefined; // Will be updated based on active patterns

    // Debug: Log initial patterns
    const initialPatterns = this.patternManager.getPatterns();
    console.log(
      "Initial patterns loaded:",
      initialPatterns.length,
      initialPatterns
    );

    // Update tree view description dynamically
    this.updateTreeViewDescription();
    this.updateTreeViewBadge();

    // Listen for pattern changes to update UI elements
    this.patternManager.onDidChangePatterns(() => {
      console.log("Extension: Pattern change detected, updating UI");
      this.updateTreeViewDescription();
      this.updateTreeViewBadge();
      this.updateStatusBar();
      // Force refresh the tree view
      this.treeProvider.refresh();
    });

    // Setup tree view event handlers
    this.treeView.onDidChangeSelection((event) => {
      // Handle selection changes for accessibility
      if (event.selection.length > 0) {
        const item = event.selection[0];
        if (item.contextValue === "patternItem") {
          // Announce selection to screen readers
          const pattern = this.patternManager
            .getPatterns()
            .find((p) => p.id === item.id);
          if (pattern) {
            vscode.window.setStatusBarMessage(
              `Selected pattern: ${pattern.text} (${
                item.enabled ? "active" : "inactive"
              })`,
              2000
            );
          }
        }
      }
    });

    // Setup tree view visibility changes
    this.treeView.onDidChangeVisibility((event) => {
      if (event.visible) {
        this.updateTreeViewDescription();
        this.updateTreeViewBadge();
      }
    });

    context.subscriptions.push(this.treeView);
  }

  /**
   * Register all commands
   */
  private registerCommands(context: vscode.ExtensionContext): void {
    this.patternCommands = new PatternCommands(
      this.patternManager,
      this.decorationManager,
      this.treeProvider,
      context
    );
  }

  /**
   * Setup event handlers for VS Code events
   */
  private setupEventHandlers(context: vscode.ExtensionContext): void {
    // Listen for workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(
      () => {
        console.log("Workspace folders changed, updating pattern decorations");
        this.decorationManager.updateAllEditors();
      },
      null,
      context.subscriptions
    );

    // Listen for theme changes with enhanced handling
    vscode.window.onDidChangeActiveColorTheme(
      (theme) => {
        console.log(`Color theme changed to: ${theme.kind}`);
        // Announce theme change to screen readers
        vscode.window.setStatusBarMessage(
          `$(color-mode) Theme changed - refreshing pattern colors...`,
          2000
        );

        // Refresh decorations when theme changes with a slight delay
        setTimeout(() => {
          this.decorationManager.refresh();
          this.treeProvider.refresh();
        }, 150);
      },
      null,
      context.subscriptions
    );

    // Listen for configuration changes specific to our extension
    vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration("patternColorization")) {
          console.log("Pattern colorization configuration changed");
          this.handleConfigurationChange();

          // Provide feedback for configuration changes
          const config = vscode.workspace.getConfiguration(
            "patternColorization"
          );
          const enabled = config.get("enabled", true);
          vscode.window.setStatusBarMessage(
            `$(gear) Pattern highlighting ${enabled ? "enabled" : "disabled"}`,
            2000
          );
        }
      },
      null,
      context.subscriptions
    );

    // Listen for window state changes
    vscode.window.onDidChangeWindowState(
      (windowState) => {
        if (windowState.focused) {
          // Refresh decorations when window gains focus
          console.log("Window gained focus, updating decorations");
          this.decorationManager.updateAllEditors();
        }
      },
      null,
      context.subscriptions
    );

    // Listen for editor focus changes for better accessibility
    vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          const patterns = this.patternManager.getEnabledPatterns();
          if (patterns.length > 0) {
            // Brief status message for screen readers
            setTimeout(() => {
              vscode.window.setStatusBarMessage(
                `$(symbol-color) ${patterns.length} pattern${
                  patterns.length !== 1 ? "s" : ""
                } active in this file`,
                1500
              );
            }, 500);
          }
        }
      },
      null,
      context.subscriptions
    );
  }

  /**
   * Handle configuration changes
   */
  private handleConfigurationChange(): void {
    const config = vscode.workspace.getConfiguration("patternColorization");

    this.patternManager.updateConfig({
      enabled: config.get("enabled", true),
      caseSensitive: config.get("caseSensitive", false),
      wholeWord: config.get("wholeWord", false),
    });

    this.updateTreeViewDescription();
  }

  /**
   * Update tree view description with current status
   */
  private updateTreeViewDescription(): void {
    if (this.treeView && this.treeProvider) {
      const summary = this.treeProvider.getSummary();
      this.treeView.description = summary;
    }
  }

  /**
   * Update tree view badge to show active pattern count
   */
  private updateTreeViewBadge(): void {
    if (this.treeView) {
      const patterns = this.patternManager.getPatterns();
      const config = this.patternManager.getConfig();
      const enabledCount = patterns.filter((p) => p.enabled).length;

      if (config.enabled && enabledCount > 0) {
        this.treeView.badge = {
          tooltip: `${enabledCount} active pattern${
            enabledCount !== 1 ? "s" : ""
          }`,
          value: enabledCount,
        };
      } else {
        this.treeView.badge = undefined;
      }
    }
  }

  /**
   * Update status bar with extension information
   */
  private updateStatusBar(): void {
    const patterns = this.patternManager.getPatterns();
    const config = this.patternManager.getConfig();
    const enabledCount = patterns.filter((p) => p.enabled).length;

    if (config.enabled && enabledCount > 0) {
      vscode.window.setStatusBarMessage(
        `$(symbol-color) ${enabledCount} pattern${
          enabledCount !== 1 ? "s" : ""
        } active`,
        3000
      );
    }
  }
}

// Global extension instance
let extensionInstance: PatternColorizationExtension;

/**
 * VS Code extension activation function
 */
export function activate(context: vscode.ExtensionContext): void {
  extensionInstance = new PatternColorizationExtension();
  extensionInstance.activate(context);
}

/**
 * VS Code extension deactivation function
 */
export function deactivate(): void {
  if (extensionInstance) {
    extensionInstance.deactivate();
  }
}

/**
 * Get the current extension instance (useful for testing)
 */
export function getExtensionInstance(): PatternColorizationExtension {
  return extensionInstance;
}
