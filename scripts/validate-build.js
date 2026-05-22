/**
 * Post-build checks so Cloudflare (and local) deploys fail if the site
 * would show the legacy "Loading events..." shell or an empty broken homepage.
 */
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(process.cwd(), '_site');
const INDEX = path.join(SITE_DIR, 'index.html');
const RULES = path.join(SITE_DIR, 'rules', 'index.html');
const LEGACY_LOADING = 'Loading events';

function fail(message) {
  console.error(`[validate-build] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(SITE_DIR)) {
  fail('Missing _site/ directory. Run eleventy first.');
}

if (!fs.existsSync(INDEX)) {
  fail('Missing _site/index.html. Check Eleventy output directory is _site.');
}

const indexHtml = fs.readFileSync(INDEX, 'utf8');

if (indexHtml.includes(LEGACY_LOADING)) {
  fail(
    'Built index.html contains legacy "Loading events..." markup. ' +
      'Cloudflare may be publishing the repo root instead of _site, or the wrong index was built.'
  );
}

const hasEventCards = indexHtml.includes('class="event-card"');
const hasEmptyState = indexHtml.includes('class="no-events"');

if (!hasEventCards && !hasEmptyState) {
  fail(
    'Built index.html has no event cards and no "no-events" empty state. ' +
      'The homepage layout or events data did not render.'
  );
}

if (!fs.existsSync(RULES)) {
  fail('Missing _site/rules/index.html.');
}

const rulesHtml = fs.readFileSync(RULES, 'utf8');
if (rulesHtml.includes(LEGACY_LOADING)) {
  fail('Built rules page still contains legacy loading markup.');
}

// When events.json has future-dated events, the homepage should list at least one
const eventsPath = path.join(process.cwd(), 'events.json');
if (fs.existsSync(eventsPath)) {
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  const upcoming = events.filter((e) => e.date >= todayStr);

  if (upcoming.length > 0 && !hasEventCards) {
    fail(
      `events.json has ${upcoming.length} upcoming event(s) but the built homepage has no event cards. ` +
        'Check the build date filter and templates.'
    );
  }
}

console.log('[validate-build] OK — homepage and rules built correctly.');
