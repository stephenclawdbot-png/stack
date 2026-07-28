import { useEffect, useState } from "react";
import type { GameState } from "../lib/useGame";
import { FACILITY_TIERS } from "../config";
import { FactoryIcon } from "./Icons";
import { formatStack, timeUntil } from "../lib/format";
import { minerSprites, uiPanels, sprites } from "../assets";

interface RefineryGridProps {
  state: GameState;
  onUpgrade: () => void;
  loading: boolean;
  /** Tier of each placed rig, in placement order (0 = hand drill). */
  placedTiers?: number[];
}

interface Particle {
  id: number;
  left: number;
  top: number;
}

export function RefineryGrid({ state, onUpgrade, loading, placedTiers }: RefineryGridProps) {
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const tier = FACILITY_TIERS[state.facilityTier - 1];
  const grid = Array(tier.cells).fill(null);

  // Floating +STACK particles drift up from working rigs
  useEffect(() => {
    if (state.minerCount === 0 && state.playerHashrate === 0) return;
    const interval = window.setInterval(() => {
      const p: Particle = {
        id: Date.now() + Math.random(),
        left: 18 + Math.random() * 55,
        top: 18 + Math.random() * 45,
      };
      setParticles((ps) => [...ps.slice(-4), p]);
      window.setTimeout(
        () => setParticles((ps) => ps.filter((q) => q.id !== p.id)),
        1800
      );
    }, 2100);
    return () => clearInterval(interval);
  }, [state.minerCount, state.playerHashrate]);

  // sprite for the rig in a given occupied slot; hand drill first, then
  // whatever tiers the player placed
  const rigSprite = (idx: number) =>
    minerSprites[placedTiers?.[idx] ?? (idx === 0 ? 0 : 1)] ?? minerSprites[1];

  // Client-side synergy estimate mirroring the contract rule: +10% per
  // orthogonally adjacent occupied cell (max +30%) per rig.
  const HASHRATES = [1, 5, 25, 100, 500];
  const occupiedIdx = new Set(
    Array.from({ length: state.minerCount }, (_, i) => i)
  );
  let baseSum = 0;
  let effSum = 0;
  occupiedIdx.forEach((i) => {
    const x = i % tier.gridSize;
    const y = Math.floor(i / tier.gridSize);
    const neighbors = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ].filter(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= tier.gridSize || ny >= tier.gridSize) return false;
      return occupiedIdx.has(ny * tier.gridSize + nx);
    }).length;
    const base = HASHRATES[placedTiers?.[i] ?? (i === 0 ? 0 : 1)] ?? 5;
    baseSum += base;
    effSum += base * (1 + Math.min(neighbors, 3) * 0.1);
  });
  const synergyPct = baseSum > 0 ? (effSum / baseSum - 1) * 100 : 0;

  const upgradeAvailable = state.lastUpgrade > 0
    ? Date.now() / 1000 > state.lastUpgrade + state.upgradeCooldown
    : true;

  const nextTier = FACILITY_TIERS[state.facilityTier] || null;

  const toggleCell = (idx: number) => {
    const next = new Set(selectedCells);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedCells(next);
  };

  return (
    <div className="frame-metal">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] flex items-center gap-2">
          <FactoryIcon className="w-5 h-5 text-accent" />
          {tier.name}
        </h3>
        <div className="flex items-center gap-3">
          {synergyPct > 0 && (
            <span
              className="text-lg font-mono text-positive [text-shadow:0_0_8px_rgba(157,255,94,0.5)]"
              title="Rigs touching each other mine +10% per neighbor (max +30%)"
            >
              SYNERGY +{synergyPct.toFixed(1)}%
            </span>
          )}
          <span className="text-lg text-muted font-mono">
            T{state.facilityTier} | {tier.gridSize}x{tier.gridSize}
          </span>
        </div>
      </div>

      {/* Power bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="stat-label">Power</span>
          <span className="font-mono text-text">
            {state.facilityPowerUsed} / {state.facilityPower}
          </span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              state.facilityPowerUsed / state.facilityPower > 0.9 ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${Math.min((state.facilityPowerUsed / state.facilityPower) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Grid — drawn inside the workshop board art (inner field is ~12% inset) */}
      <div
        className="relative pixelated aspect-square max-w-md mx-auto"
        style={{
          backgroundImage: `url(${uiPanels.gridPanel})`,
          backgroundSize: "100% 100%",
          padding: "12.5% 12.5% 11% 12.5%",
        }}
      >
        <div
          className="grid gap-0 bg-[#0c0e07]"
          style={{ gridTemplateColumns: `repeat(${tier.gridSize}, 1fr)` }}
        >
          {grid.map((_, idx) => {
            const occupied = idx < state.minerCount;
            const selected = selectedCells.has(idx);
            return (
              <button
                key={idx}
                onClick={() => !occupied && toggleCell(idx)}
                className={`aspect-square flex items-center justify-center transition-colors duration-100 bg-[#0c0e07] ${
                  occupied
                    ? "[box-shadow:inset_0_0_0_2px_rgba(253,180,42,0.35)]"
                    : selected
                      ? "[box-shadow:inset_0_0_0_2px_#9dff5e]"
                      : "[box-shadow:inset_0_0_0_1px_#2a2f1a] hover:[box-shadow:inset_0_0_0_2px_rgba(253,180,42,0.55)] hover:bg-[#12150c]"
                }`}
              >
                {occupied ? (
                  <img
                    src={rigSprite(idx)}
                    alt="miner"
                    className="w-[88%] h-[88%] pixelated object-contain anim-mine drop-shadow-[0_0_6px_rgba(253,180,42,0.45)]"
                  />
                ) : selected ? (
                  <div className="w-2 h-2 bg-secondary" />
                ) : (
                  <span className="text-lg text-white/15 font-mono">+</span>
                )}
              </button>
            );
          })}
        </div>
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle-float led-text"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
          >
            +STACK
          </span>
        ))}
        <img src={sprites.pipeValve} alt="" className="absolute -bottom-1 -left-1 w-7 pixelated" />
      </div>

      {/* Upgrade button */}
      {nextTier && (
        <div className="mt-3 pt-3 border-t-2 border-white/10">
          <div className="flex items-center justify-between mb-2 text-lg">
            <span className="text-muted">
              Upgrade to {nextTier.name} ({nextTier.gridSize}x{nextTier.gridSize})
            </span>
            <span className="led-text">
              {formatStack(nextTier.upgradeCost.toString())} STACK
            </span>
          </div>
          <button
            onClick={onUpgrade}
            disabled={loading || !upgradeAvailable}
            className="btn-secondary w-full"
          >
            {loading
              ? "Processing..."
              : upgradeAvailable
                ? "Upgrade Refinery"
                : `Cooldown: ${timeUntil(state.lastUpgrade + state.upgradeCooldown)}`}
          </button>
        </div>
      )}
    </div>
  );
}