import { MINER_TIERS, FACILITY_TIERS, REFERRAL_TIERS, EMISSION_PER_DAY, HALVING_INTERVAL, MAX_SUPPLY } from "../config";
import { formatStack } from "../lib/format";
import { characters } from "../assets";

export function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <section>
        <div className="flex items-end gap-3 mb-4">
          <img src={characters.miningForeman} alt="Mining foreman" className="h-14 pixelated" />
          <h1 className="text-base md:text-xl font-heading">How the Refinery Works</h1>
        </div>
        <p className="text-muted mb-4">
          Four actions form the whole loop. Each step makes the next one faster.
        </p>
        <div className="space-y-3">
          {[
            { n: "01", title: "Open your facility", desc: "Pay the one-time ETH entry price, optionally attach a referrer, and unlock the starter refinery site." },
            { n: "02", title: "Place your free miner", desc: "Claim the free Hand Drill and place it on the grid. Every miner consumes a cell and some facility power." },
            { n: "03", title: "Earn every second", desc: "Emission is shared by hashrate. More hash means a larger slice. Your STACK keeps accruing while you are away." },
            { n: "04", title: "Claim and compound", desc: "Claim STACK, buy stronger miners, and climb the facility ladder for more cells and power." },
          ].map((step) => (
            <div key={step.n} className="panel-elevated flex gap-4">
              <span className="text-accent font-heading text-2xl">{step.n}</span>
              <div>
                <h3 className="font-heading text-text-strong">{step.title}</h3>
                <p className="text-sm text-muted">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-heading mb-3">The Economy</h2>
        <div className="panel-elevated space-y-2">
          <div className="flex justify-between"><span className="text-muted">Emission rate at launch</span><span className="font-mono text-text">{formatStack(EMISSION_PER_DAY.toString())} STACK/day</span></div>
          <div className="flex justify-between"><span className="text-muted">Halving interval</span><span className="font-mono text-text">~158.3 days</span></div>
          <div className="flex justify-between"><span className="text-muted">Max supply</span><span className="font-mono text-text">{formatStack(MAX_SUPPLY.toString())} STACK</span></div>
          <div className="flex justify-between"><span className="text-muted">Token</span><span className="font-mono text-text">Fixed supply, launched on ponz.family</span></div>
          <div className="flex justify-between"><span className="text-muted">Purchase burned</span><span className="font-mono text-accent">75%</span></div>
          <div className="flex justify-between"><span className="text-muted">Purchase to reward pool</span><span className="font-mono text-secondary">25%</span></div>
        </div>
        <p className="text-xs text-muted mt-2">Emission halves every {HALVING_INTERVAL.toLocaleString()} seconds. Rewards are paid from an on-chain pool held by the game contract; burns go to the dead address permanently. The supply is fixed — nothing can ever be minted.</p>
      </section>

      <section>
        <h2 className="text-xl font-heading mb-3">Why This Can't Rug Itself</h2>
        <div className="panel-elevated space-y-3 text-sm text-muted">
          <p>
            <span className="text-text-strong font-semibold">Runway guard.</span>{" "}
            Emission is throttled on-chain so the reward pool always covers at least 60 days
            at the current rate. If the pool shrinks, emission shrinks with it — the pool can
            never abruptly run dry. Every purchase refills it (25% of every price), which
            raises the emission cap back up. The math self-balances.
          </p>
          <p>
            <span className="text-text-strong font-semibold">Compounding beats dumping.</span>{" "}
            You can convert pending rewards straight into miners at a 10% discount — no claim,
            no cooldown, no sell pressure. 75% of every compound is burned forever.
          </p>
          <p>
            <span className="text-text-strong font-semibold">Claim cooldown.</span>{" "}
            Claims are limited to once per hour per wallet, smoothing out dump waves.
          </p>
          <p>
            <span className="text-text-strong font-semibold">Everything burns.</span>{" "}
            75% of every miner purchase and facility upgrade goes to the dead address.
            Supply is fixed at 1B and only ever goes down.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-heading mb-3">Miner Tiers</h2>
        <div className="space-y-2">
          {MINER_TIERS.map((tier) => (
            <div key={tier.id} className="panel-elevated flex items-center justify-between">
              <div>
                <span className="font-heading text-text-strong">T{tier.id} {tier.name}</span>
                <span className="text-xs text-muted ml-2">{tier.cells === 1 ? "1x1" : "2x2"} cell{tier.cells > 1 ? "s" : ""}</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-accent">{tier.hashrate} H/s</div>
                <div className="text-xs text-muted">{tier.price > 0 ? formatStack(tier.price.toString()) + " STACK" : "Free"}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-heading mb-3">Facility Tiers</h2>
        <div className="space-y-2">
          {FACILITY_TIERS.map((tier) => (
            <div key={tier.id} className="panel-elevated flex items-center justify-between">
              <div>
                <span className="font-heading text-text-strong">T{tier.id} {tier.name}</span>
                <span className="text-xs text-muted ml-2">{tier.gridSize}x{tier.gridSize} grid, {tier.power} power</span>
              </div>
              <span className="text-xs font-mono text-muted">
                {tier.upgradeCost > 0 ? formatStack(tier.upgradeCost.toString()) + " STACK" : "Starting tier"}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">Facility upgrades have a 24h cooldown.</p>
      </section>

      <section>
        <h2 className="text-xl font-heading mb-3">Referrals</h2>
        <div className="panel-elevated space-y-3">
          <p className="text-sm text-muted">Each wallet can create one permanent custom code before or after entering. Codes use 5-32 lowercase letters or digits. Once recorded, a referrer cannot be swapped.</p>
          <div className="space-y-2">
            {REFERRAL_TIERS.map((tier) => (
              <div key={tier.id} className="flex justify-between">
                <span className="text-text">{tier.name}</span>
                <span className="font-mono text-accent">{tier.rate}%</span>
                <span className="text-xs text-muted">{tier.threshold === 0 ? "0+" : formatStack(tier.threshold.toString()) + "+"} STACK</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Your friend always receives 95.5% of every gross claim. Referral bonuses come from the fixed 4.5% cut. Second-level referrer earns 50% of the direct reward. No referrer? The full 4.5% remains in the game contract.</p>
        </div>
      </section>
    </div>
  );
}