import type { GameState } from "../lib/useGame";
import { useLivePending } from "../lib/useGame";
import { MINER_TIERS, FACILITY_TIERS, COMPOUND_DISCOUNT } from "../config";
import { formatStack, timeUntil } from "../lib/format";

/// The retention ladder: always show the player what's next and when.
export function NextGoals({ state }: { state: GameState }) {
  const pending = useLivePending(state);
  const share =
    state.totalNetworkHashrate > 0
      ? state.playerHashrate / state.totalNetworkHashrate
      : 0;
  const ratePerSec = state.emissionRatePerSec * share;

  const goals: { label: string; value: string; ready?: boolean }[] = [];

  // next rig via compound (the cheapest one not yet affordable, or READY)
  const compoundable = MINER_TIERS.filter((t) => t.id > 0)
    .map((t) => ({ ...t, cost: t.price * (1 - COMPOUND_DISCOUNT) }));
  const ready = compoundable.filter((t) => pending >= t.cost).pop();
  const nextUp = compoundable.find((t) => pending < t.cost);
  if (ready) {
    goals.push({ label: `${ready.name} compound`, value: "READY", ready: true });
  }
  if (nextUp) {
    const eta = ratePerSec > 0 ? (nextUp.cost - pending) / ratePerSec : Infinity;
    goals.push({
      label: `${nextUp.name} compound`,
      value: isFinite(eta) ? `~${timeUntil(Date.now() / 1000 + eta)}` : "—",
    });
  }

  // facility upgrade
  const nextTier = FACILITY_TIERS[state.facilityTier];
  if (nextTier) {
    const affordable = state.stackBalance >= nextTier.upgradeCost;
    goals.push({
      label: `${nextTier.name} (${nextTier.gridSize}x${nextTier.gridSize})`,
      value: affordable ? "AFFORDABLE" : `${formatStack(nextTier.upgradeCost)} STACK`,
      ready: affordable,
    });
  }

  // halving countdown
  if (state.nextHalving > 0) {
    goals.push({ label: "Next halving", value: timeUntil(state.nextHalving) });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {goals.map((g) => (
        <div
          key={g.label}
          className={`panel !py-1.5 !px-3 flex items-center gap-2 text-lg ${
            g.ready ? "[box-shadow:inset_0_0_0_2px_rgba(157,255,94,0.4)]" : ""
          }`}
        >
          <span className="stat-label !text-[8px]">next</span>
          <span className="text-text">{g.label}</span>
          <span className={g.ready ? "text-positive font-mono" : "led-text"}>{g.value}</span>
        </div>
      ))}
    </div>
  );
}
