/**
 * Post-build checks so Cloudflare (and local) deploys fail if the site
 * would show the legacy "Loading events..." shell, an empty broken homepage,
 * or missing pages/assets (about, esbuild bundles + fonts, SEO surfaces).
 */
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(process.cwd(), '_site');
const INDEX = path.join(SITE_DIR, 'index.html');
const RULES = path.join(SITE_DIR, 'rules', 'index.html');
const ABOUT = path.join(SITE_DIR, 'about', 'index.html');
const MAIN_JS = path.join(SITE_DIR, 'assets', 'main.js');
const MAIN_CSS = path.join(SITE_DIR, 'assets', 'main.css');
const SITEMAP = path.join(SITE_DIR, 'sitemap.xml');
const ROBOTS = path.join(SITE_DIR, 'robots.txt');
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

const hasEventCards = /class=["'][^"']*\bevent-card\b[^"']*["']/.test(indexHtml);
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

if (!fs.existsSync(ABOUT)) {
  fail('Missing _site/about/index.html.');
}

if (!fs.existsSync(MAIN_JS) || fs.statSync(MAIN_JS).size === 0) {
  fail('Missing or empty _site/assets/main.js. The esbuild asset step did not run (npm run build wires it before Eleventy).');
}

if (!fs.existsSync(MAIN_CSS) || fs.statSync(MAIN_CSS).size === 0) {
  fail('Missing or empty _site/assets/main.css. The esbuild asset step did not run (npm run build wires it before Eleventy).');
}

// The stylesheet references self-hosted fonts; at least one must have shipped.
const mainCssContent = fs.readFileSync(MAIN_CSS, 'utf8');
const fontMatch = mainCssContent.match(/url\("\.?\/?(fonts\/[^"]+\.woff2)"\)/);
if (fontMatch && !fs.existsSync(path.join(SITE_DIR, 'assets', fontMatch[1]))) {
  fail(`main.css references font "${fontMatch[1]}" but it was not emitted to _site/assets/.`);
}

if (!fs.existsSync(SITEMAP)) {
  fail('Missing _site/sitemap.xml.');
}

if (!fs.existsSync(ROBOTS)) {
  fail('Missing _site/robots.txt.');
}

// Event pages advertise themselves with structured data.
if (hasEventCards && !indexHtml.includes('application/ld+json')) {
  fail('Homepage has event cards but no Event JSON-LD script.');
}

// When events.json has upcoming events (single or recurring), the homepage
// should list at least one. Recurring events are always upcoming (they have
// a next occurrence), so they count even without a `date` field.
const eventsPath = path.join(process.cwd(), 'events.json');
if (fs.existsSync(eventsPath)) {
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  const now = new Date();
  const todayStr =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  const isUpcoming = (e) => {
    if (e.recurring) return true;
    return typeof e.date === 'string' && e.date >= todayStr;
  };
  const upcomingCount = events.filter(isUpcoming).length;

  if (upcomingCount > 0 && !hasEventCards) {
    fail(
      `events.json has ${upcomingCount} upcoming event(s) but the built homepage has no event cards. ` +
        'Check the build date filter and templates.'
    );
  }
}

console.log('[validate-build] OK — pages, assets, and SEO surfaces all present.');
