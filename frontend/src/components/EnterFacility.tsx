import { useState } from "react";
import { ENTRY_FEE } from "../config";
import { sprites } from "../assets";

interface EnterFacilityProps {
  onEnter: (referralCode: string) => void;
  loading: boolean;
  presetRef?: string | null;
}

export function EnterFacility({ onEnter, loading, presetRef }: EnterFacilityProps) {
  const [refCode, setRefCode] = useState(presetRef || "");

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="panel-elevated text-center">
        <div className="flex justify-center mb-4">
          <img src={sprites.refineryBuilding} alt="Refinery" className="w-24 h-24 pixelated" />
        </div>
        <h2 className="text-xl font-heading mb-2">Open Your Refinery</h2>
        <p className="text-sm text-muted mb-6">
          Pay the one-time entry fee to unlock your starter facility and claim your free Hand Drill.
        </p>

        <div className="bg-surface rounded-lg p-3 mb-4 border border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Entry Fee</span>
            <span className="font-mono text-text">{ENTRY_FEE} ETH</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted">Starter Miner</span>
            <span className="text-accent">Free (Hand Drill)</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted">Starting Grid</span>
            <span className="font-mono text-text">2x2 (4 cells)</span>
          </div>
        </div>

        <input
          type="text"
          value={refCode}
          onChange={(e) => setRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
          maxLength={32}
          placeholder="Referral code (optional)"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text placeholder:text-muted/50 mb-4"
        />

        <button
          onClick={() => onEnter(refCode)}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Opening..." : `Open Refinery (${ENTRY_FEE} ETH)`}
        </button>
      </div>
    </div>
  );
}