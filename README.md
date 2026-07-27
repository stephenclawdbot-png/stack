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

- **STACK**: 100M max supply, 18 decimals
- **Emission**: 300K/day at launch, halves every ~158 days
- **Burn**: 75% of purchases burned forever, 25% to game balance
- **Premint**: 5M STACK for launch liquidity

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