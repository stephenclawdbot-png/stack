import { ethers } from "ethers";
import { ADDRESSES } from "../config";

// ABI fragments (minimal, will expand as contracts are written)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
];

const MINER_NFT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function tokenByIndex(uint256) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function minerTier(uint256) view returns (uint8)",
  "function minerHashrate(uint256) view returns (uint256)",
];

const REFINERY_ABI = [
  "function entryFee() view returns (uint256)",
  "function hasFacility(address) view returns (bool)",
  "function facilityTier(address) view returns (uint8)",
  "function facilityGridSize(address) view returns (uint8)",
  "function facilityPower(address) view returns (uint256)",
  "function facilityPowerUsed(address) view returns (uint256)",
  "function facilityLastUpgrade(address) view returns (uint256)",
  "function playerHashrate(address) view returns (uint256)",
  "function totalNetworkHashrate() view returns (uint256)",
  "function pendingRewards(address) view returns (uint256)",
  "function lastClaim(address) view returns (uint256)",
  "function emissionRatePerSec() view returns (uint256)",
  "function nextHalvingTimestamp() view returns (uint256)",
  "function totalRewardsPaid() view returns (uint256)",
  "function totalBurned() view returns (uint256)",
  "function rewardPool() view returns (uint256)",
  "function fundRewards(uint256)",
  "function referralCode(address) view returns (string)",
  "function referrer(address) view returns (address)",
  "function referredVolume(address) view returns (uint256)",
  "function referralTier(address) view returns (uint8)",
  "function enterFacility(string) payable",
  "function claimRewards()",
  "function buyMiner(uint8)",
  "function placeMiner(uint256,uint8,uint8)",
  "function removeMiner(uint256)",
  "function upgradeFacility()",
  "function createReferralCode(string)",
  "function MINER_TIERS(uint8) view returns (uint256 hashrate, uint256 price, uint8 cells, uint256 power)",
  "function facilityGridMask(address) view returns (uint64)",
  "function referralCodeOwner(string) view returns (address)",
  "function FACILITY_TIERS(uint8) view returns (uint8 gridSize, uint256 power, uint256 upgradeCost)",
  "function UPGRADE_COOLDOWN() view returns (uint256)",
  "function REMOVAL_COOLDOWN() view returns (uint256)",
];

export function getStackTokenContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(ADDRESSES.stackToken, ERC20_ABI, signerOrProvider);
}

export function getMinerNFTContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(ADDRESSES.minerNFT, MINER_NFT_ABI, signerOrProvider);
}

export function getRefineryContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(ADDRESSES.refinery, REFINERY_ABI, signerOrProvider);
}

export { ERC20_ABI, MINER_NFT_ABI, REFINERY_ABI };