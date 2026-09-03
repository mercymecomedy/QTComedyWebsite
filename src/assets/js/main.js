/**
 * QTs & Cuties Website - Client-side JavaScript
 *
 * This file contains:
 * 1. Recurring event next-date computation in the visitor's browser timezone,
 *    plus card re-sorting so recurring events slot into chronological order.
 * 2. Event filtering functionality.
 * 3. Calendar integration (ICS download / Google Calendar redirect).
 *
 * Event data is pre-rendered as static HTML by Eleventy at build time. The
 * build also computes a fallback next date for recurring events using the
 * build server's clock; this script overrides that with the visitor's local
 * date so the rollover happens at the visitor's midnight, not the server's.
 *
 * nextOccurrence() is the browser copy of the canonical implementation in
 * scripts/recurring.js (which eleventy.config.js requires at build time).
 * scripts/test-recurring.js asserts the two copies behave identically, so
 * they cannot silently drift.
 */

// ============================================================================
// Recurring event helpers (duplicated in eleventy.config.js)
// ============================================================================

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
 * date compared as YYYY-MM-DD strings). Returns YYYY-MM-DD or null.
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

/**
 * Effective date for an event: its `date` if single, otherwise the next
 * occurrence computed from the visitor's now. Used by the calendar helpers
 * so recurring events export the correct month's ICS.
 * @param {Object} event
 * @returns {string|null} YYYY-MM-DD
 */
function effectiveEventDate(event) {
  if (event.date) return event.date;
  if (event.recurring) return nextOccurrence(event.recurring, new Date());
  return null;
}

// ============================================================================
// Recurring date rendering + card re-sort
// ============================================================================

/**
 * For each recurring event card, recompute the next occurrence in the
 * visitor's timezone, update the visible date text and data-sort-date, then
 * re-sort all cards chronologically by data-sort-date.
 */
function initRecurringDates() {
  const now = new Date();
  const refYear = now.getFullYear();
  const cards = document.querySelectorAll('.event-card[data-recurring]');

  cards.forEach(card => {
    const raw = card.getAttribute('data-recurring');
    if (!raw) return;
    let spec;
    try {
      spec = JSON.parse(raw);
    } catch (e) {
      return;
    }
    const next = nextOccurrence(spec, now);
    if (!next) return;

    card.setAttribute('data-sort-date', next);

    const dateEl = card.querySelector('.event-date--recurring');
    if (dateEl) {
      const nextSpan = dateEl.querySelector('.event-next-date');
      if (nextSpan) nextSpan.textContent = 'Next: ' + formatDateOrdinal(next, refYear);
    }

    // Keep the calendar button's event payload in sync with the rolled-over
    // date so ICS export matches what the visitor sees.
    const calBtn = card.querySelector('.add-to-calendar');
    if (calBtn) {
      const data = calBtn.getAttribute('data-event');
      if (data) {
        try {
          const evt = JSON.parse(data);
          evt._effectiveDate = next;
          calBtn.setAttribute('data-event', JSON.stringify(evt));
        } catch (e) { /* leave as-is */ }
      }
    }
  });

  resortCards();
}

/**
 * Re-sort event cards in the container by data-sort-date ascending. Non-card
 * children (e.g. the .no-events message) are left in place.
 */
function resortCards() {
  const container = document.getElementById('events-container');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll(':scope > .event-card'));
  if (cards.length < 2) return;

  cards.sort((a, b) => {
    const da = a.getAttribute('data-sort-date') || '';
    const db = b.getAttribute('data-sort-date') || '';
    return da.localeCompare(db);
  });

  // Re-append in sorted order. Appending an existing node moves it.
  cards.forEach(card => container.appendChild(card));
}

// ============================================================================
// Event Filtering
// ============================================================================

let currentFilter = 'all';

/**
 * Initialize filter buttons
 */
function initFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filterType = btn.dataset.filter;
      filterEvents(filterType);
    });
  });
}

/**
 * Filter events by type
 * @param {string} filterType - The filter to apply ('all', 'open-mic', 'showcase')
 */
function filterEvents(filterType) {
  currentFilter = filterType;

  // Update active button state
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.filter === filterType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show/hide event cards
  const eventCards = document.querySelectorAll('.event-card[data-event-type]');
  let visibleCount = 0;

  eventCards.forEach(card => {
    if (filterType === 'all' || card.dataset.eventType === filterType) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Show "no events" message if no matches
  const container = document.getElementById('events-container');
  const existingMessage = container.querySelector('.no-events-filter');

  if (visibleCount === 0 && filterType !== 'all') {
    if (!existingMessage) {
      const message = document.createElement('div');
      message.className = 'no-events no-events-filter';
      message.textContent = `No ${filterType === 'open-mic' ? 'Open Mic' : 'Showcase'} events found.`;
      container.appendChild(message);
    }
  } else if (existingMessage) {
    existingMessage.remove();
  }
}

// ============================================================================
// Calendar Integration
// ============================================================================

/**
 * Parse time string like "6:00 PM" to { hours, minutes } in 24h format
 * @param {string} timeStr - Time string in format "H:MM AM/PM"
 * @returns {{ hours: number, minutes: number }}
 */
function parseTimeString(timeStr) {
  if (!timeStr) return { hours: 18, minutes: 0 };
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 18, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Build ICS file content for an event
 * @param {Object} event - Event object with title, date, location, etc.
 * @returns {string} ICS file content
 */
function buildIcsContent(event) {
  const dateStr = event._effectiveDate || effectiveEventDate(event);
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const { hours, minutes } = parseTimeString(event.performanceTime || '6:00 PM');
  const startStr = [y, String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('') +
    'T' + [String(hours).padStart(2, '0'), String(minutes).padStart(2, '0'), '00'].join('');
  const startDate = new Date(y, m - 1, d, hours, minutes, 0);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const endStr = endDate.getFullYear() +
    String(endDate.getMonth() + 1).padStart(2, '0') +
    String(endDate.getDate()).padStart(2, '0') +
    'T' + String(endDate.getHours()).padStart(2, '0') +
    String(endDate.getMinutes()).padStart(2, '0') + '00';

  const title = (event.title || 'Comedy Event').replace(/\r?\n/g, ' ').replace(/,/g, '\\,');
  const location = (event.location || '').replace(/\r?\n/g, ' ').replace(/,/g, '\\,');
  const desc = (event.eventType ? event.eventType + '. ' : '') +
               (event.signupTime ? 'Signup: ' + event.signupTime + '. ' : '') +
               'Show: ' + (event.performanceTime || '');
  const uid = 'qt-' + dateStr + '-' + startStr + '@qtcomedy';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QT Comedy//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTART;TZID=America/Denver:' + startStr,
    'DTEND;TZID=America/Denver:' + endStr,
    'SUMMARY:' + title,
    'DESCRIPTION:' + desc.replace(/,/g, '\\,').replace(/;/g, '\\;'),
    'LOCATION:' + location,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return ics;
}

/**
 * Download ICS file or open Google Calendar (mobile)
 * @param {Object|string} eventJson - Event object or JSON string
 */
function downloadIcs(eventJson) {
  const event = typeof eventJson === 'string' ? JSON.parse(eventJson) : eventJson;
  const isMobile = window.innerWidth < 769;

  const dateStr = event._effectiveDate || effectiveEventDate(event);

  // On mobile: send to Google Calendar instead of downloading a file
  if (isMobile && dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) {
      const { hours, minutes } = parseTimeString(event.performanceTime || '6:00 PM');
      const start = new Date(y, m - 1, d, hours, minutes, 0);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      const fmt = (date) => {
        const yy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yy}${mm}${dd}T${hh}${min}00`;
      };

      const datesParam = `${fmt(start)}/${fmt(end)}`;
      const title = encodeURIComponent(event.title || 'Comedy Event');
      const details = encodeURIComponent(
        ((event.eventType ? event.eventType + '. ' : '') +
          (event.signupTime ? 'Signup: ' + event.signupTime + '. ' : '') +
          'Show: ' +
          (event.performanceTime || ''))
      );
      const location = encodeURIComponent(event.location || '');

      const gcalUrl =
        `https://www.google.com/calendar/render?action=TEMPLATE` +
        `&text=${title}` +
        `&dates=${datesParam}` +
        (location ? `&location=${location}` : '') +
        (details ? `&details=${details}` : '') +
        `&sf=true&output=xml`;

      window.open(gcalUrl, '_blank');
      return;
    }
  }

  // Desktop (or fallback): download ICS file
  const ics = buildIcsContent(event);
  if (!ics) return;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const raw = (event.title || 'event').trim();
  const slug =
    raw
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'event';
  const datePart = dateStr ? `-${dateStr}` : '';
  a.download = `${slug}${datePart}.ics`;
  a.click();
  URL.revokeObjectURL(url);

  // Show toast notification
  const existing = document.querySelector('.calendar-download-hint');
  if (existing) existing.remove();
  const hint = document.createElement('span');
  hint.className = 'calendar-download-hint';
  hint.textContent = 'Calendar file downloaded — open it to add to your calendar.';
  hint.setAttribute('aria-live', 'polite');
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 4000);
}

// ============================================================================
// Event Listeners
// ============================================================================

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initRecurringDates();
  initFilters();
});

// Delegated click handler for calendar buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-calendar');
  if (!btn) return;
  e.preventDefault();
  const data = btn.getAttribute('data-event');
  if (data) {
    downloadIcs(data);
  }
});
