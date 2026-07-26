import type { GameState } from "../lib/useGame";
import { formatStack } from "../lib/format";

interface ClaimPanelProps {
  state: GameState;
  onClaim: () => void;
  loading: boolean;
}

export function ClaimPanel({ state, onClaim, loading }: ClaimPanelProps) {
  return (
    <div className="panel-elevated">
      <div className="flex items-center justify-between">
        <div>
          <div className="stat-label mb-1">Pending Rewards</div>
          <div className="text-2xl font-heading font-bold text-accent">
            {formatStack(state.pendingRewards.toString())} STACK
          </div>
        </div>
        <button
          onClick={onClaim}
          disabled={loading || state.pendingRewards <= 0}
          className="btn-primary text-lg px-8"
        >
          {loading ? "Claiming..." : "Claim"}
        </button>
      </div>
      {state.pendingRewards > 0 && (
        <div className="mt-2 text-xs text-muted">
          Earning {formatStack((state.emissionRatePerSec * (state.playerHashrate / state.totalNetworkHashrate)).toString())} STACK/sec
        </div>
      )}
    </div>
  );
}