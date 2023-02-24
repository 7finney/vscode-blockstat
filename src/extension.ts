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
  let selectedNetworkConfig: NetworkConfig =
    await ethcode.provider.network.get();
  let ethcodeProvider: any = await ethcode.provider.get();
  let selectedNetwork: string;
  let selectedAccount: string;
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

  // detect network change
  ethcode.ethcode.network.event(async (network: string) => {
    selectedNetwork = network;
    ethcodeProvider = await ethcode.provider.get();
    selectedNetworkConfig = await ethcode.provider.network.get();
    if (selectedAccount !== undefined && ethcodeProvider !== undefined) {
      checkBalance(
        showAccountCommand,
        selectedAccount,
        ethcodeProvider,
        selectedNetworkConfig
      );
    }

    ethcodeProvider.on("block", async (blockNumber: number) => {
      console.log(`${blockNumber}`);
      const network = await ethcodeProvider.getNetwork();
      console.log(`chainID: ${JSON.parse(JSON.stringify(network)).chainId}`);
      const networkChainId = JSON.parse(JSON.stringify(network)).chainId;
      if (
        blockNumber > 0 &&
        networkChainId == parseInt(selectedNetworkConfig.chainID)
      ) {
        const gasPrice = await ethcodeProvider.getGasPrice();
        const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, "gwei");
        myStatusBarItemPrimary.text = `$(symbol-constructor) ${selectedNetwork}: ${blockNumber} ${gasPriceInGwei}`;
        myStatusBarItemPrimary.command = blockScannerCommand;
        myStatusBarItemPrimary.show();
      } else {
        vscode.window.showInformationMessage("No network selected");
        myStatusBarItemPrimary.hide();
      }
    });
  });

  ethcode.ethcode.account.event(async (account: string) => {
    selectedAccount = account;
    if (ethcodeProvider !== undefined) {
      checkBalance(
        showAccountCommand,
        selectedAccount,
        ethcodeProvider,
        selectedNetworkConfig
      );
    } else {
      vscode.window.showInformationMessage("No Network selected.");
    }
  });
  // checkBalance(showAccountCommand, selectedNetworkConfig, selectedAccount);
}
const checkBalance = async (
  command: string,
  currentAccount: string,
  provider: any,
  networkConfig: NetworkConfig
) => {
  if (currentAccount.length >= 42) {
    const balance = await provider
      .getBalance(currentAccount)
      .then((balance: number) => {
        const balanceInEther = ethers.utils.formatEther(balance);
        return balanceInEther;
      });

    const dataToPrint = `$(file-code) ${balance} ${
      networkConfig.nativeCurrency.symbol
    } ${shortenAddress(currentAccount, 4)}`;

    myStatusBarItemSecondary.text = dataToPrint;
    myStatusBarItemSecondary.command = command;
    myStatusBarItemSecondary.show();
  } else {
    vscode.window.showInformationMessage("No account selected.");
    myStatusBarItemPrimary.hide();
  }
};
