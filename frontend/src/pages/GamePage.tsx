import { useGame, type GameState } from "../lib/useGame";
import { ConnectButton } from "../components/ConnectButton";
import { EnterFacility } from "../components/EnterFacility";
import { StatsBar } from "../components/StatsBar";
import { RefineryGrid } from "../components/RefineryGrid";
import { MinerShop } from "../components/MinerShop";
import { ClaimPanel } from "../components/ClaimPanel";
import { ReferralPanel } from "../components/ReferralPanel";

// ?demo=1 renders the game board with mock state (design review / promo shots)
const DEMO_STATE: GameState = {
  hasFacility: true,
  facilityTier: 2,
  facilityGridSize: 3,
  facilityPower: 25,
  facilityPowerUsed: 15,
  playerHashrate: 36,
  totalNetworkHashrate: 1284,
  pendingRewards: 12845.7,
  totalRewardsPaid: 8_412_390,
  totalBurned: 1_968_204,
  rewardPool: 412_500_000,
  stackBalance: 6420.5,
  minerCount: 3,
  referralCode: "stackers",
  referrer: "0x0000000000000000000000000000000000000000",
  referredVolume: 84_120,
  referralTier: 1,
  emissionRatePerSec: 34.72,
  nextHalving: Math.floor(Date.now() / 1000) + 9_000_000,
  lastUpgrade: Math.floor(Date.now() / 1000) - 90_000,
  upgradeCooldown: 86_400,
  lastClaim: Math.floor(Date.now() / 1000) - 7_200,
};

export function GamePage() {
  const game = useGame();
  const isDemo = new URLSearchParams(window.location.search).has("demo");

  if (isDemo) {
    const noop = () => {};
    return (
      <div className="space-y-6">
        <StatsBar state={DEMO_STATE} />
        <ClaimPanel state={DEMO_STATE} onClaim={noop} loading={false} />
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <RefineryGrid state={DEMO_STATE} onUpgrade={noop} loading={false} placedTiers={[0, 1, 2]} />
          <MinerShop
            stackBalance={DEMO_STATE.stackBalance}
            pendingRewards={DEMO_STATE.pendingRewards}
            onBuy={noop}
            onCompound={noop}
            loading={false}
          />
        </div>
        <ReferralPanel state={DEMO_STATE} onCreateCode={noop} loading={false} />
      </div>
    );
  }

  // Not connected
  if (!game.wallet.address) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h2 className="text-xl font-heading mb-2">Connect to Start</h2>
        <p className="text-muted mb-6">Connect your wallet to open a refinery and start mining STACK.</p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Wrong chain
  if (!game.isCorrectChain) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h2 className="text-xl font-heading mb-2">Wrong Network</h2>
        <p className="text-muted mb-6">Switch to Robinhood Chain to play.</p>
        <button onClick={() => game.wallet.switchChain(4663)} className="btn-primary">
          Switch to Robinhood Chain
        </button>
      </div>
    );
  }

  // Contracts not deployed yet
  if (!game.isReady) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h2 className="text-xl font-heading mb-2">Coming Soon</h2>
        <p className="text-muted">Contracts are being deployed. Check back shortly.</p>
      </div>
    );
  }

  // No facility yet - show entry screen
  if (game.state && !game.state.hasFacility) {
    const urlParams = new URLSearchParams(window.location.search);
    const presetRef = urlParams.get("ref");
    return (
      <EnterFacility
        onEnter={game.enterFacility}
        loading={game.loading}
        presetRef={presetRef}
      />
    );
  }

  // Main game UI
  if (game.state && game.state.hasFacility) {
    return (
      <div className="space-y-6">
        {game.error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger">
            {game.error}
          </div>
        )}

        <StatsBar state={game.state} />

        <ClaimPanel state={game.state} onClaim={game.claimRewards} loading={game.loading} />

        <div className="grid md:grid-cols-2 gap-4 items-start">
          <RefineryGrid state={game.state} onUpgrade={game.upgradeFacility} loading={game.loading} />
          <MinerShop
            stackBalance={game.state.stackBalance}
            pendingRewards={game.state.pendingRewards}
            onBuy={game.buyMiner}
            onCompound={game.compound}
            loading={game.loading}
          />
        </div>

        <ReferralPanel
          state={game.state}
          onCreateCode={game.createReferralCode}
          loading={game.loading}
        />
      </div>
    );
  }

  // Loading
  return (
    <div className="flex justify-center mt-20">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}