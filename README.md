# Stack Refinery

An on-chain idle mining game on Robinhood Chain (EVM L2, chainId 4663). Build a refinery, fill it with drill rigs, and earn STACK tokens every second.

## Quick Start

```bash
# Frontend
cd frontend
npm install
npm run dev

# Contracts
cd contracts
npm install
npm run compile
npm test
```

## Game Loop

1. **Open** your refinery (0.001 ETH entry)
2. **Place** your free Hand Drill miner
3. **Earn** STACK every second based on hashrate share
4. **Claim** and compound: buy stronger miners, upgrade facility

## Tokenomics

- **STACK**: fixed 1B supply, launched on [ponz.family](https://pons.money) — the game cannot mint
- **Treasury**: rewards are paid from an on-chain pool held by the game contract
- **Emission**: 3M/day at launch (configurable at deploy), halves every ~158 days
- **Burn**: 75% of purchases sent to 0xdEaD forever, 25% recycles into the reward pool

## Tech

- Solidity contracts (Hardhat)
- Vite + React + TypeScript frontend
- ethers v6 for web3
- Tailwind CSS v3
- PixelLab API for pixel art assets

## Links

- Chain: Robinhood Chain (chainId 4663)
- Explorer: https://explorer.robinhood.com
- Repo: github.com/stephenclawdbot-png/stack

See [BUILD.md](./BUILD.md) for full design and build docs.

## License

MIT