import { useState } from "react";
import type { GameState } from "../lib/useGame";
import { FACILITY_TIERS } from "../config";
import { FactoryIcon } from "./Icons";
import { formatStack, timeUntil } from "../lib/format";
import { minerSprites } from "../assets";

interface RefineryGridProps {
  state: GameState;
  onUpgrade: () => void;
  loading: boolean;
}

export function RefineryGrid({ state, onUpgrade, loading }: RefineryGridProps) {
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const tier = FACILITY_TIERS[state.facilityTier - 1];
  const grid = Array(tier.cells).fill(null);

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
    <div className="panel-elevated">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-text-strong flex items-center gap-2">
          <FactoryIcon className="w-5 h-5 text-accent" />
          {tier.name}
        </h3>
        <span className="text-xs text-muted">
          T{state.facilityTier} | {tier.gridSize}x{tier.gridSize} grid
        </span>
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

      {/* Grid */}
      <div
        className="grid gap-1 p-2 bg-bg/50 rounded-lg border border-border"
        style={{ gridTemplateColumns: `repeat(${tier.gridSize}, 1fr)` }}
      >
        {grid.map((_, idx) => {
          const occupied = idx < state.minerCount;
          const selected = selectedCells.has(idx);
          return (
            <button
              key={idx}
              onClick={() => !occupied && toggleCell(idx)}
              className={`aspect-square rounded border-2 flex items-center justify-center transition-all ${
                occupied
                  ? "border-accent bg-accent-soft"
                  : selected
                    ? "border-secondary bg-secondary-soft"
                    : "border-border bg-surface hover:border-accent/50"
              }`}
            >
              {occupied ? (
                <img src={minerSprites[0]} alt="miner" className="w-full h-full pixelated object-contain animate-pulse-glow" />
              ) : selected ? (
                <div className="w-2 h-2 rounded-full bg-secondary" />
              ) : (
                <span className="text-xs text-muted/30">+</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upgrade button */}
      {nextTier && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">
              Upgrade to {nextTier.name} ({nextTier.gridSize}x{nextTier.gridSize})
            </span>
            <span className="font-mono text-sm text-accent">
              {formatStack(nextTier.upgradeCost.toString())} STACK
            </span>
          </div>
          <button
            onClick={onUpgrade}
            disabled={loading || !upgradeAvailable}
            className="btn-secondary w-full text-sm"
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