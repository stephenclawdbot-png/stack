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
    <div className="frame-shop">
      <h3 className="text-[11px] mb-3 flex items-center gap-2">
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
              className={`w-full text-left p-2.5 border-2 pixel-corners bg-black/40 ${
                selected === tier.id
                  ? "border-accent bg-accent-soft"
                  : "border-white/10 hover:border-accent/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                  <img src={minerSprites[tier.id]} alt={tier.name} className="w-10 h-10 pixelated object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-[10px] text-text-strong">{tier.name}</span>
                    <span className="text-base text-muted font-mono">T{tier.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg">
                    <span>
                      <span className="text-accent font-mono">{formatHashrate(tier.hashrate)}</span>
                      <span className="text-muted ml-2">{tier.cells === 1 ? "1x1" : "2x2"}</span>
                    </span>
                    <span className={`font-mono ${canAfford ? "led-text" : "text-danger"}`}>
                      {tier.price > 0 ? formatStack(tier.price.toString()) : "Free"}
                    </span>
                  </div>
                </div>
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
            className="btn-secondary w-full"
            title="Pay with pending rewards — no claim needed, 10% cheaper"
          >
            {loading
              ? "Processing..."
              : `Compound for ${formatStack((MINER_TIERS[selected].price * (1 - COMPOUND_DISCOUNT)).toString())} pending (-10%)`}
          </button>
        </div>
      )}
      <div className="mt-3 pt-3 border-t-2 border-white/10">
        <p className="text-lg text-muted">
          75% of every purchase is burned forever. 25% refills the reward pool.
        </p>
      </div>
    </div>
  );
}