import { useState, useEffect } from "react";
import { ConnectButton } from "./components/ConnectButton";
import { GamePage } from "./pages/GamePage";
import { DocsPage } from "./pages/DocsPage";
import { AboutPage } from "./pages/AboutPage";
import { ReferralPage } from "./pages/ReferralPage";
import { PickaxeIcon, BookIcon, InfoIcon, ShareIcon, LinkButton } from "./components/Icons";
import { sprites, uiPanels } from "./assets";

type Page = "game" | "docs" | "about" | "referral";

export default function App() {
  const [page, setPage] = useState<Page>("game");

  useEffect(() => {
    const hash = window.location.hash.slice(1) as Page;
    if (["game", "docs", "about", "referral"].includes(hash)) {
      setPage(hash);
    }
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
            <img src={sprites.tokenIcon} alt="STACK" className="w-8 h-8 pixelated animate-pulse-glow" />
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

          <ConnectButton />
        </div>

        <div className="md:hidden border-t border-border px-4 py-2 flex gap-1 overflow-x-auto">
          <LinkButton active={page === "game"} onClick={() => goTo("game")} icon={<PickaxeIcon className="w-4 h-4" />} label="Game" />
          <LinkButton active={page === "docs"} onClick={() => goTo("docs")} icon={<BookIcon className="w-4 h-4" />} label="Docs" />
          <LinkButton active={page === "referral"} onClick={() => goTo("referral")} icon={<ShareIcon className="w-4 h-4" />} label="Referral" />
          <LinkButton active={page === "about"} onClick={() => goTo("about")} icon={<InfoIcon className="w-4 h-4" />} label="About" />
        </div>
      </header>

      {/* Title banner — gears & pipes frame from PixelLab */}
      <div className="max-w-6xl mx-auto w-full px-4 mt-4">
        <div
          className="relative h-20 md:h-24 pixelated flex items-center justify-center"
          style={{ backgroundImage: `url(${uiPanels.headerBanner})`, backgroundSize: "100% 100%" }}
        >
          <div className="text-center">
            <div className="font-heading text-sm md:text-lg text-accent [text-shadow:3px_3px_0_#000]">
              STACK REFINERY
            </div>
            <div className="text-lg md:text-xl text-muted font-mono -mt-0.5">
              dig. claim. compound. repeat.
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
        <div className="flex items-end justify-center gap-3 md:gap-6 translate-y-[3px] opacity-95">
          <img src={sprites.crane} alt="" className="h-20 md:h-28 pixelated" />
          <img src={sprites.storageTank} alt="" className="h-14 md:h-20 pixelated" />
          <img src={sprites.refineryBuilding} alt="" className="h-16 md:h-24 pixelated" />
          <img src={sprites.smelterFurnace} alt="" className="h-14 md:h-20 pixelated hidden sm:block" />
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
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between text-lg">
          <span className="font-mono text-text [text-shadow:2px_2px_0_#000]">
            STACK REFINERY // ROBINHOOD CHAIN
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
