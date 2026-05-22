# Eleventy Build — Handoff (Windows + macOS)

Last updated after resuming on **Windows 11** (`feat/implement-build-process_GLM-5`). Kiro completed Phases 1–4 on a MacBook; Phase 5 validation was blocked there when Node/npm were unavailable.

## Current status

| Phase | Status |
|-------|--------|
| 1–4 Setup, templates, JS refactor, docs | Done (Kiro) |
| 5 Build validation | **Done on Windows** — fixes applied (see below) |
| 6 Cloudflare deployment | **Your turn** — see `CLOUDFLARE_SETUP.md` |

## Bugs fixed after Kiro (required for a working build)

These did not show up until `npm run build` ran on Windows:

1. **YAML front matter** — Titles with `&` or `:` must be quoted in `src/index.njk` and `src/rules/index.njk`.
2. **Eleventy layouts** — `layout: base.njk` injects page HTML via `{{ content | safe }}`, not Nunjucks `{% block %}`. Layout and pages were updated accordingly.
3. **`script.js` passthrough** — Added to `eleventy.config.js` so `_site/script.js` exists.
4. **Calendar `data-event`** — Replaced `json \| escape` with a `jsonAttr` filter + `\| safe` so JSON parses correctly in the browser.
5. **Past-event filter** — Uses local `YYYY-MM-DD` string compare (consistent across timezones and OS).

## Node.js on Windows

Node was not on PATH in Cursor’s terminal until installed. Options:

- **Installer:** https://nodejs.org/ (LTS). Restart Cursor/terminal after install.
- **winget:** `winget install OpenJS.NodeJS.LTS`
- **nvm-windows:** https://github.com/coreybutler/nvm-windows (optional; mirrors Mac `nvm`)

Verify in a **new** terminal:

```powershell
node --version   # should be >= 18
npm --version
```

## Node.js on macOS

```bash
nvm install    # uses .nvmrc (18)
nvm use
node --version
```

## Commands (both platforms)

From the repo root:

```bash
npm install
npm run build
npm run dev      # http://localhost:8080
```

After changing dependencies on one machine, commit `package-lock.json` so the other gets the same versions.

## Manual checks still worth doing in a browser

- [ ] Filter buttons (All / Open Mic / Showcase)
- [ ] Add to calendar (desktop ICS download, mobile Google Calendar)
- [ ] Rules page nav shows **Home** (not Rules); no `script.js` on rules page

## Phase 6 — Deploy

1. Commit and push this branch (or merge to `main`).
2. Follow `CLOUDFLARE_SETUP.md`: build `npm run build`, output `_site`, `NODE_VERSION=18`.
3. Confirm preview deploy on a PR before merging.

## Legacy root files

`index.html` and `rules/index.html` at the repo root are the **old** static site. The built site lives under `src/` → `_site/`. Cloudflare should use the Eleventy build output only.
