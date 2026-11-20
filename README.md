# StudyQuest

A gamified Pomodoro study timer. Local-first, no backend, no account — all your
progress lives in your browser.

**Live: <https://aakashparui.github.io/studyquest/>** — open it on your phone
and install it to the home screen; it then runs fully offline.

---

## How to run it

```powershell
cd studyquest
npm install
npm run dev
```

Then open <http://localhost:5180>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload on port 5180 |
| `npm run build` | Typecheck, bundle to `dist/`, then write the service worker's precache list |
| `npm run preview` | Serve the built bundle on port 5181 |
| `npm run lint` | Lint with oxlint |
| `npm run icons` | Regenerate the app icons in `public/icons/` |

The build is fully static. After the first load it needs no network: fonts are
system fonts, icons are inline SVG, and all audio is synthesised in the browser,
so it works offline.

### Using it on your phone

The dev and preview servers listen on the local network, so with your laptop and
phone on the same Wi-Fi, `npm run dev` prints a second URL like
`http://192.168.1.4:5180/` — open that on the phone.

If it does not load, Windows Firewall is usually the reason: allow Node.js on
**private** networks the first time it asks. The laptop's IP can also change
when it reconnects to Wi-Fi, so check the URL Vite prints each time.

For day-to-day use `npm run build` then `npm run preview` (port 5181) is better
than the dev server — same app, no HMR socket trying to reconnect.

**Progress is stored per origin.** The phone keeps its own XP, streak and
history, separate from the laptop, and `http://localhost:5180` and
`http://192.168.1.4:5180` count as different origins even on the same machine.
Use Settings → Export / Import JSON to move progress between them.

### Installing it as an app (PWA)

StudyQuest ships a web manifest and a service worker, so it can be installed to
a home screen and then opens full-screen with no network at all. Settings has an
**Install** card that triggers the browser's install prompt where one is
available, and shows the Share-sheet steps on iOS.

**Installing requires a secure context — HTTPS, or `localhost`.** A plain
`http://192.168.1.4:5181` LAN address is *not* one, so the worker will not
register there and no install will be offered. Over the LAN the app still runs
fine in the phone's browser; it just isn't installable or offline-capable.

That is what the deployed copy is for: open
**<https://aakashparui.github.io/studyquest/>** on your phone, install it once,
and from then on it opens from the home-screen icon with this laptop switched
off.

### Deployment

Every push to `main` builds and publishes to GitHub Pages via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). Pages project
sites are served from a sub-path, so the workflow builds with
`BASE_PATH=/studyquest/`; locally the base stays `/`. The manifest, the worker
and its registration all use relative paths, so the same build works at a root
domain too.

To deploy somewhere else instead, `npm run build` and upload `dist/` to any
static host with HTTPS.

**How the offline cache works.** `npm run build` runs
`scripts/inject-precache.mjs`, which writes the build's hashed asset filenames
and a build-id cache name into `dist/sw.js`. The worker precaches the whole app
shell on install — so it is offline-ready from the *first* load, not the second
— serves navigations network-first (a new build is picked up as soon as you are
online) and static assets cache-first. Old caches are deleted when a new worker
activates.

---

## Project structure

```
src/
  types/study.ts            Domain types (sessions, subjects, settings, state)
  lib/
    storage.ts              LocalStorage read/write, validation, export/import
    session.ts              Scoring a finished run (pure); phase sequencing
    xpSystem.ts             XP values, level curve, level titles
    achievements.ts         Achievement definitions + unlock checks
    streak.ts               Current/longest streak, heatmap grid
    statistics.ts           All derived stats from the session log
    events.ts               Random "study event" rolls
    mascot.ts               Mascot lines by mood, break tips
    quotes.ts               Daily quote rotation
    sound.ts                Web Audio cues + generated ambient soundscapes
    date.ts / format.ts / id.ts
  hooks/
    useTimer.ts             Timestamp-based timer, persisted
    useStudyStats.ts        Memoised stats, refreshed across midnight
    useNotifications.ts     Browser notification permission + sending
    useKeyboardShortcuts.ts Global shortcuts
    useLocalStorage.ts      Small persisted values
    useHashRoute.ts         Hash routing
  store/
    StudyProvider.tsx       Single source of truth; wires timer → XP → feedback
    StudyContext.ts         Context shape
    useStudy.ts             Consumer hook
  components/
    Timer/                  ProgressRing, TimerPanel, TimerControls, SessionComplete
    FocusMode/              Immersive full-screen mode
    Dashboard/              MissionCard, DailyGoalCard, ComboMeter, Quote, Ambient, header/nav
    XPBar/ LevelCard/ Streak/ Mascot/ Achievements/ SubjectSelector/ Stats/ History/
    ui/                     Button, Card, Modal, Controls, Aurora, Confetti, ToastStack
  pages/
    Dashboard.tsx  Statistics.tsx  History.tsx  Achievements.tsx  Settings.tsx
  App.tsx                   Shell: header, routing, overlays, shortcuts
```

Pure logic lives in `lib/` and is side-effect free, so scoring, streaks and
statistics can be reasoned about (and tested) without React.

---

## Main features

**Timer**
- 25 / 5 / 15 defaults, every duration configurable, plus per-session length
  presets (15 / 25 / 50 min).
- Driven by `targetEndTime − now`, never by decrementing state, so it stays
  accurate through inactive tabs, throttling and laptop sleep.
- The active run is persisted: refresh mid-session and it picks up exactly where
  it was, including Focus Mode. A run that finished while you were away is
  credited on your return; one that finished more than 2 hours ago is not.
- Browser notification + sound on completion, and a live countdown in the tab
  title.

**Game layer**
- XP: 4 XP per focus minute (25 min → 100 XP), +25 for a run with no pauses,
  +100 for completing a cycle, +200 the first time you hit the daily goal,
  plus streak and combo bonuses.
- Levels are computed from total XP (cost grows 200, 350, 500, …), with titles
  from Beginner to Grandmaster and beyond. Level-ups fire confetti and a chime.
- 17 achievements with progress bars on the locked ones.
- Focus combo: consecutive completed focus sessions, reset by abandoning one.
- Small random study events (Critical Focus, Deep Work, Streak Saved …) — at
  most two per session, rolled *after* the timer, never interrupting it.

**Tracking**
- Daily goal with a circular indicator and today's focus time.
- Streak with a GitHub-style contribution heatmap (22 weeks).
- Subjects with icon, colour, total time and session count.
- Statistics: totals, averages, today/week/month, per-subject split, most
  productive weekday and time of day.
- History grouped by day, with duration, subject, completion status and XP.

**Experience**
- Dark by default, light theme available, glassmorphism with a slow ambient
  background wash.
- Focus Mode: full-screen, distraction-free, subtle motion only.
- "Pip", a mascot that reacts at the start, quarter, halfway and final stretch
  of a session, and never repeats the line it just said.
- Ambient sound (rain, forest, fireplace, ocean) generated with the Web Audio
  API — no streaming, no audio files.
- Keyboard: `Space` start/pause, `R` reset, `S` skip, `F` focus mode, `Esc` exit.
- Export / import your data as JSON; reset behind a confirmation dialog.

---

## Assumptions I made

- **Where it lives.** This repository already contains the Next.js "Shortlist"
  app, so StudyQuest is a self-contained Vite project in `studyquest/`. Nothing
  outside that folder changed except an added `studyquest` entry in
  `.claude/launch.json`.
- **Default subjects** are seeded from your examples (Payments, Coding, Power BI,
  Interview Prep, General Study). Deleting a subject keeps its past sessions in
  history — they store a snapshot of the name, icon and colour.
- **Daily goal is counted in Pomodoros** (default 6). The "≈2 hours" preset is
  converted using your current focus duration.
- **The streak survives until midnight.** If yesterday had a session and today
  has none yet, the streak still shows and is flagged "at risk" rather than
  dropping to zero mid-morning.
- **Abandoned runs** (reset or skip) are logged only if at least 60 seconds had
  elapsed, so a mis-click does not clutter history. They break the combo but
  never remove XP.
- **Breaks earn no XP** — they are logged for history, and long breaks reset the
  cycle counter.
- **Random events are modest and bounded** (max two per session, 10–30 XP). No
  loot boxes, no gambling loops, no streak-loss guilt mechanics.
- **Ambient sound plays whenever a soundscape is selected**, not only during a
  session, and starts after your first interaction (browsers require a gesture
  before audio).
- **History is capped at 2,000 sessions** so localStorage can't grow unbounded;
  the oldest entries drop off first.
- Corrupted or partially-written saved data is repaired field by field rather
  than discarded, and you get a notice when that happens.

---

## What I'd add next

1. **A small test suite** for `lib/` — `completeFocusRun`, `currentStreak` and
   `computeStats` are pure and would be cheap to lock down with Vitest.
2. **Per-subject goals and targets** (e.g. "6 hours of Payments this week") with
   progress in the statistics page.
3. **Notes on a session** — a line about what you actually covered, shown in
   history, which makes revision planning much easier.
4. **Longer-range charts** — a 12-week trend and month-over-month comparison;
   the data is already there, only the views are missing.
5. **Optional cloud sync** behind an explicit toggle, if you ever want the same
   streak on a phone and a laptop.
6. **Richer ambient mixing** — layering two soundscapes, and a gentle fade-out
   in the last minute of a session.
