# QTs & Cuties Comedy Website

Static event website for QTs & Cuties, built with [Eleventy](https://www.11ty.dev/), bundled browser assets with [esbuild](https://esbuild.github.io/), and deployed with Cloudflare Pages.

## Quick Start

Requirements: Node.js 18 or newer, as specified in `.nvmrc`, and npm.

```bash
npm ci
npm run dev
```

`npm run dev` starts two processes together: esbuild watches `src/assets/` and writes bundled JS/CSS/fonts into `_site/assets/`, while Eleventy serves the site at `http://localhost:8080` and rebuilds when templates or data change.

Production build and local preview:

```bash
npm run build    # esbuild assets → Eleventy → scripts/validate-build.js
npm run preview  # serve _site/ locally
```

Run the recurring-event tests with:

```bash
npm test
```

## Pages

| Page | Source | Notes |
| --- | --- | --- |
| Home | `src/index.njk` | Upcoming shows, type filters, Event JSON-LD |
| Rules | `src/rules/index.njk` | Content lives in `src/_data/rules.json` |
| About | `src/about/index.njk` | Draft copy with `TODO:` placeholders |

Shared layout: `src/_layouts/base.njk`. Site-wide settings (title, email, Instagram, navigation, canonical URL) live in `src/_data/site.json`.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `events.json` | Event data and the primary file for event updates |
| `images/` | Event flyer images, referenced from `events.json` (create as needed) |
| `src/` | Eleventy templates, layouts, includes, and data (`_data/`) |
| `src/assets/js/main.js` | Browser behavior (filters, recurring dates, calendar links, flyer lightbox); imports the CSS and fonts |
| `src/assets/css/main.css` | Design system and all site styles |
| `scripts/` | Build/dev pipeline, build validation, recurring-event helpers/tests |
| `eleventy.config.js` | Eleventy configuration, filters, and event processing |
| `CNAME`, `_redirects` | Cloudflare Pages deployment metadata |
| `_site/` | Generated output; do not edit manually |

Browser JS/CSS are bundled by esbuild from a single entry point (`src/assets/js/main.js` imports `main.css` and the self-hosted Bricolage Grotesque font). The recurring-date logic in `src/assets/js/main.js` is imported from the canonical `scripts/recurring.js`, so build time and browser time always agree.

## Updating Events

Edit the root `events.json` file. It must contain an array of event objects. Every event must have exactly one date mode:

- `date` for a one-time event, formatted as `YYYY-MM-DD`.
- `recurring` for a monthly event.

Required fields for every event:

| Field | Example |
| --- | --- |
| `title` | `QTs & Cuties @ Fiction Beer Company` |
| `eventType` | `Open Mic` or `Showcase` |
| `location` | `7101 E Colfax Ave, Denver, CO 80220` |
| `performanceTime` | `7:00 PM` |
| `eventbriteLink` | `https://www.eventbrite.com/...` |

Optional fields are `signupTime`, `facebookLink`, `image`, and `imageAlt`.

The homepage filter buttons are generated from the `eventType` values actually present, so a "Showcase" button only appears when a showcase event exists.

### Recurring Events

Use a recurring object with these fields:

```json
{
  "label": "1st Wednesday of the month",
  "week": 1,
  "weekday": 3
}
```

`week` is `1` through `5`, or `-1` for the last occurrence. `weekday` uses `0` for Sunday through `6` for Saturday. Months without a requested fifth weekday are skipped.

Recurring cards show the human-readable label and the next occurrence. Eleventy computes a build-time fallback; browser JavaScript recalculates the date in the visitor's local timezone. Use one Eventbrite series URL for all occurrences.

### Event Flyer Images

To show a flyer on a card, drop the image file (9:16 portrait works best) into the root `images/` folder and reference it:

```json
{
  "image": "/images/my-show-flyer.png",
  "imageAlt": "Flyer for QTs & Cuties at Fiction Beer Company"
}
```

`image` is optional; `imageAlt` is strongly recommended (it falls back to `"<title> event flyer"`).

Posters often come with uneven built-in borders (e.g. an empty floor strip at the bottom). Re-center the artwork procedurally with:

```sh
scripts/center-flyer.sh images/my-show-flyer.png   # add --measure to preview
```

It requires ImageMagick and shifts the content so whitespace is equal top and bottom, recreating any padding from the poster's own edge pixels.

Example event:

```json
{
  "title": "QTs & Cuties @ Fiction Beer Company",
  "recurring": {
    "label": "1st Wednesday of the month",
    "week": 1,
    "weekday": 3
  },
  "signupTime": "6:30 PM",
  "performanceTime": "7:00 PM",
  "eventType": "Open Mic",
  "location": "7101 E Colfax Ave, Denver, CO 80220",
  "eventbriteLink": "https://www.eventbrite.com/..."
}
```

## Development Workflow

1. Create a branch for the change.
2. Edit `events.json` or the relevant source files.
3. Run `npm test` and `npm run build`.
4. Review the local site with `npm run preview`.
5. Open a pull request and review its Cloudflare preview before merging.

## Deployment

Cloudflare Pages deploys the `main` branch with these settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `_site` |
| Root directory | Repository root (leave blank in Cloudflare) |
| Node.js version | 18 |

`npm run build` bundles assets with esbuild, runs Eleventy, then `scripts/validate-build.js` — which fails the deploy if pages (home/rules/about), bundled assets and fonts, or SEO surfaces (`sitemap.xml`, `robots.txt`, Event JSON-LD) are missing.

For deployment configuration details, see [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md).
