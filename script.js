// Store all events globally for filtering
let allEvents = [];
let currentFilter = 'all';

// Fetch and display events from events.json
async function loadEvents() {
  const container = document.getElementById("events-container");
  const filtersContainer = document.getElementById("event-filters");

  try {
    console.log("Attempting to fetch events.json...");
    const response = await fetch("events.json");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const events = await response.json();
    console.log("Events loaded:", events);

    // Store events globally
    allEvents = events;

    // Sort events by date (earliest first)
    // We filter for events that have a valid date string before sorting
    allEvents = allEvents
      .filter((event) => event.date)
      .sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });

    // Create filter buttons
    createFilterButtons(filtersContainer);

    // Display events with current filter
    displayFilteredEvents();
  } catch (error) {
    console.error("Error loading events:", error);
    container.innerHTML = `
            <div class="error">
                <p><strong>Unable to load events.</strong></p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">Error: ${error.message}</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">This might be a CORS issue. Try running a local server instead of opening the file directly.</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">You can run: <code>python -m http.server</code> or <code>npx serve</code></p>
            </div>
        `;
  }
}

// Create filter buttons based on available event types
function createFilterButtons(container) {
  // Get unique event types from valid events
  const eventTypes = [
    ...new Set(allEvents.map((event) => event.eventType).filter(Boolean)),
  ];

  // Clear container first
  container.innerHTML = "";

  // Create "All" button
  const allButton = document.createElement("button");
  allButton.className = "filter-btn active";
  allButton.textContent = "All";
  allButton.dataset.filter = "all";
  allButton.addEventListener("click", () => filterEvents("all"));
  container.appendChild(allButton);

  // Create buttons for each event type
  eventTypes.forEach((type) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.textContent = type;
    button.dataset.filter = type.toLowerCase().replace(/\s+/g, "-");
    button.addEventListener("click", () => filterEvents(type));
    container.appendChild(button);
  });
}

// Filter events by type
function filterEvents(filterType) {
  currentFilter = filterType;

  // Update active button
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((btn) => {
    const btnFilter = btn.dataset.filter;
    const normalizedFilter = filterType.toLowerCase().replace(/\s+/g, "-");

    if (
      (filterType === "all" && btnFilter === "all") ||
      (filterType !== "all" && btnFilter === normalizedFilter)
    ) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Display filtered events
  displayFilteredEvents();
}

// Display events based on current filter
function displayFilteredEvents() {
  const container = document.getElementById("events-container");

  // Step 1: Filter out "commented out" items that lack a title or date
  let filteredEvents = allEvents.filter((event) => event.title && event.date);

  // Step 2: Apply category filter
  if (currentFilter !== "all") {
    filteredEvents = filteredEvents.filter(
      (event) => event.eventType === currentFilter,
    );
  }

  if (filteredEvents.length === 0) {
    container.innerHTML =
      '<div class="no-events">No events found for this filter.</div>';
    return;
  }

  // Format and display events
  container.innerHTML = filteredEvents
    .map((event) => createEventCard(event))
    .join("");
}

// Parse time string like "6:00 PM" or "5:30 PM" to { hours, minutes } in 24h
function parseTimeString(timeStr) {
  if (!timeStr) return { hours: 18, minutes: 0 };
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 18, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (match[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

// Build ICS file content for an event (works on iPhone & Android)
function buildIcsContent(event) {
  const [y, m, d] = event.date.split("-").map(Number);
  const { hours, minutes } = parseTimeString(event.performanceTime || "6:00 PM");
  const startStr = [y, String(m).padStart(2, "0"), String(d).padStart(2, "0")].join("") +
    "T" + [String(hours).padStart(2, "0"), String(minutes).padStart(2, "0"), "00"].join("");
  const startDate = new Date(y, m - 1, d, hours, minutes, 0);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const endStr = endDate.getFullYear() +
    String(endDate.getMonth() + 1).padStart(2, "0") +
    String(endDate.getDate()).padStart(2, "0") +
    "T" + String(endDate.getHours()).padStart(2, "0") +
    String(endDate.getMinutes()).padStart(2, "0") + "00";

  const title = (event.title || "Comedy Event").replace(/\r?\n/g, " ").replace(/,/g, "\\,");
  const location = (event.location || "").replace(/\r?\n/g, " ").replace(/,/g, "\\,");
  const desc = (event.eventType ? event.eventType + ". " : "") + (event.signupTime ? "Signup: " + event.signupTime + ". " : "") + "Show: " + (event.performanceTime || "");
  const uid = "qt-" + event.date + "-" + startStr + "@qtcomedy";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QT Comedy//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + uid,
    "DTSTART;TZID=America/Denver:" + startStr,
    "DTEND;TZID=America/Denver:" + endStr,
    "SUMMARY:" + title,
    "DESCRIPTION:" + desc.replace(/,/g, "\\,").replace(/;/g, "\\;"),
    "LOCATION:" + location,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return ics;
}

// Trigger download of ICS file for "Add to calendar"
function downloadIcs(eventJson) {
  const event = typeof eventJson === "string" ? JSON.parse(eventJson) : eventJson;
  const ics = buildIcsContent(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const raw = (event.title || "event").trim();
  const slug = raw
    .replace(/[^a-zA-Z0-9\s]/g, "")   // remove punctuation/symbols (not spaces)
    .replace(/\s+/g, "-")             // spaces to single hyphen
    .replace(/-+/g, "-")              // collapse multiple hyphens
    .replace(/^-+|-+$/g, "")         // trim hyphens
    .slice(0, 40) || "event";
  const datePart = event.date ? `-${event.date}` : "";
  a.download = `${slug}${datePart}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  // Only show toast on desktop (file downloaded to disk); skip on mobile (often opens calendar app)
  if (window.innerWidth >= 769) {
    const existing = document.querySelector(".calendar-download-hint");
    if (existing) existing.remove();
    const hint = document.createElement("span");
    hint.className = "calendar-download-hint";
    hint.textContent = "Calendar file downloaded — open it to add to your calendar.";
    hint.setAttribute("aria-live", "polite");
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 4000);
  }
}

// Create HTML for a single event card
function createEventCard(event) {
  // Format the date nicely
  const [y, m, d] = event.date.split("-").map(Number);
  const eventDate = new Date(y, m - 1, d); // local midnight
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format event type for CSS class
  const eventTypeClass = event.eventType
    ? event.eventType.toLowerCase().replace(/\s+/g, "-")
    : "default";

  // Build event links HTML (Add to calendar last)
  const eventDataAttr = encodeURIComponent(JSON.stringify(event));
  let linksHTML = "";
  if (event.eventbriteLink) {
    linksHTML += `<a href="${event.eventbriteLink}" target="_blank" rel="noopener noreferrer" class="event-link eventbrite">Eventbrite</a>`;
  }
  if (event.facebookLink) {
    linksHTML += `<a href="${event.facebookLink}" target="_blank" rel="noopener noreferrer" class="event-link facebook">Facebook</a>`;
  }
  linksHTML += `<a href="#" class="event-link calendar add-to-calendar" data-event="${eventDataAttr}" aria-label="Add to calendar">Add to calendar</a>`;

  // Build time display
  let timeHTML = "";
  if (event.signupTime && event.signupTime !== null) {
    timeHTML = `
            <div class="event-detail-item event-time">
                <strong>Signup:</strong>
                <span>${event.signupTime}</span>
                <span class="time-separator">•</span>
                <strong>Show:</strong>
                <span>${event.performanceTime}</span>
            </div>
        `;
  } else {
    timeHTML = `
            <div class="event-detail-item event-time">
                <strong>Show:</strong>
                <span>${event.performanceTime}</span>
            </div>
        `;
  }

  return `
        <div class="event-card">
            <div class="event-title">${event.title || "Comedy Event"}</div>
            <div class="event-date">${formattedDate}</div>
            <div class="event-type ${eventTypeClass}">${
    event.eventType || ""
  }</div>
            <div class="event-details">
                ${timeHTML}
                <div class="event-detail-item">
                    <strong>Location:</strong>
                    <span>${event.location || "TBA"}</span>
                </div>
            </div>
            ${linksHTML ? `<div class="event-links">${linksHTML}</div>` : ""}
        </div>
    `;
}

// Add to calendar button click (delegated)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-to-calendar");
  if (!btn) return;
  e.preventDefault();
  const data = btn.getAttribute("data-event");
  if (data) downloadIcs(decodeURIComponent(data));
});

// Load events when the page loads
document.addEventListener("DOMContentLoaded", loadEvents);