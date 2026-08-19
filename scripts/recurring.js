/**
 * Recurring event helpers — canonical, framework-free pure functions.
 *
 * Used by:
 *   - eleventy.config.js  (Node, at build time) via require()
 *   - scripts/test-recurring.js (unit tests)
 *
 * script.js (browser) keeps an inline copy because this project has no JS
 * bundler. scripts/test-recurring.js asserts the two copies behave
 * identically so they cannot silently drift.
 */

/**
 * Day of the Nth (or last) weekday in a given month.
 * @param {number} year  Full year (e.g. 2026)
 * @param {number} month 0-11
 * @param {number} week  1-5 for "Nth", -1 for "last"
 * @param {number} weekday 0-6 (0 = Sunday)
 * @returns {number} day-of-month (may exceed the month's length for week 5)
 */
function nthWeekdayOfMonth(year, month, week, weekday) {
  if (week === -1) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    let d = lastDay;
    while (new Date(year, month, d).getDay() !== weekday) d--;
    return d;
  }
  const firstWeekday = new Date(year, month, 1).getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return 1 + offset + (week - 1) * 7;
}

/**
 * First occurrence of a recurring spec on or after `fromDate` (local calendar
 * date compared as YYYY-MM-DD strings). Returns YYYY-MM-DD or null if none
 * within the next 24 months (should not happen for valid monthly rules).
 *
 * Rollover rule: 11:59 PM on the event day -> fromDate is still that day, so
 * the event shows today. 12:01 AM the next day -> fromDate rolls forward and
 * the event jumps to next month's occurrence.
 * @param {{week:number,weekday:number}} recurring
 * @param {Date} fromDate
 * @returns {string|null}
 */
function nextOccurrence(recurring, fromDate) {
  const { week, weekday } = recurring;
  const todayStr =
    fromDate.getFullYear() + '-' +
    String(fromDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(fromDate.getDate()).padStart(2, '0');

  let y = fromDate.getFullYear();
  let m = fromDate.getMonth();

  for (let i = 0; i < 24; i++) {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const day = nthWeekdayOfMonth(y, m, week, weekday);
    if (day <= daysInMonth) {
      const cand =
        y + '-' +
        String(m + 1).padStart(2, '0') + '-' +
        String(day).padStart(2, '0');
      if (cand >= todayStr) return cand;
    }
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return null;
}

/**
 * Ordinal suffix for a number: 1st, 2nd, 3rd, 11th, 21st, etc.
 * @param {number} n
 * @returns {string}
 */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Short ordinal format: "September 2nd". Adds ", YYYY" when the occurrence
 * year differs from refYear (defaults to this year) so cross-year dates stay
 * unambiguous.
 * @param {string} dateStr YYYY-MM-DD
 * @param {number} [refYear]
 * @returns {string}
 */
function formatDateOrdinal(dateStr, refYear) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const base = `${monthName} ${ordinal(d)}`;
  const ref = (typeof refYear === 'number') ? refYear : new Date().getFullYear();
  return y === ref ? base : `${base}, ${y}`;
}

module.exports = {
  nthWeekdayOfMonth,
  nextOccurrence,
  ordinal,
  formatDateOrdinal,
};
