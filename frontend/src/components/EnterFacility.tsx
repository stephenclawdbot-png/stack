import { useState } from "react";
import { ENTRY_FEE } from "../config";
import { sprites, characters, uiPanels } from "../assets";

interface EnterFacilityProps {
  onEnter: (referralCode: string) => void;
  loading: boolean;
  presetRef?: string | null;
}

export function EnterFacility({ onEnter, loading, presetRef }: EnterFacilityProps) {
  const [refCode, setRefCode] = useState(presetRef || "");

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* The vault door */}
        <div className="relative">
          <img
            src={uiPanels.enterPanel}
            alt="Facility airlock"
            className="w-full pixelated drop-shadow-[0_8px_0_rgba(0,0,0,0.4)]"
          />
          <img
            src={sprites.hazardSign}
            alt=""
            className="absolute -top-3 -right-3 w-10 h-10 pixelated rotate-6"
          />
        </div>

        {/* The paperwork */}
        <div className="frame-metal">
          <div className="p-2">
            <div className="flex items-end gap-3 mb-3">
              <img src={sprites.refineryBuilding} alt="" className="w-16 h-16 pixelated" />
              <h2 className="text-sm leading-6">OPEN YOUR<br />REFINERY</h2>
            </div>
            <p className="text-muted mb-4">
              Pay the one-time entry fee, unlock the starter site, and get a free Hand
              Drill already bolted to the floor.
            </p>

            <div className="panel mb-4 space-y-1 text-lg">
              <div className="flex justify-between">
                <span className="text-muted">Entry fee</span>
                <span className="led-text">{ENTRY_FEE} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Starter miner</span>
                <span className="text-positive">Hand Drill (free)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Starting grid</span>
                <span className="text-text">2x2 - 10 power</span>
              </div>
            </div>

            <input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              maxLength={32}
              placeholder="> referral code (optional)"
              className="input-terminal mb-4"
            />

            <button
              onClick={() => onEnter(refCode)}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Opening..." : `Open Refinery — ${ENTRY_FEE} ETH`}
            </button>

            <div className="flex justify-center gap-6 mt-4 opacity-90">
              <img src={characters.refineryWorker} alt="Refinery worker" className="h-12 pixelated" />
              <img src={characters.miningForeman} alt="Mining foreman" className="h-12 pixelated" />
              <img src={characters.drillBot} alt="Drill bot" className="h-12 pixelated" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
