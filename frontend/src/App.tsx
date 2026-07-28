import { useState, useEffect } from "react";
import { playBlip, isMuted, toggleMute } from "./lib/sound";
import { ConnectButton } from "./components/ConnectButton";
import { GamePage } from "./pages/GamePage";
import { DocsPage } from "./pages/DocsPage";
import { AboutPage } from "./pages/AboutPage";
import { ReferralPage } from "./pages/ReferralPage";
import { PickaxeIcon, BookIcon, InfoIcon, ShareIcon, LinkButton } from "./components/Icons";
import { sprites, uiPanels, brand } from "./assets";

type Page = "game" | "docs" | "about" | "referral";

export default function App() {
  const [page, setPage] = useState<Page>("game");
  const [muted, setMuted] = useState(isMuted());
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1) as Page;
    if (["game", "docs", "about", "referral"].includes(hash)) {
      setPage(hash);
    }
  }, []);

  // every button click gets a retro blip
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("button")) playBlip();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Stack Boy celebrates claims
  useEffect(() => {
    const onClaim = () => {
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 1400);
    };
    window.addEventListener("stack:claimed", onClaim);
    return () => window.removeEventListener("stack:claimed", onClaim);
  }, []);

  const goTo = (p: Page) => {
    setPage(p);
    window.location.hash = p;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => goTo("game")} className="flex items-center gap-3">
            <img src={brand.bottlecap} alt="STACK" className="w-8 h-8 pixelated animate-pulse-glow" />
            <span className="font-heading text-xs md:text-sm text-accent [text-shadow:2px_2px_0_#000]">
              STACK REFINERY
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <LinkButton active={page === "game"} onClick={() => goTo("game")} icon={<PickaxeIcon className="w-4 h-4" />} label="Game" />
            <LinkButton active={page === "docs"} onClick={() => goTo("docs")} icon={<BookIcon className="w-4 h-4" />} label="Docs" />
            <LinkButton active={page === "referral"} onClick={() => goTo("referral")} icon={<ShareIcon className="w-4 h-4" />} label="Referral" />
            <LinkButton active={page === "about"} onClick={() => goTo("about")} icon={<InfoIcon className="w-4 h-4" />} label="About" />
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(toggleMute())}
              className="w-9 h-9 flex items-center justify-center text-lg border-2 border-border hover:border-accent pixel-corners"
              title={muted ? "Unmute sounds" : "Mute sounds"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <ConnectButton />
          </div>
        </div>

        <div className="md:hidden border-t border-border px-4 py-2 flex gap-1 overflow-x-auto">
          <LinkButton active={page === "game"} onClick={() => goTo("game")} icon={<PickaxeIcon className="w-4 h-4" />} label="Game" />
          <LinkButton active={page === "docs"} onClick={() => goTo("docs")} icon={<BookIcon className="w-4 h-4" />} label="Docs" />
          <LinkButton active={page === "referral"} onClick={() => goTo("referral")} icon={<ShareIcon className="w-4 h-4" />} label="Referral" />
          <LinkButton active={page === "about"} onClick={() => goTo("about")} icon={<InfoIcon className="w-4 h-4" />} label="About" />
        </div>
      </header>

      {/* Title banner — atompunk wasteland panorama */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-4">
        <div
          className="relative h-32 md:h-44 pixelated overflow-hidden border-2 border-border"
          style={{ backgroundImage: `url(${brand.wastelandBanner})`, backgroundSize: "100% 100%" }}
        >
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <img
            src={celebrating ? brand.mascotJump : brand.mascot}
            alt="Stack Boy"
            className={`absolute left-2 md:left-6 bottom-0 h-24 md:h-32 pixelated drop-shadow-[3px_3px_0_rgba(0,0,0,0.6)] ${
              celebrating ? "" : "mascot-idle"
            }`}
          />
          <div className="absolute left-24 sm:left-28 md:left-44 right-2 bottom-2 md:bottom-3 [text-shadow:2px_2px_0_#000] overflow-hidden">
            <div className="font-heading text-xs sm:text-sm md:text-xl text-accent whitespace-nowrap">
              STACK REFINERY
            </div>
            <div className="text-base sm:text-lg md:text-2xl text-text font-mono -mt-0.5 truncate">
              A STACK-TEC™ FACILITY — building a brighter yield
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {page === "game" && <GamePage />}
        {page === "docs" && <DocsPage />}
        {page === "referral" && <ReferralPage />}
        {page === "about" && <AboutPage />}
      </main>

      {/* Factory skyline sitting on the footer */}
      <div className="max-w-6xl mx-auto w-full px-4 overflow-hidden">
        <div className="relative flex items-end justify-center gap-3 md:gap-6 translate-y-[3px] opacity-95">
          <img src={sprites.crane} alt="" className="h-20 md:h-28 pixelated" />
          <img src={sprites.storageTank} alt="" className="h-14 md:h-20 pixelated" />
          <span className="relative">
            <span className="smoke-puff left-[30%] -top-2" />
            <span className="smoke-puff left-[55%] -top-1 [animation-delay:1.1s]" />
            <img src={sprites.refineryBuilding} alt="" className="h-16 md:h-24 pixelated" />
          </span>
          <span className="relative hidden sm:block">
            <span className="smoke-puff left-[45%] -top-2 [animation-delay:2s]" />
            <img src={sprites.smelterFurnace} alt="" className="h-14 md:h-20 pixelated" />
          </span>
          <img src={sprites.conveyorBelt} alt="" className="h-12 md:h-16 pixelated hidden md:block" />
          <img src={sprites.orePile} alt="" className="h-8 md:h-10 pixelated" />
          <img src={sprites.controlTerminal} alt="" className="h-10 md:h-14 pixelated hidden sm:block" />
          <img src={sprites.hazardSign} alt="" className="h-8 md:h-10 pixelated" />
        </div>
      </div>
      <footer
        className="pixelated"
        style={{ backgroundImage: `url(${uiPanels.footerBar})`, backgroundSize: "100% 100%" }}
      >
        <div className="max-w-6xl mx-auto px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-1 text-base sm:text-lg text-center">
          <span className="font-mono text-text [text-shadow:2px_2px_0_#000]">
            STACK-TEC™ INDUSTRIES // ROBINHOOD CHAIN
          </span>
          <a
            href="https://robinhoodchain.blockscout.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-text hover:text-accent [text-shadow:2px_2px_0_#000]"
          >
            View on Explorer
          </a>
        </div>
      </footer>
    </div>
  );
}
