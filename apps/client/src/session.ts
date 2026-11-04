// One game session: local (two players, one device), against the AI, or online through PeerJS
// (host or guest). The host (or this device) runs the engine; a guest only sends actions and shows
// the state it gets back. Room codes and connection settings follow the prototype (prototype/index.html).
import { content, starterDeck } from "@hcd/content";
import {
  apply,
  botAction,
  checkConfig,
  newMatch,
  normalConfig,
  type Action,
  type GameEvent,
  type GameState,
  type MatchConfig,
  type Seat,
} from "@hcd/engine";
import { Peer, type DataConnection } from "peerjs";
import { loadDeck, loadName } from "./storage.ts";
import { splitSteps, STEP_MS } from "./playback.ts";
import type { PrepBase } from "./view.ts";

export type Mode = "local" | "ai" | "host" | "guest";

// A room before the game starts (rules.md "Match config": Normal or Custom room).
export interface Lobby {
  gameMode: "normal" | "custom";
  config: MatchConfig;
  guestHere: boolean;
}

export interface Snapshot {
  mode: Mode | null;
  state: GameState | null;
  events: GameEvent[]; // from the last action, for animations
  history: GameEvent[]; // recent events, newest last, for the log
  logTotal: number; // events ever added to the log (history holds the last ones)
  prepBase: PrepBase | null; // the state when this Preparation Phase started (view.ts)
  seq: number; // bumps on every change, restarts animations
  deadline: number | null; // when the current draft step or Preparation Phase times out (ms)
  status: string; // connection news or the last error
  code: string | null; // room code
  mySeat: Seat | null; // null = local: both seats on this device
  names: Record<Seat, string>;
  lobby: Lobby | null;
  connected: boolean;
}

type Msg =
  | { t: "hello"; name: string; deck: string[] }
  | { t: "lobby"; lobby: Lobby; names: Record<Seat, string> }
  | { t: "action"; action: Action }
  | { t: "state"; state: GameState; events: GameEvent[]; seq: number; remainingMs: number | null; names: Record<Seat, string> }
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
const AI_DELAY_MS = 600; // so the AI's moves can be followed

const empty: Snapshot = {
  mode: null,
  state: null,
  events: [],
  history: [],
  logTotal: 0,
  prepBase: null,
  seq: 0,
  deadline: null,
  status: "",
  code: null,
  mySeat: null,
  names: { A: "", B: "" },
  lobby: null,
  connected: false,
};

// Seconds for the current draft step or Preparation Phase (rules.md), or null when there is no clock.
function stepSeconds(s: GameState): number | null {
  const t = s.config.timers;
  let secs = 0;
  if (s.phase === "draft") secs = s.draft!.stage === "timeOfDay" ? t.timeOfDay : s.draft!.stage === "ban" ? t.ban : t.pick;
  if (s.phase === "prep") secs = s.round === 1 ? t.firstPrep : t.majorPrep;
  return secs > 0 ? secs : null; // 0 = no clock
}
const stepKey = (s: GameState) => `${s.phase}|${s.draft?.stage}|${s.draft?.banIndex}|${s.draft?.pickIndex}|${s.round}`;

class Session {
  private snap: Snapshot = empty;
  private listeners = new Set<() => void>();
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private timerKey = "";
  private guestDeck: string[] = starterDeck;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    setInterval(() => this.tick(), 250);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  get = () => this.snap;

  private set(p: Partial<Snapshot>) {
    const next = { ...this.snap, ...p };
    const s = next.state;
    if (!s || s.phase !== "prep") next.prepBase = null;
    else if (next.prepBase?.round !== s.round) next.prepBase = { round: s.round, state: s, logAt: next.logTotal };
    this.snap = next;
    for (const fn of this.listeners) fn();
  }

  leave() {
    this.conn?.close();
    this.peer?.destroy();
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.peer = null;
    this.conn = null;
    this.timerKey = "";
    this.set(empty);
  }

  startLocal() {
    this.leave();
    this.set({ mode: "local", state: newMatch(normalConfig, newSeed(), { A: loadDeck(), B: loadDeck() }) });
    this.armTimer();
  }

  // You are A; the AI plays B.
  startAI() {
    this.leave();
    this.set({
      mode: "ai",
      mySeat: "A",
      names: { A: loadName() || "คุณ", B: "AI" },
      state: newMatch(normalConfig, newSeed(), { A: loadDeck(), B: starterDeck }),
    });
    this.armTimer();
    this.scheduleAI();
  }

  // ---- Online rooms ----

  host(gameMode: Lobby["gameMode"]) {
    this.leave();
    const code = newCode();
    this.set({
      mode: "host",
      mySeat: "A",
      code,
      names: { A: loadName() || "เจ้าของห้อง", B: "" },
      lobby: { gameMode, config: { ...normalConfig, mode: gameMode }, guestHere: false },
      status: "กำลังเปิดห้อง…",
    });
    const peer = new Peer(PREFIX + code, PEER_OPTS);
    this.peer = peer;
    peer.on("open", () => this.set({ status: "" }));
    peer.on("connection", (conn) => this.bind(conn));
    peer.on("error", (e) => this.set({ status: `เชื่อมต่อไม่ได้ (${e.type})` }));
    peer.on("disconnected", () => !peer.destroyed && peer.reconnect());
  }

  // Custom room: the host changes the rules before starting.
  setConfig(config: MatchConfig) {
    if (this.snap.mode !== "host" || !this.snap.lobby || this.snap.lobby.gameMode !== "custom") return;
    this.set({ lobby: { ...this.snap.lobby, config } });
    this.sendLobby();
  }

  startGame() {
    const lobby = this.snap.lobby;
    if (this.snap.mode !== "host" || !lobby?.guestHere || checkConfig(lobby.config).length) return;
    this.set({ state: newMatch(lobby.config, newSeed(), { A: loadDeck(), B: this.guestDeck }) });
    this.armTimer();
    this.broadcast();
  }

  join(code: string) {
    this.leave();
    code = code.trim().toUpperCase();
    this.set({ mode: "guest", mySeat: "B", code, names: { A: "", B: loadName() || "ผู้เล่น 2" }, status: `กำลังเข้าห้อง ${code}…` });
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
      if (this.snap.mode !== "guest") return;
      this.conn = conn;
      conn.send({ t: "hello", name: this.snap.names.B, deck: loadDeck() } satisfies Msg);
    });
    conn.on("data", (m) => this.onMessage(conn, m as Msg));
    conn.on("close", () => {
      if (this.conn !== conn) return;
      this.conn = null;
      if (this.snap.mode === "host" && !this.snap.state && this.snap.lobby) {
        this.set({ lobby: { ...this.snap.lobby, guestHere: false }, names: { ...this.snap.names, B: "" } });
        return;
      }
      this.set({ connected: false, status: "อีกฝ่ายหลุดการเชื่อมต่อ เกมจะรอจนกว่าจะกลับมา" });
      if (this.snap.mode === "guest") setTimeout(() => !this.conn && this.connect(), 3000);
    });
  }

  private onMessage(conn: DataConnection, m: Msg) {
    if (this.snap.mode === "host") {
      if (m.t === "hello") {
        if (this.conn && this.conn !== conn) this.conn.close();
        this.conn = conn;
        this.guestDeck = Array.isArray(m.deck) ? m.deck : starterDeck;
        this.set({ connected: true, names: { ...this.snap.names, B: String(m.name || "ผู้เล่น 2").slice(0, 20) } });
        if (this.snap.lobby) this.set({ lobby: { ...this.snap.lobby, guestHere: true } });
        if (this.snap.state) this.broadcast();
        else this.sendLobby();
      } else if (m.t === "action" && conn === this.conn) {
        // The guest plays B only, and never sends the clock's time-up actions.
        if (!("seat" in m.action) || m.action.seat !== "B") return conn.send({ t: "error", error: "not your seat" } satisfies Msg);
        const error = this.run(m.action);
        if (error) conn.send({ t: "error", error } satisfies Msg);
      }
      return;
    }
    if (m.t === "lobby") this.set({ lobby: m.lobby, names: m.names, connected: true, status: "" });
    else if (m.t === "state") {
      this.set({
        state: m.state,
        events: m.events,
        ...this.log(m.events),
        seq: m.seq,
        names: m.names,
        deadline: m.remainingMs === null ? null : Date.now() + m.remainingMs,
        connected: true,
        status: "",
      });
    } else if (m.t === "error") this.set({ status: m.error });
  }

  private sendLobby() {
    const { lobby, names } = this.snap;
    if (this.conn?.open && lobby) this.conn.send({ t: "lobby", lobby, names } satisfies Msg);
  }

  // ---- Playing ----

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
      ...this.log(r.events),
      seq: this.snap.seq + 1,
      status: "",
    });
    this.armTimer();
    this.broadcast();
    this.scheduleAI();
    return null;
  }

  private log(events: GameEvent[]) {
    return { history: [...this.snap.history, ...events].slice(-80), logTotal: this.snap.logTotal + events.length };
  }

  // AI mode: whenever it is the AI's move, play it after a short pause. In combat it waits for the last action's
  // step-by-step playback (playback.ts) and then STEP_MS more, so each move can be followed.
  private scheduleAI() {
    if (this.snap.mode !== "ai" || this.aiTimer) return;
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      const s = this.snap.state;
      if (this.snap.mode !== "ai" || !s) return;
      const a = botAction(s, content, "B");
      if (a) this.run(a);
    }, this.snap.state?.phase === "combat" ? STEP_MS * splitSteps(this.snap.events).length : AI_DELAY_MS);
  }

  private broadcast() {
    const { state, events, seq, deadline, names } = this.snap;
    if (!this.conn?.open || !state) return;
    // As in the prototype, the whole state is sent, opponent's hand included (no hidden information yet).
    const remainingMs = deadline === null ? null : Math.max(deadline - Date.now(), 0);
    this.conn.send({ t: "state", state, events, seq, remainingMs, names } satisfies Msg);
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
