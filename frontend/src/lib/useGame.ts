import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { getRefineryContract, getStackTokenContract, getMinerNFTContract } from "./contracts";
import { ADDRESSES, CHAIN_ID } from "../config";

export interface GameState {
  hasFacility: boolean;
  facilityTier: number;
  facilityGridSize: number;
  facilityPower: number;
  facilityPowerUsed: number;
  playerHashrate: number;
  totalNetworkHashrate: number;
  pendingRewards: number;
  totalMinted: number;
  totalBurned: number;
  stackBalance: number;
  minerCount: number;
  referralCode: string;
  referrer: string;
  referredVolume: number;
  referralTier: number;
  emissionRatePerSec: number;
  nextHalving: number;
  lastUpgrade: number;
  upgradeCooldown: number;
}

export function useGame() {
  const wallet = useWallet();
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const isCorrectChain = wallet.chainId === CHAIN_ID;
  const isConnected = !!wallet.address;
  const isReady = isConnected && isCorrectChain && ADDRESSES.refinery !== "0x0000000000000000000000000000000000000000";

  const refresh = useCallback(async () => {
    if (!wallet.address || !isCorrectChain) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const refinery = getRefineryContract(provider);
      const token = getStackTokenContract(provider);
      const minerNFT = getMinerNFTContract(provider);

      const [
        hasFacility, facTier, gridSize, power, powerUsed,
        playerHash, networkHash, pending, minted, burned,
        stackBal, minerCount, refCode, refAddr, refVol, refTier,
        emissionRate, halving, lastUpg, cooldown,
      ] = await Promise.all([
        refinery.hasFacility(wallet.address),
        refinery.facilityTier(wallet.address),
        refinery.facilityGridSize(wallet.address),
        refinery.facilityPower(wallet.address),
        refinery.facilityPowerUsed(wallet.address),
        refinery.playerHashrate(wallet.address),
        refinery.totalNetworkHashrate(),
        refinery.pendingRewards(wallet.address),
        refinery.totalMinted(),
        refinery.totalBurned(),
        token.balanceOf(wallet.address),
        minerNFT.balanceOf(wallet.address),
        refinery.referralCode(wallet.address),
        refinery.referrer(wallet.address),
        refinery.referredVolume(wallet.address),
        refinery.referralTier(wallet.address),
        refinery.emissionRatePerSec(),
        refinery.nextHalvingTimestamp(),
        refinery.facilityLastUpgrade(wallet.address),
        refinery.UPGRADE_COOLDOWN(),
      ]);

      setState({
        hasFacility,
        facilityTier: Number(facTier),
        facilityGridSize: Number(gridSize),
        facilityPower: Number(power),
        facilityPowerUsed: Number(powerUsed),
        playerHashrate: Number(playerHash),
        totalNetworkHashrate: Number(networkHash),
        pendingRewards: parseFloat(ethers.formatUnits(pending, 18)),
        totalMinted: parseFloat(ethers.formatUnits(minted, 18)),
        totalBurned: parseFloat(ethers.formatUnits(burned, 18)),
        stackBalance: parseFloat(ethers.formatUnits(stackBal, 18)),
        minerCount: Number(minerCount),
        referralCode: refCode,
        referrer: refAddr,
        referredVolume: parseFloat(ethers.formatUnits(refVol, 18)),
        referralTier: Number(refTier),
        emissionRatePerSec: Number(emissionRate),
        nextHalving: Number(halving),
        lastUpgrade: Number(lastUpg),
        upgradeCooldown: Number(cooldown),
      });
    } catch (err) {
      // Contracts not deployed yet or not connected
    }
  }, [wallet.address, isCorrectChain]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!isReady) {
      setState(null);
      return;
    }

    refresh();
    pollRef.current = window.setInterval(refresh, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isReady, refresh]);

  // Actions
  const enterFacility = useCallback(async (referralCode: string) => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      if (!signer) throw new Error("No signer");
      const refinery = getRefineryContract(signer);
      const tx = await refinery.enterFacility(referralCode, {
        value: ethers.parseEther("0.001"),
      });
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enter");
    } finally {
      setLoading(false);
    }
  }, [wallet, refresh]);

  const claimRewards = useCallback(async () => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      if (!signer) throw new Error("No signer");
      const refinery = getRefineryContract(signer);
      const tx = await refinery.claimRewards();
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim");
    } finally {
      setLoading(false);
    }
  }, [wallet, refresh]);

  const buyMiner = useCallback(async (tier: number) => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      if (!signer) throw new Error("No signer");
      const refinery = getRefineryContract(signer);
      const tx = await refinery.buyMiner(tier);
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to buy miner");
    } finally {
      setLoading(false);
    }
  }, [wallet, refresh]);

  const upgradeFacility = useCallback(async () => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      if (!signer) throw new Error("No signer");
      const refinery = getRefineryContract(signer);
      const tx = await refinery.upgradeFacility();
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upgrade");
    } finally {
      setLoading(false);
    }
  }, [wallet, refresh]);

  const createReferralCode = useCallback(async (code: string) => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      if (!signer) throw new Error("No signer");
      const refinery = getRefineryContract(signer);
      const tx = await refinery.createReferralCode(code);
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setLoading(false);
    }
  }, [wallet, refresh]);

  return {
    wallet,
    state,
    loading,
    error,
    isReady,
    isCorrectChain,
    isConnected,
    refresh,
    enterFacility,
    claimRewards,
    buyMiner,
    upgradeFacility,
    createReferralCode,
  };
}