// Store all events globally for filtering
let allEvents = [];
let currentFilter = 'all';

// Fetch and display events from events.json
async function loadEvents() {
    const container = document.getElementById('events-container');
    const filtersContainer = document.getElementById('event-filters');
    
    try {
        console.log('Attempting to fetch events.json...');
        const response = await fetch('events.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        console.log('Events loaded:', events);
        console.log('Total events:', events.length);
        
        // TEMPORARY: Show all events for debugging (remove date filter)
        // Filter out past events (optional - remove if you want to show all events)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Today:', today);
        
        // For now, show ALL events regardless of date to debug
        let upcomingEvents = events;
        
        // Uncomment below to re-enable date filtering:
        /*
        const upcomingEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            const isUpcoming = eventDate >= today;
            console.log(`Event ${event.date}: ${eventDate} >= ${today} = ${isUpcoming}`);
            return isUpcoming;
        });
        */
        
        // Store events globally
        allEvents = upcomingEvents;
        
        // Sort events by date (earliest first)
        allEvents.sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        // Create filter buttons
        createFilterButtons(filtersContainer);
        
        // Display events with current filter
        displayFilteredEvents();
        
    } catch (error) {
        console.error('Error loading events:', error);
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
    // Get unique event types
    const eventTypes = [...new Set(allEvents.map(event => event.eventType))];
    
    // Create "All" button
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.textContent = 'All';
    allButton.dataset.filter = 'all';
    allButton.addEventListener('click', () => filterEvents('all'));
    container.appendChild(allButton);
    
    // Create buttons for each event type
    eventTypes.forEach(type => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = type;
        button.dataset.filter = type.toLowerCase().replace(/\s+/g, '-');
        button.addEventListener('click', () => filterEvents(type));
        container.appendChild(button);
    });
}

// Filter events by type
function filterEvents(filterType) {
    currentFilter = filterType;
    
    // Update active button
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        const btnFilter = btn.dataset.filter;
        const normalizedFilter = filterType.toLowerCase().replace(/\s+/g, '-');
        
        if ((filterType === 'all' && btnFilter === 'all') || 
            (filterType !== 'all' && btnFilter === normalizedFilter)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Display filtered events
    displayFilteredEvents();
}

// Display events based on current filter
function displayFilteredEvents() {
    const container = document.getElementById('events-container');
    
    let filteredEvents = allEvents;
    
    if (currentFilter !== 'all') {
        filteredEvents = allEvents.filter(event => event.eventType === currentFilter);
    }
    
    if (filteredEvents.length === 0) {
        container.innerHTML = '<div class="no-events">No events found for this filter.</div>';
        return;
    }
    
    // Format and display events
    container.innerHTML = filteredEvents.map(event => createEventCard(event)).join('');
}

// Create HTML for a single event card
function createEventCard(event) {
    // Format the date nicely
    // const eventDate = new Date(event.date);
    const [y, m, d] = event.date.split('-').map(Number);
    const eventDate = new Date(y, m - 1, d);   // local midnight
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Format event type for CSS class
    const eventTypeClass = event.eventType.toLowerCase().replace(/\s+/g, '-');
    
    // Build event links HTML
    let linksHTML = '';
    if (event.eventbriteLink) {
        linksHTML += `<a href="${event.eventbriteLink}" target="_blank" rel="noopener noreferrer" class="event-link eventbrite">Eventbrite</a>`;
    }
    if (event.facebookLink) {
        linksHTML += `<a href="${event.facebookLink}" target="_blank" rel="noopener noreferrer" class="event-link facebook">Facebook Event</a>`;
    }
    
    // Build time display - signup and show on same line if signup exists
    let timeHTML = '';
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
            <div class="event-title">${event.title || 'Comedy Event'}</div>
            <div class="event-date">${formattedDate}</div>
            <div class="event-type ${eventTypeClass}">${event.eventType}</div>
            <div class="event-details">
                ${timeHTML}
                <div class="event-detail-item">
                    <strong>Location:</strong>
                    <span>${event.location}</span>
                </div>
            </div>
            ${linksHTML ? `<div class="event-links">${linksHTML}</div>` : ''}
        </div>
    `;
}

// Load events when the page loads
document.addEventListener('DOMContentLoaded', loadEvents);
