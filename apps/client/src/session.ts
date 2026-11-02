// One game session: local (two players, one device), host or guest (online through PeerJS).
// The host (or the local device) runs the engine; a guest only sends actions and shows the state it gets back.
// Room codes and connection settings follow the prototype (prototype/index.html).
import { content, starterDeck } from "@hcd/content";
import { apply, newMatch, normalConfig, type Action, type GameEvent, type GameState, type Seat } from "@hcd/engine";
import { Peer, type DataConnection } from "peerjs";

export type Mode = "local" | "host" | "guest";

export interface Snapshot {
  mode: Mode | null;
  state: GameState | null;
  events: GameEvent[]; // from the last action, for animations
  history: GameEvent[]; // recent events, newest last, for the log
  seq: number; // bumps on every change, restarts animations
  deadline: number | null; // when the current draft step or Preparation Phase times out (ms)
  status: string; // connection news or the last error
  code: string | null; // room code
  mySeat: Seat | null; // null = local: both seats on this device
  connected: boolean;
}

type Msg =
  | { t: "hello" }
  | { t: "action"; action: Action }
  | { t: "state"; state: GameState; events: GameEvent[]; seq: number; remainingMs: number | null }
  | { t: "error"; error: string };

const PREFIX = "hcd-v2-";
const TURN = { username: "openrelayproject", credential: "openrelayproject" };
const PEER_OPTS = {
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "turn:openrelay.metered.ca:80", ...TURN },
      { urls: "turn:openrelay.metered.ca:443", ...TURN },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", ...TURN },
    ],
  },
};
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

const empty: Snapshot = {
  mode: null,
  state: null,
  events: [],
  history: [],
  seq: 0,
  deadline: null,
  status: "",
  code: null,
  mySeat: null,
  connected: false,
};

// Seconds for the current draft step or Preparation Phase (rules.md), or null when there is no clock.
function stepSeconds(s: GameState): number | null {
  const t = s.config.timers;
  if (s.phase === "draft") return s.draft!.stage === "timeOfDay" ? t.timeOfDay : s.draft!.stage === "ban" ? t.banPhase : t.pick;
  if (s.phase === "prep") return s.round === 1 ? t.firstPrep : t.majorPrep;
  return null;
}
const stepKey = (s: GameState) => `${s.phase}|${s.draft?.stage}|${s.draft?.pickIndex}|${s.round}`;

class Session {
  private snap: Snapshot = empty;
  private listeners = new Set<() => void>();
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private timerKey = "";

  constructor() {
    setInterval(() => this.tick(), 250);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  get = () => this.snap;

  private set(p: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...p };
    for (const fn of this.listeners) fn();
  }

  leave() {
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.conn = null;
    this.timerKey = "";
    this.set(empty);
  }

  startLocal() {
    this.leave();
    this.set({ mode: "local", state: newMatch(normalConfig, newSeed(), { A: starterDeck, B: starterDeck }) });
    this.armTimer();
  }

  host() {
    this.leave();
    const code = newCode();
    this.set({ mode: "host", mySeat: "A", code, status: "กำลังเปิดห้อง…" });
    const peer = new Peer(PREFIX + code, PEER_OPTS);
    this.peer = peer;
    peer.on("open", () => this.set({ status: "รอเพื่อนเข้าห้อง…" }));
    peer.on("connection", (conn) => this.bind(conn));
    peer.on("error", (e) => this.set({ status: `เชื่อมต่อไม่ได้ (${e.type})` }));
    peer.on("disconnected", () => !peer.destroyed && peer.reconnect());
  }

  join(code: string) {
    this.leave();
    code = code.trim().toUpperCase();
    this.set({ mode: "guest", mySeat: "B", code, status: `กำลังเข้าห้อง ${code}…` });
    const peer = new Peer(PEER_OPTS);
    this.peer = peer;
    peer.on("open", () => this.connect());
    peer.on("error", (e) => {
      if (e.type !== "peer-unavailable") return this.set({ status: `เชื่อมต่อไม่ได้ (${e.type})` });
      this.set({ status: `ยังไม่พบห้อง ${code} เจ้าของห้องต้องเปิดหน้าเกมค้างไว้ กำลังลองใหม่…` });
      setTimeout(() => this.peer === peer && !this.conn?.open && this.connect(), 4000);
    });
    peer.on("disconnected", () => !peer.destroyed && peer.reconnect());
  }

  private connect() {
    if (!this.peer || this.peer.destroyed || !this.snap.code) return;
    this.bind(this.peer.connect(PREFIX + this.snap.code, { reliable: true }));
  }

  private bind(conn: DataConnection) {
    conn.on("open", () => {
      if (this.snap.mode === "guest") {
        this.conn = conn;
        conn.send({ t: "hello" } satisfies Msg);
      }
    });
    conn.on("data", (m) => this.onMessage(conn, m as Msg));
    conn.on("close", () => {
      if (this.conn !== conn) return;
      this.conn = null;
      this.set({ connected: false, status: "อีกฝ่ายหลุดการเชื่อมต่อ เกมจะรอจนกว่าจะกลับมา" });
      if (this.snap.mode === "guest") setTimeout(() => !this.conn && this.connect(), 3000);
    });
  }

  private onMessage(conn: DataConnection, m: Msg) {
    if (this.snap.mode === "host") {
      if (m.t === "hello") {
        if (this.conn && this.conn !== conn) this.conn.close();
        this.conn = conn;
        if (!this.snap.state) this.set({ state: newMatch(normalConfig, newSeed(), { A: starterDeck, B: starterDeck }) });
        this.set({ connected: true, status: "" });
        this.armTimer();
        this.broadcast();
      } else if (m.t === "action" && conn === this.conn) {
        // The guest plays B only, and never sends the clock's time-up actions.
        if (!("seat" in m.action) || m.action.seat !== "B") return conn.send({ t: "error", error: "not your seat" } satisfies Msg);
        const error = this.run(m.action);
        if (error) conn.send({ t: "error", error } satisfies Msg);
      }
      return;
    }
    if (m.t === "state") {
      this.set({
        state: m.state,
        events: m.events,
        history: [...this.snap.history, ...m.events].slice(-80),
        seq: m.seq,
        deadline: m.remainingMs === null ? null : Date.now() + m.remainingMs,
        connected: true,
        status: "",
      });
    } else if (m.t === "error") {
      this.set({ status: m.error });
    }
  }

  // Everything the player does goes through here.
  dispatch(a: Action): string | null {
    if (this.snap.mode === "guest") {
      if (!this.conn?.open) return "ไม่ได้เชื่อมต่อ";
      this.conn.send({ t: "action", action: a } satisfies Msg);
      return null;
    }
    return this.run(a);
  }

  private run(a: Action): string | null {
    const s = this.snap.state;
    if (!s) return "ยังไม่เริ่มเกม";
    const r = apply(s, a, content);
    if (!r.ok) {
      this.set({ status: r.error });
      return r.error;
    }
    this.set({
      state: r.state,
      events: r.events,
      history: [...this.snap.history, ...r.events].slice(-80),
      seq: this.snap.seq + 1,
      status: "",
    });
    this.armTimer();
    this.broadcast();
    return null;
  }

  private broadcast() {
    const { state, events, seq, deadline } = this.snap;
    if (!this.conn?.open || !state) return;
    // As in the prototype, the whole state is sent, opponent's hand included (no hidden information yet).
    const remainingMs = deadline === null ? null : Math.max(deadline - Date.now(), 0);
    this.conn.send({ t: "state", state, events, seq, remainingMs } satisfies Msg);
  }

  // A new draft step or Preparation Phase starts its clock (rules.md timings, config.timers).
  private armTimer() {
    const s = this.snap.state;
    if (!s || stepKey(s) === this.timerKey) return;
    this.timerKey = stepKey(s);
    const secs = stepSeconds(s);
    this.set({ deadline: secs === null ? null : Date.now() + secs * 1000 });
  }

  private tick() {
    const { mode, state, deadline } = this.snap;
    if (mode === "guest" || !state || deadline === null || Date.now() < deadline) return;
    this.set({ deadline: null });
    if (state.phase === "draft") this.run({ type: "DraftTimeUp" });
    else if (state.phase === "prep") this.run({ type: "PrepTimeUp" });
  }
}

export const session = new Session();
