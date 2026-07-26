import { useState } from "react";
import { useWallet } from "../lib/useWallet";
import { getRefineryContract } from "../lib/contracts";
import { ShareIcon } from "../components/Icons";
import { REFERRAL_TIERS } from "../config";
import { formatStack, shortAddr } from "../lib/format";
import { ethers } from "ethers";

export function ReferralPage() {
  const wallet = useWallet();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    refCode: string;
    referrer: string;
    referredVolume: number;
    tier: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchReferral = async () => {
    if (!wallet.address) return;
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const refinery = getRefineryContract(provider);
    try {
      const [refCode, referrer, refVol, tier] = await Promise.all([
        refinery.referralCode(wallet.address),
        refinery.referrer(wallet.address),
        refinery.referredVolume(wallet.address),
        refinery.referralTier(wallet.address),
      ]);
      setData({
        refCode,
        referrer,
        referredVolume: parseFloat(ethers.formatUnits(refVol, 18)),
        tier: Number(tier),
      });
    } catch {
      setData(null);
    }
  };

  const createCode = async () => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const signer = await wallet.getSigner();
      if (!signer) throw new Error("No signer");
      const refinery = getRefineryContract(signer);
      const tx = await refinery.createReferralCode(code);
      await tx.wait();
      await fetchReferral();
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.address) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h2 className="text-xl font-heading mb-2">Connect to View Referrals</h2>
        <p className="text-muted">Connect your wallet to manage your referral code.</p>
      </div>
    );
  }

  // Auto-fetch on connect
  if (wallet.address && !data && !loading) {
    fetchReferral();
  }

  const shareLink = data?.refCode ? `${window.location.origin}?ref=${data.refCode}` : "";
  const currentTier = REFERRAL_TIERS[(data?.tier ?? 1) - 1] || REFERRAL_TIERS[0];
  const nextTier = REFERRAL_TIERS[data?.tier ?? 1] || null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-heading flex items-center gap-2">
        <ShareIcon className="w-6 h-6 text-accent" />
        Referral Program
      </h1>

      {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 text-sm text-danger">{error}</div>}

      {data?.refCode ? (
        <div className="panel-elevated space-y-4">
          <div>
            <span className="stat-label">Your Referral Code</span>
            <div className="text-lg font-heading text-accent">{data.refCode}</div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareLink}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-secondary text-sm"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="stat-label">Current Tier</span>
                <div className="font-heading text-text-strong">{currentTier.name}</div>
                <div className="text-accent font-mono">{currentTier.rate}%</div>
              </div>
              <div>
                <span className="stat-label">Referred Volume</span>
                <div className="font-heading text-text-strong">{formatStack(data.referredVolume.toString())} STACK</div>
              </div>
            </div>
            {nextTier && (
              <p className="text-xs text-muted mt-3">
                Next: {nextTier.name} ({nextTier.rate}%) at {formatStack(nextTier.threshold.toString())} STACK referred.
              </p>
            )}
          </div>

          {data.referrer !== "0x0000000000000000000000000000000000000000" && (
            <div className="text-xs text-muted">
              Referred by: <span className="font-mono text-text">{shortAddr(data.referrer)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="panel-elevated space-y-3">
          <p className="text-muted text-sm">
            Create your permanent referral code. Earn 1-3% of your referrals' claims, plus 50% of their second-level referrals.
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
            <button onClick={createCode} disabled={loading || code.length < 5} className="btn-primary text-sm">
              {loading ? "Creating..." : "Create Code"}
            </button>
          </div>
          <p className="text-xs text-muted">5-32 lowercase letters or digits. One code per wallet, permanent and non-transferable.</p>
        </div>
      )}

      <div className="panel">
        <h3 className="font-heading text-text-strong mb-2">How It Works</h3>
        <ul className="text-sm text-muted space-y-2">
          <li>Share your code or link with friends.</li>
          <li>They attach your code before or at entry.</li>
          <li>You earn 1-3% of their gross claim volume, by tier.</li>
          <li>If your referrer has a referrer, they earn 50% of your direct reward.</li>
          <li>All bonuses come from the fixed 4.5% cut. Your friend always gets 95.5%.</li>
          <li>Self-referrals and two-wallet loops are rejected on-chain.</li>
        </ul>
      </div>
    </div>
  );
}