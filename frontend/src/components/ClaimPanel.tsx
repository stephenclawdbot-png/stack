import type { GameState } from "../lib/useGame";
import { formatStack, timeUntil } from "../lib/format";
import { CLAIM_COOLDOWN } from "../config";
import { uiPanels } from "../assets";

interface ClaimPanelProps {
  state: GameState;
  onClaim: () => void;
  loading: boolean;
}

export function ClaimPanel({ state, onClaim, loading }: ClaimPanelProps) {
  const cooldownEnds = state.lastClaim + CLAIM_COOLDOWN;
  const onCooldown = Date.now() / 1000 < cooldownEnds;
  const disabled = loading || state.pendingRewards <= 0 || onCooldown;

  return (
    <div className="max-w-2xl mx-auto">
      {/* The claim console — the art IS the button */}
      <button
        onClick={onClaim}
        disabled={disabled}
        className="relative block w-full group disabled:cursor-not-allowed"
        title={onCooldown ? `Claim available in ${timeUntil(cooldownEnds)}` : "Claim pending STACK"}
      >
        <img
          src={uiPanels.claimPanel}
          alt="Claim console"
          className={`w-full pixelated transition-none ${
            disabled ? "saturate-50 brightness-90" : "group-hover:brightness-110"
          }`}
        />
        {/* LED readout on the console's lower plate */}
        <div className="absolute left-[24%] right-[24%] bottom-[13%] bg-black/70 border border-accent/40 px-2 py-0.5">
          <span className="led-text text-xl md:text-2xl whitespace-nowrap">
            {loading
              ? "> PROCESSING..."
              : onCooldown
                ? `> COOLDOWN ${timeUntil(cooldownEnds)}`
                : `> PENDING: ${formatStack(state.pendingRewards)} STACK`}
          </span>
        </div>
      </button>

      <div className="flex justify-between mt-2 px-1 text-lg text-muted">
        <span>
          Rig output:{" "}
          <span className="text-accent font-mono">
            {formatStack(
              state.totalNetworkHashrate > 0
                ? state.emissionRatePerSec * (state.playerHashrate / state.totalNetworkHashrate) * 86400
                : 0
            )}{" "}
            STACK/day
          </span>
        </span>
        <span>Compounding is 10% cheaper - no cooldown</span>
      </div>
    </div>
  );
}
