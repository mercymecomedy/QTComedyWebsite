# Implementation Tasks

## Overview

This document tracks the implementation tasks for migrating the QTs & Cuties website to an Eleventy-based build system.

## Task List

### Phase 1: Project Setup ✅

- [x] Create `package.json` with Eleventy dependency and npm scripts
- [x] Create `eleventy.config.js` with build configuration
- [x] Create `.nvmrc` for Node.js version specification
- [x] Create `.gitignore` for node_modules and build output

### Phase 2: Templates ✅

- [x] Create `src/_layouts/base.njk` base layout template
- [x] Create `src/_includes/event-card.njk` event card partial
- [x] Create `src/index.njk` homepage template
- [x] Create `src/rules/index.njk` rules page template

### Phase 3: Client-Side JS Refactor ✅

- [x] Remove `fetch("events.json")` call from script.js
- [x] Remove `createEventCard()` function (moved to template)
- [x] Remove `loadEvents()` function (replaced by static HTML)
- [x] Retain filter functionality in script.js
- [x] Retain calendar integration in script.js

### Phase 4: Documentation ✅

- [x] Create comprehensive README.md with:
  - Installation instructions
  - Development commands
  - Event data structure documentation
  - Editing workflow (local and GitHub web UI)
  - Cloudflare Pages configuration
  - Troubleshooting guide
- [x] Create CLOUDFLARE_SETUP.md with step-by-step setup guide

### Phase 5: Build Validation ✅ (automated) / browser checks optional

**Validated on Windows 11 (May 2026).** Post-Kiro fixes: YAML quoting, layout `content` injection, `script.js` passthrough, `jsonAttr` calendar data.

- [x] Install Node.js 18 or higher (`node --version` to verify)
- [x] Run `npm install` to install dependencies
- [x] Run `npm run build` to verify build succeeds
- [ ] Run `npm run dev` to verify dev server works (local)
- [x] Verify events render correctly in built output (`_site/index.html`)
- [x] Verify past events are filtered out (build-time date filter)
- [ ] Verify filter buttons work correctly in browser
- [ ] Verify calendar integration works (desktop and mobile)

### Phase 6: Deployment Setup ⏳

- [ ] Push changes to GitHub
- [ ] Connect repository to Cloudflare Pages
- [ ] Configure build settings in Cloudflare
- [ ] Verify production deployment succeeds
- [ ] Test preview deployment with a branch/PR

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `package.json` | Node.js project configuration with Eleventy dependency |
| `eleventy.config.js` | Eleventy build configuration with event validation |
| `.nvmrc` | Node.js version 18 specification |
| `.gitignore` | Exclude node_modules and build output |
| `src/_layouts/base.njk` | Base HTML layout template |
| `src/_includes/event-card.njk` | Reusable event card component |
| `src/index.njk` | Homepage template with event listing |
| `src/rules/index.njk` | Rules page template |
| `script.js` | Client-side JS (refactored - filter + calendar only) |
| `README.md` | Comprehensive project documentation |
| `CLOUDFLARE_SETUP.md` | Cloudflare Pages setup guide |

### Files Modified

| File | Changes |
|------|---------|
| `script.js` | Removed event fetching/rendering, kept filter and calendar functionality |

### Files Preserved

| File | Purpose |
|------|---------|
| `events.json` | Event data (source of truth) |
| `styles.css` | Stylesheet (unchanged) |
| `CNAME` | Custom domain configuration |
| `_redirects` | Cloudflare redirects |
| `rules/index.html` | Original rules page (will be replaced by template) |

### Key Design Decisions

1. **Cache-busting**: Build timestamp query parameter (`?v=timestamp`) for CSS/JS URLs
   - Simpler than content hashing
   - Sufficient for a small static site
   - No additional dependencies required

2. **Event filtering**: Events filtered at build time (past events excluded) and client-side (by type)
   - Build-time: Past events don't appear in HTML at all
   - Client-side: Filter buttons show/hide events by type using data attributes

3. **Calendar integration**: Preserved from original implementation
   - Desktop: Downloads ICS file
   - Mobile: Opens Google Calendar
   - Event data embedded in `data-event` attribute

4. **Template engine**: Nunjucks (`.njk`)
   - Eleventy's recommended engine
   - Powerful templating with layouts and includes
   - Familiar syntax for HTML developers

5. **Output directory**: `_site/`
   - Conventional Eleventy output directory
   - Clear distinction from source files

## Next Steps

### For the User

1. **Install Node.js** (if not already installed):
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   
   # Or download from nodejs.org
   # Download Node.js 18 LTS from https://nodejs.org/
   ```

2. **Install dependencies and test locally**:
   ```bash
   npm install
   npm run dev
   # Open http://localhost:8080 in your browser
   ```

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Implement Eleventy build system"
   git push origin main
   ```

4. **Configure Cloudflare Pages**:
   - Follow the steps in `CLOUDFLARE_SETUP.md`
   - Build command: `npm run build`
   - Output directory: `_site`
   - Node version: `18`

### Cloudflare Pages Configuration

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `_site` |
| Node.js version | 18 (set via `NODE_VERSION` environment variable) |

## Verification Checklist

Before considering the implementation complete:

- [x] `npm install` succeeds without errors
- [x] `npm run build` generates `_site/` directory with:
  - [x] `_site/index.html` with pre-rendered events
  - [x] `_site/rules/index.html`
  - [x] `_site/styles.css`
  - [x] `_site/script.js`
  - [x] `_site/CNAME`
- [ ] `npm run dev` starts development server at `localhost:8080`
- [ ] Events display correctly without JavaScript
- [ ] Filter buttons work correctly
- [ ] Calendar integration works on desktop (ICS download)
- [ ] Calendar integration works on mobile (Google Calendar)
- [ ] Past events are not shown
- [ ] Events are sorted by date (earliest first)
- [ ] Production deployment succeeds on Cloudflare Pages
- [ ] Preview deployment works for PRs
