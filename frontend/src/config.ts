// Robinhood Chain (EVM L2)
export const CHAIN_ID = 4663;
export const CHAIN_NAME = "Robinhood Chain";
export const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const EXPLORER_URL = "https://robinhoodchain.blockscout.com";
export const NATIVE_CURRENCY = { name: "Ether", symbol: "ETH", decimals: 18 };

// Entry fee (0.001 ETH)
export const ENTRY_FEE = "0.001";

// Contract addresses (filled after deployment)
export const ADDRESSES = {
  stackToken: "0x0000000000000000000000000000000000000000",
  minerNFT: "0x0000000000000000000000000000000000000000",
  refinery: "0x0000000000000000000000000000000000000000",
} as const;

// Emission parameters
export const EMISSION_PER_DAY = 300_000;
export const EMISSION_PER_SEC = EMISSION_PER_DAY / 86400;
export const HALVING_INTERVAL = 13_680_000; // seconds
export const MAX_SUPPLY = 100_000_000;
export const PREMINT = 5_000_000;

// Miner tiers
export interface MinerTier {
  id: number;
  name: string;
  hashrate: number;
  price: number; // in STACK
  cells: number; // grid cells occupied (1 = 1x1, 4 = 2x2)
  emoji: string;
}

export const MINER_TIERS: MinerTier[] = [
  { id: 0, name: "Hand Drill", hashrate: 1, price: 0, cells: 1, emoji: "🔧" },
  { id: 1, name: "Drill Rig", hashrate: 5, price: 100, cells: 1, emoji: "⛏️" },
  { id: 2, name: "Pump Jack", hashrate: 25, price: 500, cells: 1, emoji: "🛢️" },
  { id: 3, name: "Excavator", hashrate: 100, price: 2000, cells: 4, emoji: "🚜" },
  { id: 4, name: "Mega Rig", hashrate: 500, price: 8000, cells: 4, emoji: "🏭" },
];

// Facility tiers
export interface FacilityTier {
  id: number;
  name: string;
  gridSize: number;
  cells: number;
  power: number;
  upgradeCost: number; // in STACK
}

export const FACILITY_TIERS: FacilityTier[] = [
  { id: 1, name: "Starter Site", gridSize: 2, cells: 4, power: 10, upgradeCost: 0 },
  { id: 2, name: "Small Refinery", gridSize: 3, cells: 9, power: 25, upgradeCost: 1000 },
  { id: 3, name: "Medium Refinery", gridSize: 4, cells: 16, power: 60, upgradeCost: 5000 },
  { id: 4, name: "Large Refinery", gridSize: 5, cells: 25, power: 150, upgradeCost: 20000 },
  { id: 5, name: "Mega Refinery", gridSize: 6, cells: 36, power: 400, upgradeCost: 100000 },
];

// Referral tiers
export interface ReferralTier {
  id: number;
  name: string;
  rate: number; // percentage
  threshold: number; // gross STACK referred
}

export const REFERRAL_TIERS: ReferralTier[] = [
  { id: 1, name: "Tier 1", rate: 1.0, threshold: 0 },
  { id: 2, name: "Tier 2", rate: 1.75, threshold: 50_000 },
  { id: 3, name: "Tier 3", rate: 3.0, threshold: 250_000 },
];