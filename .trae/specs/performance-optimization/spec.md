# Tab Out Performance Optimization - Product Requirement Document

## Overview
- **Summary**: Optimize Tab Out extension's rendering and search performance for scenarios with large numbers of open tabs (>100), ensuring smooth 60fps interaction and responsive search filtering.
- **Purpose**: When users have many tabs open, the current implementation renders all DOM nodes at once and performs search by traversing the full DOM on each keystroke, causing lag and unresponsiveness.
- **Target Users**: Power users who regularly have 50+ tabs open, developers who use many tabs for research, and anyone experiencing slow performance with large tab counts.

## Goals
- Improve search response time by 70%+ through debouncing and data-layer caching
- Reduce initial render DOM nodes by 80%+ through lazy loading
- Achieve stable 60fps rendering regardless of tab count via virtual scrolling
- Maintain all existing functionality (search, drag-drop, hover preview, etc.)

## Non-Goals (Out of Scope)
- Changing the visual design or UI layout
- Adding new features unrelated to performance
- Modifying the Chrome API calls or data fetching logic
- Supporting browsers other than Chrome (Manifest V3)

## Background & Context
- **Current State**: 
  - `search.js` performs DOM-based search: querySelectorAll on every keystroke, style.display toggling
  - `domain-cards.js` renders all domain groups and chips via innerHTML in one pass
  - No lazy loading or viewport-based rendering
- **Technical Constraints**:
  - Pure vanilla JavaScript, no frameworks
  - Manifest V3 service worker architecture
  - Must work within Chrome's performance budget (16ms per frame)
  - Intersection Observer and ResizeObserver are fully supported in Chrome MV3

## Functional Requirements
- **FR-1**: Search input should debounce for 200ms before executing filter logic
- **FR-2**: Search should operate on data layer (domainGroups) rather than DOM elements
- **FR-3**: First render should display only the first 10 domain groups, with additional groups loaded on scroll
- **FR-4**: Virtual scrolling should render only visible domain cards (viewport + buffer)
- **FR-5**: Virtual scrolling should maintain scrollbar height via placeholder element
- **FR-6**: Card height changes should be detected and height cache updated
- **FR-7**: During search mode, all cards should be rendered (disable virtual scrolling) to ensure search visibility
- **FR-8**: All existing features (drag-drop, hover preview, chip actions) should work identically with optimizations

## Non-Functional Requirements
- **NFR-1**: Initial render time should be <500ms for 100+ tabs
- **NFR-2**: Search response time should be <30ms after debounce for 100+ tabs
- **NFR-3**: Scroll smoothness should maintain 60fps regardless of tab count
- **NFR-4**: No visual regressions or layout shifts during lazy loading
- **NFR-5**: Memory usage should not increase significantly with optimizations

## Constraints
- **Technical**: Vanilla JS only, no build system, no npm dependencies
- **Platform**: Chrome Manifest V3 only
- **Performance**: Must not block main thread for >16ms during interactions
- **Compatibility**: Must work with all 4 themes and compact mode

## Assumptions
- Users with >100 tabs have ~10-30 domain groups (many tabs per domain)
- Card heights are relatively consistent within a single session
- Intersection Observer API is available (Chrome 51+)
- The extension's new tab page has a scrollable container

## Acceptance Criteria

### AC-1: Search Debouncing
- **Given**: User has 100+ tabs open across multiple domains
- **When**: User types rapidly in the search box
- **Then**: Search filter should not execute on every keystroke, only 200ms after the last keystroke
- **Verification**: `programmatic`
- **Notes**: Verify by adding console.log timestamps to filterTabs function

### AC-2: Data-Layer Search
- **Given**: User has 100+ tabs open
- **When**: User searches for a keyword
- **Then**: Search should filter based on domainGroups data array, not DOM traversal
- **Verification**: `programmatic`
- **Notes**: No querySelectorAll calls during search execution

### AC-3: Lazy Loading
- **Given**: User has 30+ domain groups
- **When**: Page first loads
- **Then**: Only first 10 domain groups should render initially
- **Verification**: `programmatic`
- **Notes**: count DOM .mission-card elements after first render

### AC-4: Virtual Scrolling
- **Given**: User has 50+ domain groups (200+ tabs)
- **When**: User scrolls through the page
- **Then**: Only visible domain cards plus a small buffer should exist in DOM
- **Verification**: `human-judgment`
- **Notes**: Check DevTools Elements panel - DOM node count should stay low

### AC-5: Scroll Smoothness
- **Given**: User has 100+ tabs open
- **When**: User scrolls rapidly through all domain groups
- **Then**: Scroll should feel smooth with no stuttering or visible lag
- **Verification**: `human-judgment`

### AC-6: Search with Virtual Scrolling
- **Given**: User has virtual scrolling active and searches for a keyword
- **When**: Search results include hidden cards
- **Then**: Matching cards should be rendered and visible
- **Verification**: `human-judgment`
- **Notes**: Virtual scrolling should be temporarily disabled during search

### AC-7: Feature Compatibility
- **Given**: All optimizations are implemented
- **When**: User uses drag-drop, hover preview, close tabs, save for later
- **Then**: All features should work identically to before
- **Verification**: `human-judgment`

### AC-8: No Visual Regressions
- **Given**: Optimizations are complete
- **When**: User views the dashboard in all 4 themes and compact mode
- **Then**: Layout and visual appearance should match the pre-optimization version
- **Verification**: `human-judgment`

## Open Questions
- [ ] Should we add a user-configurable threshold for when to enable virtual scrolling?
- [ ] Should we measure actual card heights on first render to populate the height cache?
- [ ] How should we handle dynamic height changes (e.g., expanding overflow chips)?
