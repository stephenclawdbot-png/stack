import { useState } from "react";
import type { GameState } from "../lib/useGame";
import { ShareIcon } from "./Icons";
import { REFERRAL_TIERS } from "../config";
import { formatStack, shortAddr } from "../lib/format";

interface ReferralPanelProps {
  state: GameState;
  onCreateCode: (code: string) => void;
  loading: boolean;
}

export function ReferralPanel({ state, onCreateCode, loading }: ReferralPanelProps) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const shareLink = state.referralCode
    ? `${window.location.origin}?ref=${state.referralCode}`
    : "";

  const currentTier = REFERRAL_TIERS[state.referralTier - 1] || REFERRAL_TIERS[0];
  const nextTier = REFERRAL_TIERS[state.referralTier] || null;

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="panel-elevated">
      <h3 className="font-heading text-text-strong mb-3 flex items-center gap-2">
        <ShareIcon className="w-5 h-5 text-accent" />
        Referral Program
      </h3>

      {state.referrer !== "0x0000000000000000000000000000000000000000" && (
        <div className="text-xs text-muted mb-3">
          Referred by: <span className="font-mono text-text">{shortAddr(state.referrer)}</span>
        </div>
      )}

      {state.referralCode ? (
        <div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text"
            />
            <button onClick={copyLink} className="btn-secondary text-sm">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-4">
            <div className="stat-label mb-1">Your Tier: {currentTier.name}</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-heading text-accent">{currentTier.rate}%</span>
              <span className="text-xs text-muted">
                Referred: {formatStack(state.referredVolume.toString())} STACK
              </span>
            </div>
            {nextTier && (
              <div className="text-xs text-muted">
                Next: {nextTier.name} at {formatStack(nextTier.threshold.toString())} STACK referred
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted mb-3">
            Create a custom referral code. Earn 1-3% of your referrals' claims.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              maxLength={32}
              placeholder="e.g. refinery24"
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text placeholder:text-muted/50"
            />
            <button
              onClick={() => onCreateCode(code)}
              disabled={loading || code.length < 5}
              className="btn-primary text-sm"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
          <p className="text-xs text-muted mt-2">5-32 lowercase letters or digits. One code per wallet, permanent.</p>
        </div>
      )}
    </div>
  );
}