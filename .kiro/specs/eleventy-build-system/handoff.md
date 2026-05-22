I won't use any more tools. Let me just summarize what's done.

## Status

**Implementation complete.** I fixed one bug (missing `escape` filter) and updated the documentation.

## What You Need To Do

### 1. Install Node.js 18+
```bash
# Check if installed
node --version

# If not, install from nodejs.org or use nvm
nvm install 18 && nvm use 18
```

### 2. Test Locally
```bash
npm install
npm run dev
# Open http://localhost:8080
```

### 3. Deploy to Cloudflare Pages
Follow the steps in `CLOUDFLARE_SETUP.md`:
- Build command: `npm run build`
- Output directory: `_site`
- Set `NODE_VERSION=18` environment variable

## Files Created

- `package.json` - Node config
- `eleventy.config.js` - Build config with validation
- `.nvmrc` - Node version
- `.gitignore` - Ignore node_modules/_site
- `src/_layouts/base.njk` - Base layout
- `src/_includes/event-card.njk` - Event component
- `src/index.njk` - Homepage
- `src/rules/index.njk` - Rules page
- `script.js` - Refactored (filter + calendar only)
- `README.md` - Full docs
- `CLOUDFLARE_SETUP.md` - Deployment guide

## Files Modified

- `script.js` - Removed fetch/rendering, kept filter/calendar

The spec is complete in `.kiro/specs/eleventy-build-system/`.