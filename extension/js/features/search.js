const DEBOUNCE_DELAY = 200;
const searchCache = new Map();
let _debounceTimer = null;
let _groupCardMap = new Map();

/**
 * Builds a Map of domain-id → card element for O(1) lookup during filtering.
 *
 * Querying the DOM on every keystroke would be expensive, so this map
 * is rebuilt once per filter cycle (or lazily on first use) and cleared
 * whenever the virtual/lazy renderer modifies the DOM. Using stable
 * domain-ids as keys avoids re-querying and lets filterTabs jump directly
 * to the card it needs to show/hide.
 */
function buildGroupCardMap() {
  _groupCardMap.clear();
  const cards = document.querySelectorAll('#openTabsMissions .mission-card');
  cards.forEach(card => {
    const domainId = card.dataset.domainId;
    if (domainId) _groupCardMap.set(domainId, card);
  });
}

function clearGroupCardMap() {
  _groupCardMap.clear();
}

/**
 * Debounced search entry point — coordinates renderers before filtering.
 *
 * Waits DEBOUNCE_DELAY (200ms) after the user stops typing, then:
 * 1. Toggles virtual-scroll into/out of search mode so all cards are
 *    in the DOM for CSS-based filtering.
 * 2. Flushes any pending lazy-render pages so no results are hidden.
 * 3. Calls filterTabs() and caches the result for instant repeat queries.
 *
 * The debounce + cache combo ensures rapid keystrokes don't thrash the
 * DOM, while backspacing to a previously-seen query is a free lookup.
 *
 * @param {string} query - The raw search string from the input field
 * @returns {*} Cached result for the query, or undefined if still debouncing
 */
function debouncedFilterTabs(query) {
  clearTimeout(_debounceTimer);

  if (searchCache.has(query)) {
    return searchCache.get(query);
  }

  _debounceTimer = setTimeout(() => {
    if (query && virtualScrollEnabled()) {
      setVirtualSearchMode(true);
    } else if (!query && virtualScrollEnabled()) {
      setVirtualSearchMode(false);
    }
    if (query && !isLazyAllRendered()) {
      renderAllLazy();
    }
    const result = filterTabs(query);
    searchCache.set(query, result);
  }, DEBOUNCE_DELAY);
}

function clearSearchCache() {
  searchCache.clear();
}

/**
 * Applies the current search query to all domain groups via CSS display toggling.
 *
 * Iterates over every domain group and uses the pre-built card map to
 * find its DOM node. For each group, marks individual tabs with a _matched
 * flag by comparing title and URL against the query, then shows/hides the
 * group card and its page chips accordingly. Empty query resets everything
 * to visible. The overflow section (chips hidden behind "show more") is
 * also filtered so matches in overflow aren't invisible.
 *
 * @param {string} query - Normalized search string (lowercase, trimmed)
 */
function filterTabs(query) {
  const q = query.toLowerCase().trim();

  if (_groupCardMap.size === 0) buildGroupCardMap();

  for (const group of domainGroups) {
    const groupId = 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');
    const card = _groupCardMap.get(groupId);
    if (!card) continue;

    if (!q) {
      card.style.display = '';
      const chips = card.querySelectorAll('.page-chip');
      chips.forEach(chip => { chip.style.display = ''; });
      const overflowChip = card.querySelector('.page-chip-overflow');
      if (overflowChip) overflowChip.style.display = '';
      const overflowContainer = card.querySelector('.page-chips-overflow');
      if (overflowContainer) overflowContainer.style.display = 'none';
      continue;
    }

    let groupHasMatch = false;

    for (const tab of group.tabs) {
      const title = (tab.title || '').toLowerCase();
      const url = (tab.url || '').toLowerCase();
      tab._matched = title.includes(q) || url.includes(q);
      if (tab._matched) groupHasMatch = true;
    }

    card.style.display = groupHasMatch ? '' : 'none';

    if (groupHasMatch) {
      const chips = card.querySelectorAll('.page-chip[data-action="focus-tab"]');
      chips.forEach(chip => {
        const tabId = parseInt(chip.dataset.tabId);
        const tab = group.tabs.find(t => t.id === tabId);
        if (tab) {
          chip.style.display = tab._matched ? '' : 'none';
        }
      });

      const overflowChip = card.querySelector('.page-chip-overflow');
      const overflowContainer = card.querySelector('.page-chips-overflow');
      if (overflowChip) overflowChip.style.display = 'none';
      if (overflowContainer) {
        const overflowChips = overflowContainer.querySelectorAll('.page-chip[data-action="focus-tab"]');
        let overflowHasMatch = false;
        overflowChips.forEach(chip => {
          const tabId = parseInt(chip.dataset.tabId);
          const tab = group.tabs.find(t => t.id === tabId);
          const match = tab && tab._matched;
          chip.style.display = match ? '' : 'none';
          if (match) overflowHasMatch = true;
        });
        overflowContainer.style.display = overflowHasMatch ? '' : 'none';
      }
    }
  }

  // Also filter smart suggestion cards
  const suggestionCards = document.querySelectorAll('#smartSuggestionsList .suggestion-card');
  if (suggestionCards.length > 0) {
    let anySuggestionMatch = false;
    suggestionCards.forEach(card => {
      const tabId = parseInt(card.dataset.tabId);
      const tab = openTabs.find(t => t.id === tabId);
      if (!q) {
        card.style.display = '';
        return;
      }
      if (tab) {
        const title = (tab.title || '').toLowerCase();
        const url = (tab.url || '').toLowerCase();
        const match = title.includes(q) || url.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) anySuggestionMatch = true;
      }
    });
    const section = document.getElementById('smartSuggestionsSection');
    if (section) {
      section.style.display = (!q || anySuggestionMatch) && suggestionCards.length > 0 ? 'block' : 'none';
      if (!q) {
        section.style.display = settings.showSmartSuggestions ? 'block' : 'none';
      }
    }
  }
}

function focusSearch() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.focus();
    input.select();
  }
}