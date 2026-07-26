import { useState, useEffect } from "react";
import { ConnectButton } from "./components/ConnectButton";
import { GamePage } from "./pages/GamePage";
import { DocsPage } from "./pages/DocsPage";
import { AboutPage } from "./pages/AboutPage";
import { ReferralPage } from "./pages/ReferralPage";
import { GearIcon, PickaxeIcon, BookIcon, InfoIcon, ShareIcon, LinkButton } from "./components/Icons";
import { sprites, characters } from "./assets";

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
          <button onClick={() => goTo("game")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center overflow-hidden">
              <img src={sprites.tokenIcon} alt="STACK" className="w-6 h-6 pixelated" />
            </div>
            <span className="font-heading text-lg font-semibold text-text-strong tracking-tight">
              Stack Refinery
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {page === "game" && <GamePage />}
        {page === "docs" && <DocsPage />}
        {page === "referral" && <ReferralPage />}
        {page === "about" && <AboutPage />}
      </main>

      <footer className="border-t border-border bg-surface/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted">
          <span>Stack Refinery | Robinhood Chain</span>
          <a href="https://explorer.robinhood.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            View on Explorer
          </a>
        </div>
      </footer>
    </div>
  );
}
