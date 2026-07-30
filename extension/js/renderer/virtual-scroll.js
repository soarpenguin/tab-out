const VIRTUAL_BUFFER = 300;
const VIRTUAL_THRESHOLD = 99999;
let _vsEnabled = false;
let virtualScrollContainer = null;
let virtualScrollPlaceholder = null;
let virtualScrollGroupHeights = new Map();
let virtualScrollGroupOrder = [];
let virtualScrollTopPositions = new Map();
let virtualScrollCurrentGroups = [];
let virtualScrollScrollHandler = null;
let virtualScrollRafId = null;
let virtualScrollIsSearching = false;
let virtualScrollResizeObserver = null;

function stableGroupId(group) {
  return 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');
}

/**
 * Initializes virtual scrolling on the dashboard container.
 *
 * Enables virtualization only when group count >= VIRTUAL_THRESHOLD (30),
 * since below that threshold the DOM cost is negligible. When enabled,
 * cards are positioned absolutely inside a placeholder spacer that preserves
 * the full scrollable height. A ResizeObserver tracks height changes so the
 * position cache stays accurate when cards resize (e.g. tab chips toggling).
 *
 * @param {HTMLElement} containerEl - The scrollable parent holding mission cards
 * @param {Array} groups - Domain groups to render virtually
 */
function initVirtualScroll(containerEl, groups) {
  virtualScrollContainer = containerEl;
  virtualScrollCurrentGroups = groups;
  virtualScrollGroupOrder = groups.map(stableGroupId);

  virtualScrollPlaceholder = document.createElement('div');
  virtualScrollPlaceholder.className = 'virtual-scroll-placeholder';

  recalcVirtualScrollHeights();

  _vsEnabled = groups.length >= VIRTUAL_THRESHOLD;

  if (_vsEnabled) {
    setupVirtualScroll();
    setupVirtualScrollResizeObserver();
  }
}

function recalcVirtualScrollHeights() {
  if (!virtualScrollContainer) return;

  const cards = virtualScrollContainer.querySelectorAll('.mission-card');
  cards.forEach(card => {
    const id = card.dataset.domainId;
    if (id) {
      virtualScrollGroupHeights.set(id, card.offsetHeight);
    }
  });

  let top = 0;
  virtualScrollTopPositions.clear();
  for (const id of virtualScrollGroupOrder) {
    const height = virtualScrollGroupHeights.get(id) || 200;
    virtualScrollTopPositions.set(id, top);
    top += height;
  }

  if (virtualScrollPlaceholder) {
    virtualScrollPlaceholder.style.height = top + 'px';
  }
}

function recalcTopPositions() {
  let top = 0;
  for (const id of virtualScrollGroupOrder) {
    virtualScrollTopPositions.set(id, top);
    const height = virtualScrollGroupHeights.get(id) || 200;
    top += height;
  }

  if (virtualScrollPlaceholder) {
    virtualScrollPlaceholder.style.height = top + 'px';
  }

  if (virtualScrollContainer) {
    const cards = virtualScrollContainer.querySelectorAll('.mission-card');
    cards.forEach(card => {
      const id = card.dataset.domainId;
      if (id && virtualScrollTopPositions.has(id)) {
        card.style.top = virtualScrollTopPositions.get(id) + 'px';
      }
    });
  }
}

function setupVirtualScrollResizeObserver() {
  if (virtualScrollResizeObserver) {
    virtualScrollResizeObserver.disconnect();
  }

  virtualScrollResizeObserver = new ResizeObserver((entries) => {
    let needsRecalc = false;

    for (const entry of entries) {
      const card = entry.target;
      const id = card.dataset.domainId;
      if (id) {
        const newHeight = card.offsetHeight;
        const oldHeight = virtualScrollGroupHeights.get(id);

        if (oldHeight !== newHeight) {
          virtualScrollGroupHeights.set(id, newHeight);
          needsRecalc = true;
        }
      }
    }

    if (needsRecalc) {
      recalcTopPositions();
    }
  });

  if (virtualScrollContainer) {
    const cards = virtualScrollContainer.querySelectorAll('.mission-card');
    cards.forEach(card => {
      virtualScrollResizeObserver.observe(card);
    });
  }
}

function setupVirtualScroll() {
  if (!virtualScrollContainer) return;

  const fragment = document.createDocumentFragment();

  const existingCards = virtualScrollContainer.querySelectorAll('.mission-card');
  const cardsMap = new Map();

  existingCards.forEach(card => {
    const id = card.dataset.domainId;
    if (id) {
      cardsMap.set(id, card);
      card.style.position = 'absolute';
      card.style.left = '0';
      card.style.right = '0';
    }
  });

  virtualScrollContainer.innerHTML = '';
  virtualScrollContainer.style.position = 'relative';
  virtualScrollContainer.style.overflow = 'auto';

  virtualScrollPlaceholder.style.position = 'relative';
  virtualScrollPlaceholder.style.width = '100%';
  virtualScrollContainer.appendChild(virtualScrollPlaceholder);

  updateVirtualScrollWindow();

  virtualScrollScrollHandler = () => {
    if (virtualScrollRafId) return;
    virtualScrollRafId = requestAnimationFrame(() => {
      updateVirtualScrollWindow();
      virtualScrollRafId = null;
    });
  };
  virtualScrollContainer.addEventListener('scroll', virtualScrollScrollHandler, { passive: true });
}

/**
 * Rebuilds the visible card window around the current scroll position.
 *
 * Called on every scroll event (throttled via requestAnimationFrame).
 * Removes all existing cards from the DOM, then re-renders only the cards
 * whose cached [top, top+height] intervals overlap the viewport expanded by
 * VIRTUAL_BUFFER (300px) in both directions. This buffer prevents white
 * flashes during fast scrolling while keeping the live DOM proportional to
 * viewport size rather than total group count.
 *
 * When in search mode this is a no-op — search uses CSS display toggling
 * on fully-rendered cards instead.
 */
function updateVirtualScrollWindow() {
  if (!_vsEnabled || !virtualScrollContainer || virtualScrollIsSearching) return;

  const scrollTop = virtualScrollContainer.scrollTop;
  const viewportHeight = virtualScrollContainer.clientHeight;
  const viewportBottom = scrollTop + viewportHeight;

  virtualScrollContainer.querySelectorAll('.mission-card').forEach(card => card.remove());

  for (const id of virtualScrollGroupOrder) {
    const top = virtualScrollTopPositions.get(id) || 0;
    const height = virtualScrollGroupHeights.get(id) || 200;

    if (top + height >= scrollTop - VIRTUAL_BUFFER &&
        top <= viewportBottom + VIRTUAL_BUFFER) {
      const group = virtualScrollCurrentGroups.find(g => stableGroupId(g) === id);
      if (group) {
        const cardHtml = renderDomainCard(group);
        const temp = document.createElement('div');
        temp.innerHTML = cardHtml.trim();
        const cardEl = temp.firstElementChild;

        if (cardEl) {
          cardEl.style.position = 'absolute';
          cardEl.style.left = '0';
          cardEl.style.right = '0';
          cardEl.style.top = top + 'px';
          virtualScrollContainer.appendChild(cardEl);
        }
      }
    }
  }

  if (virtualScrollResizeObserver) {
    const cards = virtualScrollContainer.querySelectorAll('.mission-card');
    cards.forEach(card => {
      virtualScrollResizeObserver.observe(card);
    });
  }
}

/**
 * Switches between virtual-scroll mode and search mode.
 *
 * Search mode requires every card to be present in the DOM so that
 * filterTabs() can toggle individual card/chip visibility via CSS.
 * When entering search mode the scroll listener is detached, absolute
 * positioning is cleared on all cards, and the spacer is hidden — effectively
 * falling back to normal document flow. When exiting, virtualization is
 * re-enabled and the viewport window is rebuilt from the height cache.
 *
 * @param {boolean} isSearching - True when a search query is active
 */
function setVirtualSearchMode(isSearching) {
  virtualScrollIsSearching = isSearching;

  if (isSearching) {
    if (virtualScrollContainer) {
      if (virtualScrollScrollHandler) {
        virtualScrollContainer.removeEventListener('scroll', virtualScrollScrollHandler);
      }
      virtualScrollContainer.querySelectorAll('.mission-card').forEach(card => {
        card.style.position = '';
        card.style.left = '';
        card.style.right = '';
        card.style.top = '';
      });
      virtualScrollPlaceholder.style.display = 'none';
    }
  } else {
    if (virtualScrollContainer) {
      virtualScrollPlaceholder.style.display = '';
      virtualScrollScrollHandler = () => {
        if (virtualScrollRafId) return;
        virtualScrollRafId = requestAnimationFrame(() => {
          updateVirtualScrollWindow();
          virtualScrollRafId = null;
        });
      };
      virtualScrollContainer.addEventListener('scroll', virtualScrollScrollHandler, { passive: true });
      updateVirtualScrollWindow();
    }
  }
}

function resetVirtualScroll() {
  if (virtualScrollScrollHandler && virtualScrollContainer) {
    virtualScrollContainer.removeEventListener('scroll', virtualScrollScrollHandler);
  }
  if (virtualScrollContainer) {
    virtualScrollContainer.style.position = '';
    virtualScrollContainer.style.overflow = '';
    const placeholder = virtualScrollContainer.querySelector('.virtual-scroll-placeholder');
    if (placeholder) placeholder.remove();
    virtualScrollContainer.querySelectorAll('.mission-card').forEach(card => {
      card.style.position = '';
      card.style.left = '';
      card.style.right = '';
      card.style.top = '';
    });
  }
  _vsEnabled = false;
  virtualScrollContainer = null;
  virtualScrollPlaceholder = null;
  virtualScrollGroupHeights.clear();
  virtualScrollGroupOrder = [];
  virtualScrollTopPositions.clear();
  virtualScrollCurrentGroups = [];
  virtualScrollIsSearching = false;
  virtualScrollScrollHandler = null;
  virtualScrollRafId = null;
  if (virtualScrollResizeObserver) {
    virtualScrollResizeObserver.disconnect();
    virtualScrollResizeObserver = null;
  }
}

function virtualScrollEnabled() {
  return _vsEnabled;
}

/**
 * Temporarily disables virtualization and flushes all cards to the DOM.
 *
 * Used before operations (e.g. search, workspace filtering) that need
 * every card present for CSS-based filtering. Stops listening for scroll,
 * clears absolute positioning, hides the spacer, and renders any not-yet-
 * visible cards that are missing from the DOM. Also invalidates the
 * group-card map so search can rebuild it from the now-complete DOM.
 */
function pauseVirtualScroll() {
  if (!_vsEnabled || !virtualScrollContainer) return;

  if (virtualScrollScrollHandler) {
    virtualScrollContainer.removeEventListener('scroll', virtualScrollScrollHandler);
  }

  virtualScrollContainer.querySelectorAll('.mission-card').forEach(card => {
    card.style.position = '';
    card.style.left = '';
    card.style.right = '';
    card.style.top = '';
  });
  virtualScrollPlaceholder.style.display = 'none';

  if (!virtualScrollIsSearching) {
    for (const group of virtualScrollCurrentGroups) {
      const id = stableGroupId(group);
      const existingCard = virtualScrollContainer.querySelector(`[data-domain-id="${id}"]`);
      if (!existingCard) {
        const cardHtml = renderDomainCard(group);
        const temp = document.createElement('div');
        temp.innerHTML = cardHtml.trim();
        const cardEl = temp.firstElementChild;
        if (cardEl) {
          virtualScrollContainer.appendChild(cardEl);
        }
      }
    }
  }

  if (typeof clearGroupCardMap === 'function') {
    clearGroupCardMap();
  }
}

/**
 * Re-enables virtualization after a pause.
 *
 * Restores the spacer, re-attaches the rAF-throttled scroll listener,
 * and immediately rebuilds the viewport window using the height cache.
 * This avoids a full re-render while still catching up on any scroll
 * movement that happened during the paused state.
 */
function resumeVirtualScroll() {
  if (!_vsEnabled || !virtualScrollContainer) return;

  virtualScrollPlaceholder.style.display = '';
  virtualScrollScrollHandler = () => {
    if (virtualScrollRafId) return;
    virtualScrollRafId = requestAnimationFrame(() => {
      updateVirtualScrollWindow();
      virtualScrollRafId = null;
    });
  };
  virtualScrollContainer.addEventListener('scroll', virtualScrollScrollHandler, { passive: true });
  updateVirtualScrollWindow();
}

function invalidateVirtualHeightCacheForGroup(groupId) {
  if (!_vsEnabled) return;
  const card = virtualScrollContainer.querySelector(`[data-domain-id="${groupId}"]`);
  if (card) {
    virtualScrollGroupHeights.set(groupId, card.offsetHeight);
  } else {
    virtualScrollGroupHeights.delete(groupId);
  }
  recalcTopPositions();
}

function invalidateAllVirtualHeights() {
  virtualScrollGroupHeights.clear();
  if (virtualScrollContainer) {
    recalcVirtualScrollHeights();
    recalcTopPositions();
  }
}