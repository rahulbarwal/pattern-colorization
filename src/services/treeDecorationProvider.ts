import * as vscode from "vscode";

/**
 * Provides decorations for tree items based on their state
 */
export class TreeDecorationProvider implements vscode.FileDecorationProvider {
  private globallyDisabled: boolean = false;

  /**
   * Update the global disabled state
   */
  public updateGlobalState(disabled: boolean): void {
    this.globallyDisabled = disabled;
  }

  /**
   * Provide decoration for a tree item URI
   */
  provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken
  ): vscode.FileDecoration | undefined {
    // Check if this is a globally disabled pattern URI
    if (uri.scheme === "globally-disabled-pattern" && this.globallyDisabled) {
      return {
        color: new vscode.ThemeColor("patternColorization.disabledText"),
        tooltip: "Pattern highlighting is globally disabled",
      };
    }

    // Check if this is a disabled pattern URI
    if (uri.scheme === "disabled-pattern") {
      return {
        color: new vscode.ThemeColor("patternColorization.disabledText"),
        tooltip: "Pattern is disabled",
      };
    }

    return undefined;
  }
}
