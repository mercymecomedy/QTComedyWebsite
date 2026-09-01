# QTs & Cuties Comedy Website

Static event website for QTs & Cuties, built with [Eleventy](https://www.11ty.dev/) and deployed with Cloudflare Pages.

## Quick Start

Requirements: Node.js 18 or newer, as specified in `.nvmrc`, and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:8080` to view the development site. The server rebuilds when source files change.

Production build and local preview:

```bash
npm run build
npm run preview
```

Run the recurring-event tests with:

```bash
npm test
```

## Repository Layout

| Path | Purpose |
| --- | --- |
| `events.json` | Event data and the primary file for event updates |
| `src/` | Eleventy templates, layouts, and includes |
| `styles.css` | Site styles |
| `script.js` | Browser behavior, event filters, recurring dates, and calendar links |
| `scripts/` | Build validation and recurring-event helpers/tests |
| `eleventy.config.js` | Eleventy configuration, filters, and event processing |
| `CNAME`, `_redirects` | Cloudflare Pages deployment metadata |
| `_site/` | Generated output; do not edit manually |

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

Optional fields are `signupTime` and `facebookLink`.

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

The build runs Eleventy and then `scripts/validate-build.js`. A successful build must include the homepage, rules page, and either event cards or the intentional empty state.

For deployment configuration details, see [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md).
