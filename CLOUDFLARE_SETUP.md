# Cloudflare Pages — Adding Eleventy Builds to an Existing Site

This guide is for **your situation**: Cloudflare Pages is already connected to GitHub, **production branch = `main`**, custom domain is already working, and deploys today are **static** (no build command — Cloudflare publishes files from the repo as-is). You are adding an **Eleventy build** on top of that setup.

You do **not** need a new Pages project, new domain, or reconnecting GitHub.

---

## What stays the same vs what changes

| Item | Action |
|------|--------|
| Pages project | Keep it |
| GitHub connection | Keep it |
| Custom domain (e.g. `www.qtcomedy.com`) | Keep it — no DNS changes if the domain is already attached |
| Production branch (`main`) | Keep it |
| **Build configuration** | **Add** build command, output directory, Node version |
| What visitors get | After merge: HTML/CSS/JS from **`_site/`** (build output), not raw repo root |

---

## Gotchas when adding a build to a live static site

### 1. Output directory is the biggest change

Previously Cloudflare likely published the **repository root** (empty build command, output `/` or “none”).

After Eleventy:

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Build output directory** | `_site` |
| **Root directory** (project root / monorepo path) | Leave **empty** unless the app lives in a subfolder |

If output is still `/` or wrong, you will get a broken site (wrong files, missing pages, or 404s) even when the build succeeds.

### 2. Saving new build settings may trigger a production deploy immediately

When you save build settings, Cloudflare often starts a **new production deploy from `main`**.

- If `main` does **not** yet have `package.json` / Eleventy, that deploy can **fail**.
- **Your live custom domain usually keeps serving the last successful deployment** until a new production deploy succeeds. A failed build does not automatically wipe the working site.

Still: plan to validate on a **PR preview** before merging Eleventy into `main`.

### 3. Root `index.html` is no longer what production serves

The repo may still contain legacy files at the root (`index.html`, `rules/index.html`). After the build pipeline is active, only what lands in **`_site/`** is published. That is correct — source lives under `src/`, output under `_site/`.

### 4. Commit `package-lock.json`

Cloudflare runs `npm install` using the lockfile when present. Commit it on your feature branch so Mac and Windows (and Cloudflare) install the same dependency tree.

### 5. `_redirects` and `CNAME` must come from the build

This project copies them into `_site/` via `eleventy.config.js`. Do not rely on root-level static publish for those files after the switch.

### 6. Custom domain / SSL

No extra step for the domain if it is already bound to this Pages project. After a successful production deploy, the same domain points at the new build output.

---

## Should you select the Eleventy framework preset?

**Recommendation: No — use “None” (or leave framework unset) and enter settings manually.**

| Approach | Use when |
|----------|----------|
| **None + manual settings** | **This repo** — custom `eleventy.config.js`, `package.json` scripts, `src/` layout, passthrough copies, event validation |
| **Eleventy preset** | Quick start for a stock Eleventy layout Cloudflare expects; may not match your paths or Eleventy 3 setup |

Manual settings (authoritative for this project):

| Setting | Value |
|---------|-------|
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `_site` |
| Root directory | *(empty)* |

The preset can overwrite or assume defaults (install command, output path, directory layout). Your build is already defined in `package.json` (`"build": "eleventy"`). Manual config avoids surprises.

---

## Step 1: Update build settings in the dashboard

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → your **existing** project.
2. Go to **Settings** → **Builds & deployments** → **Build configuration** → **Edit**.
3. Set:

   | Field | Value |
   |-------|-------|
   | Framework preset | **None** |
   | Build command | `npm run build` |
   | Build output directory | `_site` |
   | Root directory | *(leave empty)* |

4. **Do not** change production branch away from `main` unless you intentionally use another default branch.

5. Save. Cloudflare may queue a production build; see [Gotcha #2](#2-saving-new-build-settings-may-trigger-a-production-deploy-immediately) if `main` is not ready yet.

---

## Step 2: Environment variable (required)

Under **Settings** → **Environment variables**:

| Variable | Value | Environments |
|----------|-------|----------------|
| `NODE_VERSION` | `18` | **Production** and **Preview** |

Cloudflare uses this to select the Node.js runtime for `npm install` / `npm run build`. Matches `.nvmrc` and `package.json` `engines`.

No API keys or secrets are required for this static build.

---

## Step 3: Advanced settings — what to use

These appear under **Settings** → **Builds & deployments** (names may vary slightly in the UI).

### Build cache

| Recommendation | **Enable** (default on many accounts) |
|----------------|----------------------------------------|

Caches dependencies (e.g. `node_modules`) between builds so repeat deploys are faster. Safe and helpful for `npm install` on every deploy.

Clear cache only if builds act stale after dependency changes (rare); otherwise leave enabled.

### Branch control (branch deploy controls)

| Setting | Recommendation |
|---------|----------------|
| **Production branch** | `main` (unchanged) |
| **Preview deployments** | **Enabled** |

Previews let you test the Eleventy PR on Cloudflare **before** `main` has the new code. Production URL / custom domain only switch to the new build after a **successful production** deploy from `main`.

Optional: restrict which branches get previews if you have many experimental branches; for a small site, default “previews for non-production branches and PRs” is fine.

### Build watch paths

| Recommendation | **Leave empty** (default) for this repository |

Watch paths limit which file changes trigger a rebuild. Useful in **monorepos** where only `apps/web/` should rebuild.

This site is a single project at the repo root; any push already warrants a full build. Empty = “watch the whole repo” behavior.

If you later split the repo, you might set something like:

```text
src/**
events.json
eleventy.config.js
package.json
package-lock.json
styles.css
script.js
```

Not required today.

### Build system version

| Recommendation | **Version 2** (current Pages build image) |

Use the latest **Build system version** Cloudflare offers (v2). v1 is legacy. No project-specific change needed unless Cloudflare docs tell you otherwise for a new feature.

### Deploy hooks

| Recommendation | **Skip** unless you have a specific need |

Deploy hooks are URLs you call (e.g. `curl`) to start a deploy **without** a Git push — handy for external CMS or scheduled jobs.

**Git push and PR merges already trigger deploys.** You do not need a hook for normal work.

Create one later only if you want manual “redeploy production” from a script or third-party tool.

---

## Step 4: Validate on a pull request (before `main` has Eleventy)

After Steps 1–2, build settings apply to **preview** builds too.

1. Push your feature branch (with `package.json`, `package-lock.json`, `src/`, `eleventy.config.js`, etc.).
2. Open a PR: **base `main`** ← **compare feature branch**.
3. Wait for Cloudflare (1–3 minutes):
   - PR comment with **Visit preview**, or
   - Dashboard → **Deployments** → **Preview** for that commit.
4. Test on the preview URL:
   - Homepage events render
   - `/rules/` works
   - Filters and “Add to calendar”
   - Spot-check `_redirects` behavior if you rely on short links (preview host may differ from production domain; paths should still work on the preview origin)
5. Merge when satisfied → **production** build runs on `main` → custom domain serves `_site/`.

```text
Today (static, no build):
  main ──► Cloudflare publishes repo files ──► your domain

After build config + merge:
  PR branch ──► npm run build ──► _site ──► preview URL
  main (merged) ──► npm run build ──► _site ──► production + your domain
```

### Where preview URLs appear

| Location | Notes |
|----------|--------|
| GitHub PR | Comment from Cloudflare Pages / workers-and-pages bot |
| Dashboard | Project → **Deployments** → type **Preview** |
| Branch alias | Sometimes `https://<branch>--<project>.pages.dev` |

PR URLs may use a hash-style hostname; any link Cloudflare provides on the PR is valid.

---

## Step 5: After merge — confirm production

1. Dashboard → **Deployments** → latest **Production** = success (green).
2. Open your **custom domain** in an incognito window (hard refresh: Ctrl+Shift+R / Cmd+Shift+R).
3. Confirm `CNAME` in the repo still matches your domain (`www.qtcomedy.com` is copied into `_site/CNAME` at build time).

Rollback if needed: **Deployments** → previous successful deployment → **Rollback to this deployment** (does not revert Git; only hosting).

---

## Recommended order of operations (existing domain)

For the lowest risk to your live site:

1. **Update Cloudflare** build settings + `NODE_VERSION` (Steps 1–2). Expect a possible **failed** production build if `main` is still pre-Eleventy; live site should remain on last good deploy.
2. **Open PR** from the Eleventy feature branch; confirm **preview** build passes.
3. **Test preview URL** thoroughly.
4. **Merge to `main`**; confirm **production** deploy succeeds.
5. **Verify custom domain** shows the new site.

Avoid merging to `main` before preview succeeds — that is when production is most likely to break visibly.

---

## Settings reference (quick copy)

```text
Framework preset:     None
Build command:        npm run build
Build output dir:     _site
Root directory:       (empty)
Production branch:    main
NODE_VERSION:         18  (Production + Preview)
Build cache:          On
Preview deployments:  On
Build watch paths:    (empty)
Build system:         v2
Deploy hooks:         (none needed)
```

---

## Troubleshooting

### Preview shows “Loading events…” forever (check passed)

**Cause:** The preview is serving the **old static** `index.html` from the repo root, not the Eleventy output in `_site/`. That legacy file had a placeholder:

```html
<div class="loading">Loading events...</div>
```

Events were never meant to load via JavaScript anymore. If you see that text, Cloudflare is **not** publishing `_site/` (most often **Build output directory** is empty, `/`, or not `_site`).

**Fix in Cloudflare dashboard:**

1. **Settings** → **Builds & deployments** → **Build configuration**
2. **Build output directory** must be exactly: `_site`
3. **Build command** must be: `npm run build`
4. Save and redeploy (or push an empty commit to the PR branch)

**Fix in the repo (this project):**

- Root `index.html` / `rules/index.html` were removed so a misconfigured deploy cannot serve the old shell.
- `npm run build` runs `scripts/validate-build.js` after Eleventy. If the built homepage is wrong, **the build fails** and the Cloudflare check should fail too.

After pushing these changes, confirm the deploy log ends with `[validate-build] OK`.

### Build fails: `npm: command not found` / wrong Node version

- Set `NODE_VERSION` = `18` for **both** Production and Preview.
- Save and retry deploy.

### Build fails: `Cannot find module` / Eleventy errors

- Ensure `package-lock.json` is committed.
- Open the failed deploy → **View build log**; errors usually match local `npm run build`.

### Build succeeds but site is wrong / 404

- **Build output directory** must be `_site`, not `/` or `dist` unless you change the project.
- Framework preset should not override output to something else.

### Build fails on `main` but PR preview works

- `main` may be missing commits; merge the PR or sync branches.
- Check production deploy log for the commit SHA Cloudflare built.

### Preview never appears on PR

- Branch pushed to GitHub?
- Preview deployments enabled?
- GitHub app allowed for the repo?
- Check PR **Checks** tab and Dashboard **Deployments**.
- Empty commit push to retrigger: `git commit --allow-empty -m "retrigger pages" && git push`

### Custom domain still shows old content after successful deploy

- Hard refresh / incognito.
- Confirm you are viewing the custom domain, not an old bookmarked preview URL.
- DNS rarely needs changes when the domain was already on this project.

### `events.json` / validation errors

- Build fails by design with a clear message in logs.
- Fix JSON on a branch, push, preview again.

---

## Production checklist

**Before merge (on PR preview):**

- [ ] Preview deploy succeeded in Cloudflare
- [ ] Events, rules, filters, calendar checked on preview URL
- [ ] Local `npm run build` passes (optional but fast feedback)

**After merge (production + custom domain):**

- [ ] Production deploy succeeded
- [ ] Custom domain shows built site
- [ ] Short redirects in `_redirects` behave as expected on production host

---

## Monitoring and notifications

- **Deployments** tab: build logs, commit, branch, preview vs production.
- **Settings** → **Build notifications**: email or webhook on failure (recommended once builds are required for every deploy).

---

## Further reading

- [Cloudflare Pages — Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages — Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Eleventy docs](https://www.11ty.dev/docs/)
- Project **README.md** — local dev and editing `events.json`
