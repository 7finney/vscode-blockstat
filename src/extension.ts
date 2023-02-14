import { ethers } from "ethers";
import * as vscode from "vscode";
import { shortenAddress } from "./utils";

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

let myStatusBarItemPrimary: vscode.StatusBarItem;
let myStatusBarItemSecondary: vscode.StatusBarItem;
const extension = vscode.extensions.getExtension("7finney.ethcode");
const ethcode = extension?.exports;

export async function activate({ subscriptions }: vscode.ExtensionContext) {
  // create a new status bar item that we can now manage

  /**
   * Status bar item for primary side
   * structure: `Ethereum: <block number> <gas> is the primary item.`
   */
  myStatusBarItemPrimary = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1
  );
  subscriptions.push(myStatusBarItemPrimary);

  /**
   * Status bar item for secondary side
   * structure: `<account> <balance>> is the primary item.`
   */
  myStatusBarItemSecondary = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  subscriptions.push(myStatusBarItemSecondary);

  /**
   *  register a command that is invoked when  statusbar item
   *  is selected
   */

  const blockScannerCommand = "blockNumber.showBlockScanner";
  const showAccountCommand = "blockNumber.showAccount";
  vscode.commands.registerCommand(blockScannerCommand, () =>
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse(`${selectedNetworkConfig.blockScanner}`)
    )
  );

  subscriptions.push(
    vscode.commands.registerCommand(showAccountCommand, async () => {
      const accounts = await ethcode.wallet.list();
      vscode.window.showInformationMessage(`${accounts[0]}`);
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
      const gasPrice = await ethcodeProvider.getGasPrice();
      const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, "gwei");
      myStatusBarItemPrimary.text = `$(symbol-constructor) ${selectedNetworkConfig.nativeCurrency.name}: ${blockNumber} ${gasPriceInGwei}`;
      myStatusBarItemPrimary.command = blockScannerCommand;
      myStatusBarItemPrimary.show();
    } else {
      myStatusBarItemPrimary.hide();
    }
  });
  checkBalance(showAccountCommand, selectedNetworkConfig);
}
const checkBalance = async (command: string, networkConfig: NetworkConfig) => {
  const ethcodeProvider = ethcode.provider.get();
  const accounts: Array<string> = await ethcode.wallet.list();
  if (accounts.length > 0) {
    const balance = await ethcodeProvider
      .getBalance(accounts[0])
      .then((balance: number) => {
        const balanceInEther = ethers.utils.formatEther(balance);
        return balanceInEther;
      });
    const dataToPrint = `$(file-code) ${balance} ${
      networkConfig.nativeCurrency.symbol
    } ${shortenAddress(accounts[0], 4)}`;
    myStatusBarItemSecondary.text = dataToPrint;
    myStatusBarItemSecondary.command = command;
    myStatusBarItemSecondary.show();
  } else {
    myStatusBarItemPrimary.hide();
    vscode.window.showInformationMessage("No account available in ETHcode.");
  }
};
