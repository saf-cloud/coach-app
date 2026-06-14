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
  "Front plank": "Straight line head-to-heel. Brace abs hard, don't sag hips. Plate or pack on the back to load it.",
  "Side plank": "Stack shoulders & hips, lift high, straight line. Hold a weight on the top hip; don't let the hip drop.",
  "Hollow hold": "Lower back pressed flat to the floor, arms & legs extended, ribs down. The shake is the work.",
  "Skip rope": "Light bounce on the balls of the feet, elbows in, turn the rope from the wrists. Relax and let it flow.",
  "Dead bug": "On your back, lower opposite arm & leg slowly — keep the lower back glued to the floor. Anti-arch core.",
  "Glute bridge": "Drive through the heels, squeeze the glutes hard at the top, ribs down. Single-leg to make it harder.",
  "Pike push-ups": "Hips high, head between hands, lower the crown toward the floor. Builds the handstand press.",
  "Pistol squat": "One leg out front, sit all the way down on the standing leg, drive up. Hold a rail/box to assist.",
  "L-sit": "Hands down by your hips, push the floor away, lift legs out (tuck if needed). Shoulders down, don't shrug.",
  "Nordic curl": "Anchor the ankles, body dead-straight from knees, lower as slow as you can, catch with your hands.",
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
  "Side-to-side w/ 10kg": "Tall posture, sweep the weight side to side — hips stay square, the core does the turning.",
  "Ab roller": "Hips tucked, roll out only as far as your back stays flat. Exhale on the way back.",
  "Goblet squat": "Bell tight to chest, elbows inside knees, sit deep, chest tall. Drive up through the heels.",
  "Press-ups on Y bar": "Hands on the bar, body one line. Full range — fast up, controlled down.",
  "Medicine ball crunches": "Ball at chest, curl up slow with the abs — no pulling on the neck.",
  "Med-ball punch-outs": "Punch straight out and snap back. Shoulders down, fast hands.",
  "Med-ball press punch": "Drive up explosively, lower on a slow 3-count. Power up, control down.",
  "Pull-ups (wide grip)": "Wide overhand grip, dead-hang start, chin over bar, zero swing.",
  "Bicep pull-ups": "Underhand, shoulder-width. Squeeze the biceps at the top, lower slow.",
  "Clean & press": "Bar close, hips snap it up, catch at the shoulders, press tall. Reset each rep.",
  "Shoulder press (bar)": "Glutes and abs braced, press to full lockout — no leaning back.",
  "Row 1600m": "Legs, then back, then arms. Pushed but steady — try to negative-split the second half.",
  "Row blowout": "Three minutes, honest from the first stroke. Hold your split.",
  "Lower back machine": "Smooth hinge, pause and squeeze at the top. No jerking.",
  "Bicep curls & hammers": "Elbows pinned to your ribs — strict curls, then hammers.",
  "Stride @ 16 km/h": "The opener — smooth and tall.",
  "Stride @ 18 km/h": "Quick turnover, relaxed shoulders.",
  "Stride @ 20 km/h": "Fast. Drive the arms.",
  "Stride @ 22 km/h": "Top gear — full focus for 15 seconds.",
  "8-min bike": "Level 10-12 — a pace you could barely hold a sentence at.",
  "8-min row": "Long, powerful strokes. Pick a split and hold it.",
  "8-min run @ 75%": "Strong but controlled — finish knowing you had a little more.",
  "Jog": "Easy flush. Shake the legs out.",
  "Stretch & core activation": "Hips, shoulders, then wake the core up — bird-dogs, dead bugs, easy holds.",
};
// --- exercise images: public-domain photos from free-exercise-db (Unlicense) ---
// https://github.com/yuhonas/free-exercise-db — each exercise has a start (0.jpg)
// and finish (1.jpg) frame; the app alternates them to show movement direction.
// To self-host later: download the folders into /public/exercises/ and change EXDB to "/exercises/".
const EXDB = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const IMG = {
  "Front plank": "Plank",
  "Side plank": "Side_Bridge",
  "Side plank w/ weight": "Side_Bridge",
  "Skip rope": "Rope_Jumping",
  "Dead bug": "Dead_Bug",
  "Glute bridge": "Single_Leg_Glute_Bridge",
  "Hollow hold": "Flutter_Kicks",
  "Pike push-ups": "Handstand_Push-Ups",
  "Loaded hold": "Farmers_Walk",
  "Medicine ball plank": "Plank",
  "Press-ups": "Pushups",
  "Pull-ups": "Pullups",
  "Dips": "Dips_-_Triceps_Version",
  "Bulgarian split squat": "One_Leg_Barbell_Squat",
  "Reverse lunge": "Dumbbell_Rear_Lunge",
  "Walking / reverse lunge": "Bodyweight_Walking_Lunge",
  "Single-leg RDL": "Stiff-Legged_Barbell_Deadlift",
  "Hanging knee raise": "Hanging_Leg_Raise",
  "Russian twist": "Russian_Twist",
  "Goblet squat": "Goblet_Squat",
  "Clean & press": "Clean_and_Press",
  "Shoulder press (bar)": "Barbell_Shoulder_Press",
  "Bicep pull-ups": "Chin-Up",
  "Pull-ups (wide grip)": "Pullups",
  "Ab roller": "Ab_Roller",
  "Bicep curls & hammers": "Alternate_Hammer_Curl",
  "Row 1600m": "Rowing_Stationary",
  "Row blowout": "Rowing_Stationary",
  "8-min row": "Rowing_Stationary",
  "Press-ups on Y bar": "Pushups",
};

// ---------- Per-session focus line (coaching) ----------
const FOCUS = {
  "Strength A — Core Circuit": "Today: your strong-core engine — rigid bodyweight holds, single-leg strength, then a short rower finisher.",
  "Strength B — Pull & Push": "Today: pulling and pressing strength, all bodyweight — pull-ups, dips, pike push-ups. Own every rep, never grind.",
  "Strength C — Power & Med Ball": "Today: explosive hands and fast feet. Every rep with intent — this is what turns into padel winners.",
  "Cardio — Sprint Ladder Run": "Today: top-end speed + fat burn. The sprints sharpen the footwork padel rewards.",
  "Cardio — Padel": "Today: agility & play. This is conditioning that doesn't feel like training — enjoy it.",
  "Cardio — Engine Triplet": "Today: bike, row, run — one engine, three machines. Strong honest pace, not a sprint.",
};

// ---------- The north star: what this program is (and isn't) ----------
const PRINCIPLES = [
  "Bodyweight, core-first — a strong, strong core is the main goal, every session.",
  "Functional & accessible, not skill-chasing — no pistols, levers or muscle-ups.",
  "Stay nimble, sharp & strong for life — sustainable beats impressive.",
  "Legs are secondary — present, but never ahead of the core work.",
  "Skipping opens every session; rower / bike / sprints are conditioning only.",
  "Log Active calories (not Total) from your Watch toward the weekly burn.",
];

// ---------- STRENGTH variants (rebuilt from the real training log) ----------
// Progression ramps back toward the old log numbers (then past them):
// weights/reps creep with the cycle counter, capped sensibly, backed off on deloads.
const strengthBlocks = (variantIdx, cycle, deload) => {
  const r3 = deload ? 2 : 3;
  const repBump = Math.floor(cycle / 3);
  // ---- bodyweight strength progression (reps creep with the cycle) ----
  const dipReps = Math.min(8 + repBump, 14);
  const pullReps = Math.min(4 + repBump, 8);
  const chinReps = Math.min(5 + repBump, 8);
  const pushReps = Math.min(10 + repBump * 2, 20);
  const pikeReps = Math.min(6 + repBump, 12);
  const absReps = Math.min(8 + repBump, 15);
  // ---- strong-core hold progression (seconds) — the centerpiece ----
  const plankSec = deload ? 30 : Math.min(40 + Math.floor(cycle / 3) * 5, 60);
  const sidePlankSec = deload ? 20 : Math.min(25 + Math.floor(cycle / 3) * 5, 45);
  const hollowSec = deload ? 20 : Math.min(20 + Math.floor(cycle / 3) * 5, 45);
  // weighted planks at the user's CURRENT MAX (~20kg on the back, ~10-12kg on the top hip).
  // Already at the ceiling, so only a slow creep over many cycles; eases off on a deload.
  const frontPlankWt = deload ? 12 : Math.min(20 + Math.floor(cycle / 6) * 2, 26);
  const sidePlankWt = deload ? 6 : Math.min(10 + Math.floor(cycle / 6) * 2, 14);
  // ---- legs: SECONDARY, accessible bodyweight only (no skill/feat moves) ----
  const splitReps = Math.min(8 + Math.floor(cycle / 4), 12);
  const splitWt = deload ? 0 : Math.min(Math.floor(cycle / 4) * 5, 16);
  const lungeReps = Math.min(8 + repBump, 14);
  const bridgeReps = Math.min(10 + repBump, 20);
  const wt = (kg) => (kg > 0 ? `+${kg}kg vest/pack` : "bodyweight");

  const variants = [
    {
      title: "Strength A — Core Circuit",
      core: { name: `Core Circuit — ${r3} rounds`,
        note: "30s between moves · 1 min between rounds. Brace hard — this is the strong-core engine.",
        est: 17, rounds: r3, priority: 1,
        items: [
          { label: "Front plank", detail: frontPlankWt ? `${frontPlankWt}kg on back` : "bodyweight", type: "time", seconds: plankSec, rest: "30s" },
          { label: "Side plank", detail: `${sidePlankWt ? `${sidePlankWt}kg · ` : ""}each side`, type: "time", seconds: sidePlankSec, rest: "30s" },
          { label: "Hollow hold", type: "time", seconds: hollowSec, rest: "30s" },
          { label: "Dead bug", detail: `${absReps} each side`, type: "reps", rest: "30s" },
          { label: "Ab roller", detail: `${absReps} reps`, type: "reps", rest: "30s" },
          { label: "Hanging knee raise", detail: `${absReps} reps`, type: "reps", rest: "30s" },
          { label: "Press-ups", detail: `${pushReps} reps`, type: "reps", rest: "30s" },
        ] },
      main: { name: "Engine Finisher", est: 8, priority: 3,
        items: [
          { label: "Row 1600m", detail: "pushed but steady", type: "manual" },
        ] },
      legs: { name: "Legs — accessible & secondary", note: "Two easy bodyweight sets for nimble, strong legs — never ahead of the core work.", est: 8, priority: 2,
        items: [
          { label: "Bulgarian split squat", detail: `${wt(splitWt)} · 2 x ${splitReps} each leg`, type: "sets", rest: "90s" },
          { label: "Glute bridge", detail: `single-leg · 2 x ${bridgeReps} each`, type: "sets", rest: "60s" },
        ] },
      finisher: null,
    },
    {
      title: "Strength B — Pull & Push",
      main: { name: "Pull / Push", note: "Full range, control the lowering. Band-assist or backpack-load as needed.", est: 16, priority: 1,
        items: [
          { label: "Pull-ups (wide grip)", detail: `4 x ${pullReps}`, type: "sets", rest: "2-3 min" },
          { label: "Dips", detail: `4 x ${dipReps}`, type: "sets", rest: "2-3 min" },
          { label: "Pike push-ups", detail: `3 x ${pikeReps} · shoulders`, type: "sets", rest: "2 min" },
          { label: "Bicep pull-ups", detail: `3 x ${chinReps}`, type: "sets", rest: "2 min" },
        ] },
      legs: { name: "Legs — accessible & secondary", note: "Long-window bonus on this pull/push day — drop it when time's tight, the core stays.", est: 8, priority: 3,
        items: [
          { label: "Walking / reverse lunge", detail: `2 x ${lungeReps} each leg`, type: "sets", rest: "90s" },
          { label: "Glute bridge", detail: `single-leg · 2 x ${bridgeReps} each`, type: "sets", rest: "60s" },
        ] },
      core: { name: "Core — 2 rounds", est: 10, rounds: 2, priority: 2,
        items: [
          { label: "Hollow hold", type: "time", seconds: hollowSec, rest: "45s" },
          { label: "Hanging knee raise", detail: `${absReps} reps`, type: "reps", rest: "45s" },
          { label: "Side plank", detail: `${sidePlankWt ? `${sidePlankWt}kg · ` : ""}each side`, type: "time", seconds: sidePlankSec, rest: "45s" },
          { label: "Front plank", detail: frontPlankWt ? `${frontPlankWt}kg on back` : "bodyweight", type: "time", seconds: plankSec, rest: "45s" },
        ] },
      finisher: { name: "Engine Finisher", est: 6, priority: 3,
        items: [
          { label: "Row blowout", detail: "3 min flat out", type: "manual" },
        ] },
    },
    {
      title: "Strength C — Power & Med Ball",
      core: { name: `Power & Core — ${r3} rounds`, note: "Explosive intent on every rep — padel power + a bulletproof core.",
        est: 14, rounds: r3, priority: 1,
        items: [
          { label: "Med-ball punch-outs", detail: "3kg · 8 each arm", type: "reps", rest: "till fresh" },
          { label: "Med-ball press punch", detail: "6kg · 10-12 · fast up, slow down", type: "reps", rest: "till fresh" },
          { label: "Medicine ball plank", detail: "reach fwd + both sides x 12", type: "reps", rest: "30s" },
          { label: "Hollow hold", type: "time", seconds: hollowSec, rest: "30s" },
          { label: "Side plank", detail: `${sidePlankWt ? `${sidePlankWt}kg · ` : ""}each side`, type: "time", seconds: sidePlankSec, rest: "30s" },
        ] },
      main: { name: "Speed — Strides · 15s on / 45s off", note: "Walk-back recovery between reps. Build through the ladder.",
        est: 10, priority: 2,
        items: [
          { label: "Stride @ 16 km/h", detail: "x 2", type: "time", seconds: 15, rest: "45s" },
          { label: "Stride @ 18 km/h", detail: "x 2", type: "time", seconds: 15, rest: "45s" },
          { label: "Stride @ 20 km/h", detail: "x 2", type: "time", seconds: 15, rest: "45s" },
          { label: "Stride @ 22 km/h", detail: "x 2", type: "time", seconds: 15, rest: "45s" },
        ] },
      legs: { name: "Legs — single-leg power", note: "After the strides — 2 quick single-leg sets, then flush. Secondary to the power & core work.", est: 8, priority: 2,
        items: [
          { label: "Reverse lunge", detail: `2 x ${lungeReps} each leg`, type: "sets", rest: "90s" },
          { label: "Bulgarian split squat", detail: `${wt(splitWt)} · 2 x ${splitReps} each leg`, type: "sets", rest: "90s" },
        ] },
      finisher: { name: "Flush Jog", est: 7, priority: 3,
        items: [
          { label: "Jog", detail: "6-8 min @ 10 km/h", type: "manual" },
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
  const tri = (budget >= 60 && !deload) ? 2 : 1;
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
      title: "Cardio — Engine Triplet",
      blocks: [
        { name: "Stretch & core activation", est: 5, warmup: true,
          items: [{ label: "Stretch & core activation", detail: "hips, shoulders, easy core", type: "manual" }] },
        { name: `Triplet — ${tri} round${tri > 1 ? "s" : ""} · 1 min rest between machines${tri > 1 ? " · 3 min between rounds" : ""}`,
          note: "8 minutes each at ~75% — strong but repeatable.", est: 28 * tri, rounds: tri, priority: 1,
          items: [
            { label: "8-min bike", detail: "level 10-12", type: "time", seconds: 480 },
            { label: "8-min row", detail: "steady split", type: "time", seconds: 480 },
            { label: "8-min run @ 75%", type: "time", seconds: 480 },
          ] },
      ],
    },
  ];
  return variants[variantIdx % variants.length];
};

// ---------- Skipping: the opener for every session (scaled to the time budget) ----------
const skipMins = (budget) => (budget === 30 ? 5 : budget === 90 ? 10 : 8);
const skipWarmup = (budget) => {
  const mins = skipMins(budget);
  return { name: "Skip rope warm-up", warmup: true, est: mins,
    note: "Your opener — light on the feet, relaxed wrists. Mix in footwork (alternating feet, high knees) to switch on.",
    items: [{ label: "Skip rope", detail: `${mins} min · easy, find a rhythm`, type: "time", seconds: mins * 60, rest: "—" }] };
};

// ---------- Mobility prep (after skipping) ----------
const buildWarmup = (variantTitle, budget, recentHeavyCore) => {
  const stretch = budget === 90 ? 600 : 300;
  if (recentHeavyCore) {
    return { name: "Mobilise & light core activation", warmup: true, est: Math.round(stretch / 60),
      note: "Core was loaded last session — just ACTIVATE today, don't over-exert. Light bird-dogs, dead bugs, easy unweighted holds. No grinding.",
      items: [{ label: "Stretch & core activation", detail: `${stretch / 60} min · easy activation only`, type: "time", seconds: stretch }] };
  }
  return { name: "Mobilise & core prep", warmup: true, est: Math.round(stretch / 60),
    note: "After the rope — loosen hips & shoulders, then wake the core up: bird-dogs, dead bugs, easy unweighted plank holds. No weight in the warm-up — save it for the core work.",
    items: [{ label: "Stretch & core activation", detail: `${stretch / 60} min · bodyweight`, type: "time", seconds: stretch }] };
};

// ---------- Assemble session to fit time budget ----------
const buildSession = (state, budget) => {
  const deload = state.deloadNext;
  // auto-regulate the core activation: if the last session loaded the core (a strength day),
  // keep today's activation light — just switch it on, don't over-exert.
  const lastSession = (state.log || []).filter((l) => !l.seed).slice(-1)[0];
  const recentHeavyCore = !!lastSession && lastSession.type === "strength";
  if (state.dayType === "strength") {
    const v = strengthBlocks(state.strengthVariant, state.strengthCycle, deload);
    const warm = buildWarmup(v.title, budget, recentHeavyCore);
    let pool = [v.main, v.legs, v.core, v.finisher].filter(Boolean);
    const full = pool.length;
    if (budget === 30) {
      const p1 = pool.filter((b) => b.priority === 1);
      const p2 = pool.filter((b) => b.priority === 2).slice(0, 1);
      pool = [...p1, ...p2];
    } else if (budget === 60) {
      pool = pool.filter((b) => b.priority <= 2);
    }
    return { title: v.title, type: "strength", blocks: [skipWarmup(budget), warm, ...pool], dropped: full - pool.length, deload };
  } else {
    const v = cardioBlocks(state.cardioVariant, state.cardioCycle, budget, deload);
    const skip = skipWarmup(budget);
    if (recentHeavyCore) skip.note += " Core was loaded last session — keep any core activation light today, just switch it on, don't over-exert.";
    return { title: v.title, type: "cardio", blocks: [skip, ...v.blocks], dropped: 0, deload };
  }
};
const totalEst = (s) => s.blocks.reduce((a, b) => a + (b.est || 0), 0);

// ---------- Apple Watch workout type ----------
const appleType = (session) => {
  const t = session.title;
  if (t.includes("Engine Triplet")) return { rec: "High Intensity Interval Training", why: "mixed bike/row/run blocks — HIIT tracks the effort best" };
  if (t.includes("Power & Med Ball")) return { rec: "High Intensity Interval Training", why: "explosive circuit + strides — HIIT estimates the burn best" };
  if (session.type === "strength") return { rec: "Functional Strength Training", why: "right profile for circuit + barbell work" };
  if (t.includes("Padel")) return { rec: "Tennis", why: "closest racquet-sport profile (no padel option)" };
  if (t.includes("Sprint")) return { rec: "Running (Indoor)", why: "treadmill intervals" };
  return { rec: "Running (Outdoor)", why: "steady run" };
};

// ---------- Timer ----------
function Timer({ seconds, accent }) {
  const [rem, setRem] = useState(seconds);
  const [run, setRun] = useState(false);
  const endRef = useRef(null);
  // reset whenever the exercise (its duration) changes
  useEffect(() => { setRem(seconds); setRun(false); endRef.current = null; }, [seconds]);
  // timestamp-based countdown: survives the tab being backgrounded / phone locked.
  // We store an absolute end-time and recompute remaining from the clock on every
  // tick AND whenever the app becomes visible again, so leaving the app no longer
  // freezes (or loses) the timer.
  useEffect(() => {
    if (!run) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRem(left);
      if (left <= 0) { setRun(false); try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch {} }
    };
    tick();
    const id = setInterval(tick, 250);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [run]);
  const done = rem === 0, pct = ((seconds - rem) / seconds) * 100;
  const onClick = () => {
    if (done) { setRem(seconds); endRef.current = null; }      // reset
    else if (run) { setRun(false); }                            // pause (rem already current)
    else { endRef.current = Date.now() + rem * 1000; setRun(true); } // start / resume
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
      <button onClick={onClick}
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

// ---------- Exercise image: two stills (start / finish). Tap to flip — no auto-motion. ----------
function ExImg({ id, alt }) {
  const [frame, setFrame] = useState(0);
  const imgStyle = (visible) => ({
    position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "left center",
    opacity: visible ? 1 : 0, transition: "opacity 0.2s ease",
  });
  return (
    <div onClick={() => setFrame((f) => 1 - f)} role="button" aria-label={`${alt} positions — tap to flip`}
      style={{ position: "relative", height: 170, marginTop: 10, borderRadius: 10, cursor: "pointer",
      overflow: "hidden", background: "#0d0d0d", border: "1px solid #1f1f1f" }}>
      <img src={`${EXDB}${id}/0.jpg`} alt={`${alt} — start position`} style={imgStyle(frame === 0)} />
      <img src={`${EXDB}${id}/1.jpg`} alt={`${alt} — finish position`} style={imgStyle(frame === 1)} />
      <span style={{ position: "absolute", right: 8, bottom: 8, fontSize: 10, fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase",
        background: "rgba(10,10,10,0.75)", color: "#d4ff3f", borderRadius: 6, padding: "3px 8px" }}>
        {frame === 0 ? "start · tap to flip" : "finish · tap to flip"}
      </span>
    </div>
  );
}

export default function App() {
  const ACCENT = "#d4ff3f";
  const KEY = "coach-program-v3";
  const [state, setState] = useState({
    dayType: "strength", strengthVariant: 0, cardioVariant: 0,
    strengthCycle: 0, cardioCycle: 0, sessionsDone: 0, log: [],
    deloadNext: false, goodStreak: 0, weeklyCalTarget: 0, loaded: false,
  });
  const [phase, setPhase] = useState("time");
  const [budget, setBudget] = useState(60);
  const [done, setDone] = useState({});
  const [feel, setFeel] = useState(null);
  const [niggle, setNiggle] = useState(null);
  const [hit, setHit] = useState(null);
  const [itemLog, setItemLog] = useState({});   // "bi-ii" -> { done: "complete"|"incomplete"|null, value: string }
  const [notes, setNotes] = useState("");        // free-text "what worked / what didn't"
  const [cals, setCals] = useState("");          // calories burned (from Watch), optional
  const [viewLog, setViewLog] = useState(null);  // a past session being viewed in detail
  const [external, setExternal] = useState(null); // { title, minutes } when logging an outside class (HIIT etc.)
  const [goalEdit, setGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [showPrinciples, setShowPrinciples] = useState(false);

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
      const calNum = Number(cals) || 0;
      n.goodStreak = hadProblem ? 0 : s.goodStreak + 1;
      n.sessionsDone = s.sessionsDone + 1;
      const realLog = (s.log || []).filter((l) => !l.seed);
      const today = new Date().toISOString().slice(0, 10);
      if (external) {
        // outside class (HIIT etc.): logged + counts toward fatigue, but does NOT
        // advance the strength<->cardio rotation or its progression cycles.
        n.deloadNext = hadProblem ? true : s.deloadNext;
        n.log = [...realLog, {
          date: today, type: "hiit", title: external.title || "HIIT class",
          budget: Number(external.minutes) || 0, feel, niggle, hit, notes,
          calories: calNum, external: true,
        }].slice(-60);
      } else {
        let step = 1;
        if (feel === "easy") step = 2;
        if (hadProblem) step = 0;
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
        // lightweight snapshot of what the session actually was, so it can be
        // re-opened from history later (alongside per-exercise actuals + notes)
        const snapshot = {
          blocks: session.blocks.map((b) => ({
            name: b.name,
            items: (b.items || []).map((it) => ({ label: it.label, detail: it.detail || "" })),
          })),
        };
        n.log = [...realLog, {
          date: today, type: s.dayType, title: session.title,
          budget, feel, niggle, hit, notes, calories: calNum, actuals: itemLog, session: snapshot,
        }].slice(-60);
      }
      persist(n);
      return n;
    });
    setPhase("time"); setBudget(60); setDone({}); setFeel(null); setNiggle(null); setHit(null);
    setItemLog({}); setNotes(""); setCals(""); setExternal(null);
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
    // variant picker — choose today's session instead of forced rotation
    const accentCol = isStrength ? ACCENT : "#7d9aff";
    const variantTitles = isStrength
      ? [0, 1, 2].map((i) => strengthBlocks(i, state.strengthCycle, false).title)
      : [0, 1, 2].map((i) => cardioBlocks(i, state.cardioCycle, budget, false).title);
    const activeVariant = isStrength ? state.strengthVariant : state.cardioVariant;
    const pickVariant = (i) => setState((s) => {
      const n = { ...s, [isStrength ? "strengthVariant" : "cardioVariant"]: i };
      persist(n); return n;
    });
    const shortTitle = (t) => (t.split("—")[1] || t).trim();
    // weekly calorie-burn goal: sum calories logged since Monday vs the target
    const weekStart = (() => { const d = new Date(); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d.toISOString().slice(0, 10); })();
    const weekCals = (state.log || []).filter((l) => l.date >= weekStart && l.calories).reduce((a, l) => a + (Number(l.calories) || 0), 0);
    const target = Number(state.weeklyCalTarget) || 0;
    const remaining = Math.max(0, target - weekCals);
    const pctGoal = target > 0 ? Math.min(100, Math.round((weekCals / target) * 100)) : 0;
    const saveGoal = () => setState((s) => { const n = { ...s, weeklyCalTarget: Math.max(0, Math.round(Number(goalInput) || 0)) }; persist(n); return n; });
    const fmtN = (x) => x.toLocaleString();
    return (
      <div style={page}>{font}<div style={wrap}>
        <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.03em" }}>{isStrength ? "STRENGTH" : "CARDIO"}</h1>
        <p style={{ color: "#666", fontSize: 13, margin: "4px 0 20px", fontFamily: "'JetBrains Mono', monospace" }}>{state.sessionsDone} sessions done</p>
        {/* weekly burn goal */}
        <div style={{ background: "#101010", border: "1px solid #1f1f1f", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888" }}>Weekly burn</span>
            <button onClick={() => { setGoalInput(target ? String(target) : ""); setGoalEdit((e) => !e); }} style={{ background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>{goalEdit ? "close" : target ? "edit goal" : "set goal"}</button>
          </div>
          {goalEdit ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <input type="number" inputMode="numeric" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g. 3500"
                style={{ flex: 1, background: "#0d0d0d", border: "1px solid #262626", borderRadius: 8, color: "#e5e5e5", padding: "9px 12px", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }} />
              <span style={{ fontSize: 12, color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>kcal/wk</span>
              <button onClick={() => { saveGoal(); setGoalEdit(false); }} style={{ background: ACCENT, color: "#0a0a0a", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>save</button>
            </div>
          ) : target > 0 ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: "#fff" }}>{fmtN(weekCals)}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#666" }}>/ {fmtN(target)} kcal</span>
              </div>
              <div style={{ height: 5, background: "#222", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pctGoal}%`, background: ACCENT, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 12, color: remaining > 0 ? "#888" : "#4ade80", marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                {remaining > 0 ? `${fmtN(remaining)} kcal to go this week` : "goal smashed 🎉"}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#777", marginTop: 8, lineHeight: 1.4 }}>Set a weekly burn goal — sessions log calories from your Watch and count toward it.</div>
          )}
        </div>
        {/* training principles — the north star */}
        <div style={{ background: "#101010", border: "1px solid #1f1f1f", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
          <button onClick={() => setShowPrinciples((p) => !p)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888" }}>Training principles</span>
            <span style={{ color: "#666", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{showPrinciples ? "hide" : "show"}</span>
          </button>
          {showPrinciples && (
            <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {PRINCIPLES.map((p, i) => (
                <li key={i} style={{ fontSize: 13, color: "#cfcf9a", lineHeight: 1.45, paddingLeft: 16, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: ACCENT }}>·</span>{p}
                </li>
              ))}
            </ul>
          )}
        </div>
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
        <div style={{ fontSize: 13, color: "#888", marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
          Pick today's {isStrength ? "strength" : "cardio"} session
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {variantTitles.map((t, i) => (
            <button key={i} onClick={() => pickVariant(i)} style={{
              padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: activeVariant === i ? `1.5px solid ${accentCol}` : "1px solid #262626",
              background: activeVariant === i ? `${accentCol}1f` : "#111",
              color: activeVariant === i ? "#fff" : "#888", fontFamily: "'JetBrains Mono', monospace" }}>
              {shortTitle(t)}
            </button>
          ))}
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
        <button onClick={() => { setDone({}); setItemLog({}); setNotes(""); setCals(""); setExternal(null); setPhase("workout"); }} style={{
          width: "100%", marginTop: 16, padding: 18, borderRadius: 14, border: "none", background: ACCENT,
          color: "#0a0a0a", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          Build my session
        </button>
        <button onClick={() => { setFeel(null); setNiggle(null); setHit(null); setNotes(""); setCals(""); setItemLog({}); setExternal({ title: "HIIT class", minutes: 45 }); setPhase("checkin"); }} style={{
          width: "100%", marginTop: 10, padding: 14, borderRadius: 14, border: "1px solid #2a3a66", background: "rgba(125,154,255,0.06)",
          color: "#9ab0ff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
          + Log a class I did elsewhere (HIIT, etc.)
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
            <button key={i} onClick={() => { setViewLog(l); setPhase("detail"); }} style={{
              background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 10, padding: "12px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%",
              textAlign: "left", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
              <div>
                <div style={{ fontSize: 13, color: "#ddd", fontWeight: 600 }}>{l.title}</div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {l.date} · {l.budget}min{l.niggle === "tweaked" ? " · niggle" : ""}{l.notes ? " · note" : ""} ›
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: feelColor[l.feel] || "#888", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{feelLabel[l.feel] || l.feel}</span>
            </button>
          ))}
        </div>
      </div></div>
    );
  }

  // ---- PHASE: session detail (read-only, opened from history) ----
  if (phase === "detail" && viewLog) {
    const l = viewLog;
    const feelColor = { easy: "#4ade80", right: ACCENT, brutal: "#f87171" };
    const feelLabel = { easy: "Too easy", right: "Just right", brutal: "Brutal" };
    const hitLabel = { all: "all targets", most: "most targets", short: "fell short" };
    const blocks = l.session && l.session.blocks ? l.session.blocks : [];
    const statusStyle = (st) => ({
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap",
      background: st === "complete" ? "rgba(74,222,128,0.12)" : st === "incomplete" ? "rgba(248,113,113,0.12)" : "transparent",
      color: st === "complete" ? "#4ade80" : st === "incomplete" ? "#f87171" : "#555",
      border: st ? "none" : "1px solid #222",
    });
    return (
      <div style={page}>{font}<div style={wrap}>
        <button onClick={() => setPhase("history")} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>back to history</button>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>{l.title}</h2>
        <p style={{ color: "#888", fontSize: 12, marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>
          {l.date} · {l.budget} min · <span style={{ color: feelColor[l.feel] || "#888" }}>{feelLabel[l.feel] || l.feel}</span>
          {l.hit ? ` · ${hitLabel[l.hit] || l.hit}` : ""}{l.niggle === "tweaked" ? " · niggle" : ""}{l.calories ? ` · ${l.calories} kcal` : ""}{l.external ? " · logged externally" : ""}
        </p>
        {l.notes && (
          <div style={{ background: "#101010", borderLeft: `3px solid ${ACCENT}`, borderRadius: "0 8px 8px 0", padding: "12px 14px", marginBottom: 18, fontSize: 13, color: "#cfcf9a", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7d7d4d", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>What worked / what didn't</div>
            {l.notes}
          </div>
        )}
        {blocks.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>No detailed breakdown was saved for this session — just the summary above.</p>
        ) : blocks.map((b, bi) => (
          <div key={bi} style={{ border: "1px solid #1f1f1f", borderRadius: 14, padding: 16, marginBottom: 12, background: "#111" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{b.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(b.items || []).map((it, ii) => {
                const rec = (l.actuals || {})[`${bi}-${ii}`] || {};
                return (
                  <div key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, borderTop: ii === 0 ? "none" : "1px solid #1c1c1c", paddingTop: ii === 0 ? 0 : 10 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, color: "#e5e5e5" }}>{it.label}</span>
                      {it.detail && <span style={{ fontSize: 11, color: "#777", marginLeft: 8, fontFamily: "'JetBrains Mono', monospace" }}>{it.detail}</span>}
                      {rec.value && <div style={{ fontSize: 11, color: "#9a9a6a", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>actual: {rec.value}</div>}
                    </div>
                    <span style={statusStyle(rec.done)}>{rec.done === "complete" ? "done" : rec.done === "incomplete" ? "missed" : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
    const ready = external ? !!feel : (feel && niggle && hit);
    const { rec, why } = appleType(session);
    return (
      <div style={page}>{font}<div style={wrap}>
        <button onClick={() => { if (external) { setExternal(null); setPhase("time"); } else setPhase("workout"); }} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>{external ? "‹ cancel" : "‹ back to session"}</button>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>{external ? "Log a class" : "Session done"}</h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>{external ? "Record something you did outside the app — it still counts toward your fatigue tracking and weekly burn." : "Quick check-in — tunes your next sessions. Use ‹ back to session any time to check what you did; your answers stay put."}</p>
        {external ? (
          <div style={{ background: "rgba(125,154,255,0.06)", border: "1px solid #2a3a66", borderRadius: 12, padding: "14px 16px", marginBottom: 26 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7d9aff", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>What did you do?</div>
            <input value={external.title} onChange={(e) => setExternal((x) => ({ ...x, title: e.target.value }))} placeholder="HIIT class"
              style={{ width: "100%", boxSizing: "border-box", background: "#0d0d0d", border: "1px solid #262626", borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 15, fontWeight: 600, marginBottom: 10, fontFamily: "'Space Grotesk', system-ui, sans-serif" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" inputMode="numeric" value={external.minutes} onChange={(e) => setExternal((x) => ({ ...x, minutes: e.target.value }))} placeholder="45"
                style={{ width: 90, background: "#0d0d0d", border: "1px solid #262626", borderRadius: 8, color: "#e5e5e5", padding: "9px 12px", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }} />
              <span style={{ fontSize: 13, color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>minutes</span>
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(125,154,255,0.06)", border: "1px solid #2a3a66", borderRadius: 12, padding: "14px 16px", marginBottom: 26 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7d9aff", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Log it on your Watch</div>
            <div style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>Record as: {rec}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{why}</div>
          </div>
        )}
        <Group q="How did that feel?" val={feel} set={setFeel} opts={[
          { v: "easy", label: "Too easy", c: "#4ade80" }, { v: "right", label: "Just right", c: ACCENT }, { v: "brutal", label: "Brutal", c: "#f87171" }]} />
        <Group q="Any niggles?" val={niggle} set={setNiggle} opts={[
          { v: "good", label: "All good", c: "#4ade80" }, { v: "tweaked", label: "Tweaked something", c: "#f87171" }]} />
        <Group q="Hit your targets?" val={hit} set={setHit} opts={[
          { v: "all", label: "All of them", c: "#4ade80" }, { v: "most", label: "Most", c: ACCENT }, { v: "short", label: "Fell short", c: "#fbbf24" }]} />
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>What worked? What didn't?</div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>Optional — notes save with the session so you can look back.</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            placeholder="e.g. felt strong on goblet squats · left knee niggle on lunges · ran out of time for the rower finisher"
            style={{ width: "100%", boxSizing: "border-box", background: "#111", border: "1px solid #262626", borderRadius: 10,
              color: "#e5e5e5", padding: "12px 14px", fontSize: 14, lineHeight: 1.5, resize: "vertical",
              fontFamily: "'Space Grotesk', system-ui, sans-serif" }} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Calories burned</div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>Optional — read it off your Watch. Counts toward your weekly burn goal.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" inputMode="numeric" value={cals} onChange={(e) => setCals(e.target.value)} placeholder="e.g. 420"
              style={{ width: 120, background: "#111", border: "1px solid #262626", borderRadius: 10, color: "#e5e5e5", padding: "11px 14px", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }} />
            <span style={{ fontSize: 13, color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>kcal</span>
          </div>
        </div>
        <button disabled={!ready} onClick={submitCheckin} style={{
          width: "100%", marginTop: 10, padding: 18, borderRadius: 14, border: "none",
          background: ready ? ACCENT : "#222", color: ready ? "#0a0a0a" : "#555",
          fontSize: 16, fontWeight: 700, cursor: ready ? "pointer" : "not-allowed", fontFamily: "'Space Grotesk', sans-serif" }}>
          {external ? "Log this class" : `Save & rotate to ${isStrength ? "Cardio" : "Strength"}`}
        </button>
        {(feel === "brutal" || niggle === "tweaked") ? (
          <p style={{ textAlign: "center", color: "#fbbf24", fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>Your next built session will back off — fewer rounds, recovery first.</p>
        ) : feel === "easy" && !external ? (
          <p style={{ textAlign: "center", color: "#4ade80", fontSize: 12, marginTop: 14 }}>Targets will step up faster next time.</p>
        ) : null}
      </div></div>
    );
  }

  // ---- PHASE: workout ----
  const pill = (on, c) => ({
    padding: "6px 13px", borderRadius: 999, cursor: "pointer", fontSize: 11, fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace", border: on ? "none" : "1px solid #2a2a2a",
    background: on ? c : "transparent", color: on ? "#0a0a0a" : "#888",
  });
  return (
    <div style={page}>{font}<div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <button onClick={() => setPhase("time")} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>‹ change session</button>
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
                  {IMG[item.label] ? <ExImg id={IMG[item.label]} alt={item.label} /> : null}
                  {CUE[item.label] && <div style={{ fontSize: 12, color: "#9a9a6a", marginTop: 4, lineHeight: 1.4 }}>{CUE[item.label]}</div>}
                  {item.rest && <div style={{ fontSize: 11, color: "#7d9aff", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>⏱ rest {item.rest}</div>}
                  {item.type === "time" && <Timer seconds={item.seconds} accent={ACCENT} />}
                  {item.type === "manual" && <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontStyle: "italic" }}>self-paced — use your phone timer</div>}
                  {(() => {
                    const k = `${bi}-${ii}`;
                    const rec = itemLog[k] || {};
                    const setRec = (patch) => setItemLog((m) => ({ ...m, [k]: { ...m[k], ...patch } }));
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button onClick={() => setRec({ done: rec.done === "complete" ? null : "complete" })} style={pill(rec.done === "complete", "#4ade80")}>done</button>
                        <button onClick={() => setRec({ done: rec.done === "incomplete" ? null : "incomplete" })} style={pill(rec.done === "incomplete", "#f87171")}>missed</button>
                        <input value={rec.value || ""} onChange={(e) => setRec({ value: e.target.value })}
                          placeholder={item.type === "time"
                            ? (item.detail && item.detail.includes("kg") ? "actual weight (kg)" : "note (optional)")
                            : "actual reps / weight"}
                          style={{ flex: 1, minWidth: 120, background: "#0d0d0d", border: "1px solid #222", borderRadius: 8,
                            color: "#e5e5e5", padding: "7px 10px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
                      </div>
                    );
                  })()}
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
