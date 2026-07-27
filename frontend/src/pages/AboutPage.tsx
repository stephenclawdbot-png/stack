import { sprites, characters } from "../assets";

export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <img src={sprites.refineryBuilding} alt="Refinery" className="w-20 h-20 pixelated" />
        <h1 className="text-2xl font-heading">About Stack Refinery</h1>
      </div>

      <p className="text-muted">
        Stack Refinery is an on-chain idle mining game on Robinhood Chain. Build a refinery,
        fill it with increasingly powerful drill rigs, and earn a share of the network emission
        every second. The rules are transparent and always on-chain.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="panel-elevated text-center">
          <img src={characters.refineryWorker} alt="Worker" className="w-16 h-16 pixelated mx-auto mb-2" />
          <p className="text-xs text-muted">Refinery Worker</p>
        </div>
        <div className="panel-elevated text-center">
          <img src={characters.miningForeman} alt="Foreman" className="w-16 h-16 pixelated mx-auto mb-2" />
          <p className="text-xs text-muted">Mining Foreman</p>
        </div>
        <div className="panel-elevated text-center">
          <img src={characters.drillBot} alt="Drill Bot" className="w-16 h-16 pixelated mx-auto mb-2" />
          <p className="text-xs text-muted">Drill Bot</p>
        </div>
      </div>

      <div className="panel-elevated">
        <h2 className="font-heading text-text-strong mb-2">The Game Loop</h2>
        <p className="text-sm text-muted">
          Pay a one-time entry fee, claim your free starter miner, and start earning STACK.
          Use STACK to buy stronger miners and upgrade your facility for more cells and power.
          Every miner you add increases your hashrate, growing your slice of the network emission.
        </p>
      </div>

      <div className="panel-elevated">
        <h2 className="font-heading text-text-strong mb-2">On-Chain Rules</h2>
        <p className="text-sm text-muted">
          The entire game is governed by smart contracts on Robinhood Chain. Emission rates,
          halvings, burn percentages, and referral splits are all encoded and verifiable.
          No off-chain servers control game logic.
        </p>
      </div>

      <div className="panel-elevated">
        <h2 className="font-heading text-text-strong mb-2">Idle Accrual</h2>
        <p className="text-sm text-muted">
          Your STACK accrues every second based on your share of total network hashrate.
          You can be away for days and your miners keep working. Claim whenever you want,
          then compound by buying more miners or upgrading.
        </p>
      </div>

      <div className="panel-elevated">
        <h2 className="font-heading text-text-strong mb-2">Fixed 1B Supply</h2>
        <p className="text-sm text-muted">
          STACK is a fixed-supply token launched on ponz.family — 1 billion tokens, no minting,
          ever. The game pays rewards from an on-chain pool, emission halves approximately every
          158 days, and 75% of every purchase is burned to the dead address forever. This creates
          deflationary pressure over time.
        </p>
      </div>

      <div className="panel-elevated">
        <h2 className="font-heading text-text-strong mb-2">Built With</h2>
        <ul className="text-sm text-muted space-y-1">
          <li>Solidity smart contracts on Robinhood Chain (EVM L2)</li>
          <li>React + Vite frontend</li>
          <li>ethers v6 for contract interaction</li>
          <li>Pixel art assets generated via PixelLab</li>
        </ul>
      </div>
    </div>
  );
}