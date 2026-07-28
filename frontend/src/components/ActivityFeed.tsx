import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ADDRESSES, MINER_TIERS } from "../config";
import { REFINERY_EVENTS } from "../lib/contracts";
import { formatStack, shortAddr } from "../lib/format";

interface FeedRow {
  id: string;
  text: string;
  accent?: boolean;
}

const DEMO_POOL: string[] = [
  "0x3f..a2 claimed 8,412 STACK",
  "0x91..77 bought a Mega Rig",
  "0x5c..19 compounded into a Pump Jack",
  "0xa4..e3 upgraded to Large Refinery",
  "0xd0..4b claimed 921 STACK",
  "0x77..c8 bought a Drill Rig",
  "0x28..90 compounded into an Excavator",
  "0xbe..12 claimed 44,102 STACK",
];

/// Live wire of what other wastelanders are doing — greed fuel.
export function ActivityFeed({ demo }: { demo?: boolean }) {
  const [rows, setRows] = useState<FeedRow[]>([]);

  // demo mode: rotate fake entries
  useEffect(() => {
    if (!demo) return;
    let i = 0;
    setRows(DEMO_POOL.slice(0, 5).map((t, j) => ({ id: `d${j}`, text: t, accent: j === 0 })));
    const interval = window.setInterval(() => {
      i++;
      const t = DEMO_POOL[i % DEMO_POOL.length];
      setRows((rs) => [{ id: `d${i}-${Date.now()}`, text: t, accent: true },
        ...rs.map((r) => ({ ...r, accent: false }))].slice(0, 6));
    }, 3500);
    return () => clearInterval(interval);
  }, [demo]);

  // real mode: recent contract events
  useEffect(() => {
    if (demo || ADDRESSES.refinery === "0x0000000000000000000000000000000000000000") return;
    if (typeof window === "undefined" || !window.ethereum) return;
    let stop = false;

    const load = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum!);
        const iface = new ethers.Interface(REFINERY_EVENTS);
        const latest = await provider.getBlockNumber();
        const logs = await provider.getLogs({
          address: ADDRESSES.refinery,
          fromBlock: Math.max(0, latest - 5000),
          toBlock: latest,
        });
        const parsed: FeedRow[] = [];
        for (const log of logs.slice(-12).reverse()) {
          try {
            const ev = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (!ev) continue;
            if (ev.name === "RewardsClaimed") {
              parsed.push({
                id: log.transactionHash + log.index,
                text: `${shortAddr(ev.args.player)} claimed ${formatStack(
                  parseFloat(ethers.formatUnits(ev.args.gross, 18))
                )} STACK`,
              });
            } else if (ev.name === "MinerPurchased") {
              const tier = MINER_TIERS[Number(ev.args.tier)];
              parsed.push({
                id: log.transactionHash + log.index,
                text: `${shortAddr(ev.args.player)} added a ${tier?.name ?? "rig"}`,
              });
            } else if (ev.name === "FacilityUpgraded") {
              parsed.push({
                id: log.transactionHash + log.index,
                text: `${shortAddr(ev.args.player)} upgraded to T${ev.args.newTier}`,
              });
            }
          } catch { /* unknown event */ }
        }
        if (!stop) setRows(parsed.slice(0, 6));
      } catch { /* rpc hiccup — keep whatever we have */ }
    };

    load();
    const interval = window.setInterval(load, 15000);
    return () => { stop = true; clearInterval(interval); };
  }, [demo]);

  return (
    <div className="panel-elevated">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 bg-positive animate-pulse" />
        <span className="stat-label">Wasteland wire</span>
      </div>
      <div className="space-y-1 text-lg leading-6 min-h-[9rem]">
        {rows.length === 0 && <div className="text-muted">Listening for activity...</div>}
        {rows.map((r) => (
          <div key={r.id} className={r.accent ? "text-accent" : "text-muted"}>
            &gt; {r.text}
          </div>
        ))}
      </div>
    </div>
  );
}
