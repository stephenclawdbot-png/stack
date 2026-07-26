import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// Minimal EIP-1193 provider type
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
  });

  const provider = typeof window !== "undefined" ? window.ethereum : null;

  const connect = useCallback(async () => {
    if (!provider) {
      setState((s) => ({ ...s, error: "No wallet found. Install MetaMask or Phantom." }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      const chainIdHex = (await provider.request({
        method: "eth_chainId",
      })) as string;

      setState({
        address: accounts[0] ?? null,
        chainId: parseInt(chainIdHex, 16),
        connecting: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: err instanceof Error ? err.message : "Failed to connect",
      }));
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    setState({ address: null, chainId: null, connecting: false, error: null });
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + targetChainId.toString(16) }],
      });
    } catch {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x" + targetChainId.toString(16),
              chainName: "Robinhood Chain",
              rpcUrls: ["https://rpc.robinhood.com"],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://explorer.robinhood.com"],
            },
          ],
        });
      } catch {
        setState((s) => ({ ...s, error: "Failed to switch network" }));
      }
    }
  }, [provider]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!provider?.on) return;

    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setState((s) => ({ ...s, address: accounts[0] ?? null }));
    };

    const handleChain = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      setState((s) => ({ ...s, chainId: parseInt(chainIdHex, 16) }));
    };

    provider.on("accountsChanged", handleAccounts);
    provider.on("chainChanged", handleChain);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
      provider.removeListener?.("chainChanged", handleChain);
    };
  }, [provider]);

  // Auto-connect if already authorized
  useEffect(() => {
    if (!provider) return;
    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const addrs = accounts as string[];
        if (addrs.length > 0) {
          provider
            .request({ method: "eth_chainId" })
            .then((chainIdHex) => {
              setState((s) => ({
                ...s,
                address: addrs[0],
                chainId: parseInt(chainIdHex as string, 16),
              }));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [provider]);

  // Get ethers signer for contract interactions
  const getSigner = useCallback(async () => {
    if (!provider || !state.address) return null;
    const browserProvider = new ethers.BrowserProvider(provider);
    return browserProvider.getSigner();
  }, [provider, state.address]);

  return { ...state, connect, disconnect, switchChain, getSigner };
}