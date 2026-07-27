# Tab Preview Feature - Implementation Plan

## [x] Task 1: Add `showTabPreview` setting
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Add `showTabPreview: true` to the default settings object in `js/features/settings.js`
  - Add toggle UI in settings drawer (General section)
  - Update `clearAllData` function to reset the setting
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: Setting key `showTabPreview` exists and defaults to `true`
  - `human-judgement` TR-1.2: Toggle appears in settings drawer under General section with label "Show tab preview"
- **Notes**: Follow existing toggle pattern used for `showTabAge`

## [x] Task 2: Create tab preview CSS styles
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Create new CSS file `css/ui/tab-preview.css` for preview overlay styles
  - Include styles for: preview container, thumbnail image, title/URL text, positioning, animations, hover states
  - Link the CSS file in `index.html`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: Preview overlay has rounded corners, shadow, and proper spacing
  - `human-judgement` TR-2.2: Preview has smooth fade-in/out animations
  - `human-judgement` TR-2.3: Preview stays within viewport when near edges
- **Notes**: Use CSS variables from `variables.css` for colors and spacing

## [x] Task 3: Implement tab capture and caching logic
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - Create `js/ui/tab-preview.js` module
  - Implement `captureTabPreview(tabId)` function using `chrome.tabs.captureVisibleTab`
  - Implement caching mechanism with TTL (e.g., 5 minutes)
  - Implement fallback to favicon when capture fails
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: `captureTabPreview` returns base64 image data or null on failure
  - `programmatic` TR-3.2: Cache stores captured images and returns cached data within TTL
  - `human-judgement` TR-3.3: Second hover on same tab shows preview instantly
- **Notes**: Cache should be cleared when tab content changes (tab updated event)

## [x] Task 4: Add hover event handlers for preview
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**: 
  - Add mouseenter/mouseleave event handlers to page chips in `js/events/handlers.js`
  - On hover: fetch tab ID, capture preview (or use cache), show preview overlay
  - On leave: hide and remove preview overlay
  - Conditionally enable/disable based on `settings.showTabPreview`
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-4.1: Preview appears when hovering over a tab chip
  - `human-judgement` TR-4.2: Preview disappears when moving mouse away
  - `human-judgement` TR-4.3: Preview doesn't appear when setting is disabled
- **Notes**: Use event delegation for efficient handling

## [ ] Task 5: Add preview overlay DOM structure
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - Add preview overlay container to `index.html`
  - Include elements for thumbnail, title, and URL
  - The overlay should be positioned absolutely and appended dynamically via JS
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `human-judgement` TR-5.1: Preview includes thumbnail image, tab title, and URL
  - `human-judgement` TR-5.2: Preview is positioned correctly relative to hovered tab
- **Notes**: The overlay can be added directly to the body or created dynamically in JS

## [x] Task 6: Update domain-cards.js to include tab ID in chips
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Modify `renderDomainCard` in `js/renderer/domain-cards.js` to include tab ID in the page chip data attributes
  - Add `data-tab-id` attribute alongside existing `data-tab-url`
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-6.1: Page chips have `data-tab-id` attribute with valid numeric value
- **Notes**: Need to store tab IDs during tab fetching

## [x] Task 7: Integrate preview module into initialization
- **Priority**: medium
- **Depends On**: Task 3, Task 4
- **Description**: 
  - Load `tab-preview.js` in `index.html` after core modules
  - Initialize preview cache on dashboard render
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-7.1: Preview works without errors after page load
- **Notes**: Follow existing script loading order pattern

## [x] Task 8: Cleanup and edge case handling
- **Priority**: medium
- **Depends On**: All tasks
- **Description**: 
  - Handle cases where tab is closed while preview is being captured
  - Ensure preview overlay is removed when tab chips are re-rendered
  - Handle cache cleanup for closed tabs
- **Acceptance Criteria Addressed**: AC-2, AC-5
- **Test Requirements**:
  - `human-judgement` TR-8.1: No errors when closing a tab during capture
  - `human-judgement` TR-8.2: Preview doesn't persist after tab is removed
- **Notes**: Use try-catch around capture calls

## [x] Task 9: Update AGENTS.md documentation
- **Priority**: low
- **Depends On**: All tasks
- **Description**: 
  - Update `AGENTS.md` to include information about the new tab preview feature
  - Add entry in Key Files and Roles table for `js/ui/tab-preview.js`
- **Acceptance Criteria Addressed**: N/A
- **Test Requirements**:
  - `human-judgement` TR-9.1: Documentation is accurate and complete
- **Notes**: Keep documentation minimal and focused

## [x] Task 10: Test across themes and compact mode
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - Verify preview styling works correctly in all 4 themes
  - Verify preview works in compact mode
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-10.1: Preview looks correct in Warm Light, Cool Light, Dark, and Frosted Blue themes
  - `human-judgement` TR-10.2: Preview positioning works in compact mode
- **Notes**: Test both light and dark themes thoroughly
