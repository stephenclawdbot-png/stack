import { useWallet } from "../lib/useWallet";
import { WalletIcon } from "./Icons";
import { shortAddr } from "../lib/format";
import { CHAIN_ID } from "../config";

export function ConnectButton() {
  const wallet = useWallet();

  if (wallet.error) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={wallet.connect}
          disabled={wallet.connecting}
          className="btn-primary text-sm"
        >
          {wallet.connecting ? "Connecting..." : "Connect Wallet"}
        </button>
        <span className="text-xs text-danger">{wallet.error}</span>
      </div>
    );
  }

  if (!wallet.address) {
    return (
      <button
        onClick={wallet.connect}
        disabled={wallet.connecting}
        className="btn-primary text-sm flex items-center gap-2"
      >
        <WalletIcon className="w-4 h-4" />
        {wallet.connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  const wrongChain = wallet.chainId !== CHAIN_ID;

  return (
    <div className="flex items-center gap-2">
      {wrongChain && (
        <button
          onClick={() => wallet.switchChain(CHAIN_ID)}
          className="btn-danger text-xs"
        >
          Wrong Network
        </button>
      )}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border">
        <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
        <span className="font-mono text-sm text-text">{shortAddr(wallet.address)}</span>
      </div>
    </div>
  );
}