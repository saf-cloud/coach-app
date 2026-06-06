# Coach — your training partner app

This is the app we built together, packaged as a real React project you can deploy to your own URL (exactly how your friend's "Iron Log" runs on Render). Once it's your own hosted site, you control the plumbing — so you can add real exercise images and, if you want, wire in live AI.

## What's already in it
- Time-budget session builder (Quick / Standard / Long)
- Strength ⇄ Cardio auto-rotation with 3 variants each
- Per-session coaching focus + per-exercise form cues
- Fatigue management: auto-deload after a "brutal"/niggle session, ramps back up after good ones
- Feel-trend history
- Apple Watch "record as…" prompts
- Progress saved in your browser (localStorage)

---

## 1. Run it on your computer first (optional, to see it locally)
You need Node.js installed (nodejs.org). Then in this folder:

```
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

---

## 2. Deploy it to a public URL (the Iron Log step)

**Easiest — Vercel or Netlify (free):**
1. Put this folder on GitHub (create a repo, push these files).
2. Go to vercel.com or netlify.com, sign in with GitHub.
3. "New Project" → pick the repo → it auto-detects Vite → Deploy.
4. You get a URL like `your-app.vercel.app`. Done.

**Render (what your friend used):**
1. Push to GitHub as above.
2. Render.com → New → Static Site → pick the repo.
3. The included `render.yaml` sets build command + publish path automatically.
4. Deploy → you get `your-app.onrender.com`.

The `vercel.json` and `render.yaml` files handle the routing so refreshes don't 404.

---

## 3. Add real exercise images (the thing you wanted)

Now that it's YOUR server, you can host images legally. Two ways:

**A) Host your own files**
- Put image files in the `public/exercises/` folder, e.g. `public/exercises/split-squat.jpg`
- Open `src/App.jsx`, find the `IMG = { ... }` block near the top.
- Set the path, e.g. `"Bulgarian split squat": "/exercises/split-squat.jpg",`
- Redeploy. The image shows above that exercise's cue.

**B) Use a licensed image URL**
- If you buy a GIF/image pack (e.g. gymvisual) or have any image you're allowed to use, paste its URL straight into the `IMG` map.

Only use images you own or are licensed to use. That's the rule I can't break for you inside Claude, but on your own site it's your call and your responsibility.

---

## 4. (Optional) Add live AI "Regenerate" like Iron Log

This needs a small backend so your Anthropic API key is never exposed in the browser.
- Add a serverless function (Vercel: `/api/regenerate.js`; Netlify: a function) that calls the Anthropic API using an env var `ANTHROPIC_API_KEY`.
- Set that key in your host's Environment Variables settings (never commit it).
- Have the app POST the user's history to that function and render the returned session.

Ask Claude to "write me the serverless regenerate endpoint for this app" when you're ready — it's a focused add-on once the app is deployed.

---

## Notes
- Progress is stored per-browser. Clearing browser data resets it.
- Everything works offline once loaded, except any future AI features.
- This is yours now — edit freely.
