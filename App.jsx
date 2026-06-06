import React, { useState, useEffect, useRef, useCallback } from "react";

// --- persistence: localStorage-backed (works on any deployed host) ---
const storage = {
  async get(key) {
    try { const v = localStorage.getItem(key); return v == null ? null : { value: v }; }
    catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); return { value }; } catch { return null; }
  },
};


// ============================================================
//  COACH — bodyweight + cardio training partner
//  • Time-aware: pick your window, session is built to fit
//  • Coaching layer: per-session focus + per-exercise cue
//  • Fatigue management: deloads after "brutal" / niggle, ramps after good runs
//  • Strength <-> Cardio rotation, feel-trend history, Watch prompts
//  • Demos: written cue + one "open in YouTube app" link per move
// ============================================================

const fmtTime = (s) => {
  const m = Math.floor(s / 60), r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
};

// ---------- Per-exercise coaching cue + demo search ----------
const CUE = {
  "Front plank": "Straight line head-to-heel. Brace abs hard, don't sag hips.",
  "Side plank w/ weight": "Stack shoulders & hips, lift high. Hold weight on top hip.",
  "Loaded hold": "Brace like you're about to be punched. Breathe shallow, stay rigid.",
  "Medicine ball plank": "Ball adds wobble — fight to keep still. That's the work.",
  "Press-ups": "Elbows ~45°, body one line, full lockout at top.",
  "Pull-ups": "Overhand, just outside shoulders. Chin over bar, no swing. Easier: chin-ups.",
  "Dips": "Lean slightly forward, lower to ~90° elbow, press up. Shoulders down.",
  "Bulgarian split squat": "Rear foot up, drop straight DOWN, torso tall. Front heel drives up.",
  "Reverse lunge": "Step back, back knee toward floor, push through front heel.",
  "Walking / reverse lunge": "Long step, control the descent, drive through the heel.",
  "Single-leg RDL": "Flat back, hinge at hip, reach free leg back. Feel the hamstring.",
  "Hanging knee raise": "No swing — pull knees to chest with the abs, lower slow.",
  "Russian twist": "Lean back, feet up, rotate fully each side, touch near floor.",
  "Easy jog": "Conversational pace — you should be able to talk.",
  "Sprint @ 16 km/h": "Controlled fast. Land mid-foot, drive arms.",
  "Sprint @ 18 km/h": "Pick it up. Stay tall, quick turnover.",
  "Sprint @ 20 km/h": "Near-max. Full effort for the 15s.",
  "Recover": "Walk or slow jog. Get your breath back for the next one.",
  "Steady jog": "Easy flush — keep it light, shake the legs out.",
  "5 km steady run": "Conversational pace start to finish. Negative-split if you feel good.",
  "Strides x6": "20s build to ~90% then walk back. Smooth, not strained.",
  "Play padel": "Move your feet, split-step, rotate through the hips on shots.",
};
// --- exercise images: drop your own hosted/licensed image URLs here ---
// Once deployed, put files in /public/exercises/ and reference as "/exercises/name.jpg",
// or paste any image URL you have the rights to use. Empty = no image shown.
const IMG = {
  "Front plank": "",
  "Side plank w/ weight": "",
  "Loaded hold": "",
  "Medicine ball plank": "",
  "Press-ups": "",
  "Pull-ups": "",
  "Dips": "",
  "Bulgarian split squat": "",
  "Reverse lunge": "",
  "Walking / reverse lunge": "",
  "Single-leg RDL": "",
  "Hanging knee raise": "",
  "Russian twist": "",
};

// ---------- Per-session focus line (coaching) ----------
const FOCUS = {
  "Strength A — Core & Pull Focus": "Today: pulling strength + bracing core. Quality reps over grinding — every pull-up clean, every plank rigid.",
  "Strength B — Legs & Anti-Rotation": "Today: single-leg strength + a core that resists twisting. Control the split squats; don't rush the lunges.",
  "Strength C — Full Circuit (timed grind)": "Today: conditioning meets strength. Keep moving, keep form — this is where lean & nimble is built.",
  "Cardio — Sprint Ladder Run": "Today: top-end speed + fat burn. The sprints sharpen the footwork padel rewards.",
  "Cardio — Padel": "Today: agility & play. This is conditioning that doesn't feel like training — enjoy it.",
  "Cardio — 5km Steady + Strides": "Today: easy aerobic base. Stay relaxed; the strides at the end keep the legs springy.",
};

// ---------- STRENGTH variants (cycle drives progression) ----------
const strengthBlocks = (variantIdx, cycle, deload) => {
  const repBump = Math.floor(cycle / 3);
  const loadBump = Math.floor(cycle / 4) * 2.5;
  const timeBump = Math.min(Math.floor(cycle / 2) * 5, 30);
  const r3 = deload ? 2 : 3, r4 = deload ? 3 : 4; // fewer rounds on a deload

  const variants = [
    {
      title: "Strength A — Core & Pull Focus",
      core: { name: `Core Circuit — ${r3} rounds, 30s rest between moves`,
        note: "Round 2: +10kg on back · Round 3: +15kg on back", est: 12, rounds: r3, priority: 2,
        items: [
          { label: "Front plank", type: "time", seconds: 40 + timeBump },
          { label: "Side plank w/ weight", detail: "5-7kg · each side", type: "time", seconds: 30 + timeBump },
          { label: "Loaded hold", detail: `${10 + loadBump}kg`, type: "time", seconds: 20 + timeBump },
          { label: "Medicine ball plank", type: "time", seconds: 40 + timeBump },
          { label: "Press-ups", detail: `${12 + repBump} reps`, type: "reps" },
        ] },
      main: { name: "Pull / Push", est: 10, priority: 1,
        items: [
          { label: "Pull-ups", detail: `4 x ${4 + repBump}-${6 + repBump}`, type: "sets" },
          { label: "Dips", detail: `4 x ${10 + repBump}`, type: "sets" },
        ] },
      legs: { name: `Legs — ${r3} rounds, 30s on / 30s off`, est: 9, rounds: r3, priority: 1,
        items: [
          { label: "Bulgarian split squat", detail: "each leg", type: "time", seconds: 30 },
          { label: "Reverse lunge", type: "time", seconds: 30 },
          { label: "Single-leg RDL", detail: "each leg", type: "time", seconds: 30 },
        ] },
      finisher: { name: `Rotational Finisher — ${r3} rounds, 40s on / 20s off`, est: 6, rounds: r3, priority: 3,
        items: [
          { label: "Hanging knee raise", type: "time", seconds: 40 },
          { label: "Russian twist", type: "time", seconds: 40 },
        ] },
    },
    {
      title: "Strength B — Legs & Anti-Rotation",
      legs: { name: `Legs — ${r4} rounds, 40s on / 20s off`,
        note: "Add a loaded backpack once bodyweight feels easy.", est: 13, rounds: r4, priority: 1,
        items: [
          { label: "Bulgarian split squat", detail: "each leg", type: "time", seconds: 40 },
          { label: "Walking / reverse lunge", type: "time", seconds: 40 },
          { label: "Single-leg RDL", detail: "each leg", type: "time", seconds: 40 },
        ] },
      main: { name: "Pull / Push", est: 10, priority: 1,
        items: [
          { label: "Pull-ups", detail: `4 x ${4 + repBump}-${6 + repBump}`, type: "sets" },
          { label: "Dips", detail: `4 x ${10 + repBump}`, type: "sets" },
        ] },
      core: { name: `Anti-Rotation Core — ${r3} rounds`, est: 11, rounds: r3, priority: 2,
        items: [
          { label: "Front plank", type: "time", seconds: 45 + timeBump },
          { label: "Side plank w/ weight", detail: "5-7kg · each side", type: "time", seconds: 30 + timeBump },
          { label: "Medicine ball plank", type: "time", seconds: 45 + timeBump },
          { label: "Press-ups", detail: `${12 + repBump} reps`, type: "reps" },
        ] },
      finisher: null,
    },
    {
      title: "Strength C — Full Circuit (timed grind)",
      main: { name: `Big Circuit — ${r4} rounds, 40s on / 20s off`,
        note: "Move straight through. Strength + conditioning blend.", est: 24, rounds: r4, priority: 1,
        items: [
          { label: "Pull-ups", detail: "max clean reps", type: "time", seconds: 40 },
          { label: "Bulgarian split squat", detail: "each leg", type: "time", seconds: 40 },
          { label: "Dips", detail: "max clean reps", type: "time", seconds: 40 },
          { label: "Single-leg RDL", detail: "each leg", type: "time", seconds: 40 },
          { label: "Hanging knee raise", type: "time", seconds: 40 },
          { label: "Russian twist", type: "time", seconds: 40 },
        ] },
      finisher: { name: `Plank Finisher — ${deload ? 1 : 2} rounds`, est: 6, rounds: deload ? 1 : 2, priority: 3,
        items: [
          { label: "Front plank", type: "time", seconds: 45 + timeBump },
          { label: "Side plank w/ weight", detail: "5-7kg · each side", type: "time", seconds: 30 + timeBump },
        ] },
    },
  ];
  return variants[variantIdx % variants.length];
};

// ---------- CARDIO variants ----------
const cardioBlocks = (variantIdx, cycle, budget, deload) => {
  const extra = Math.floor(cycle / 2);
  let ladders = budget === 30 ? 3 + extra : budget === 90 ? 6 + extra : 4 + extra;
  if (deload) ladders = Math.max(2, ladders - 2);
  const variants = [
    {
      title: "Cardio — Sprint Ladder Run",
      blocks: [
        { name: "Warm-up", est: 5, warmup: true, items: [{ label: "Easy jog", detail: "10 km/h", type: "time", seconds: 300 }] },
        { name: `Intervals — 15s on / 45s off · ${ladders} ladders`,
          note: "Each ladder climbs 16 -> 18 -> 20 km/h.", est: 15, rounds: ladders, priority: 1,
          items: [
            { label: "Sprint @ 16 km/h", type: "time", seconds: 15 },
            { label: "Recover", type: "time", seconds: 45 },
            { label: "Sprint @ 18 km/h", type: "time", seconds: 15 },
            { label: "Recover", type: "time", seconds: 45 },
            { label: "Sprint @ 20 km/h", type: "time", seconds: 15 },
            { label: "Recover", type: "time", seconds: 45 },
          ] },
        { name: "Cool-down jog", est: 8, priority: 3, items: [{ label: "Steady jog", detail: "10 km/h", type: "time", seconds: budget === 30 ? 240 : 480 }] },
      ],
    },
    {
      title: "Cardio — Padel",
      blocks: [
        { name: "On-court session", est: budget === 30 ? 30 : 90, priority: 1,
          items: [
            { label: "Dynamic warm-up", detail: "lunges, side shuffles, arm swings", type: "time", seconds: 300 },
            { label: "Play padel", detail: "agility + conditioning", type: "manual" },
            { label: "Cool-down walk + stretch", type: "time", seconds: 300 },
          ] },
      ],
    },
    {
      title: "Cardio — 5km Steady + Strides",
      blocks: [
        { name: "Run", est: 30, rounds: 1, priority: 1,
          items: [
            { label: "5 km steady run", detail: "conversational pace", type: "manual" },
            { label: "Strides x6", detail: "20s build to fast, walk back", type: "time", seconds: 20 },
          ] },
      ],
    },
  ];
  return variants[variantIdx % variants.length];
};

// ---------- Dynamic warm-up ----------
const buildWarmup = (variantTitle, budget) => {
  const isGrind = variantTitle.includes("Full Circuit");
  let bike, skip, why;
  if (budget === 30) { bike = 0; skip = 300; why = "Tight window — short skip primes the feet; the work warms you up."; }
  else if (isGrind) { bike = 300; skip = 300; why = "The circuit ramps you up from rep one, so keep the warm-up short and stay fresh."; }
  else if (budget === 90) { bike = 600; skip = 600; why = "Full window — proper warm-up before skill + strength work."; }
  else { bike = 600; skip = 300; why = "Warm but fresh for the pull-ups and loaded work."; }
  const items = [];
  if (bike) items.push({ label: "Bike — easy spin", detail: `${bike / 60} min`, type: "time", seconds: bike });
  if (skip) items.push({ label: "Skipping", detail: `${skip / 60} min · light feet`, type: "time", seconds: skip });
  return { name: "Warm-up", note: why, est: Math.round((bike + skip) / 60), items, warmup: true };
};

// ---------- Assemble session to fit time budget ----------
const buildSession = (state, budget) => {
  const deload = state.deloadNext;
  if (state.dayType === "strength") {
    const v = strengthBlocks(state.strengthVariant, state.strengthCycle, deload);
    const warm = buildWarmup(v.title, budget);
    let pool = [v.main, v.legs, v.core, v.finisher].filter(Boolean);
    const full = pool.length;
    if (budget === 30) {
      const p1 = pool.filter((b) => b.priority === 1);
      const p2 = pool.filter((b) => b.priority === 2).slice(0, 1);
      pool = [...p1, ...p2];
    } else if (budget === 60) {
      pool = pool.filter((b) => b.priority <= 2);
    }
    return { title: v.title, type: "strength", blocks: [warm, ...pool], dropped: full - pool.length, deload };
  } else {
    const v = cardioBlocks(state.cardioVariant, state.cardioCycle, budget, deload);
    return { title: v.title, type: "cardio", blocks: v.blocks, dropped: 0, deload };
  }
};
const totalEst = (s) => s.blocks.reduce((a, b) => a + (b.est || 0), 0);

// ---------- Apple Watch workout type ----------
const appleType = (session) => {
  const t = session.title;
  if (t.includes("Full Circuit")) return { rec: "High Intensity Interval Training", why: "continuous 40/20 work — HIIT estimates the burn best" };
  if (session.type === "strength") return { rec: "Functional Strength Training", why: "right profile for bodyweight + circuit work" };
  if (t.includes("Padel")) return { rec: "Tennis", why: "closest racquet-sport profile (no padel option)" };
  if (t.includes("Sprint")) return { rec: "Running (Indoor)", why: "treadmill intervals" };
  return { rec: "Running (Outdoor)", why: "steady run" };
};

// ---------- Timer ----------
function Timer({ seconds, accent }) {
  const [rem, setRem] = useState(seconds);
  const [run, setRun] = useState(false);
  const ref = useRef(null);
  useEffect(() => setRem(seconds), [seconds]);
  useEffect(() => {
    if (run && rem > 0) ref.current = setTimeout(() => setRem((r) => r - 1), 1000);
    return () => clearTimeout(ref.current);
  }, [run, rem]);
  const done = rem === 0, pct = ((seconds - rem) / seconds) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
      <button onClick={() => { if (done) { setRem(seconds); setRun(true); } else setRun((r) => !r); }}
        style={{ background: done ? "#1f3a2e" : run ? "#2a2a2a" : accent, color: done ? "#4ade80" : run ? "#fff" : "#0a0a0a",
          border: "none", borderRadius: 999, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
          minWidth: 90, fontFamily: "'JetBrains Mono', monospace" }}>
        {done ? "reset" : run ? "pause" : "start"}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: done ? "#4ade80" : "#fff", lineHeight: 1 }}>{fmtTime(rem)}</div>
        <div style={{ height: 3, background: "#262626", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: accent, transition: "width 1s linear" }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const ACCENT = "#d4ff3f";
  const KEY = "coach-program-v3";
  const [state, setState] = useState({
    dayType: "strength", strengthVariant: 0, cardioVariant: 0,
    strengthCycle: 0, cardioCycle: 0, sessionsDone: 0, log: [],
    deloadNext: false, goodStreak: 0, loaded: false,
  });
  const [phase, setPhase] = useState("time");
  const [budget, setBudget] = useState(60);
  const [done, setDone] = useState({});
  const [feel, setFeel] = useState(null);
  const [niggle, setNiggle] = useState(null);
  const [hit, setHit] = useState(null);

  useEffect(() => { (async () => {
    try { const r = await storage.get(KEY); if (r && r.value) { setState({ ...JSON.parse(r.value), loaded: true }); return; } } catch (e) {}
    const sample = [
      { date: "sample", type: "strength", title: "Strength A — Core & Pull Focus", budget: 60, feel: "right", niggle: "good", hit: "most", seed: true },
      { date: "sample", type: "cardio", title: "Cardio — Sprint Ladder Run", budget: 30, feel: "brutal", niggle: "good", hit: "all", seed: true },
      { date: "sample", type: "strength", title: "Strength B — Legs & Anti-Rotation", budget: 90, feel: "right", niggle: "tweaked", hit: "most", seed: true },
      { date: "sample", type: "cardio", title: "Cardio — Padel", budget: 90, feel: "easy", niggle: "good", hit: "all", seed: true },
    ];
    setState((s) => ({ ...s, log: sample, loaded: true }));
  })(); }, []);

  const persist = useCallback(async (n) => { try { await storage.set(KEY, JSON.stringify(n)); } catch (e) {} }, []);
  if (!state.loaded) return <div style={{ background: "#0a0a0a", minHeight: "100vh" }} />;

  const isStrength = state.dayType === "strength";
  const session = buildSession(state, budget);
  const est = totalEst(session);

  const submitCheckin = () => {
    setState((s) => {
      const n = { ...s };
      const hadProblem = feel === "brutal" || niggle === "tweaked";
      let step = 1;
      if (feel === "easy") step = 2;
      if (hadProblem) step = 0;
      // fatigue management
      const newStreak = hadProblem ? 0 : s.goodStreak + 1;
      n.goodStreak = newStreak;
      // if this session WAS a deload, clear it; otherwise set deload if problem reported
      n.deloadNext = s.deloadNext ? false : hadProblem;
      if (s.dayType === "strength") {
        n.strengthCycle = s.strengthCycle + step;
        n.strengthVariant = (s.strengthVariant + 1) % 3;
        n.dayType = "cardio";
      } else {
        n.cardioCycle = s.cardioCycle + step;
        n.cardioVariant = (s.cardioVariant + 1) % 3;
        n.dayType = "strength";
      }
      n.sessionsDone = s.sessionsDone + 1;
      const realLog = (s.log || []).filter((l) => !l.seed);
      n.log = [...realLog, { date: new Date().toISOString().slice(0, 10), type: s.dayType, title: session.title, budget, feel, niggle, hit }].slice(-60);
      persist(n);
      return n;
    });
    setPhase("time"); setBudget(60); setDone({}); setFeel(null); setNiggle(null); setHit(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const wrap = { maxWidth: 640, margin: "0 auto" };
  const page = { background: "radial-gradient(circle at 30% 0%, #181818 0%, #0a0a0a 55%)", minHeight: "100vh",
    color: "#e5e5e5", padding: "24px 16px 80px", fontFamily: "'Space Grotesk', system-ui, sans-serif" };
  const font = <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>;

  // ---- PHASE: time budget ----
  if (phase === "time") {
    const opts = [
      { v: 30, label: "Quick", sub: "~30 min · essentials only" },
      { v: 60, label: "Standard", sub: "~50-60 min · full session" },
      { v: 90, label: "Long", sub: "~75-90 min · everything + extra rounds" },
    ];
    return (
      <div style={page}>{font}<div style={wrap}>
        <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.03em" }}>{isStrength ? "STRENGTH" : "CARDIO"}</h1>
        <p style={{ color: "#666", fontSize: 13, margin: "4px 0 20px", fontFamily: "'JetBrains Mono', monospace" }}>{state.sessionsDone} sessions done</p>
        <div style={{ border: `1px solid ${isStrength ? ACCENT : "#3f6fff"}`, borderRadius: 16, padding: 18, marginBottom: 16,
          background: isStrength ? "rgba(212,255,63,0.04)" : "rgba(63,111,255,0.05)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: isStrength ? ACCENT : "#7d9aff" }}>
            {isStrength ? "Strength" : "Cardio"} day
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 6 }}>{session.title}</div>
          {state.deloadNext && (
            <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 8, lineHeight: 1.4 }}>
              ⚑ Backing off this session — you flagged a rough one last time. Rounds reduced; let your body catch up.
            </div>
          )}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>How long have you got?</div>
        {opts.map((o) => (
          <button key={o.v} onClick={() => setBudget(o.v)} style={{
            width: "100%", textAlign: "left", padding: "16px 18px", marginBottom: 10, borderRadius: 12, cursor: "pointer",
            border: budget === o.v ? `1.5px solid ${ACCENT}` : "1px solid #262626",
            background: budget === o.v ? "rgba(212,255,63,0.06)" : "#111", color: "#fff" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{o.label}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{o.sub}</div>
          </button>
        ))}
        <button onClick={() => setPhase("workout")} style={{
          width: "100%", marginTop: 16, padding: 18, borderRadius: 14, border: "none", background: ACCENT,
          color: "#0a0a0a", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          Build my session
        </button>
        {(state.log && state.log.length > 0) && (
          <button onClick={() => setPhase("history")} style={{
            width: "100%", marginTop: 10, padding: 14, borderRadius: 14, border: "1px solid #262626", background: "transparent",
            color: "#aaa", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
            view history &amp; feel-trend
          </button>
        )}
      </div></div>
    );
  }

  // ---- PHASE: history ----
  if (phase === "history") {
    const log = state.log || [];
    const feelColor = { easy: "#4ade80", right: ACCENT, brutal: "#f87171" };
    const feelLabel = { easy: "Too easy", right: "Just right", brutal: "Brutal" };
    const counts = log.reduce((a, l) => { a[l.feel] = (a[l.feel] || 0) + 1; return a; }, {});
    const niggles = log.filter((l) => l.niggle === "tweaked").length;
    return (
      <div style={page}>{font}<div style={wrap}>
        <button onClick={() => setPhase("time")} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>back</button>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>Feel-trend</h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24, fontFamily: "'JetBrains Mono', monospace" }}>
          {log.some((l) => l.seed) ? "sample data — replaced once you log real sessions" : `${log.length} sessions · oldest → newest`}
        </p>
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
            {log.map((l, i) => (
              <div key={i} title={`${l.date} · ${feelLabel[l.feel] || l.feel}`} style={{
                width: 16, height: 16, borderRadius: "50%", background: feelColor[l.feel] || "#555",
                border: l.niggle === "tweaked" ? "2px solid #f87171" : "none" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            {Object.entries(feelColor).map(([k, c]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#999", fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
                {feelLabel[k]} ({counts[k] || 0})
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#999", fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #f87171", display: "inline-block" }} />
              niggle ({niggles})
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...log].reverse().slice(0, 12).map((l, i) => (
            <div key={i} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 10, padding: "12px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, color: "#ddd", fontWeight: 600 }}>{l.title}</div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {l.date} · {l.budget}min{l.niggle === "tweaked" ? " · niggle" : ""}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: feelColor[l.feel] || "#888", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{feelLabel[l.feel] || l.feel}</span>
            </div>
          ))}
        </div>
      </div></div>
    );
  }

  // ---- PHASE: check-in ----
  if (phase === "checkin") {
    const Group = ({ q, opts, val, set }) => (
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{q}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {opts.map((o) => (
            <button key={o.v} onClick={() => set(o.v)} style={{
              flex: 1, minWidth: 90, padding: "12px 10px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
              border: val === o.v ? `1.5px solid ${o.c}` : "1px solid #262626",
              background: val === o.v ? `${o.c}18` : "#111", color: val === o.v ? o.c : "#aaa" }}>{o.label}</button>
          ))}
        </div>
      </div>
    );
    const ready = feel && niggle && hit;
    const { rec, why } = appleType(session);
    return (
      <div style={page}>{font}<div style={wrap}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Session done</h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Quick check-in — this is what tunes your next sessions.</p>
        <div style={{ background: "rgba(125,154,255,0.06)", border: "1px solid #2a3a66", borderRadius: 12, padding: "14px 16px", marginBottom: 26 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7d9aff", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Log it on your Watch</div>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>Record as: {rec}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{why}</div>
        </div>
        <Group q="How did that feel?" val={feel} set={setFeel} opts={[
          { v: "easy", label: "Too easy", c: "#4ade80" }, { v: "right", label: "Just right", c: ACCENT }, { v: "brutal", label: "Brutal", c: "#f87171" }]} />
        <Group q="Any niggles?" val={niggle} set={setNiggle} opts={[
          { v: "good", label: "All good", c: "#4ade80" }, { v: "tweaked", label: "Tweaked something", c: "#f87171" }]} />
        <Group q="Hit your targets?" val={hit} set={setHit} opts={[
          { v: "all", label: "All of them", c: "#4ade80" }, { v: "most", label: "Most", c: ACCENT }, { v: "short", label: "Fell short", c: "#fbbf24" }]} />
        <button disabled={!ready} onClick={submitCheckin} style={{
          width: "100%", marginTop: 10, padding: 18, borderRadius: 14, border: "none",
          background: ready ? ACCENT : "#222", color: ready ? "#0a0a0a" : "#555",
          fontSize: 16, fontWeight: 700, cursor: ready ? "pointer" : "not-allowed", fontFamily: "'Space Grotesk', sans-serif" }}>
          Save & rotate to {isStrength ? "Cardio" : "Strength"}
        </button>
        {(feel === "brutal" || niggle === "tweaked") ? (
          <p style={{ textAlign: "center", color: "#fbbf24", fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>Next same-type session will back off — fewer rounds, recovery first.</p>
        ) : feel === "easy" ? (
          <p style={{ textAlign: "center", color: "#4ade80", fontSize: 12, marginTop: 14 }}>Targets will step up faster next time.</p>
        ) : null}
      </div></div>
    );
  }

  // ---- PHASE: workout ----
  return (
    <div style={page}>{font}<div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <button onClick={() => setPhase("time")} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>back</button>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#666" }}>~ {est} min</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: isStrength ? ACCENT : "#7d9aff", marginTop: 8 }}>
        {isStrength ? "Strength" : "Cardio"} · {budget === 30 ? "Quick" : budget === 90 ? "Long" : "Standard"}{session.deload ? " · deload" : ""}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "4px 0 8px", letterSpacing: "-0.02em" }}>{session.title}</h1>
      {FOCUS[session.title] && (
        <div style={{ background: "#101010", borderLeft: `3px solid ${ACCENT}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#cfcf9a", lineHeight: 1.5 }}>
          {FOCUS[session.title]}
        </div>
      )}
      <div style={{ fontSize: 12, color: "#7d9aff", marginBottom: 14, fontFamily: "'JetBrains Mono', monospace" }}>
        ⌚ start a "{appleType(session).rec}" workout on your Watch
      </div>
      {session.dropped > 0 && (
        <p style={{ fontSize: 12, color: "#888", marginBottom: 18, lineHeight: 1.5 }}>
          Trimmed to fit your window — dropped {session.dropped} lower-priority block{session.dropped > 1 ? "s" : ""}. The main work is all here; a focused short session still counts.
        </p>
      )}

      {session.blocks.map((block, bi) => {
        const ch = done[bi];
        return (
          <div key={bi} style={{ border: block.warmup ? "1px dashed #2e2e2e" : "1px solid #1f1f1f", borderRadius: 14, padding: 18, marginBottom: 14,
            background: ch ? "rgba(74,222,128,0.04)" : block.warmup ? "#0d0d0d" : "#111", opacity: ch ? 0.65 : 1, transition: "all 0.3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{block.name}</div>
                {block.note && <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{block.note}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {block.est ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#666" }}>{block.est}m</span> : null}
                <button onClick={() => setDone((d) => ({ ...d, [bi]: !d[bi] }))} style={{
                  width: 26, height: 26, borderRadius: 7, cursor: "pointer", border: ch ? "none" : "1.5px solid #333",
                  background: ch ? "#4ade80" : "transparent", color: "#0a0a0a", fontWeight: 800, fontSize: 14 }}>{ch ? "ok" : ""}</button>
              </div>
            </div>
            {block.rounds && (
              <div style={{ display: "inline-block", marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: 6, padding: "2px 8px" }}>x {block.rounds} rounds</div>
            )}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              {block.items.map((item, ii) => (
                <div key={ii} style={{ borderTop: ii === 0 ? "none" : "1px solid #1c1c1c", paddingTop: ii === 0 ? 0 : 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 15, color: "#e5e5e5", fontWeight: 500 }}>{item.label}</span>
                    {item.detail && <span style={{ fontSize: 12, color: "#888", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{item.detail}</span>}
                  </div>
                  {IMG[item.label] ? (
                    <img src={IMG[item.label]} alt={item.label} style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, marginTop: 8, border: "1px solid #1f1f1f" }} />
                  ) : null}
                  {CUE[item.label] && <div style={{ fontSize: 12, color: "#9a9a6a", marginTop: 4, lineHeight: 1.4 }}>{CUE[item.label]}</div>}
                  {item.type === "time" && <Timer seconds={item.seconds} accent={ACCENT} />}
                  {item.type === "manual" && <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontStyle: "italic" }}>self-paced — use your phone timer</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={() => { setPhase("checkin"); window.scrollTo({ top: 0 }); }} style={{
        width: "100%", marginTop: 12, padding: 18, borderRadius: 14, border: "none", background: ACCENT,
        color: "#0a0a0a", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
        Finish session
      </button>
    </div></div>
  );
}
