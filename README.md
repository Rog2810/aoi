# Aoi

A task-management and day-planning web app (installable PWA). Tasks and deadlines come first, planning tools second.
Built with Next.js (App Router), React, TypeScript, CSS Modules and Dexie (IndexedDB).

This is an early prototype. Section 9 lists what is built and what is deliberately not built yet.

---

## 1. Ideas you need coming from Python

| Here | Python comparison |
| --- | --- |
| **Node.js** | The runtime that runs JavaScript outside the browser. Next's dev server and the test runner run on it. Like installing the `python` program. |
| **npm** | The package manager, like `pip`. It installs packages into `node_modules/` inside the project (like a venv's `site-packages`, but per-project). |
| **`package.json`** | `requirements.txt` plus a place to name commands (`npm run dev`, `npm test`). |
| **`package-lock.json`** | Exact versions that were installed. Created by `npm install`. Commit it. |
| **TypeScript** | JavaScript plus type hints. Unlike Python hints, they are checked: `npm run typecheck` fails if they are wrong. |
| **React component** | A function that returns HTML-like markup (JSX). `useState` holds a value; calling its setter re-draws the component. |
| **Next.js App Router** | Folders under `src/app` become URLs: `src/app/page.tsx` is `/`, `src/app/tasks/page.tsx` would be `/tasks`. |
| **Vitest** | Like `pytest`. Files in `tests/` ending in `.test.ts`. |

---

## 2. Setup and everyday commands (Windows PowerShell)

Requires **Node.js 20 or newer** (download the LTS installer from https://nodejs.org). Check it:

```powershell
node --version
npm --version
```

If PowerShell says "running scripts is disabled", run this once, then reopen the terminal:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

(Or type `npm.cmd` instead of `npm`, or use Command Prompt.)

From the project folder:

| Command | What it does |
| --- | --- |
| `npm install` | Downloads dependencies. Run once, and again whenever `package.json` changes. |
| `npm run dev` | Starts the dev server at http://localhost:3000. Saving a file refreshes the browser automatically. Press **Ctrl+C** to stop. |
| `npm run typecheck` | Checks all TypeScript types without producing files. |
| `npm test` | Runs all unit tests once. `npx vitest` keeps running and re-runs tests when you save. |
| `npm run build` | Production build. Fails on type errors, so it doubles as a final check. |
| `npm start` | Serves the production build (run `npm run build` first). The offline/PWA behavior only works here. |

Port 3000 busy? Use `npm run dev -- -p 3001`.

ESLint, Prettier, Playwright and axe are **not set up yet**, so there are no `lint`, `format` or browser-test commands. They are on the deferred list.

---

## 3. Project tour

```
src/
  app/            Pages and global styling (Next.js routes)
    layout.tsx      Wraps every page; skip link; registers the service worker
    page.tsx        Home ("/")
    globals.css     Design tokens: colors, spacing, radius, motion, font scale
  components/     React UI: Dashboard (owns the shared data), one file per widget, usePersistentRecords (loads and saves through the repositories)
  lib/            Pure logic, no React: dates, calendar, sessions, layout, shareCode
  domain/types.ts Shapes of the data: Task, Session, CompletionRecord, TimeboxEntry
  db/db.ts        Dexie (IndexedDB) schema and repositories. Only place that touches the database
  fixtures/       Deterministic sample data (no personal information)
  config/app.ts   The app name, in one place
public/           Files served as-is: manifest.webmanifest, sw.js, offline.html, icon.svg
tests/            Vitest unit tests
.vscode/          Shared editor settings (debug launch configs, recommended extensions)
```

---

## 4. How to make changes

### The loop

1. `npm run dev` and keep it running in one terminal.
2. Edit a file in VS Code and save. The browser updates.
3. Before committing, in a second terminal: `npm run typecheck` then `npm test`.
4. Commit with Git (section 7).

### Rules this code follows (keep following them)

- **Logic lives in `src/lib`, not in components.** A function there takes values and returns values, so it is easy to test.
- **Components never import Dexie.** They get data through state or services; `src/db` is the only place that knows about IndexedDB.
- **Don't store what you can calculate.** "Days remaining" is computed from the due date each time, never saved.
- **Dates are local calendar strings** (`"2026-11-20"`). Use `src/lib/dates.ts`; never subtract timestamps and divide by 24 hours (daylight-saving days are 23 or 25 hours long).
- **Colors come from CSS variables** in `globals.css`, not hard-coded per component.

### Recipes

**Rename the app.** Edit `src/config/app.ts`, and the `name` and `short_name` in `public/manifest.webmanifest` (static JSON cannot import the config).

**Change colors or spacing.** Edit the variables at the top of `src/app/globals.css`. The `@media (prefers-color-scheme: dark)` block holds the dark-mode values.

**Edit the sample data.** `src/fixtures/sample.ts`. Every date there is an offset from today (for example `9` means nine days from now), so the demo never goes stale. The same file holds the sample events, reminders, sessions and timebox entries.

**Add a pure function and a test (the safest way to learn).**

```ts
// src/lib/dates.ts  (add at the bottom)
export const isOverdue = (dueKey: string, today: Date = new Date()): boolean =>
  daysRemaining(dueKey, today) < 0;
```

```ts
// tests/dates.test.ts  (add inside the file)
import { isOverdue } from "../src/lib/dates";

it("flags past dates", () => {
  expect(isOverdue("2026-11-10", new Date(2026, 10, 13))).toBe(true); // months start at 0
});
```

Run `npm test`. Note that JavaScript months are zero-based: `new Date(2026, 10, 13)` is November 13.

**Add a field to a task.**

1. In `src/domain/types.ts`, add it to `Task`. Make it optional so existing records stay valid: `priority?: "low" | "normal" | "high";`
2. Run `npm run typecheck`. TypeScript lists every place that needs updating.
3. Show it in `src/components/Dashboard.tsx`.
4. Database: Dexie stores whole objects, so a new field needs **no** schema change. Only if you want to *search or sort* by it, add an index by adding a new version in `src/db/db.ts`: `this.version(2).stores({ tasks: "id, dueDate, status, parentId, priority" });`. Never edit version 1; real users' browsers already have it.

**Add a page.** Create a folder and a `page.tsx`; the folder name is the URL.

```tsx
// src/app/tasks/page.tsx   ->   http://localhost:3000/tasks
export default function TasksPage() {
  return (
    <main id="main">
      <h1>Tasks</h1>
    </main>
  );
}
```

A page with a changing part of the URL uses brackets: `src/app/tasks/[taskId]/page.tsx` serves `/tasks/abc`. Keep one `<main id="main">` per page; the skip link in `layout.tsx` jumps to it.

**Add a component.** Create `src/components/Thing.tsx` and `Thing.module.css`, then import with the `@/` shortcut (it means `src/`):

```tsx
"use client"; // needed for useState, useEffect and click handlers
import { useState } from "react";
import styles from "./Thing.module.css";

export default function Thing() {
  const [count, setCount] = useState(0);
  return (
    <button className={styles.box} onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

```tsx
import Thing from "@/components/Thing";
```

Classes in a `.module.css` file are private to the component, so names can't clash. Use `var(--border)`-style tokens inside them.

### When something goes red

- **Red squiggle in VS Code / `npm run typecheck` error:** read the first error only; later ones are often a knock-on effect. The message names the file and line.
- **`Cannot find module '@/...'`:** press `Ctrl+Shift+P` → "TypeScript: Restart TS Server".
- **"Hydration failed" in the browser console:** the server and browser rendered different text, usually from dates or locale. Read the date/time after mount, as `Dashboard.tsx` does.
- **A test fails after your change:** the failure shows expected versus received values. Decide whether the code or the test is wrong. Don't edit a test just to make it pass.

---

## 5. Visual Studio Code

Open the folder with **File → Open Folder** (not individual files). Install extensions from the Extensions panel (`Ctrl+Shift+X`).

| Extension | Status | Why |
| --- | --- | --- |
| EditorConfig for VS Code | Recommended now | Applies `.editorconfig` (2-space indent, UTF-8, LF line endings). |
| Error Lens | Optional | Shows errors inline on the line, easier to notice than squiggles. |
| GitLens | Optional | Shows who changed each line and when; richer history views. |
| ESLint | Install when ESLint is added | Highlights suspicious code. Not configured in this repo yet. |
| Prettier | Install when Prettier is added | Auto-formats on save. Not configured yet. |
| Playwright Test for VS Code | Install when Playwright is added | Runs and debugs browser tests. Not configured yet. |
| axe Accessibility Linter | Install when UI grows | Flags accessibility problems in JSX as you type. |

When ESLint and Prettier are added, use `eslint-config-prettier` so ESLint stops complaining about formatting and the two never fight. Prettier owns formatting; ESLint owns code problems.

### Debugging

`.vscode/launch.json` has two ready-made configurations. Open **Run and Debug** (`Ctrl+Shift+D`):

- **Next.js: server-side** starts `npm run dev` under the debugger. Click left of a line number to set a red breakpoint in code that runs on the server (for example in `layout.tsx` or `page.tsx`).
- **Next.js: client-side (Chrome)** opens Chrome attached to http://localhost:3000. Breakpoints in components, such as `Dashboard.tsx`, pause when you click in the page. Start the dev server first (run `npm run dev` in a terminal).

Many people simply use the browser instead: press `F12`, open **Sources**, and press `Ctrl+P` to find a file. `console.log(...)` output appears in the browser **Console** for client code and in the terminal for server code. Don't log task titles or other private data.

**Debugging a test:** open a *JavaScript Debug Terminal* (the terminal's `+` dropdown), set a breakpoint in the test or the function it calls, then run `npx vitest run`. The run pauses at your breakpoint.

---

## 6. Data, offline mode, PWA and environment variables

**Where data lives.** Tasks and reminders are saved in your browser's IndexedDB through repositories (`src/db/db.ts`) and the `usePersistentRecords` hook; components never call the database directly. On first run the sample data is copied in as starting records. Sessions, events and timebox entries are still sample data. Data lives only in that browser on that device, and **clearing browser site data deletes it**. Cloud sync is planned; until it exists, anything not exported is local-only.

**Inspect IndexedDB.** In Chrome or Edge press `F12` → **Application** → **Storage → IndexedDB** → `aoi` → `tasks` or `reminders`. You can view and edit rows there. To start over (and re-copy the sample data), right-click `aoi` → **Delete database**, then reload. Changing `src/fixtures/sample.ts` does not affect records that were already saved.

**Test offline mode.** The service worker only registers in a production build:

1. `npm run build` then `npm start`, open http://localhost:3000, and let it load.
2. `F12` → **Application → Service Workers**: it should say *activated*.
3. **Network** tab → set throttling to **Offline** → reload. Pages you have already visited should still open; others show `offline.html`.

**Stale pages after testing?** The service worker also takes over `localhost:3000` in dev. If dev mode shows old content, go to **Application → Service Workers → Unregister**, then **Storage → Clear site data**.

**Install as an app.** In Chrome or Edge, look for the install icon in the address bar of the production build. The icon is currently SVG only; if the browser does not offer installation, adding 192×192 and 512×512 PNG icons to the manifest is the first thing to try.

**Environment variables.** Nothing needs them yet. When it does, put them in a file named `.env.local` in the project root (already ignored by Git). Next.js only exposes variables whose names start with `NEXT_PUBLIC_` to the browser; everything else stays on the server. **Never** put a secret in a `NEXT_PUBLIC_` variable or in client code. For the planned Supabase integration, the project URL and "anon" key are designed to be public (protected by row-level security), but the **service-role key must never be in this repo or in browser code.** Files that must never contain secrets or be committed: `.env.local`, any `.env*.local`, exported task data, and screenshots of private data.

---

## 7. Git guide

Git records snapshots ("commits") of your project so you can go back, compare, and work on experiments safely. It works locally; GitHub is just a website that stores a copy.

### Install and configure (once)

Install Git for Windows from https://git-scm.com (accept the defaults; it includes Git Credential Manager for GitHub sign-in), or run `winget install --id Git.Git -e`. Reopen the terminal, then:

```powershell
git --version
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

A warning like "LF will be replaced by CRLF" is harmless on Windows.

### Three places your files can be

- **Working tree:** the files on disk as you edit them.
- **Staging area:** the changes you have chosen to include in the next snapshot (`git add`).
- **Repository:** the saved history of snapshots (`git commit`).

### Start tracking this project

```powershell
cd path\to\aoi
git init
git status
```

Check that `node_modules` and `.next` do **not** appear in the status output (`.gitignore` hides them). Then:

```powershell
git add .
git commit -m "Add initial Aoi prototype"
```

To copy an existing repository instead: `git clone https://github.com/you/aoi.git`.

### The commands you will use daily

| Command | Meaning |
| --- | --- |
| `git status` | What changed, and what is staged. Run it often. |
| `git diff` | Exactly which lines changed (unstaged). |
| `git add file.ts` / `git add .` | Stage one file / everything. |
| `git commit -m "message"` | Save the staged snapshot. |
| `git log --oneline` | Short history. |

Run `git status` before every `git add .` and look for anything that should not be committed.

**Good commit messages:** short, present tense, say what the change does. Good: `Show days remaining on task cards`, `Fix Sunday week start in month grid`. Bad: `stuff`, `fixes`, `wip`. Commit small, working steps; run `npm run typecheck` and `npm test` first.

### Solo workflow: `main` plus short-lived feature branches

`main` always holds working code. Each piece of work gets its own branch, which you merge back and delete. You do not need a permanent `develop` branch: that is for teams that need a separate integration stage.

Branch names: `feature/widget-layout`, `feature/calendar-navigation`, `feature/indexeddb-persistence`, and `fix/short-description` for bug fixes.

```powershell
git switch main
git switch -c feature/calendar-navigation   # create and move to a new branch
# ...edit, test, then:
git add .
git commit -m "Animate month changes"
git switch main
git merge feature/calendar-navigation
git branch -d feature/calendar-navigation   # delete the finished branch
```

### Resolving a merge conflict

If two branches changed the same lines, `git merge` stops and says `CONFLICT`. Open the named file; you will see:

```
<<<<<<< HEAD
the version on main
=======
the version from your branch
>>>>>>> feature/calendar-navigation
```

Edit the file to the correct final text and delete the three marker lines. (VS Code shows **Accept Current / Incoming / Both** buttons above each conflict.) Then:

```powershell
git add the-file.ts
git commit        # finishes the merge; accept the suggested message
```

If you panic mid-merge: `git merge --abort` returns to how things were before.

### GitHub

1. On github.com create a new **empty** repository (do not tick "Add a README").
2. Connect and upload:

```powershell
git remote add origin https://github.com/YOUR-NAME/aoi.git
git push -u origin main
```

A browser window opens once to sign in (passwords typed in the terminal are not accepted). After that: `git push` uploads your commits, `git pull` downloads new ones. Push finished branches or `main` at the end of each work session as a backup.

### Undoing mistakes safely

| Situation | Command |
| --- | --- |
| Staged the wrong file | `git restore --staged file.ts` |
| Throw away uncommitted edits in one file | `git restore file.ts` (**cannot be undone**; check with `git diff` first) |
| Undo a commit that is already saved/pushed | `git revert <commit-id>` (adds a new commit that cancels it; id from `git log --oneline`) |
| Park half-finished work temporarily | `git stash`, later `git stash pop` |

Avoid `git reset --hard` and `git push --force` until you are comfortable; they can destroy work.

### Applying files and updates from Claude

Rule: **commit or stash your own work first.** `Copy-Item` and `Expand-Archive` overwrite files silently, so anything uncommitted in those files is gone.

**A. Changed files only (preferred)**

```powershell
git status                                   # must say "working tree clean"
git switch -c update/short-description

# Replace each listed file. In VS Code: open it, Ctrl+A, paste, save.
# New file: right-click the folder in the Explorer -> New File, then paste.
# Or copy a downloaded file straight in:
Copy-Item $HOME\Downloads\Dashboard.tsx src\components\Dashboard.tsx -Force
Remove-Item src\fixtures\old-file.ts       # only if told a file was removed

git status                                   # only the expected files should be listed
git diff                                     # red lines = what disappeared; re-add any of YOUR edits you want to keep
npm run typecheck
npm test
git add .
git commit -m "Describe the change"
git switch main
git merge update/short-description
git branch -d update/short-description
```

Working on a branch means `git restore .` (before committing) or `git switch main` (after) puts you back exactly as you were. If you have edited a file I am replacing, tell me or paste it first so my version includes your changes.

**B. A whole project zip (rare)**

Extracting a zip over the project would overwrite your edits, so apply it to a branch that starts from the *last zip you applied* and let Git merge the two sets of changes.

```powershell
# One time: tag the commit that matches the last zip you applied
git log --oneline
git tag claude-baseline-1 <short-commit-id>

# Each new zip:
git status                                   # clean first
git switch -c update/claude-2 claude-baseline-1
Expand-Archive -Path $HOME\Downloads\aoi.zip -DestinationPath $HOME\Downloads\aoi-new -Force
Copy-Item -Path $HOME\Downloads\aoi-new\aoi\* -Destination . -Recurse -Force
git add .
git commit -m "Apply Claude update 2"
git tag claude-baseline-2

git diff --stat main...update/claude-2       # preview what it brings in
git switch main
git merge update/claude-2
git branch -d update/claude-2
```

If both sides edited the same lines, `git merge` stops with `CONFLICT`: fix it as described under "Resolving a merge conflict", then `git add` the file and `git commit`. `git merge --abort` backs out. Next time use `claude-baseline-2` as the starting point.

### Milestone tags

```powershell
git tag -a v0.1.0 -m "First runnable prototype"
git push origin v0.1.0
git tag            # list tags
```

### Never commit

`node_modules/`, `.next/` and other build output, `.env.local`, API keys or passwords, and exported or screenshotted private task data. Check that a file is ignored with `git check-ignore -v .env.local`. **If a secret is ever committed or pushed, deleting it in a later commit does not remove it from history: treat it as leaked and replace (rotate) it at the provider.**

---

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm.ps1 cannot be loaded` | Section 2: set the execution policy, or use `npm.cmd`. |
| `Port 3000 is in use` | Stop the other server (Ctrl+C) or `npm run dev -- -p 3001`. |
| Page looks old or blank after testing the production build | Unregister the service worker and clear site data (section 6). |
| Strange errors after pulling changes | Run `npm install` again, then restart `npm run dev`. |
| Changes don't appear | Confirm you saved the file and the dev server is still running. |

---

## 9. What exists and what is deferred

**Built:** Home page with a main menu generated from `src/config/navigation.ts`, and widgets for: month calendar (Monday or Sunday start, stable six-row grid, task-due markers), daily timebox (read-only; hour labels, dotted half-hour lines, current-time line updated every minute, previous/next day), tasks and events (accessible tabs; absolute due dates plus exact days remaining; Complete and Undo), sessions (planned, done and remaining minutes), reminders (sideways-scrolling cards with "days since last done"), daily/weekly missions (sample text) and a legend. Pure logic for dates, calendars, events, sessions, layout overlap validation and layout share codes, with unit tests. Tasks and reminders saved to IndexedDB (Dexie) through repositories and the `usePersistentRecords` hook. PWA manifest, offline page and service worker.

**Deferred (not built yet):** the other pages (task board, task detail, events, timebox, layouts, settings); clicking a timebox block to open its item; drag, resize and the layout editor; responsive layout projection; animated month changes; theme, palette and typography settings; saving sessions, events and timebox entries to IndexedDB; the development-state switcher; real daily/weekly mission logic; ESLint, Prettier, Playwright and axe tests; PNG app icons; authentication and cloud sync (Supabase); automatic scheduling.
