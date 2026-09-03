const fs = require('fs');
const {
  nextOccurrence,
  formatDateOrdinal,
} = require('./scripts/recurring.js');

// ============================================================================
// Recurring event helpers
// ============================================================================
// nextOccurrence() and formatDateOrdinal() live in scripts/recurring.js
// (canonical, unit-tested). The browser bundle in src/assets/js/main.js
// imports the same module; esbuild bundles it for deployment.

module.exports = function(eleventyConfig) {
  // Passthrough copy for deployment metadata and event flyer images.
  // Browser JS/CSS are built into _site/assets/ by scripts/build-assets.js
  // (esbuild), not passthrough-copied.
  eleventyConfig.addPassthroughCopy('CNAME');
  eleventyConfig.addPassthroughCopy('_redirects');
  eleventyConfig.addPassthroughCopy('images');

  // Long date format for single events: "Wednesday, September 2, 2026"
  eleventyConfig.addFilter('formatDate', (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Short ordinal format for recurring next-date: "September 2nd".
  // Adds ", YYYY" only when the occurrence year differs from the reference
  // year (defaults to the build year) so cross-year dates stay unambiguous.
  // Delegates to the canonical helper in scripts/recurring.js.
  eleventyConfig.addFilter('formatDateOrdinal', (dateStr, refYear) => {
    return formatDateOrdinal(dateStr, refYear);
  });

  // JSON for HTML attributes (single-quoted); escapes &, <, ' only
  eleventyConfig.addFilter('jsonAttr', (obj) => {
    return JSON.stringify(obj)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/'/g, '&#39;');
  });

  // Replace whitespace filter for CSS classes
  eleventyConfig.addFilter('className', (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\s+/g, '-');
  });

  // Distinct event types present in the events data, in first-appearance
  // order. The homepage renders one filter button per type — e.g. a Showcase
  // button only appears when a showcase event actually exists.
  eleventyConfig.addFilter('eventTypes', (events) => {
    const seen = [];
    for (const event of events || []) {
      const type = String(event.eventType || '').trim();
      if (type && !seen.includes(type)) seen.push(type);
    }
    return seen;
  });

  // Read and process events data
  eleventyConfig.addGlobalData('events', () => {
    const eventsPath = './events.json';

    if (!fs.existsSync(eventsPath)) {
      throw new Error(`events.json not found at ${eventsPath}`);
    }

    let events;
    try {
      events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    } catch (e) {
      throw new Error(`Failed to parse events.json: ${e.message}`);
    }

    validateEvents(events);

    const now = new Date();
    const todayStr =
      now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    const refYear = now.getFullYear();

    // Compute an effective sort date for each event:
    //  - single events: their `date`
    //  - recurring events: the next occurrence on/after today (build time)
    // Recurring events are always upcoming (they always have a next date),
    // so they always survive the filter. Single events drop off once past.
    return events
      .map(event => {
        if (event.recurring) {
          const next = nextOccurrence(event.recurring, now);
          return { ...event, _nextDate: next, _sortDate: next, _refYear: refYear };
        }
        return { ...event, _sortDate: event.date, _refYear: refYear };
      })
      .filter(event => event._sortDate && event._sortDate >= todayStr)
      .sort((a, b) => String(a._sortDate).localeCompare(String(b._sortDate)));
  });

  // Build timestamp for cache-busting
  eleventyConfig.addGlobalData('buildTime', () => Date.now());

  // Site metadata lives in src/_data/site.json (data cascade exposes it as
  // `site` to every template).

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

/**
 * Validates event data structure and content.
 * Each event must have exactly one of `date` (YYYY-MM-DD) or `recurring`
 * ({label, week, weekday}).
 * @param {Array} events - Array of event objects to validate
 * @throws {Error} If validation fails with descriptive message
 */
function validateEvents(events) {
  if (!Array.isArray(events)) {
    throw new Error('events.json must contain an array of events');
  }

  const required = ['title', 'eventType', 'location', 'performanceTime', 'eventbriteLink'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  events.forEach((event, index) => {
    const label = event.title || 'untitled';

    // Required common fields
    for (const field of required) {
      if (!event[field]) {
        throw new Error(`Event at index ${index} "${label}" is missing required field: ${field}`);
      }
      if (typeof event[field] === 'string' && !event[field].trim()) {
        throw new Error(`Event at index ${index} "${label}" has empty required field: ${field}`);
      }
    }

    // Must have exactly one of date / recurring
    const hasDate = Object.prototype.hasOwnProperty.call(event, 'date') && event.date != null;
    const hasRecurring = Object.prototype.hasOwnProperty.call(event, 'recurring') && event.recurring != null;
    if (hasDate === hasRecurring) {
      throw new Error(
        `Event at index ${index} "${label}" must have exactly one of "date" or "recurring"`,
      );
    }

    if (hasDate) {
      if (!dateRegex.test(event.date)) {
        throw new Error(`Event "${label}" has invalid date format: ${event.date} (expected YYYY-MM-DD)`);
      }
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) {
        throw new Error(`Event "${label}" has invalid date: ${event.date}`);
      }
    }

    if (hasRecurring) {
      const r = event.recurring;
      if (!r || typeof r !== 'object' || Array.isArray(r)) {
        throw new Error(`Event "${label}" has invalid "recurring" (expected an object)`);
      }
      if (typeof r.label !== 'string' || !r.label.trim()) {
        throw new Error(`Event "${label}" has invalid recurring.label (expected non-empty string)`);
      }
      if (!Number.isInteger(r.week) || !(r.week === -1 || (r.week >= 1 && r.week <= 5))) {
        throw new Error(`Event "${label}" has invalid recurring.week (expected -1 or 1-5)`);
      }
      if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) {
        throw new Error(`Event "${label}" has invalid recurring.weekday (expected 0-6, 0=Sunday)`);
      }
    }

    // Optional flyer image (path within /images/) + alt text
    if (Object.prototype.hasOwnProperty.call(event, 'image') && event.image != null) {
      if (typeof event.image !== 'string' || !event.image.trim()) {
        throw new Error(`Event "${label}" has invalid "image" (expected non-empty path string)`);
      }
    }
    if (Object.prototype.hasOwnProperty.call(event, 'imageAlt') && event.imageAlt != null) {
      if (typeof event.imageAlt !== 'string') {
        throw new Error(`Event "${label}" has invalid "imageAlt" (expected a string)`);
      }
    }
  });
}
