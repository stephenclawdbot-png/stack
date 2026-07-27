import { PickaxeIcon, FactoryIcon } from "./Icons";
import type { GameState } from "../lib/useGame";
import { useLivePending } from "../lib/useGame";
import { formatHashrate, formatStack } from "../lib/format";
import { brand } from "../assets";

export function StatsBar({ state }: { state: GameState | null }) {
  const livePending = useLivePending(state);
  if (!state) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="panel-elevated animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const networkShare = state.totalNetworkHashrate > 0
    ? (state.playerHashrate / state.totalNetworkHashrate) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="panel-elevated">
        <div className="flex items-center gap-2 mb-1">
          <PickaxeIcon className="w-4 h-4 text-accent" />
          <span className="stat-label">Your Hashrate</span>
        </div>
        <div className="stat-value">{formatHashrate(state.playerHashrate)}</div>
        <div className="text-base text-muted">{networkShare.toFixed(3)}% of network</div>
      </div>

      <div className="panel-elevated">
        <div className="flex items-center gap-2 mb-1">
          <img src={brand.bottlecap} alt="STACK" className="w-6 h-6 pixelated" />
          <span className="stat-label">Pending STACK</span>
        </div>
        <div className="stat-value text-accent tabular-nums">{formatStack(livePending)}</div>
        <div className="text-base text-muted">{state.emissionRatePerSec > 0 ? `${formatStack(state.emissionRatePerSec.toString())}/sec total` : ""}</div>
      </div>

      <div className="panel-elevated">
        <div className="flex items-center gap-2 mb-1">
          <FactoryIcon className="w-4 h-4 text-accent" />
          <span className="stat-label">Network Hash</span>
        </div>
        <div className="stat-value">{formatHashrate(state.totalNetworkHashrate)}</div>
        <div className="text-base text-muted">{formatStack(state.rewardPool.toString())} in pool</div>
      </div>

      <div className="panel-elevated">
        <div className="flex items-center gap-2 mb-1">
          <img src={brand.bottlecap} alt="STACK" className="w-6 h-6 pixelated" />
          <span className="stat-label">STACK Balance</span>
        </div>
        <div className="stat-value">{formatStack(state.stackBalance.toString())}</div>
        <div className="text-base text-muted">{state.minerCount} miners</div>
      </div>
    </div>
  );
}