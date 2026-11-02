import { useState, useSyncExternalStore } from "react";
import { session } from "./session.ts";
import { Draft } from "./ui/Draft.tsx";
import { Lobby } from "./ui/Lobby.tsx";
import { Match } from "./ui/Match.tsx";
import { Menu, type Page } from "./ui/Menu.tsx";
import { DeckPage, HeroesPage, InfoPage } from "./ui/Pages.tsx";

export function App() {
  const snap = useSyncExternalStore(session.subscribe, session.get);
  const [page, setPage] = useState<Page>("home");
  const home = () => setPage("home");
  if (!snap.mode) {
    if (page === "heroes") return <HeroesPage back={home} />;
    if (page === "deck") return <DeckPage back={home} />;
    if (page === "info") return <InfoPage back={home} />;
    return <Menu go={setPage} />;
  }
  if (!snap.state) return <Lobby snap={snap} />;
  return snap.state.phase === "draft" ? <Draft snap={snap} /> : <Match snap={snap} />;
}
