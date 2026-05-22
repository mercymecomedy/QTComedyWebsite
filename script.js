/**
 * QTs & Cuties Website - Client-side JavaScript
 * 
 * This file contains only:
 * 1. Event filtering functionality
 * 2. Calendar integration (ICS download / Google Calendar redirect)
 * 
 * Event data is now pre-rendered as static HTML by Eleventy at build time.
 */

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
  const [y, m, d] = event.date.split('-').map(Number);
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
  const uid = 'qt-' + event.date + '-' + startStr + '@qtcomedy';

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

  // On mobile: send to Google Calendar instead of downloading a file
  if (isMobile) {
    const [y, m, d] = (event.date || '').split('-').map(Number);
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
  const datePart = event.date ? `-${event.date}` : '';
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
