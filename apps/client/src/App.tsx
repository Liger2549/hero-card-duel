import { useSyncExternalStore } from "react";
import { session } from "./session.ts";
import { Draft } from "./ui/Draft.tsx";
import { Match } from "./ui/Match.tsx";
import { Menu, Waiting } from "./ui/Menu.tsx";

export function App() {
  const snap = useSyncExternalStore(session.subscribe, session.get);
  if (!snap.mode) return <Menu />;
  if (!snap.state) return <Waiting snap={snap} />;
  return (
    <>
      {snap.state.phase === "draft" ? <Draft snap={snap} /> : <Match snap={snap} />}
      <button className="leave ghost" onClick={() => confirm("ออกจากเกม?") && session.leave()}>
        ออก
      </button>
    </>
  );
}
