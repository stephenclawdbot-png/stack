import t0 from "../assets/sprites/t0-hand-drill.png";
import t1 from "../assets/sprites/t1-drill-rig.png";
import t2 from "../assets/sprites/t2-pump-jack.png";
import t3 from "../assets/sprites/t3-excavator.png";
import t4 from "../assets/sprites/t4-mega-rig.png";
import tokenIcon from "../assets/sprites/token-icon.png";
import refineryBuilding from "../assets/sprites/refinery-building.png";
import conveyorBelt from "../assets/sprites/conveyor-belt.png";
import orePile from "../assets/sprites/ore-pile.png";
import controlTerminal from "../assets/sprites/control-terminal.png";
import storageTank from "../assets/sprites/storage-tank.png";
import smelterFurnace from "../assets/sprites/smelter-furnace.png";
import pipeValve from "../assets/sprites/pipe-valve.png";
import hazardSign from "../assets/sprites/hazard-sign.png";
import crane from "../assets/sprites/crane.png";

import headerBanner from "../assets/ui/header-banner.png";
import statPanel from "../assets/ui/stat-panel.png";
import shopPanel from "../assets/ui/shop-panel.png";
import claimPanel from "../assets/ui/claim-panel.png";
import referralPanel from "../assets/ui/referral-panel.png";
import refineryPanel from "../assets/ui/refinery-panel.png";
import footerBar from "../assets/ui/footer-bar.png";
import docsPanel from "../assets/ui/docs-panel.png";
import gridPanel from "../assets/ui/grid-panel.png";
import enterPanel from "../assets/ui/enter-panel.png";

import refineryWorker from "../assets/characters/refinery-worker-south.png";
import miningForeman from "../assets/characters/mining-foreman-south.png";
import drillBot from "../assets/characters/drill-bot-south.png";

import mascot from "../assets/brand/mascot.png";
import mascotJump from "../assets/brand/mascot-jump.png";
import bottlecap from "../assets/brand/bottlecap.png";
import wastelandBanner from "../assets/brand/wasteland-banner.png";

export const minerSprites = [t0, t1, t2, t3, t4];

// Working-loop animation frames per tier (PixelLab animate_object, 7
// frames each). T0 has no animation — single static frame, CSS jitter.
const animModules = import.meta.glob("./sprites/anim/t*/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const minerAnimFrames: string[][] = [[t0], [t1], [t2], [t3], [t4]];
for (let tier = 1; tier <= 4; tier++) {
  const frames = Object.entries(animModules)
    .filter(([p]) => p.includes(`/t${tier}/`))
    .sort(([a], [b]) => {
      const na = parseInt(a.match(/(\d+)\.png$/)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/(\d+)\.png$/)?.[1] ?? "0", 10);
      return na - nb;
    })
    .map(([, url]) => url);
  if (frames.length > 0) minerAnimFrames[tier] = frames;
}

export const sprites = {
  t0HandDrill: t0,
  t1DrillRig: t1,
  t2PumpJack: t2,
  t3Excavator: t3,
  t4MegaRig: t4,
  tokenIcon,
  refineryBuilding,
  conveyorBelt,
  orePile,
  controlTerminal,
  storageTank,
  smelterFurnace,
  pipeValve,
  hazardSign,
  crane,
};

export const uiPanels = {
  headerBanner,
  statPanel,
  shopPanel,
  claimPanel,
  referralPanel,
  refineryPanel,
  footerBar,
  docsPanel,
  gridPanel,
  enterPanel,
};

export const characters = {
  refineryWorker,
  miningForeman,
  drillBot,
};

// Stack-Tec brand assets (atompunk rebrand)
export const brand = {
  mascot,
  mascotJump,
  bottlecap,
  wastelandBanner,
};