// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MinerNFT} from "./MinerNFT.sol";

/// @title Stack Refinery — on-chain idle mining game
/// @notice Players open a facility, place drill rigs on a grid, and earn STACK
///         every second proportional to their share of network hashrate.
///
/// STACK is an external fixed-supply token (1B, launched on ponz.family), so
/// the game cannot mint. Rewards are paid from a treasury held by this
/// contract: fund it with STACK (fundRewards or a plain transfer) and claims
/// draw it down. If the pool runs dry, claims are clipped to what's left —
/// pending accrual is preserved and becomes claimable again when refunded.
///
/// Burns send tokens to 0xdEaD (fixed-supply launchpad tokens have no burn),
/// and the 25% game cut of purchases recycles straight into the reward pool.
///
/// Emission: `initialRatePerSec` at launch (default 3M STACK/day), halving
/// every 13,680,000 seconds (~158.3 days). Rewards use a masterchef-style
/// accumulator integrated piecewise across halving boundaries.
///
/// Referrals: 4.5% of every gross claim is carved out. The direct referrer
/// earns 1–3% (by tier), the second-level referrer earns half the direct
/// reward, and the remainder goes to the dev wallet. Players always receive
/// 95.5% of gross. With no referrer the full 4.5% stays in the reward pool.
contract StackRefinery is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------------
    // Config constants
    // ------------------------------------------------------------------

    uint256 public constant HALVING_INTERVAL = 13_680_000; // seconds
    uint256 public constant UPGRADE_COOLDOWN = 24 hours;
    uint256 public constant REMOVAL_COOLDOWN = 24 hours;
    uint256 public constant CLAIM_COOLDOWN = 1 hours;
    uint256 public constant PRECISION = 1e12;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    /// @notice Sustainability: emission is throttled so the reward pool
    ///         always covers at least this many seconds at the current
    ///         rate. The pool can therefore never abruptly run dry — at
    ///         worst it decays while purchases refill it.
    uint256 public constant MIN_RUNWAY = 60 days;

    /// @notice Compounding pending rewards into a miner is 10% cheaper
    ///         than claiming and buying, and skips the referral carve-out.
    uint256 public constant COMPOUND_DISCOUNT_BPS = 1_000;

    uint256 public constant REFERRAL_CUT_BPS = 450; // total carve-out
    uint256 public constant TIER2_THRESHOLD = 500_000e18; // gross referred
    uint256 public constant TIER3_THRESHOLD = 2_500_000e18;

    struct MinerTierInfo {
        uint256 hashrate;
        uint256 price; // in STACK (18 decimals)
        uint8 cells; // 1 = 1x1, 4 = 2x2
        uint256 power; // power draw
    }

    struct FacilityTierInfo {
        uint8 gridSize;
        uint256 power; // capacity
        uint256 upgradeCost; // in STACK
    }

    MinerTierInfo[5] private minerTiers;
    FacilityTierInfo[6] private facilityTiers; // index 1..5

    // ------------------------------------------------------------------
    // External contracts / wallets
    // ------------------------------------------------------------------

    IERC20 public immutable stackToken;
    MinerNFT public immutable minerNFT;
    address public devWallet;
    uint256 public entryFee = 0.001 ether;

    // ------------------------------------------------------------------
    // Emission state
    // ------------------------------------------------------------------

    uint256 public immutable launchTime;
    uint256 public immutable initialRatePerSec; // wei STACK / sec
    uint256 public accPerHash; // scaled by PRECISION
    uint256 public lastAccUpdate;
    uint256 public totalNetworkHashrate;

    // Treasury accounting
    uint256 public totalRewardsPaid; // cumulative gross claims
    uint256 public totalBurned; // cumulative sent to DEAD by the game

    // ------------------------------------------------------------------
    // Player state
    // ------------------------------------------------------------------

    struct Facility {
        bool exists;
        uint8 tier;
        uint256 powerUsed;
        uint256 lastUpgrade;
        uint64 gridMask; // occupancy bitmask, bit = y * 8 + x (stride 8)
        uint256 hashrate;
        uint256 rewardDebt; // hashrate * accPerHash at last settle
        uint256 unclaimed; // settled but unclaimed rewards
        uint256 lastClaim;
    }

    struct PlacedMiner {
        address owner;
        uint8 x;
        uint8 y;
        uint64 placedAt;
    }

    mapping(address => Facility) private facilities;
    mapping(uint256 => PlacedMiner) public placedMiners; // tokenId => placement

    // Referrals
    mapping(address => string) private _referralCode; // wallet => code
    mapping(bytes32 => address) private _codeOwner; // keccak(code) => wallet
    mapping(address => address) public referrer;
    mapping(address => uint256) public referredVolume; // gross claims of referees

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event FacilityOpened(address indexed player, address indexed referrer);
    event MinerPurchased(address indexed player, uint8 tier, uint256 tokenId);
    event MinerPlaced(address indexed player, uint256 tokenId, uint8 x, uint8 y);
    event MinerRemoved(address indexed player, uint256 tokenId);
    event FacilityUpgraded(address indexed player, uint8 newTier);
    event RewardsClaimed(address indexed player, uint256 net, uint256 gross);
    event RewardsFunded(address indexed funder, uint256 amount);
    event ReferralPaid(address indexed referrer, address indexed source, uint256 amount);
    event ReferralCodeCreated(address indexed player, string code);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error WrongEntryFee();
    error AlreadyEntered();
    error NoFacility();
    error InvalidTier();
    error InvalidCode();
    error CodeTaken();
    error CodeAlreadyCreated();
    error SelfReferral();
    error NotMinerOwner();
    error AlreadyPlaced();
    error NotPlaced();
    error OutOfBounds();
    error CellOccupied();
    error PowerExceeded();
    error Cooldown();
    error MaxTier();
    error NothingToClaim();
    error ZeroAddress();

    constructor(
        address stackToken_,
        address minerNFT_,
        address devWallet_,
        uint256 initialRatePerSec_
    ) Ownable(msg.sender) {
        if (stackToken_ == address(0) || minerNFT_ == address(0) || devWallet_ == address(0)) {
            revert ZeroAddress();
        }
        stackToken = IERC20(stackToken_);
        minerNFT = MinerNFT(minerNFT_);
        devWallet = devWallet_;

        launchTime = block.timestamp;
        lastAccUpdate = block.timestamp;
        // default: 3M STACK/day (1B-supply scale)
        initialRatePerSec = initialRatePerSec_ == 0
            ? 3_000_000e18 / uint256(86_400)
            : initialRatePerSec_;

        minerTiers[0] = MinerTierInfo(1, 0, 1, 1); // T0 Hand Drill (free)
        minerTiers[1] = MinerTierInfo(5, 1_000e18, 1, 3); // T1 Drill Rig
        minerTiers[2] = MinerTierInfo(25, 5_000e18, 1, 8); // T2 Pump Jack
        minerTiers[3] = MinerTierInfo(100, 20_000e18, 4, 20); // T3 Excavator
        minerTiers[4] = MinerTierInfo(500, 80_000e18, 4, 60); // T4 Mega Rig

        facilityTiers[1] = FacilityTierInfo(2, 10, 0); // Starter Site
        facilityTiers[2] = FacilityTierInfo(3, 25, 10_000e18); // Small Refinery
        facilityTiers[3] = FacilityTierInfo(4, 60, 50_000e18); // Medium Refinery
        facilityTiers[4] = FacilityTierInfo(5, 150, 200_000e18); // Large Refinery
        facilityTiers[5] = FacilityTierInfo(6, 400, 1_000_000e18); // Mega Refinery
    }

    // ------------------------------------------------------------------
    // Treasury
    // ------------------------------------------------------------------

    /// @notice Current reward pool balance (also grows from the 25% game cut
    ///         of purchases and no-referrer carve-outs staying put).
    function rewardPool() public view returns (uint256) {
        return stackToken.balanceOf(address(this));
    }

    /// @notice Top up the reward pool. Anyone can fund. A direct ERC-20
    ///         transfer to this contract works too; this just adds an event.
    function fundRewards(uint256 amount) external {
        stackToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsFunded(msg.sender, amount);
    }

    // ------------------------------------------------------------------
    // Emission accounting
    // ------------------------------------------------------------------

    /// @dev Schedule rate for a halving epoch, before the runway throttle.
    function _scheduleRate(uint256 epoch) internal view returns (uint256) {
        if (epoch > 63) return 0;
        return initialRatePerSec >> epoch;
    }

    /// @dev Runway throttle: never emit faster than the pool can sustain
    ///      for MIN_RUNWAY. Recomputed at every state-changing interaction
    ///      (the pool is constant in between, so integration stays exact).
    function _runwayCap() internal view returns (uint256) {
        return rewardPool() / MIN_RUNWAY;
    }

    /// @notice Current effective emission rate (wei STACK / sec) after
    ///         halvings and the sustainability throttle.
    function emissionRatePerSec() public view returns (uint256) {
        uint256 epoch = (block.timestamp - launchTime) / HALVING_INTERVAL;
        uint256 rate = _scheduleRate(epoch);
        uint256 cap = _runwayCap();
        return rate < cap ? rate : cap;
    }

    function nextHalvingTimestamp() external view returns (uint256) {
        uint256 epoch = (block.timestamp - launchTime) / HALVING_INTERVAL;
        return launchTime + (epoch + 1) * HALVING_INTERVAL;
    }

    /// @dev Integrates emission since the last update into accPerHash,
    ///      stepping across halving boundaries so each segment uses the
    ///      rate that was actually in force.
    function _updateAcc() internal {
        uint256 from = lastAccUpdate;
        uint256 to = block.timestamp;
        if (to <= from) return;
        lastAccUpdate = to;
        if (totalNetworkHashrate == 0) return;

        uint256 cap = _runwayCap();
        uint256 acc = accPerHash;
        while (from < to) {
            uint256 epoch = (from - launchTime) / HALVING_INTERVAL;
            uint256 epochEnd = launchTime + (epoch + 1) * HALVING_INTERVAL;
            uint256 segEnd = epochEnd < to ? epochEnd : to;
            uint256 rate = _scheduleRate(epoch);
            if (cap < rate) rate = cap;
            acc += (rate * (segEnd - from) * PRECISION) / totalNetworkHashrate;
            from = segEnd;
        }
        accPerHash = acc;
    }

    /// @dev Settle a player's earned-so-far into `unclaimed` before any
    ///      change to their hashrate or the network hashrate.
    function _settle(address player) internal {
        _updateAcc();
        Facility storage f = facilities[player];
        if (f.hashrate > 0) {
            f.unclaimed += (f.hashrate * accPerHash) / PRECISION - f.rewardDebt;
        }
        f.rewardDebt = (f.hashrate * accPerHash) / PRECISION;
    }

    /// @dev View-only version of the accumulator for pendingRewards().
    function _accPerHashNow() internal view returns (uint256) {
        if (totalNetworkHashrate == 0 || block.timestamp <= lastAccUpdate) {
            return accPerHash;
        }
        uint256 from = lastAccUpdate;
        uint256 to = block.timestamp;
        uint256 cap = _runwayCap();
        uint256 acc = accPerHash;
        while (from < to) {
            uint256 epoch = (from - launchTime) / HALVING_INTERVAL;
            uint256 epochEnd = launchTime + (epoch + 1) * HALVING_INTERVAL;
            uint256 segEnd = epochEnd < to ? epochEnd : to;
            uint256 rate = _scheduleRate(epoch);
            if (cap < rate) rate = cap;
            acc += (rate * (segEnd - from) * PRECISION) / totalNetworkHashrate;
            from = segEnd;
        }
        return acc;
    }

    // ------------------------------------------------------------------
    // Game actions
    // ------------------------------------------------------------------

    /// @notice Open a facility. Pays the entry fee and grants a free Hand
    ///         Drill auto-placed at cell (0,0).
    function enterFacility(string calldata referralCode_)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (msg.value != entryFee) revert WrongEntryFee();
        Facility storage f = facilities[msg.sender];
        if (f.exists) revert AlreadyEntered();

        // Resolve referrer (optional). Self-referral and 2-wallet loops rejected.
        address ref = address(0);
        if (bytes(referralCode_).length > 0) {
            ref = _codeOwner[keccak256(bytes(referralCode_))];
            if (ref == msg.sender) revert SelfReferral();
            if (ref != address(0) && referrer[ref] == msg.sender) revert SelfReferral();
            if (ref != address(0)) referrer[msg.sender] = ref;
        }

        _settle(msg.sender);

        f.exists = true;
        f.tier = 1;
        f.lastClaim = block.timestamp;

        // Free T0 Hand Drill at (0,0)
        MinerTierInfo memory t0 = minerTiers[0];
        f.gridMask = 1; // bit 0 = cell (0,0)
        f.powerUsed = t0.power;
        f.hashrate = t0.hashrate;
        totalNetworkHashrate += t0.hashrate;
        f.rewardDebt = (f.hashrate * accPerHash) / PRECISION;

        emit FacilityOpened(msg.sender, ref);
    }

    /// @notice Buy a miner NFT with STACK. 75% of the price is burned (sent
    ///         to 0xdEaD), 25% recycles into the reward pool. The rig still
    ///         needs placing.
    function buyMiner(uint8 tier) external whenNotPaused nonReentrant {
        if (tier < 1 || tier > 4) revert InvalidTier();
        Facility storage f = facilities[msg.sender];
        if (!f.exists) revert NoFacility();

        uint256 price = minerTiers[tier].price;
        uint256 burnAmount = (price * 75) / 100;

        stackToken.safeTransferFrom(msg.sender, DEAD, burnAmount);
        stackToken.safeTransferFrom(msg.sender, address(this), price - burnAmount);
        totalBurned += burnAmount;

        uint256 tokenId = minerNFT.mint(msg.sender, tier);
        emit MinerPurchased(msg.sender, tier, tokenId);
    }

    /// @notice Place an owned rig on the facility grid. 2x2 rigs occupy
    ///         (x,y)..(x+1,y+1). Grid coordinates are 0-indexed.
    function placeMiner(uint256 tokenId, uint8 x, uint8 y)
        external
        whenNotPaused
        nonReentrant
    {
        Facility storage f = facilities[msg.sender];
        if (!f.exists) revert NoFacility();
        if (minerNFT.ownerOf(tokenId) != msg.sender) revert NotMinerOwner();
        if (placedMiners[tokenId].owner != address(0)) revert AlreadyPlaced();

        uint8 tier = minerNFT.minerTier(tokenId);
        MinerTierInfo memory info = minerTiers[tier];
        uint8 side = info.cells == 4 ? 2 : 1;
        uint8 gridSize = facilityTiers[f.tier].gridSize;
        if (x + side > gridSize || y + side > gridSize) revert OutOfBounds();

        uint64 mask = _footprint(x, y, side);
        if (f.gridMask & mask != 0) revert CellOccupied();
        if (f.powerUsed + info.power > facilityTiers[f.tier].power) {
            revert PowerExceeded();
        }

        _settle(msg.sender);

        f.gridMask |= mask;
        f.powerUsed += info.power;
        f.hashrate += info.hashrate;
        totalNetworkHashrate += info.hashrate;
        f.rewardDebt = (f.hashrate * accPerHash) / PRECISION;

        placedMiners[tokenId] = PlacedMiner(msg.sender, x, y, uint64(block.timestamp));
        emit MinerPlaced(msg.sender, tokenId, x, y);
    }

    /// @notice Remove a rig from the grid (24h cooldown after placing).
    function removeMiner(uint256 tokenId) external whenNotPaused nonReentrant {
        PlacedMiner memory p = placedMiners[tokenId];
        if (p.owner != msg.sender) revert NotPlaced();
        if (block.timestamp < p.placedAt + REMOVAL_COOLDOWN) revert Cooldown();

        uint8 tier = minerNFT.minerTier(tokenId);
        MinerTierInfo memory info = minerTiers[tier];
        uint8 side = info.cells == 4 ? 2 : 1;

        _settle(msg.sender);

        Facility storage f = facilities[msg.sender];
        f.gridMask &= ~_footprint(p.x, p.y, side);
        f.powerUsed -= info.power;
        f.hashrate -= info.hashrate;
        totalNetworkHashrate -= info.hashrate;
        f.rewardDebt = (f.hashrate * accPerHash) / PRECISION;

        delete placedMiners[tokenId];
        emit MinerRemoved(msg.sender, tokenId);
    }

    /// @notice Upgrade the facility to the next tier (24h cooldown).
    ///         Cost is paid in STACK: 75% burned, 25% to the reward pool.
    function upgradeFacility() external whenNotPaused nonReentrant {
        Facility storage f = facilities[msg.sender];
        if (!f.exists) revert NoFacility();
        if (f.tier >= 5) revert MaxTier();
        if (f.lastUpgrade != 0 && block.timestamp < f.lastUpgrade + UPGRADE_COOLDOWN) {
            revert Cooldown();
        }

        uint256 cost = facilityTiers[f.tier + 1].upgradeCost;
        uint256 burnAmount = (cost * 75) / 100;
        stackToken.safeTransferFrom(msg.sender, DEAD, burnAmount);
        stackToken.safeTransferFrom(msg.sender, address(this), cost - burnAmount);
        totalBurned += burnAmount;

        f.tier += 1;
        f.lastUpgrade = block.timestamp;
        emit FacilityUpgraded(msg.sender, f.tier);
    }

    /// @notice Claim pending STACK from the reward pool. Routes the 4.5%
    ///         referral carve-out and transfers the remaining 95.5% to the
    ///         player. If the pool is short, the claim is clipped to the
    ///         pool balance and the rest stays pending.
    function claimRewards() external whenNotPaused nonReentrant {
        Facility storage f = facilities[msg.sender];
        if (!f.exists) revert NoFacility();

        if (block.timestamp < f.lastClaim + CLAIM_COOLDOWN) revert Cooldown();

        _settle(msg.sender);
        uint256 gross = f.unclaimed;
        if (gross == 0) revert NothingToClaim();

        uint256 pool = rewardPool();
        if (gross > pool) gross = pool;
        if (gross == 0) revert NothingToClaim();
        f.unclaimed -= gross;
        f.lastClaim = block.timestamp;
        totalRewardsPaid += gross;

        uint256 cut = (gross * REFERRAL_CUT_BPS) / 10_000;
        uint256 net = gross - cut;

        address direct = referrer[msg.sender];
        if (direct != address(0)) {
            // Rate is based on volume accrued before this claim.
            uint256 directAmt = (gross * _referralRateBps(direct)) / 10_000;
            referredVolume[direct] += gross;
            uint256 secondAmt = directAmt / 2;
            address second = referrer[direct];

            stackToken.safeTransfer(direct, directAmt);
            emit ReferralPaid(direct, msg.sender, directAmt);

            if (second != address(0)) {
                stackToken.safeTransfer(second, secondAmt);
                emit ReferralPaid(second, msg.sender, secondAmt);
            }

            uint256 devAmt = cut - directAmt - (second != address(0) ? secondAmt : 0);
            if (devAmt > 0) stackToken.safeTransfer(devWallet, devAmt);
        }
        // No referrer: the full carve-out simply stays in the reward pool.

        stackToken.safeTransfer(msg.sender, net);
        emit RewardsClaimed(msg.sender, net, gross);
    }

    /// @notice Compound pending rewards straight into a miner NFT at a 10%
    ///         discount — no claim, no referral carve-out, no cooldown.
    ///         The burn share (75% of the discounted price) leaves the pool
    ///         for 0xdEaD; the rest simply stays in the pool. This is the
    ///         sustainability loop: rewards that never hit the market.
    function compound(uint8 tier) external whenNotPaused nonReentrant {
        if (tier < 1 || tier > 4) revert InvalidTier();
        Facility storage f = facilities[msg.sender];
        if (!f.exists) revert NoFacility();

        _settle(msg.sender);
        uint256 cost = (minerTiers[tier].price * (10_000 - COMPOUND_DISCOUNT_BPS)) / 10_000;
        if (f.unclaimed < cost) revert NothingToClaim();

        uint256 burnAmount = (cost * 75) / 100;
        uint256 pool = rewardPool();
        if (burnAmount > pool) revert NothingToClaim();

        f.unclaimed -= cost;
        totalRewardsPaid += cost;
        totalBurned += burnAmount;
        stackToken.safeTransfer(DEAD, burnAmount);
        // the remaining 25% of the cost never leaves the pool

        uint256 tokenId = minerNFT.mint(msg.sender, tier);
        emit MinerPurchased(msg.sender, tier, tokenId);
    }

    /// @notice Register a permanent referral code (5–32 chars, a-z0-9).
    function createReferralCode(string calldata code) external whenNotPaused {
        if (bytes(_referralCode[msg.sender]).length != 0) revert CodeAlreadyCreated();
        bytes memory b = bytes(code);
        if (b.length < 5 || b.length > 32) revert InvalidCode();
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool lower = c >= 0x61 && c <= 0x7a; // a-z
            bool digit = c >= 0x30 && c <= 0x39; // 0-9
            if (!lower && !digit) revert InvalidCode();
        }
        bytes32 key = keccak256(b);
        if (_codeOwner[key] != address(0)) revert CodeTaken();
        _codeOwner[key] = msg.sender;
        _referralCode[msg.sender] = code;
        emit ReferralCodeCreated(msg.sender, code);
    }

    // ------------------------------------------------------------------
    // Views (shape matches the frontend ABI)
    // ------------------------------------------------------------------

    function hasFacility(address player) external view returns (bool) {
        return facilities[player].exists;
    }

    function facilityTier(address player) external view returns (uint8) {
        return facilities[player].tier;
    }

    function facilityGridSize(address player) external view returns (uint8) {
        Facility storage f = facilities[player];
        return f.exists ? facilityTiers[f.tier].gridSize : 0;
    }

    function facilityPower(address player) external view returns (uint256) {
        Facility storage f = facilities[player];
        return f.exists ? facilityTiers[f.tier].power : 0;
    }

    function facilityPowerUsed(address player) external view returns (uint256) {
        return facilities[player].powerUsed;
    }

    function facilityLastUpgrade(address player) external view returns (uint256) {
        return facilities[player].lastUpgrade;
    }

    function facilityGridMask(address player) external view returns (uint64) {
        return facilities[player].gridMask;
    }

    function playerHashrate(address player) external view returns (uint256) {
        return facilities[player].hashrate;
    }

    function pendingRewards(address player) external view returns (uint256) {
        Facility storage f = facilities[player];
        uint256 pending = f.unclaimed;
        if (f.hashrate > 0) {
            pending += (f.hashrate * _accPerHashNow()) / PRECISION - f.rewardDebt;
        }
        return pending;
    }

    function lastClaim(address player) external view returns (uint256) {
        return facilities[player].lastClaim;
    }

    function referralCode(address player) external view returns (string memory) {
        return _referralCode[player];
    }

    function referralCodeOwner(string calldata code) external view returns (address) {
        return _codeOwner[keccak256(bytes(code))];
    }

    /// @notice Referral tier (1–3) from gross referred volume.
    function referralTier(address player) external view returns (uint8) {
        uint256 vol = referredVolume[player];
        if (vol >= TIER3_THRESHOLD) return 3;
        if (vol >= TIER2_THRESHOLD) return 2;
        return 1;
    }

    // solhint-disable-next-line func-name-mixedcase
    function MINER_TIERS(uint8 tier)
        external
        view
        returns (uint256 hashrate, uint256 price, uint8 cells, uint256 power)
    {
        if (tier > 4) revert InvalidTier();
        MinerTierInfo memory t = minerTiers[tier];
        return (t.hashrate, t.price, t.cells, t.power);
    }

    // solhint-disable-next-line func-name-mixedcase
    function FACILITY_TIERS(uint8 tier)
        external
        view
        returns (uint8 gridSize, uint256 power, uint256 upgradeCost)
    {
        if (tier < 1 || tier > 5) revert InvalidTier();
        FacilityTierInfo memory t = facilityTiers[tier];
        return (t.gridSize, t.power, t.upgradeCost);
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    function setEntryFee(uint256 fee) external onlyOwner {
        entryFee = fee;
    }

    function setDevWallet(address wallet) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        devWallet = wallet;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Withdraw collected ETH entry fees to the dev wallet.
    function withdrawFees() external onlyOwner {
        (bool ok,) = devWallet.call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _referralRateBps(address ref) internal view returns (uint256) {
        uint256 vol = referredVolume[ref];
        if (vol >= TIER3_THRESHOLD) return 300; // 3.0%
        if (vol >= TIER2_THRESHOLD) return 175; // 1.75%
        return 100; // 1.0%
    }

    /// @dev Occupancy bits for a side x side square at (x,y), stride 8.
    function _footprint(uint8 x, uint8 y, uint8 side)
        internal
        pure
        returns (uint64 mask)
    {
        for (uint8 dy = 0; dy < side; dy++) {
            for (uint8 dx = 0; dx < side; dx++) {
                mask |= uint64(1) << ((y + dy) * 8 + (x + dx));
            }
        }
    }
}
