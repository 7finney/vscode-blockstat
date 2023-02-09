import * as vscode from "vscode";

interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: string;
}

interface NetworkConfig {
  rpc: string;
  blockScanner: string;
  chainID: string;
  nativeCurrency: NativeCurrency;
}

let myStatusBarItem: vscode.StatusBarItem;
const extension = vscode.extensions.getExtension("7finney.ethcode");
const ethcode = extension?.exports;

export async function activate({ subscriptions }: vscode.ExtensionContext) {
  // create a new status bar item that we can now manage

  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  subscriptions.push(myStatusBarItem);

  /**
   *  register a command that is invoked when  statusbar item
   *  is selected
   */

  const blockScannerCommand = "blockNumber.showBlockScanner";
  subscriptions.push(
    vscode.commands.registerCommand(blockScannerCommand, () => {
      vscode.window.showInformationMessage(
        `${selectedNetworkConfig.blockScanner}`
      );
    })
  );

  /**
   *  update status bar item once at start
   *  then keep updating blocknumber after listening
   *  from the provider
   */
  const selectedNetworkConfig: NetworkConfig = ethcode.provider.network.get();
  const ethcodeProvider = ethcode.provider.get();
  ethcodeProvider.on("block", async (blockNumber: number) => {
    if (blockNumber > 0) {
      myStatusBarItem.text = `$(symbol-constructor) ${blockNumber} ${selectedNetworkConfig.nativeCurrency.name}`;
      myStatusBarItem.command = blockScannerCommand;
      myStatusBarItem.show();
    } else {
      myStatusBarItem.hide();
    }
  });
}
