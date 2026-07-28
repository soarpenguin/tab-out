# Tab Out Performance Optimization - Implementation Plan

## [x] Task 1: Implement search debouncing
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Add 200ms debounce to search input handler so filtering only executes after user stops typing
  - Add search result cache (Map) keyed by query string to avoid redundant filtering
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: filterTabs function is not called on every keystroke during rapid typing
  - `programmatic` TR-1.2: Same query string returns cached results without re-filtering
- **Notes**: Use setTimeout/clearTimeout pattern; invalidate cache when tabs change

## [x] Task 2: Implement data-layer search
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - Rewrite filterTabs to operate on domainGroups data array instead of DOM
  - Mark tabs as `_matched: true/false` based on query match
  - Pass matched state to renderDomainCard for conditional display
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: No querySelectorAll calls inside filterTabs function
  - `programmatic` TR-2.2: Filtered domainGroups have correct _matched flags
  - `human-judgement` TR-2.3: Search results display correctly for 100+ tabs

## [x] Task 3: Add Intersection Observer for lazy loading
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - Create a `LazyRenderer` class/module that uses IntersectionObserver
  - Split domainGroups into pages of 10, render first page immediately
  - Observe sentinel element at bottom of rendered cards; load next page when visible
  - Load all pages when search is active (disable lazy loading during search)
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: Only first 10 .mission-card elements exist in DOM after initial render with 30+ groups
  - `human-judgement` TR-3.2: Scroll to bottom triggers loading of more cards smoothly
  - `human-judgement` TR-3.3: No layout shift when new cards load

## [x] Task 4: Implement virtual scrolling core
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - Create `virtual-scroll.js` module with core virtual scrolling logic
  - Use position:absolute for all domain cards with calculated top positions
  - Implement viewport-windowing: only render cards within viewport + buffer (200px)
  - Maintain scrollbar height via a tall placeholder div
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: DOM .mission-card count stays <20 even with 50+ domain groups
  - `human-judgement` TR-4.2: Scrolling shows correct cards at each scroll position
  - `human-judgement` TR-4.3: Virtual scrolling is disabled during search mode, all results rendered

## [x] Task 5: Implement card height caching
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - After first render, measure each domain card's height using getBoundingClientRect
  - Store heights in a Map keyed by stableId
  - Use cached heights for virtual scroll positioning; re-measure on first render only
  - Handle height changes with ResizeObserver (overflow chips expanding, etc.)
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: Height cache is populated after first render
  - `human-judgement` TR-5.2: Scrollbar position and visual positions are accurate with cached heights
  - `human-judgement` TR-5.3: Height changes (expanding overflow chips) are detected and update positioning

## [x] Task 6: Integrate with dashboard rendering
- **Priority**: high
- **Depends On**: Task 4, Task 5
- **Description**: 
  - Modify renderStaticDashboard to use LazyRenderer + virtual scroll instead of direct innerHTML
  - Add scroll container div with overflow:auto styling
  - Wire up scroll event listener to trigger virtual scroll recalculation
  - Handle re-render scenarios (settings changes, workspace filtering, tab updates)
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-6.1: Dashboard renders correctly via virtual scroll pipeline
  - `human-judgement` TR-6.2: Re-renders (theme change, workspace switch) work correctly with virtual scroll

## [x] Task 7: Search mode integration with virtual scroll
- **Priority**: medium
- **Depends On**: Task 6
- **Description**: 
  - During search, disable virtual scrolling and render all matching cards
  - After search clears, re-enable virtual scrolling
  - Update search.js to communicate search state to virtual scroll module
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-7.1: All matching search results are visible with virtual scroll temporarily disabled
  - `human-judgement` TR-7.2: Virtual scroll resumes after clearing search

## [x] Task 8: Feature compatibility verification
- **Priority**: high
- **Depends On**: Task 6, Task 7
- **Description**: 
  - Verify drag-and-drop functionality works with virtual scroll (cards must be DOM elements when dragged)
  - Verify hover preview (tab-preview.js) works with virtual scroll
  - Verify all chip actions (close, save, focus) work with virtual scroll
  - Add edge-case handling: temporary disable virtual scroll during drag operations
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-8.1: Drag-and-drop between domain groups works correctly
  - `human-judgement` TR-8.2: Tab preview hover works on all visible chips
  - `human-judgement` TR-8.3: Close, save, focus actions work correctly on virtualized chips

## [x] Task 9: Cross-theme and compact mode testing
- **Priority**: medium
- **Depends On**: Task 8
- **Description**: 
  - Test virtual scrolling in all 4 themes (Warm Light, Cool Light, Dark, Frosted Blue)
  - Test with compact mode enabled/disabled
  - Verify card height calculations work correctly with different themes/styles
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-9.1: All themes render correctly with virtual scroll
  - `human-judgement` TR-9.2: Compact mode works with virtual scroll
  - `human-judgement` TR-9.3: No visual glitches or spacing issues across themes

## [x] Task 10: Performance benchmarks and documentation
- **Priority**: low
- **Depends On**: All tasks
- **Description**: 
  - Create benchmark script to measure render time with simulated 100+ tabs
  - Document performance improvements
  - Update AGENTS.md with new virtual-scroll.js module documentation
  - Add comments in code explaining virtual scroll logic
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-10.1: Initial render time <500ms for 100+ tabs
  - `programmatic` TR-10.2: Search response time <30ms after debounce
  - `human-judgement` TR-10.3: Code is well-documented and maintainable
