/**
 * Unit tests for the recurring-event helpers.
 *
 * Runs on Node (no test framework) via:  node scripts/test-recurring.js
 * Exits non-zero on any failure. Added to `npm test` in package.json.
 *
 * Covers:
 *   - Rollover boundary (11:59 PM event day -> event day; 12:01 AM next day -> next month)
 *   - Nth weekday selection (1st Wednesday, 2nd, etc.)
 *   - Last weekday of month (week = -1)
 *   - 5th weekday that doesn't exist in a month is skipped to next month
 *   - Cross-year rollover (December -> January)
 *   - ordinal() special cases (11th/12th/13th, 21st/22nd/23rd)
 *   - formatDateOrdinal() year-suffix behaviour
 *   - Parity: the inline copy of nextOccurrence() in script.js behaves
 *     identically to the canonical copy in scripts/recurring.js.
 */
const fs = require('fs');
const path = require('path');
const {
  nthWeekdayOfMonth,
  nextOccurrence,
  ordinal,
  formatDateOrdinal,
} = require('./recurring.js');

let passed = 0;
let failed = 0;

function eq(actual, expected, label) {
  const ok = actual === expected;
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        actual:   ${JSON.stringify(actual)}`);
  }
}

function withDate(iso, fn) {
  // Build a local-midnight Date from YYYY-MM-DD so the test does not depend
  // on the host timezone offset shifting the calendar day.
  const [y, m, d] = iso.split('-').map(Number);
  return fn(new Date(y, m - 1, d, 23, 59, 0));
}

// 1st Wednesday of the month: week=1, weekday=3 (Sun=0)
const firstWed = { label: '1st Wednesday of the month', week: 1, weekday: 3 };

console.log('Rollover boundary (1st Wednesday, Sept 2 2026 is the occurrence)');

// 11:59 PM on the event day -> still shows that day
withDate('2026-09-02', (now) =>
  eq(nextOccurrence(firstWed, now), '2026-09-02', '11:59 PM on event day shows event day'),
);
// 12:01 AM the next day -> next month's 1st Wednesday (Oct 7 2026)
withDate('2026-09-03', (now) =>
  eq(nextOccurrence(firstWed, now), '2026-10-07', 'day after event rolls to next month'),
);
// Day before the event -> this month's occurrence
withDate('2026-09-01', (now) =>
  eq(nextOccurrence(firstWed, now), '2026-09-02', 'day before event shows this month'),
);
// A month earlier -> September's occurrence
withDate('2026-08-18', (now) =>
  eq(nextOccurrence(firstWed, now), '2026-09-02', 'mid-August shows September occurrence'),
);
// Earlier in the same year (January) -> February's 1st Wednesday (Feb 4 2026)
withDate('2026-01-15', (now) =>
  eq(nextOccurrence(firstWed, now), '2026-02-04', 'January shows February 1st Wednesday'),
);

console.log('Cross-year rollover (December -> January)');

// 1st Wednesday of December 2026 is Dec 2 (Dec 1 is a Tuesday).
withDate('2026-12-02', (now) =>
  eq(nextOccurrence(firstWed, now), '2026-12-02', '1st Wed of Dec shown on the day'),
);
withDate('2026-12-03', (now) =>
  eq(nextOccurrence(firstWed, now), '2027-01-06', 'day after Dec 1st Wed -> Jan 2027 1st Wed'),
);
withDate('2026-12-04', (now) =>
  eq(nextOccurrence(firstWed, now), '2027-01-06', 'after Dec 1st Wed -> Jan 2027 1st Wed'),
);

console.log('Last weekday of month (week = -1)');

// Last Friday of September 2026: Sept 25 (Sept has 30 days; 30th is Wed).
//   Sept 30 = Wed, 29 = Tue, 28 = Mon, 27 = Sun, 26 = Sat, 25 = Fri. Yes.
const lastFri = { label: 'last Friday', week: -1, weekday: 5 };
withDate('2026-09-01', (now) =>
  eq(nextOccurrence(lastFri, now), '2026-09-25', 'last Friday of Sept 2026 is Sept 25'),
);
withDate('2026-09-26', (now) =>
  eq(nextOccurrence(lastFri, now), '2026-10-30', 'after Sept last Friday -> October last Friday'),
);

console.log('5th weekday that a month does not have is skipped');

// September 2026 has 5 Wednesdays (2, 9, 16, 23, 30) -> 5th Wed is Sept 30.
const fifthWed = { label: '5th Wednesday', week: 5, weekday: 3 };
withDate('2026-09-01', (now) =>
  eq(nextOccurrence(fifthWed, now), '2026-09-30', '5th Wednesday of Sept 2026 is Sept 30'),
);
// October 2026 has only 4 Wednesdays (7, 14, 21, 28) and November has 4
// (4, 11, 18, 25), so from Oct 1 the next 5th Wednesday is Dec 30 2026.
withDate('2026-10-01', (now) =>
  eq(nextOccurrence(fifthWed, now), '2026-12-30', '5th Wednesday skips months without one -> Dec 30'),
);

console.log('nthWeekdayOfMonth direct checks');
eq(nthWeekdayOfMonth(2026, 8, 1, 3), 2, '1st Wednesday of Sept 2026 = day 2');      // month 8 = Sept
eq(nthWeekdayOfMonth(2026, 8, 2, 3), 9, '2nd Wednesday of Sept 2026 = day 9');
eq(nthWeekdayOfMonth(2026, 8, -1, 5), 25, 'last Friday of Sept 2026 = day 25');
eq(nthWeekdayOfMonth(2026, 8, 5, 3), 30, '5th Wednesday of Sept 2026 = day 30 (Sept has 5 Wednesdays)');

console.log('ordinal() special cases');
eq(ordinal(1), '1st', '1st');
eq(ordinal(2), '2nd', '2nd');
eq(ordinal(3), '3rd', '3rd');
eq(ordinal(4), '4th', '4th');
eq(ordinal(11), '11th', '11th (teen exception)');
eq(ordinal(12), '12th', '12th (teen exception)');
eq(ordinal(13), '13th', '13th (teen exception)');
eq(ordinal(21), '21st', '21st');
eq(ordinal(22), '22nd', '22nd');
eq(ordinal(23), '23rd', '23rd');
eq(ordinal(111), '111th', '111th (teen exception across hundreds)');
eq(ordinal(121), '121st', '121st');

console.log('formatDateOrdinal() year-suffix behaviour');
eq(formatDateOrdinal('2026-09-02', 2026), 'September 2nd', 'same year: no year suffix');
eq(formatDateOrdinal('2027-01-06', 2026), 'January 6th, 2027', 'cross-year: year suffix added');
// No refYear defaults to the current year. Make the assertion robust to
// whenever the test runs: same year as today -> no suffix, else -> suffix.
(function () {
  const thisYear = new Date().getFullYear();
  const got = formatDateOrdinal('2026-09-02');
  const expect = (2026 === thisYear) ? 'September 2nd' : 'September 2nd, 2026';
  eq(got, expect, 'no refYear defaults to current year (' + thisYear + ')');
})();

console.log('Parity: script.js inline copy == canonical module');

// Extract the body of nextOccurrence() from script.js by brace-matching, then
// eval it in a sandbox along with nthWeekdayOfMonth (which it calls). Run the
// same boundary cases and compare to the canonical module.
(function parityCheck() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

  function extractFunction(name) {
    const startIdx = src.indexOf('function ' + name + '(');
    if (startIdx === -1) throw new Error('function ' + name + ' not found in script.js');
    let i = src.indexOf('{', startIdx);
    if (i === -1) throw new Error('no opening brace for ' + name);
    let depth = 0;
    const from = i;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) throw new Error('unbalanced braces for ' + name);
    return src.slice(startIdx, i + 1);
  }

  const sandbox = {};
  const code =
    extractFunction('nthWeekdayOfMonth') + '\n' +
    extractFunction('nextOccurrence') + '\n' +
    'this.nthWeekdayOfMonth = nthWeekdayOfMonth;\n' +
    'this.nextOccurrence = nextOccurrence;\n';
  // eslint-disable-next-line no-new-func
  new Function(code).call(sandbox);

  const cases = [
    { from: '2026-09-02', expect: '2026-09-02' },
    { from: '2026-09-03', expect: '2026-10-07' },
    { from: '2026-09-01', expect: '2026-09-02' },
    { from: '2026-08-18', expect: '2026-09-02' },
    { from: '2026-12-04', expect: '2027-01-06' },
  ];
  for (const c of cases) {
    withDate(c.from, (now) => {
      const got = sandbox.nextOccurrence(firstWed, now);
      eq(got, c.expect, 'script.js nextOccurrence(' + c.from + ') == ' + c.expect);
      // And directly compare against the canonical module's output.
      eq(got, nextOccurrence(firstWed, now), 'script.js == canonical for ' + c.from);
    });
  }
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
