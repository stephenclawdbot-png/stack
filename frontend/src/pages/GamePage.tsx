import { useGame } from "../lib/useGame";
import { ConnectButton } from "../components/ConnectButton";
import { EnterFacility } from "../components/EnterFacility";
import { StatsBar } from "../components/StatsBar";
import { RefineryGrid } from "../components/RefineryGrid";
import { MinerShop } from "../components/MinerShop";
import { ClaimPanel } from "../components/ClaimPanel";
import { ReferralPanel } from "../components/ReferralPanel";

export function GamePage() {
  const game = useGame();

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
      <div className="space-y-4">
        {game.error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger">
            {game.error}
          </div>
        )}

        <StatsBar state={game.state} />

        <ClaimPanel state={game.state} onClaim={game.claimRewards} loading={game.loading} />

        <div className="grid md:grid-cols-2 gap-4">
          <RefineryGrid state={game.state} onUpgrade={game.upgradeFacility} loading={game.loading} />
          <MinerShop
            stackBalance={game.state.stackBalance}
            onBuy={game.buyMiner}
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