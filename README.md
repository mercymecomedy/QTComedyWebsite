# QTs & Cuties Comedy Website

A static website for QTs & Cuties comedy events, built with [Eleventy](https://www.11ty.dev/) and hosted on Cloudflare Pages.

## Quick Start

### 1. Install Node.js

This project requires Node.js 18 or higher (see `.nvmrc`). Use the same major version on **macOS and Windows** so builds match.

**macOS — nvm (recommended)**
```bash
nvm install   # reads .nvmrc
nvm use
```

**Windows**
- Installer: [nodejs.org](https://nodejs.org/) (LTS), then restart your terminal or IDE
- Or: `winget install OpenJS.NodeJS.LTS`
- Optional: [nvm-windows](https://github.com/coreybutler/nvm-windows) if you want parity with Mac `nvm`

Verify:
```bash
node --version
npm --version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:8080 in your browser. The server will automatically rebuild when you edit files.

### 4. Build for Production

```bash
npm run build
```

This creates a `_site/` directory with the static website.

### 5. Preview Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
QTComedyWebsite/
├── events.json             # Event data (source of truth) - EDIT THIS
├── src/                    # Eleventy source files
│   ├── _includes/          # Reusable template partials
│   ├── _layouts/           # Page layouts
│   ├── index.njk           # Homepage
│   └── rules/index.njk     # Rules page
├── styles.css              # Stylesheet
├── script.js               # Client-side JS (filter + calendar)
├── _site/                  # Built output (generated, don't edit)
├── package.json            # Node.js config
└── eleventy.config.js      # Eleventy config
```

## Editing Events

Events are stored in `events.json` at the project root.

### Event Fields

| Field | Required | Example |
|-------|----------|---------|
| `title` | Yes | `"QTs & Cuties @ Fiction Beer Company"` |
| `date` | Yes | `"2026-06-05"` (YYYY-MM-DD format) |
| `eventType` | Yes | `"Open Mic"` or `"Showcase"` |
| `location` | Yes | `"7101 E Colfax Ave, Denver, CO 80220"` |
| `performanceTime` | Yes | `"7:00 PM"` |
| `signupTime` | No | `"6:30 PM"` (usually for Open Mics only) |
| `eventbriteLink` | Yes | `"https://example.eventbrite.com"` |
| `facebookLink` | No | `"https://facebook.com/events/123"` |

### Example Event

```json
{
  "title": "QTs & Cuties @ Fiction Beer Company",
  "date": "2026-06-05",
  "signupTime": "6:30 PM",
  "performanceTime": "7:00 PM",
  "eventType": "Open Mic",
  "location": "7101 E Colfax Ave, Denver, CO 80220",
  "eventbriteLink": "https://QTsMic06-05-26.eventbrite.com"
}
```

### Workflow: Update Events via GitHub Web UI

1. Go to your repository on GitHub
2. Navigate to `events.json`
3. Click the pencil icon (✏️) to edit
4. Add or modify events in the JSON array
5. Click "Commit changes"
6. Select "Create a new branch for this commit"
7. Click "Propose changes"
8. Click "Create pull request"
9. Wait for the preview deployment (appears as a comment on the PR)
10. Review the preview site
11. Merge the PR when satisfied
12. Production deploys automatically

### Workflow: Update Events Locally

```bash
# 1. Create a branch
git checkout -b update-events-june

# 2. Edit events.json in your editor

# 3. Preview changes
npm run dev

# 4. Commit and push
git add events.json
git commit -m "Update events for June"
git push origin update-events-june

# 5. Open a pull request on GitHub
```

## Deployment

### Cloudflare Pages Setup

See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for step-by-step instructions.

### Configuration Summary

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `_site` |
| Node.js version | 18 |

### Preview Deployments

- Every pull request gets a preview URL
- Preview URLs appear as comments on PRs
- Merge to `main` triggers production deployment

## Troubleshooting

### Build Fails with "missing required field"

Check that all events have the required fields: `title`, `date`, `eventType`, `location`, `performanceTime`, `eventbriteLink`.

### Build Fails with "invalid date format"

Dates must be in `YYYY-MM-DD` format, e.g., `"2026-06-05"`.

### Events Not Showing Up

- Past events are automatically filtered out
- Check that event dates are in the future
- Verify the date format is correct

### npm install fails / `node` not found

- Install Node 18+ (see above) and **open a new terminal** so PATH updates
- On Windows, if `node` works in PowerShell but not in Cursor, restart Cursor after installing Node

### Build fails on YAML / front matter

Quote titles that contain `&`, `:`, or `|` in template front matter, for example:
```yaml
title: "QTs & Cuties: A Comedy Community"
```

### Empty homepage after build

Eleventy layouts use `{{ content | safe }}` in `src/_layouts/base.njk`, not `{% block content %}`. Page templates should not wrap body content in blocks when using `layout:` in front matter.

### Changes not visible after deployment

- Wait 1-2 minutes for Cloudflare to deploy
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Check the deployment status in Cloudflare Dashboard

## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with live reload at localhost:8080 |
| `npm run build` | Build site to `_site/` directory |
| `npm run preview` | Serve built site locally (run build first) |

### How It Works

1. **Build time**: Eleventy reads `events.json`, validates data, filters past events, sorts by date, and generates static HTML
2. **Client side**: JavaScript handles filtering (show/hide by type) and calendar integration (ICS download or Google Calendar)
3. **Deployment**: Cloudflare Pages runs `npm run build` and serves the `_site/` directory

### Cache Busting

CSS and JavaScript files include a build timestamp query parameter (`?v=1716393600000`) to ensure users get fresh assets after each deployment.

## Need Help?

- Check [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for deployment setup
- Review `events.json` for correct data format
- Run `npm run build` locally to see build errors
- Check Cloudflare Dashboard for deployment logs
