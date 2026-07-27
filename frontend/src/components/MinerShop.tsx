import { useState } from "react";
import { MINER_TIERS, COMPOUND_DISCOUNT } from "../config";
import { formatStack, formatHashrate } from "../lib/format";
import { PickaxeIcon } from "./Icons";
import { minerSprites } from "../assets";

interface MinerShopProps {
  stackBalance: number;
  pendingRewards: number;
  onBuy: (tier: number, priceStack: number) => void;
  onCompound: (tier: number) => void;
  loading: boolean;
}

export function MinerShop({ stackBalance, pendingRewards, onBuy, onCompound, loading }: MinerShopProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="panel-elevated">
      <h3 className="font-heading text-text-strong mb-3 flex items-center gap-2">
        <PickaxeIcon className="w-5 h-5 text-accent" />
        Miner Shop
      </h3>
      <div className="space-y-2">
        {MINER_TIERS.filter((t) => t.id > 0).map((tier) => {
          const canAfford = stackBalance >= tier.price;
          return (
            <button
              key={tier.id}
              onClick={() => setSelected(tier.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selected === tier.id
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:border-accent/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <img src={minerSprites[tier.id]} alt={tier.name} className="w-8 h-8 pixelated" />
                  <span className="font-heading font-semibold text-text-strong">
                    {tier.name}
                  </span>
                </div>
                <span className="text-xs text-muted">T{tier.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-accent font-mono">{formatHashrate(tier.hashrate)}</span>
                  <span className="text-muted ml-2">{tier.cells === 1 ? "1x1" : "2x2"} cell{tier.cells > 1 ? "s" : ""}</span>
                </div>
                <span className={`font-mono text-sm ${canAfford ? "text-text" : "text-danger"}`}>
                  {tier.price > 0 ? formatStack(tier.price.toString()) : "Free"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-3 space-y-2">
          <button
            onClick={() => onBuy(selected, MINER_TIERS[selected].price)}
            disabled={loading || stackBalance < MINER_TIERS[selected].price}
            className="btn-primary w-full"
          >
            {loading ? "Processing..." : `Buy ${MINER_TIERS[selected].name}`}
          </button>
          <button
            onClick={() => onCompound(selected)}
            disabled={loading || pendingRewards < MINER_TIERS[selected].price * (1 - COMPOUND_DISCOUNT)}
            className="btn-secondary w-full text-sm"
            title="Pay with pending rewards — no claim needed, 10% cheaper"
          >
            {loading
              ? "Processing..."
              : `Compound for ${formatStack((MINER_TIERS[selected].price * (1 - COMPOUND_DISCOUNT)).toString())} pending (-10%)`}
          </button>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted">
          75% of purchase burned forever. 25% funds game balance.
        </p>
      </div>
    </div>
  );
}