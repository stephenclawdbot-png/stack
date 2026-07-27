# Stack Refinery - Build Document

## What We're Building

A clone of KittyMining.co: an on-chain idle mining game on Robinhood Chain (EVM L2, chainId 4663). Players open a refinery, place drill rigs, and earn STACK tokens every second proportional to their hashrate share of the network.

## Tech Stack

- **Chain**: Robinhood Chain (EVM L2, chainId 4663, native ETH)
- **Contracts**: Solidity, compiled with Hardhat
- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v3
- **Web3**: ethers v6 (direct, no wagmi dependency for wallet)
- **Wallet**: MetaMask or Phantom (EVM mode) via window.ethereum
- **Assets**: PixelLab API (pixel art sprites, UI panels, token icons)
- **Deploy**: Frontend on Vercel (meowdotfun workspace), contracts on Robinhood Chain
- **Repo**: github.com/stephenclawdbot-png/stack

## Project Structure

```
stack-refinery/
├── contracts/
│   ├── src/
│   │   ├── StackToken.sol       # ERC-20, 100M cap, game-mintable, burnable
│   │   ├── MinerNFT.sol         # ERC-721, paid miners with hashrate metadata
│   │   └── StackRefinery.sol    # Main game logic (everything)
│   ├── test/
│   ├── hardhat.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root, hash-based routing
│   │   ├── main.tsx             # Entry, QueryClientProvider
│   │   ├── index.css            # Tailwind + custom styles
│   │   ├── config.ts            # Chain config, miner/facility/referral tiers
│   │   ├── lib/
│   │   │   ├── useWallet.ts     # Wallet connect/disconnect/switch chain hook
│   │   │   ├── useGame.ts       # Game state polling + contract actions
│   │   │   ├── contracts.ts     # ABI fragments, contract getters
│   │   │   └── format.ts        # Formatting helpers (STACK, ETH, hashrate)
│   │   ├── components/
│   │   │   ├── Icons.tsx        # Inline SVG icons + LinkButton
│   │   │   ├── ConnectButton.tsx
│   │   │   ├── StatsBar.tsx     # Hashrate, pending, network, balance
│   │   │   ├── EnterFacility.tsx # Entry screen (pay 0.001 ETH)
│   │   │   ├── RefineryGrid.tsx  # Facility grid + power bar + upgrade
│   │   │   ├── MinerShop.tsx     # Buy miners (T1-T4)
│   │   │   ├── ClaimPanel.tsx    # Claim pending STACK
│   │   │   └── ReferralPanel.tsx # Create code, share link, tier display
│   │   └── pages/
│   │       ├── GamePage.tsx     # Main game (connect -> enter -> play)
│   │       ├── DocsPage.tsx     # How it works, economy, tiers, referrals
│   │       ├── AboutPage.tsx    # Project description
│   │       └── ReferralPage.tsx # Standalone referral management
│   ├── tailwind.config.js
│   ├── package.json
│   └── vite.config.ts
├── .env.local                   # Private: deployer key, RPC URLs (gitignored)
├── BUILD.md                     # This file
└── README.md
```

## Game Mechanics

### The Loop
1. **Open facility**: Pay 0.001 ETH entry (optional referrer code)
2. **Free starter**: Get a Hand Drill (not NFT, 1 H/s hashrate)
3. **Buy miners**: Purchase ERC-721 drill rigs with STACK, place on grid
4. **Earn every second**: share = your_hashrate / total_network_hashrate * emission_rate
5. **Claim & compound**: Claim STACK, buy stronger miners, upgrade facility

### Tokenomics
- **STACK**: ERC-20, 18 decimals, 100M max supply
- **Premint**: 5M STACK for launch liquidity (to deployer)
- **Emission**: 300K STACK/day at launch
- **Halving**: Every 13,680,000 seconds (~158.3 days)
- **Burn**: 75% of miner purchases burned forever, 25% to game balance
- **Cap accounting**: Burned tokens still count against the 100M cap

### Miner Tiers
| Tier | Name | Hashrate | Price (STACK) | Cells | Power Draw | NFT? |
|------|------|----------|-------------|-------|-----------|------|
| T0 | Hand Drill | 1 | Free | 1 | 1 | No |
| T1 | Drill Rig | 5 | 100 | 1 | 3 | Yes |
| T2 | Pump Jack | 25 | 500 | 1 | 8 | Yes |
| T3 | Excavator | 100 | 2,000 | 4 (2x2) | 20 | Yes |
| T4 | Mega Rig | 500 | 8,000 | 4 (2x2) | 60 | Yes |

Power draw per tier was unspecified in the original design; the values above
are now canonical (implemented in StackRefinery.sol). They size facility
power so each facility tier meaningfully constrains loadouts (e.g. Starter
Site's 10 power fits the Hand Drill + one T2, or Hand Drill + three T1s).

### Facility Tiers
| Tier | Name | Grid | Cells | Power | Upgrade Cost |
|------|------|------|-------|-------|------------|
| 1 | Starter Site | 2x2 | 4 | 10 | - |
| 2 | Small Refinery | 3x3 | 9 | 25 | 1,000 STACK |
| 3 | Medium Refinery | 4x4 | 16 | 60 | 5,000 STACK |
| 4 | Large Refinery | 5x5 | 25 | 150 | 20,000 STACK |
| 5 | Mega Refinery | 6x6 | 36 | 400 | 100,000 STACK |

- Upgrade cooldown: 24 hours
- Each miner consumes power. Facility power limits how many miners you can place.

### Referral System
- One permanent code per wallet (5-32 lowercase alphanumeric)
- 2-level referral: direct + second-level (referrer's referrer)
- 4.5% total cut from claims:
  - Direct referrer: 1-3% by tier (from 4.5% cut)
  - Second-level: 50% of direct referrer's reward
  - Remainder: dev wallet
- Miner always gets 95.5% of gross claim
- No referrer? Full 4.5% stays in game contract

| Tier | Rate | Threshold (gross referred STACK) |
|------|------|-------------------------------|
| 1 | 1.0% | 0+ |
| 2 | 1.75% | 50,000+ |
| 3 | 3.0% | 250,000+ |

- Self-referrals and two-wallet loops rejected on-chain

## Contracts to Write

### StackToken.sol
- ERC-20 with 18 decimals
- 100M max supply (100,000,000 * 1e18)
- `mint(address to, uint256 amount)` - only callable by StackRefinery
- `burn(uint256 amount)` - public burnable
- `burnFrom(address, uint256)` - approve-and-burn
- Track `totalMinted` and `totalBurned` (burned counts against cap)

### MinerNFT.sol
- ERC-721 with minting
- Each token stores: tier (uint8), hashrate (uint256)
- `mint(address to, uint8 tier)` - only callable by StackRefinery
- `minerTier(uint256 tokenId) -> uint8`
- `minerHashrate(uint256 tokenId) -> uint256`
- Enumerable extension for balance tracking

### StackRefinery.sol
- Main game contract, holds all logic:
  - `enterFacility(string referralCode)` - payable, 0.001 ETH entry
  - `claimRewards()` - claim pending STACK, route referral cuts
  - `buyMiner(uint8 tier)` - burn 75% of price, 25% to game balance, mint NFT
  - `placeMiner(uint256 tokenId, uint8 x, uint8 y)` - place on grid
  - `removeMiner(uint256 tokenId)` - remove from grid (24h cooldown)
  - `upgradeFacility()` - upgrade to next tier (24h cooldown, pay STACK)
  - `createReferralCode(string code)` - one per wallet, permanent
  - Emission calculation: `pending = hashrateShare * elapsed * rate`
  - Halving logic: rate halves every 13,680,000 seconds
  - Cap enforcement: no minting past 100M (burned counts)
  - Referral routing on claim
  - View functions for all game state

## Visual Design

### Color Palette
- Background: #071b27 (dark teal/navy)
- Surface: #0d2535 (panel bg)
- Surface-2: #142e3f (elevated)
- Border: #1e3a4f
- Accent (amber/heat): #f59e0b
- Secondary (cyan/tech): #06b6d4
- Text: #e2e8f0 / #f8fafc
- Positive: #34d399, Warn: #fbbf24, Danger: #ef4444

### Fonts
- Headings: Prompt (600 weight)
- Body: Fira Sans (400/700)
- Mono: Fira Code

### PixelLab Assets
Generated via PixelLab API. All tagged `stack-refinery` for filtering.

**UI Panels (create_ui_asset):**
1. `refinery-panel` (512x384) - main control panel - DONE
2. `header-banner` (688x192) - game header - processing
3. `stat-panel` (512x192) - stats display - processing
4. `shop-panel` (512x384) - miner shop frame - processing
5. `claim-panel` (688x256) - claim rewards console - processing
6. `referral-panel` (512x288) - referral program - processing
7. `grid-panel` (384x384) - facility grid background - processing
8. `enter-panel` (512x384) - entry screen - processing
9. `footer-bar` (688x192) - footer decoration - processing
10. `docs-panel` (512x384) - docs page frame - processing

**Miner Sprites (create_1_direction_object):**
1. T0 Hand Drill (32x32) - generated, in review
2. T1 Drill Rig (64x64) - generated, in review
3. T2 Pump Jack (80x80) - generated, in review
4. T3 Excavator (96x96) - generated, in review
5. T4 Mega Rig (128x128) - generated, in review
6. Token Icon (48x48) - golden gear coin - generated, in review
7. Refinery Building (128x128) - factory exterior - generated, in review

**Decorative Objects (create_1_direction_object):**
8. Conveyor Belt (96x96) - processing
9. Ore Pile (48x48) - processing
10. Control Terminal (64x64) - processing
11. Storage Tank (96x96) - processing
12. Smelter Furnace (96x96) - processing
13. Pipe Valve (32x32) - processing
14. Hazard Sign (32x32) - processing
15. Crane (128x128) - processing

**Characters (create_character):**
1. Refinery Worker (48px, 8-dir) - hard hat, orange vest, wrench - processing
2. Mining Foreman (48px, 8-dir) - grey hat, clipboard, yellow vest - processing
3. Drill Bot (48px, 8-dir) - mechanical mining automaton - processing

## Implementation Notes (filled during Phase 3)

- **Solidity 0.8.28, EVM target cancun** — OpenZeppelin v5.6 requires the
  `mcopy` opcode. Verify Robinhood Chain supports Cancun opcodes before
  mainnet deploy; if not, downgrade OZ to 5.0.x and retarget shanghai.
- **Grid occupancy** is a uint64 bitmask with a fixed stride of 8
  (`bit = y * 8 + x`), so upgrading facility size never re-indexes placed
  miners. 2x2 rigs occupy (x,y)..(x+1,y+1).
- **Emission accounting** is a masterchef-style accumulator
  (`accPerHash`, PRECISION 1e12) integrated piecewise across halving
  boundaries — no per-player loops, O(1) per action.
- **Referral tier rates are based on volume accrued *before* the current
  claim**, so a single large claim can't bump its own payout tier.
- **The free T0 Hand Drill** is virtual (not an NFT), auto-placed at cell
  (0,0) on entry, and cannot be removed.
- **Buying/upgrading requires STACK approval** — the game pulls funds via
  `burnFrom`/`transferFrom`. The frontend `useGame` hook auto-approves
  (max allowance) before `buyMiner`/`upgradeFacility`.
- **Cap clipping**: claims are clipped to `remainingMintable()`; emission
  effectively ends when 100M total minted is reached.
- **Token/NFT wiring is one-shot**: `setRefinery()` can only be called once
  on each of StackToken and MinerNFT.

## Build Phases

### Phase 1: Frontend Skeleton [DONE]
- [x] Scaffold Vite + React + TS
- [x] Install deps: ethers v6, tailwind v3, @tanstack/react-query
- [x] Configure Tailwind with custom palette
- [x] Create config.ts (chain, tiers, constants)
- [x] Create lib/ (useWallet, useGame, contracts, format)
- [x] Create components/ (Icons, ConnectButton, StatsBar, EnterFacility, RefineryGrid, MinerShop, ClaimPanel, ReferralPanel)
- [x] Create pages/ (GamePage, DocsPage, AboutPage, ReferralPage)
- [x] Wire up App.tsx with navbar + hash routing
- [x] Style with industrial dark theme

### Phase 2: PixelLab Assets [IN PROGRESS]
- [x] Generate main UI panel (refinery-panel)
- [x] Generate miner sprites (T0-T4 + token icon + refinery building)
- [x] Generate decorative objects (conveyor, ore, terminal, tank, smelter, valve, sign, crane)
- [x] Generate characters (refinery worker, foreman, drill bot)
- [x] Generate additional UI panels (header, stats, shop, claim, referral, grid, enter, footer, docs)
- [x] Select best frames from review candidates
- [x] Download assets to frontend/src/assets/
- [x] Wire sprites into UI components

### Phase 3: Solidity Contracts [DONE]
- [x] Set up Hardhat in contracts/ directory (Hardhat 2.29, toolbox 5, TS pinned to 5.4.5 — newer TS breaks ts-node)
- [x] Install OpenZeppelin contracts (v5.6)
- [x] Write StackToken.sol (100M cap, 5M premint, burn counts against cap, refinery-only mint)
- [x] Write MinerNFT.sol (ERC-721 Enumerable, tier + hashrate per token, refinery-only mint)
- [x] Write StackRefinery.sol (entry, emission + halving, buy/place/remove miners, upgrades, referrals, pause, fee withdrawal)
- [x] Write deployment script (scripts/deploy.ts — deploys all 3, wires refinery, prints frontend config)
- [x] Write tests (test/StackRefinery.test.ts — 19 passing: cap, emission, halving boundary, referral routing/loops, grid/power limits, cooldowns, admin)
- [x] Compile green (`npm run compile` / `npm test` in contracts/)

### Phase 4: Wire Frontend to Contracts [IN PROGRESS]
- [x] Frontend builds clean (`npm run build` — fixed unused-import TS errors)
- [x] ABI fragments match deployed contract signatures (incl. MINER_TIERS power field, facilityGridMask)
- [x] Auto-approve STACK allowance before buyMiner/upgradeFacility
- [x] placeMiner/removeMiner actions in useGame hook
- [ ] Deploy contracts + update config.ts ADDRESSES (still zero addresses)
- [ ] Grid placement UI: let the player pick a cell and call placeMiner with real coordinates (RefineryGrid currently renders occupancy heuristically from minerCount; use facilityGridMask + NFT enumeration)
- [ ] Miner inventory panel (owned-but-unplaced rigs)
- [ ] Test all contract interactions end-to-end on a testnet/local node
- [ ] Polish UI based on real data
- [ ] Add error handling and tx notifications

### Phase 5: Deploy [NOT STARTED]
- [ ] Deploy contracts to Robinhood Chain
- [ ] Verify contracts on explorer
- [ ] Add liquidity (5M STACK premint)
- [ ] Deploy frontend to Vercel
- [ ] Test end-to-end on mainnet

## Deployment

### Contracts
```bash
cd contracts
npm install
npm run compile
npm test
npm run deploy:robinhood   # needs DEPLOYER_PRIVATE_KEY (+ optional ROBINHOOD_RPC_URL, DEV_WALLET) in ../.env.local
```
The deploy script wires token/NFT to the refinery and prints the three
addresses to paste into `frontend/src/config.ts` ADDRESSES.

### Frontend
```bash
cd frontend
npm run build
# Deploy via Vercel (meowdotfun workspace or new project)
```

### Vercel Config
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`

## Security Notes

- Only public code in the repo
- Private keys, deployer keys, RPC URLs in `.env.local` (gitignored)
- Contract owner can update: entry fee, emission rate, dev wallet
- Consider renouncing ownership or using multisig after launch
- Reentrancy guards on all payable functions
- Pausable for emergencies