# Requirements Document

## Introduction

This document specifies requirements for implementing an Eleventy-based static site generator (SSG) build system for the QTs & Cuties comedy events website. The system transforms event data from JSON into static HTML at build time, replacing the current client-side JavaScript rendering approach while preserving the existing visual design and Cloudflare Pages hosting compatibility.

The goal is to create a maintainable, solo-developer-friendly workflow where editing a JSON file and opening a pull request triggers automatic preview deployments, enabling safe review before production deployment.

## Glossary

- **Build System**: The Node.js/Eleventy toolchain that transforms source files and data into static HTML output
- **Event_Data**: JSON file containing event objects with fields: title, date, signupTime, performanceTime, eventType, location, eventbriteLink, and optional facebookLink
- **Output_Directory**: The folder containing the final static site files ready for deployment (conventionally `_site` or `dist`)
- **Preview_Deployment**: Cloudflare Pages automatic deployment for non-main branches or pull requests
- **Production_Deployment**: Cloudflare Pages deployment for the main branch
- **Upcoming_Events**: Events with a date value greater than or equal to the build date
- **Past_Events**: Events with a date value earlier than the build date
- **Event_Card**: Visual component displaying event details with glassmorphism styling
- **Filter_UI**: Interactive buttons allowing users to filter events by type (Open Mic / Showcase / All)

## Requirements

### Requirement 1: Initialize Node.js Project Structure

**User Story:** As a maintainer, I want a standard Node.js project configuration, so that dependency management and build scripts work consistently across local and CI environments.

#### Acceptance Criteria

1. THE Build_System SHALL include a package.json file with name, version, description, and scripts fields
2. THE package.json SHALL define a build script that executes Eleventy build, a dev script that runs Eleventy in serve mode, and a preview script that serves the built site
3. THE Build_System SHALL store dependencies in a node_modules directory managed by npm
4. THE package.json SHALL specify Eleventy as a development dependency with a version constraint using semantic versioning

### Requirement 2: Configure Eleventy Build Process

**User Story:** As a maintainer, I want Eleventy configured to generate static HTML from templates and data, so that the site can be built without browser-side JavaScript for content rendering.

#### Acceptance Criteria

1. THE Build_System SHALL include an Eleventy configuration file (eleventy.config.js or .eleventy.js)
2. THE Build_System SHALL read Event_Data from events.json in the project root directory
3. WHEN the build command executes, THE Build_System SHALL output static files to the Output_Directory
4. THE Build_System SHALL copy static assets (CSS, images, favicon) from the project root to the Output_Directory without modification
5. THE Output_Directory SHALL contain an index.html file, CSS stylesheets, JavaScript files, and all asset files required to render the website

### Requirement 3: Generate Static Event Listing HTML

**User Story:** As a visitor, I want event listings rendered as static HTML, so that content appears immediately without waiting for JavaScript to fetch and render data.

#### Acceptance Criteria

1. WHEN the build command executes, THE Build_System SHALL generate an index.html file in the Output_Directory containing one event card for each event in the source data
2. THE generated HTML SHALL include event content directly in the document body, where each event card displays the event title, date, signup time, performance time, location, and event type from the source data
3. WHEN the generated index.html is loaded in a browser with JavaScript disabled, THE event cards SHALL be visible and readable without requiring client-side script execution
4. THE generated HTML SHALL reference the existing styles.css stylesheet and use the existing CSS class names for event cards (event-card, event-title, event-date, event-details, event-type, event-links) to render the trans pride gradient background and glassmorphism card styling
5. IF the source data contains no events, THEN THE Build_System SHALL generate an index.html containing a no-events message in the events container

### Requirement 4: Sort and Filter Events by Date

**User Story:** As a visitor, I want to see upcoming events listed in chronological order without past events, so that the site shows only relevant future events.

#### Acceptance Criteria

1. WHEN generating the event listing, THE Build_System SHALL sort events by date in ascending order (earliest first)
2. WHEN generating the event listing, THE Build_System SHALL exclude Past_Events from the generated event listing
3. WHEN determining upcoming versus past status, THE Build_System SHALL compare event dates against the build date at midnight UTC
4. WHEN an event date equals the build date, THE Build_System SHALL treat the event as an Upcoming_Event
5. IF no Upcoming_Events exist, THEN THE Build_System SHALL generate an event listing containing zero event cards

### Requirement 5: Preserve Client-Side Filter Functionality

**User Story:** As a visitor, I want to filter events by type (Open Mic, Showcase, All), so that I can focus on the event types I'm interested in.

#### Acceptance Criteria

1. THE generated HTML SHALL include filter buttons for event types (All, Open Mic, Showcase)
2. WHEN the page loads, THE Filter_UI SHALL set the "All" filter as the active filter by default
3. WHEN filter buttons are present in the HTML, THE Build_System SHALL include client-side JavaScript for filter interactivity
4. WHEN a visitor clicks a filter button, THE Filter_UI SHALL show only events matching the selected type
5. WHEN a visitor clicks the "All" filter button, THE Filter_UI SHALL show all events regardless of event type
6. IF an event has no eventType or an eventType not matching "Open Mic" or "Showcase", THEN THE Filter_UI SHALL show that event only when the "All" filter is active
7. THE Filter_UI SHALL display the active filter button with a distinct visual state that differs from inactive filter buttons

### Requirement 6: Validate Event Data During Build

**User Story:** As a maintainer, I want the build to fail with clear errors when Event_Data is malformed, so that invalid data never reaches production.

#### Acceptance Criteria

1. WHEN the build command executes, THE Build_System SHALL validate each event object in Event_Data
2. IF an event lacks a required field (title, date, eventType, location, performanceTime, eventbriteLink), THEN THE Build_System SHALL fail the build with an error message identifying the problematic event
3. IF an event date format is invalid, THEN THE Build_System SHALL fail the build with an error message indicating the malformed date
4. THE error message SHALL include the event title or array index to help identify the problematic entry
5. IF Event_Data is not valid JSON, THEN THE Build_System SHALL fail with a JSON parse error
6. THE Build_System SHALL fail the build for any validation error including missing required fields and invalid date formats

### Requirement 7: Implement Local Development Workflow

**User Story:** As a maintainer, I want a local development server that rebuilds on file changes, so that I can preview edits quickly during development.

#### Acceptance Criteria

1. WHEN the dev command executes, THE Build_System SHALL start a local development server
2. WHILE the dev server is running, THE Build_System SHALL watch source files for changes
3. WHEN a source file changes, THE Build_System SHALL rebuild the site automatically within 5 seconds of file save completion
4. WHILE the dev server is running, THE dev server SHALL serve the Output_Directory at a local URL
5. WHEN a rebuild completes successfully, THE dev server SHALL refresh connected browsers
6. IF a rebuild fails, THEN THE Build_System SHALL display an error message indicating the failure reason to the developer

### Requirement 8: Implement Local Preview Command

**User Story:** As a maintainer, I want to preview the built output locally, so that I can verify the production build before deploying.

#### Acceptance Criteria

1. WHEN the preview command executes, THE Build_System SHALL serve the Output_Directory at a local URL on a port between 3000 and 9000
2. THE preview command SHALL NOT watch for file changes or rebuild automatically
3. THE preview command SHALL serve the exact files that would be deployed to production
4. THE preview command SHALL NOT enable file watching
5. IF the Output_Directory does not exist or is empty, THEN THE preview command SHALL fail with an error message instructing the user to run build first
6. WHEN the preview server starts successfully, THE Build_System SHALL display the local URL in the terminal

### Requirement 9: Support Cloudflare Pages Deployment

**User Story:** As a maintainer, I want the project structure to work with Cloudflare Pages Git integration, so that deployments happen automatically on merge.

#### Acceptance Criteria

1. THE Build_System SHALL use the same build command for local development and Cloudflare Pages builds
2. THE Output_Directory path SHALL be documented in a README or Cloudflare Pages configuration
3. THE Build_System SHALL NOT require environment variables or secrets for the production build
4. THE Cloudflare Pages build configuration SHALL specify the Node.js version for reproducible builds

### Requirement 10: Enable Preview Deployments for Pull Requests

**User Story:** As a maintainer, I want preview deployments for pull requests, so that I can verify changes before merging to production.

#### Acceptance Criteria

1. WHEN a pull request is opened or updated, Cloudflare Pages SHALL create a Preview_Deployment
2. THE Preview_Deployment SHALL be accessible at a unique URL distinct from production
3. THE Preview_Deployment SHALL reflect the exact state of the pull request branch
4. WHEN the pull request is merged to main, Cloudflare Pages SHALL create a Production_Deployment

### Requirement 11: Implement Cache-Busting Strategy

**User Story:** As a maintainer, I want updated assets to load immediately after deployment, so that visitors see the latest content without browser cache issues.

#### Acceptance Criteria

1. THE Build_System SHALL implement a cache-busting strategy for CSS and JavaScript files
2. IF Eleventy provides content-hashed filenames, THE Build_System SHALL use content-hashed filenames for CSS and JavaScript assets
3. WHERE content-hashing is not available, THE Build_System SHALL append a version query parameter to asset URLs (e.g., styles.css?v=timestamp)
4. THE Build_System SHALL update asset references in HTML to match the generated filenames or version parameters
5. IF asset reference updates fail, THEN THE Build_System SHALL fail the build completely

### Requirement 12: Preserve Visual Design

**User Story:** As a visitor, I want the site to look identical before and after the build system migration, so that the user experience remains consistent.

#### Acceptance Criteria

1. THE generated HTML SHALL apply the same CSS styles as the original site
2. THE Build_System SHALL preserve the trans pride gradient background (blue #5bcefa to pink #f5a9b8 to white #ffffff)
3. THE Build_System SHALL preserve glassmorphism card styling (semi-transparent background, backdrop blur, rounded corners, box shadow)
4. THE Build_System SHALL preserve responsive layout behavior (mobile-friendly grid, adaptive navigation)
5. THE Build_System SHALL preserve the purple heart emoji favicon

### Requirement 13: Maintain Calendar Integration

**User Story:** As a visitor, I want to add events to my calendar, so that I can remember to attend shows.

#### Acceptance Criteria

1. THE Build_System SHALL include the calendar integration functionality from script.js
2. WHEN a visitor clicks "Add to calendar" on desktop, THE site SHALL download an ICS file
3. WHEN a visitor clicks "Add to calendar" on mobile, THE site SHALL open Google Calendar with event details pre-filled
4. THE calendar integration SHALL work correctly with statically rendered event data
5. THE calendar integration SHALL require an explicit user click before opening Google Calendar

### Requirement 14: Document Maintenance Workflow

**User Story:** As a maintainer, I want comprehensive documentation for the editing and deployment workflow, so that I can maintain the site confidently months later.

#### Acceptance Criteria

1. THE README SHALL document dependency installation (npm install)
2. THE README SHALL document local development commands (npm run dev, npm run build, npm run preview)
3. THE README SHALL document the Event_Data structure and required fields
4. THE README SHALL document the GitHub workflow: create branch, edit JSON, commit, open pull request, verify preview, merge
5. THE README SHALL document Cloudflare Pages configuration requirements (build command, output directory, Node version)
6. THE README SHALL include instructions for editing JSON via GitHub web UI

### Requirement 15: Document Manual Setup Steps

**User Story:** As a maintainer, I want a separate setup guide for Cloudflare Pages and GitHub configuration, so that I can reference it if I need to recreate the deployment pipeline.

#### Acceptance Criteria

1. THE setup guide SHALL document Cloudflare Pages project creation steps
2. THE setup guide SHALL document connecting Cloudflare Pages to the GitHub repository
3. THE setup guide SHALL document configuring build settings (build command, output directory, root directory)
4. THE setup guide SHALL document setting the Node.js version in Cloudflare Pages
5. THE setup guide SHALL document branch deployment settings for preview deployments

### Requirement 16: Preserve Static Rules Page

**User Story:** As a visitor, I want to access the rules page at /rules/, so that I can read event participation guidelines.

#### Acceptance Criteria

1. THE Build_System SHALL include the rules/index.html in the Output_Directory
2. THE rules page SHALL be accessible at the /rules/ path
3. THE rules page SHALL preserve existing content and styling

### Requirement 17: Remove Client-Side Event Rendering Code

**User Story:** As a maintainer, I want the client-side JSON fetching and rendering code removed, so that the codebase reflects the new build-time architecture.

#### Acceptance Criteria

1. THE Build_System SHALL NOT include the fetch("events.json") call in production JavaScript
2. THE Build_System SHALL NOT include the createEventCard function in production JavaScript (or shall relocate it to build-time template logic)
3. THE Build_System SHALL NOT include the loadEvents function in production JavaScript
4. THE production JavaScript SHALL include Filter_UI interactivity code and calendar integration code as needed, allowing inclusion of one component without requiring both

### Requirement 18: Support Generic Reusability

**User Story:** As a maintainer, I want the build system to be adaptable for similar event-listing sites, so that I can reuse the architecture for other projects.

#### Acceptance Criteria

1. THE Build_System configuration SHALL avoid hardcoded values specific to QTs & Cuties where reasonable
2. THE Event_Data structure SHALL be documented as the expected schema
3. THE Build_System SHALL use template files that can be modified for different branding without restructuring the build process
