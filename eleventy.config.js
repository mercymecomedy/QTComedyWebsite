const fs = require('fs');

module.exports = function(eleventyConfig) {
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy('styles.css');
  eleventyConfig.addPassthroughCopy('CNAME');
  eleventyConfig.addPassthroughCopy('_redirects');
  
  // Date formatting filter
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
  
  // JSON stringify filter for event data attributes
  eleventyConfig.addFilter('json', (obj) => {
    return JSON.stringify(obj);
  });
  
  // Replace whitespace filter for CSS classes
  eleventyConfig.addFilter('className', (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\s+/g, '-');
  });
  
  // HTML escape filter for safe attribute embedding
  eleventyConfig.addFilter('escape', (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  });
  
  // Read and process events data
  eleventyConfig.addGlobalData('events', () => {
    const eventsPath = './events.json';
    
    // Check if events.json exists
    if (!fs.existsSync(eventsPath)) {
      throw new Error(`events.json not found at ${eventsPath}`);
    }
    
    let events;
    try {
      events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    } catch (e) {
      throw new Error(`Failed to parse events.json: ${e.message}`);
    }
    
    // Validate events
    validateEvents(events);
    
    // Filter and sort events
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    return events
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
  });
  
  // Build timestamp for cache-busting
  eleventyConfig.addGlobalData('buildTime', () => Date.now());
  
  // Site metadata
  eleventyConfig.addGlobalData('site', {
    title: 'QTs & Cuties: A Comedy Community',
    email: 'mercymecomedy@gmail.com',
    instagram: 'https://instagram.com/mercymecomedy'
  });
  
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
 * Validates event data structure and content
 * @param {Array} events - Array of event objects to validate
 * @throws {Error} If validation fails with descriptive message
 */
function validateEvents(events) {
  if (!Array.isArray(events)) {
    throw new Error('events.json must contain an array of events');
  }
  
  const required = ['title', 'date', 'eventType', 'location', 'performanceTime', 'eventbriteLink'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  events.forEach((event, index) => {
    // Check required fields
    for (const field of required) {
      if (!event[field]) {
        throw new Error(`Event at index ${index} "${event.title || 'untitled'}" is missing required field: ${field}`);
      }
      if (typeof event[field] === 'string' && !event[field].trim()) {
        throw new Error(`Event at index ${index} "${event.title || 'untitled'}" has empty required field: ${field}`);
      }
    }
    
    // Validate date format
    if (!dateRegex.test(event.date)) {
      throw new Error(`Event "${event.title}" has invalid date format: ${event.date} (expected YYYY-MM-DD)`);
    }
    
    // Validate date is parseable
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) {
      throw new Error(`Event "${event.title}" has invalid date: ${event.date}`);
    }
  });
}
