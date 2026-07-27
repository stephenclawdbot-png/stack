import { ethers } from "ethers";

// Takes human-readable STACK amounts (config numbers and useGame state are
// already converted from wei) — NOT raw wei.
export function formatStack(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(num)) return "0";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}

export function formatEth(wei: string | bigint): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(4);
}

export function formatHashrate(hashrate: number): string {
  if (hashrate >= 1_000_000) return (hashrate / 1_000_000).toFixed(1) + " MH/s";
  if (hashrate >= 1_000) return (hashrate / 1_000).toFixed(1) + " KH/s";
  return hashrate + " H/s";
}

export function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return Math.floor(diff) + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

export function timeUntil(timestamp: number): string {
  const diff = timestamp - Date.now() / 1000;
  if (diff <= 0) return "Ready";
  if (diff < 60) return Math.ceil(diff) + "s";
  if (diff < 3600) return Math.ceil(diff / 60) + "m";
  return Math.ceil(diff / 3600) + "h";
}