import type { GameState } from "../lib/useGame";
import { useLivePending } from "../lib/useGame";
import { formatStack, timeUntil } from "../lib/format";
import { CLAIM_COOLDOWN, COMPOUND_DISCOUNT, MINER_TIERS } from "../config";
import { uiPanels } from "../assets";

interface ClaimPanelProps {
  state: GameState;
  onClaim: () => void;
  onCompound?: (tier: number) => void;
  loading: boolean;
}

export function ClaimPanel({ state, onClaim, onCompound, loading }: ClaimPanelProps) {
  const livePending = useLivePending(state);
  // best rig affordable straight from pending (the one-click reinvest beat)
  const bestCompound = MINER_TIERS.filter(
    (t) => t.id > 0 && livePending >= t.price * (1 - COMPOUND_DISCOUNT)
  ).pop();
  const cooldownEnds = state.lastClaim + CLAIM_COOLDOWN;
  const onCooldown = Date.now() / 1000 < cooldownEnds;
  const disabled = loading || state.pendingRewards <= 0 || onCooldown;

  // enough precision to see the tick-up, compact enough to fit the console
  const decimals = livePending >= 100_000 ? 0 : livePending >= 1_000 ? 1 : 2;
  const liveText = livePending.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

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
            disabled ? "saturate-50 brightness-90" : "claim-ready group-hover:brightness-110"
          }`}
        />
        {/* LED readout on the console's lower plate */}
        <div className="absolute left-[6%] right-[6%] bottom-[12%] bg-black/75 border border-accent/40 px-2 py-0.5 overflow-hidden text-center">
          <span className="led-text text-base md:text-xl whitespace-nowrap tabular-nums">
            {loading
              ? "> PROCESSING..."
              : onCooldown
                ? `> COOLDOWN ${timeUntil(cooldownEnds)} | ${liveText}`
                : `> PENDING: ${liveText} STACK`}
          </span>
        </div>
      </button>

      {onCompound && bestCompound && (
        <button
          onClick={() => onCompound(bestCompound.id)}
          disabled={loading}
          className="btn-secondary w-full mt-2 !text-positive"
          title="Reinvest pending rewards without claiming — 10% cheaper, no cooldown"
        >
          ⚡ Quick compound: {bestCompound.name} for{" "}
          {formatStack(bestCompound.price * (1 - COMPOUND_DISCOUNT))} pending (-10%)
        </button>
      )}

      <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 mt-2 text-lg text-muted text-center">
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
        <span>Compounding is 10% cheaper — no cooldown</span>
      </div>
    </div>
  );
}
