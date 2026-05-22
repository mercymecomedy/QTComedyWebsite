# Design Document

## Overview

This document describes the technical design for migrating the QTs & Cuties comedy events website from client-side JavaScript rendering to an Eleventy-based static site generator build system.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Source Files                            │
├─────────────────────────────────────────────────────────────┤
│  events.json        - Event data (source of truth)          │
│  src/               - Eleventy source files                 │
│  ├── _includes/     - Layout templates                      │
│  ├── _layouts/      - Page layouts                          │
│  └── index.njk      - Homepage template                     │
│  rules/index.njk    - Rules page template                   │
│  styles.css         - Stylesheet (passthrough copy)         │
│  script.js          - Client-side JS (filter + calendar)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Eleventy Build Process                    │
├─────────────────────────────────────────────────────────────┤
│  1. Read events.json                                         │
│  2. Validate event data                                      │
│  3. Filter out past events                                   │
│  4. Sort events by date (ascending)                          │
│  5. Render templates with event data                         │
│  6. Copy static assets                                       │
│  7. Apply cache-busting to CSS/JS references                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Output (_site/)                         │
├─────────────────────────────────────────────────────────────┤
│  index.html         - Homepage with pre-rendered events     │
│  rules/index.html   - Rules page                            │
│  styles.css         - Stylesheet                            │
│  script.js          - Client-side filter + calendar JS      │
│  CNAME              - Custom domain config                  │
│  _redirects         - Cloudflare redirects                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Package Configuration (package.json)

```json
{
  "name": "qtcomedy-website",
  "version": "1.0.0",
  "description": "QTs & Cuties Comedy Community Website",
  "scripts": {
    "build": "eleventy",
    "dev": "eleventy --serve",
    "preview": "npx serve _site"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Rationale:**
- Minimal dependencies (only Eleventy)
- Same build command for local and CI
- `--serve` flag provides dev server with live reload
- `npx serve` for preview without watch/rebuild

### 2. Eleventy Configuration (eleventy.config.js)

```javascript
const fs = require('fs');

module.exports = function(eleventyConfig) {
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy('styles.css');
  eleventyConfig.addPassthroughCopy('CNAME');
  eleventyConfig.addPassthroughCopy('_redirects');
  
  // Read and process events data
  eleventyConfig.addGlobalData('events', () => {
    const eventsPath = './events.json';
    const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    
    // Validate events
    validateEvents(events);
    
    // Filter and sort events
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    return events
      .filter(event => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  });
  
  // Build timestamp for cache-busting
  eleventyConfig.addGlobalData('buildTime', () => Date.now());
  
  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts'
    },
    templateFormats: ['njk', 'html'],
    htmlTemplateEngine: 'njk'
  };
};

function validateEvents(events) {
  const required = ['title', 'date', 'eventType', 'location', 'performanceTime', 'eventbriteLink'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  events.forEach((event, index) => {
    // Check required fields
    for (const field of required) {
      if (!event[field] || (typeof event[field] === 'string' && !event[field].trim())) {
        throw new Error(`Event at index ${index} missing required field: ${field}`);
      }
    }
    
    // Validate date format
    if (!dateRegex.test(event.date)) {
      throw new Error(`Event "${event.title}" has invalid date format: ${event.date} (expected YYYY-MM-DD)`);
    }
    
    // Validate date is parseable
    if (isNaN(new Date(event.date).getTime())) {
      throw new Error(`Event "${event.title}" has invalid date: ${event.date}`);
    }
  });
}
```

### 3. Directory Structure

```
QTComedyWebsite/
├── .kiro/
│   └── specs/
│       └── eleventy-build-system/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── src/
│   ├── _includes/
│   │   └── event-card.njk      # Event card partial
│   ├── _layouts/
│   │   └── base.njk            # Base layout
│   ├── index.njk               # Homepage
│   └── rules/
│       └── index.njk           # Rules page
├── events.json                 # Event data (source of truth)
├── styles.css                  # Stylesheet
├── script.js                   # Client-side JS (filter + calendar only)
├── eleventy.config.js          # Eleventy configuration
├── package.json                # Node.js configuration
├── CNAME                       # Custom domain
├── _redirects                  # Cloudflare redirects
└── README.md                   # Documentation
```

### 4. Template Design

#### Base Layout (src/_layouts/base.njk)

```nunjucks
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <link rel="stylesheet" href="/styles.css?v={{ buildTime }}">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💜</text></svg>">
</head>
<body>
    <header>
        <div class="container">
            <h1>{{ siteTitle }}</h1>
            <nav>
                {% block nav %}{% endblock %}
            </nav>
        </div>
    </header>

    <main>
        <div class="container">
            {% block content %}{% endblock %}
        </div>
    </main>

    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>Connect With Us</h3>
                </div>
                <div class="footer-section">
                    <div class="social-links">
                        <a href="https://instagram.com/mercymecomedy" target="_blank" rel="noopener noreferrer" class="social-link">
                            Instagram
                        </a>
                        <a href="mailto:mercymecomedy@gmail.com" class="social-link">
                            Email Us
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    <script src="/script.js?v={{ buildTime }}"></script>
</body>
</html>
```

#### Event Card Partial (src/_includes/event-card.njk)

```nunjucks
<div class="event-card" data-event-type="{{ event.eventType | lower | replace(' ', '-') }}">
    <div class="event-title">{{ event.title }}</div>
    <div class="event-date">{{ event.date | formatDate }}</div>
    <div class="event-type {{ event.eventType | lower | replace(' ', '-') }}">{{ event.eventType }}</div>
    <div class="event-details">
        {% if event.signupTime %}
        <div class="event-detail-item event-time">
            <strong>Signup:</strong>
            <span>{{ event.signupTime }}</span>
            <span class="time-separator">•</span>
            <strong>Show:</strong>
            <span>{{ event.performanceTime }}</span>
        </div>
        {% else %}
        <div class="event-detail-item event-time">
            <strong>Show:</strong>
            <span>{{ event.performanceTime }}</span>
        </div>
        {% endif %}
        <div class="event-detail-item">
            <strong>Location:</strong>
            <span>{{ event.location }}</span>
        </div>
    </div>
    <div class="event-links">
        {% if event.eventbriteLink %}
        <a href="{{ event.eventbriteLink }}" target="_blank" rel="noopener noreferrer" class="event-link eventbrite">Eventbrite</a>
        {% endif %}
        {% if event.facebookLink %}
        <a href="{{ event.facebookLink }}" target="_blank" rel="noopener noreferrer" class="event-link facebook">Facebook</a>
        {% endif %}
        <a href="#" class="event-link calendar add-to-calendar" data-event='{{ event | json | escape }}' aria-label="Add to calendar">Add to calendar</a>
    </div>
</div>
```

### 5. Client-Side JavaScript (script.js)

After migration, the client-side JavaScript will be simplified to only include:

1. **Filter functionality** - Show/hide event cards based on type
2. **Calendar integration** - ICS download and Google Calendar redirect

**Removed:**
- `fetch("events.json")` - No longer needed
- `createEventCard()` - Moved to build-time template
- `loadEvents()` - Replaced by static HTML

**Retained:**
- Filter button click handlers
- `filterEvents()` function
- `downloadIcs()` function
- `buildIcsContent()` function
- `parseTimeString()` function

### 6. Cache-Busting Strategy

**Chosen approach:** Query parameter with build timestamp

**Rationale:**
- Simpler than content hashing for this small site
- Eleventy doesn't have built-in content hashing
- Sufficient for a small static site
- No additional dependencies needed

**Implementation:**
- Add `buildTime` global data with `Date.now()`
- Append `?v={{ buildTime }}` to CSS and JS URLs in templates
- Example: `/styles.css?v=1716393600000`

### 7. Cloudflare Pages Configuration

**Build Settings:**
- Build command: `npm run build`
- Build output directory: `_site`
- Root directory: `/` (project root)
- Node.js version: 18 (specified via `.nvmrc` or environment variable)

**Environment Variables:**
- `NODE_VERSION=18` - Ensures reproducible builds

**Preview Deployments:**
- Automatically enabled for all non-main branches
- Accessible at `https://<branch>--<project>.pages.dev`
- Production deployment on merge to `main`

## Data Flow

### Build-Time Data Flow

```
events.json
    │
    ▼
eleventy.config.js
    │
    ├─► Validate events
    │       └─► Fail build if invalid
    │
    ├─► Filter past events
    │       └─► Compare date >= today
    │
    ├─► Sort by date (ascending)
    │
    └─► Pass to templates as global data
            │
            ▼
        index.njk
            │
            ├─► Iterate events
            │       └─► Render event-card.njk for each
            │
            └─► Output to _site/index.html
```

### Client-Side Data Flow (After Build)

```
User clicks filter button
    │
    ▼
JavaScript event handler
    │
    ├─► Update active button state
    │
    └─► Show/hide event cards
            └─► Match data-event-type attribute
```

```
User clicks "Add to calendar"
    │
    ▼
JavaScript click handler
    │
    ├─► Desktop: Generate ICS file, trigger download
    │
    └─► Mobile: Open Google Calendar URL
```

## Error Handling

### Build-Time Errors

| Error Condition | Behavior |
|----------------|----------|
| Missing required field | Fail build with field name and event index/title |
| Invalid date format | Fail build with expected format (YYYY-MM-DD) |
| Unparseable JSON | Fail build with JSON parse error |
| Missing events.json | Fail build with file not found error |

### Runtime Errors (Client-Side)

| Error Condition | Behavior |
|----------------|----------|
| No events in data | Display "No upcoming events" message |
| Filter finds no matches | Display "No events found for this filter" |

## Security Considerations

1. **No secrets in build** - Build process requires no API keys or tokens
2. **Static output** - No server-side code execution
3. **Client-side only** - Filter and calendar features run in browser
4. **External links** - Use `rel="noopener noreferrer"` for security

## Performance Considerations

1. **Static HTML** - No client-side data fetching, instant content display
2. **Small bundle** - Minimal client-side JavaScript (filter + calendar only)
3. **No build-time dependencies** - Only Eleventy in devDependencies
4. **Fast builds** - Eleventy is fast for small sites (~1-2 seconds)

## Testing Strategy

### Build-Time Testing

1. **Valid data** - Build succeeds with well-formed events.json
2. **Invalid data** - Build fails with clear error message
3. **Past events excluded** - Verify output doesn't contain past events
4. **Date sorting** - Verify events are in ascending date order
5. **Empty data** - Build succeeds with no-events message

### Runtime Testing

1. **Filter UI** - Click each filter, verify correct events shown
2. **Calendar desktop** - Verify ICS file downloads
3. **Calendar mobile** - Verify Google Calendar opens with correct data
4. **No JavaScript** - Verify events display with JS disabled

## Deployment Workflow

### GitHub Branch Workflow

```
main (production)
    ▲
    │ merge PR
    │
feature/update-events
    │
    ├─► Edit events.json
    │
    ├─► Commit and push
    │
    ├─► Open pull request
    │       │
    │       ▼
    │   Cloudflare creates preview deployment
    │       │
    │       ▼
    │   Review preview URL
    │       │
    │       ▼
    └─► Merge to main
            │
            ▼
        Cloudflare deploys to production
```

### Cloudflare Pages Setup

1. Connect GitHub repository to Cloudflare Pages
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `_site`
   - Root directory: (leave empty)
3. Set environment variable: `NODE_VERSION=18`
4. Enable preview deployments for all branches

## Implementation Phases

### Phase 1: Project Setup
- Create package.json with dependencies
- Create eleventy.config.js with configuration
- Create .nvmrc for Node version specification

### Phase 2: Templates
- Create base layout (src/_layouts/base.njk)
- Create event card partial (src/_includes/event-card.njk)
- Create homepage template (src/index.njk)
- Create rules page template (src/rules/index.njk)

### Phase 3: Client-Side JS Refactor
- Remove event fetching and rendering code
- Retain filter functionality
- Retain calendar integration
- Update event data handling for static HTML

### Phase 4: Documentation
- Update README with workflow documentation
- Create Cloudflare Pages setup guide
- Document events.json schema

### Phase 5: Testing and Validation
- Test build process locally
- Test preview deployment
- Verify production deployment
