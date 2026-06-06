# START HERE — handoff for Claude Cowork / Claude Code

You're picking up a project that was built in a Claude chat and is now being moved
here to keep building and to deploy. Read this whole file first, then the README.md.

## What this is
A personal training app ("Coach") — a bodyweight + cardio training partner for one
user. It's a working Vite + React app. It already builds cleanly (`npm run build`).

## The user (context that shaped every decision)
- Trains up to 6x/week; mix of gym (mostly bodyweight) and padel.
- Goals, in priority order: strengthen core, lose belly fat, strengthen legs, and
  above all stay **lean, strong, nimble and agile — explicitly NOT bulky**.
- Trains in timed formats (e.g. 30s on / 30s off, sprint intervals).
- Their actual current routine: 10-min bike (~4km) + 10-min skip warm-up, a weighted
  core circuit (planks, side planks, med-ball plank, press-ups, rounds with weight on
  back), pull-ups (4x4-6) and dips (10x4). We added leg work and rotational core.
- Uses an Apple Watch; wants to log sessions there too.

## What's already built (don't rebuild — extend)
- Time-budget session builder: Quick (~30) / Standard (~60) / Long (~90); session is
  trimmed to fit, lowest-priority blocks dropped first.
- Strict Strength <-> Cardio auto-rotation, 3 variants each side.
- Dynamic warm-up matched to the session + time budget.
- Coaching layer: per-session focus line (FOCUS map) + per-exercise form cue (CUE map).
- Fatigue management: a "brutal" feel or a niggle flag triggers a deload on the next
  same-type session (fewer rounds), then ramps back up after good sessions.
- Auto-progression: reps/load/time creep up with a cycle counter, driven by check-ins.
- Post-session check-in (feel / niggle / hit targets) — this drives progression.
- Feel-trend history screen (dot strip + recent list).
- Apple Watch "record as…" prompts (appleType map): Functional Strength Training for
  strength, HIIT for the full circuit, Running for the run, Tennis for padel.
- Persistence via localStorage.

## Key files
- `src/App.jsx` — the entire app. Maps to look at near the top: CUE, IMG, FOCUS,
  strengthBlocks(), cardioBlocks(), buildSession(), appleType().
- `README.md` — deploy instructions (Vercel / Render / Netlify) + how to add images
  and an optional AI regenerate endpoint.
- `IMG` map in App.jsx — currently empty strings; this is where exercise images go.

## The history that matters (so you don't repeat dead ends)
We spent a long time trying to give each exercise a moving visual demo. Everything hit
a wall, and the user was (rightly) frustrated each time:
- Animated stick figures — looked terrible, rejected.
- YouTube demo links — work, but YouTube throws a "prove you're not a bot" wall in the
  in-app webview that loops and won't clear. Removed at the user's request.
- Good animated GIF libraries (e.g. gymvisual) — paid/licensed, can't embed for free.
- Static hand-drawn SVG figures — offered as a preview; decent for position-based moves
  (split squat, RDL) but the user wanted real images.
The user then saw a friend's deployed app ("Iron Log" on Render) with real exercise
photos and asked why this couldn't do the same. The answer — and the reason we're here —
is that a Claude chat artifact can't host or legally embed images, but a DEPLOYED app on
the user's own server can. That's the whole point of this move.

## What the user wants next (the actual goals for this session)
1. Run the app locally so they can see it working (`npm install`, `npm run dev`).
2. Get it deployed to a public URL (they liked the Render route their friend used;
   Vercel/Netlify are equally fine — pick whatever's easiest for them).
3. Help them "Add to Home Screen" on iPhone so it behaves like an app.
4. Add real exercise images to the IMG map — IMPORTANT: only images the user owns or
   is licensed to use (e.g. a gymvisual pack they buy). Do not scrape copyrighted images.
5. (Optional, later) Wire in a live "Regenerate" feature using their Anthropic API key,
   via a serverless function so the key stays server-side (never in the browser bundle).

## Guardrails to honour (these reflect how we worked together)
- Be honest about limits. The user values straight talk over impressive-sounding claims;
  we earned trust by naming what wasn't possible rather than faking it.
- Keep the training philosophy intact: lean/nimble, lower-rep strength, NOT bulky. Don't
  let it drift into a mass-building program.
- This isn't medical/PT advice; it's a personal training tool. Keep fatigue management
  conservative — when in doubt, back off, don't pile on.
- For images and any API key: it's the user's own server now, so it's their call and
  their responsibility, but still flag licensing and keep keys out of the client bundle.

## First suggested prompt for the user to give you
"Read START_HERE.md and README.md, run the app locally so I can see it, then walk me
through deploying it and adding it to my phone — one step at a time."
