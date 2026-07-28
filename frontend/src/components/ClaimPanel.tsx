import { useState } from "react";
import type { GameState } from "../lib/useGame";
import { useLivePending } from "../lib/useGame";
import { formatStack, timeUntil } from "../lib/format";
import { CLAIM_COOLDOWN, COMPOUND_DISCOUNT, MINER_TIERS } from "../config";
import { uiPanels, brand } from "../assets";
import { playChime } from "../lib/sound";

interface ClaimPanelProps {
  state: GameState;
  onClaim: () => void;
  onCompound?: (tier: number) => void;
  loading: boolean;
}

export function ClaimPanel({ state, onClaim, onCompound, loading }: ClaimPanelProps) {
  const livePending = useLivePending(state);
  const [caps, setCaps] = useState<{ id: number; dx: number; dy: number; rot: number }[]>([]);

  // bottlecaps explode from the console + mascot celebrates
  const handleClaim = () => {
    playChime();
    const burst = Array.from({ length: 9 }, (_, i) => ({
      id: Date.now() + i,
      dx: (Math.random() - 0.5) * 260,
      dy: -40 - Math.random() * 130,
      rot: (Math.random() - 0.5) * 1440,
    }));
    setCaps(burst);
    window.setTimeout(() => setCaps([]), 1000);
    window.dispatchEvent(new CustomEvent("stack:claimed"));
    onClaim();
  };
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
      {/* The claim console — art on top, LED readout in normal flow below
          so it can never overflow the artwork at any viewport width */}
      <button
        onClick={handleClaim}
        disabled={disabled}
        className="relative block w-full group disabled:cursor-not-allowed"
        title={onCooldown ? `Claim available in ${timeUntil(cooldownEnds)}` : "Claim pending STACK"}
      >
        {caps.map((c) => (
          <img
            key={c.id}
            src={brand.bottlecap}
            alt=""
            className="cap-particle pixelated left-1/2 top-1/3"
            style={{
              "--dx": `${c.dx}px`,
              "--dy": `${c.dy}px`,
              "--rot": `${c.rot}deg`,
            } as React.CSSProperties}
          />
        ))}
        <img
          src={uiPanels.claimPanel}
          alt="Claim console"
          className={`w-full max-w-md mx-auto pixelated transition-none ${
            disabled ? "saturate-50 brightness-90" : "claim-ready group-hover:brightness-110"
          }`}
        />
        <div className="bg-black/80 border-2 border-accent/40 px-2 py-1 mt-1 overflow-hidden text-center">
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
          className="btn-secondary w-full mt-2 !text-positive truncate"
          title="Reinvest pending rewards without claiming — 10% cheaper, no cooldown"
        >
          ⚡ Compound: {bestCompound.name} (-10%) —{" "}
          {formatStack(bestCompound.price * (1 - COMPOUND_DISCOUNT))}
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
