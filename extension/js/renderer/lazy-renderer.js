const PAGE_SIZE = 10;
let lazyObserver = null;
let lazyCurrentPage = 0;
let lazyTotalPages = 0;
let lazySentinelEl = null;
let lazyContainerEl = null;
let lazyGroups = [];
let lazyAllRendered = false;

/**
 * Starts incremental lazy rendering of domain group cards.
 *
 * Renders the first page of PAGE_SIZE (10) groups immediately, then
 * appends a zero-height sentinel element below the rendered content.
 * An IntersectionObserver with 100px rootMargin watches the sentinel —
 * when it enters the viewport (i.e. the user scrolls near the end of
 * currently-rendered cards), the next page is rendered and the sentinel
 * is repositioned. This keeps the initial paint fast while ensuring
 * all groups eventually become visible with no manual triggers.
 *
 * @param {HTMLElement} containerEl - The parent element to insert cards into
 * @param {Array} groups - Domain groups to render lazily
 * @param {Function} renderCallback - Optional hook fired after each page renders
 */
function initLazyRenderer(containerEl, groups, renderCallback) {
  lazyContainerEl = containerEl;
  lazyGroups = groups;
  lazyCurrentPage = 0;
  lazyAllRendered = false;
  lazyTotalPages = Math.ceil(groups.length / PAGE_SIZE);

  lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !lazyAllRendered) {
        renderNextPage(renderCallback);
      }
    });
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0
  });

  renderNextPage(renderCallback);
}

/**
 * Renders the next page of groups and repositions the sentinel.
 *
 * On page 0 the container's innerHTML is replaced (full first paint);
 * subsequent pages use insertAdjacentHTML for appending. After rendering,
 * the old sentinel is removed and a new one is appended after the latest
 * page so the IntersectionObserver can trigger the next batch. When all
 * pages are rendered, the sentinel is omitted and lazyAllRendered is set
 * so callers (e.g. search) know the DOM is complete.
 *
 * @param {Function} renderCallback - Optional hook fired after page renders
 */
function renderNextPage(renderCallback) {
  const start = lazyCurrentPage * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, lazyGroups.length);
  const pageGroups = lazyGroups.slice(start, end);

  if (lazySentinelEl && lazySentinelEl.parentNode) {
    if (lazyObserver) {
      lazyObserver.unobserve(lazySentinelEl);
    }
    lazySentinelEl.remove();
  }

  const html = pageGroups.map(g => renderDomainCard(g)).join('');

  if (lazyCurrentPage === 0) {
    lazyContainerEl.innerHTML = html;
  } else {
    lazyContainerEl.insertAdjacentHTML('beforeend', html);
  }

  lazyCurrentPage++;

  if (lazyCurrentPage < lazyTotalPages) {
    lazySentinelEl = document.createElement('div');
    lazySentinelEl.className = 'lazy-sentinel';
    lazySentinelEl.style.cssText = 'height: 1px; width: 100%;';
    lazyContainerEl.appendChild(lazySentinelEl);
    if (lazyObserver) {
      lazyObserver.observe(lazySentinelEl);
    }
  } else {
    lazyAllRendered = true;
  }

  if (typeof clearGroupCardMap === 'function') {
    clearGroupCardMap();
  }
}

/**
 * Immediately renders all remaining pages and disables the lazy observer.
 *
 * Called when search is activated: the search filter needs every card
 * in the DOM to toggle visibility individually, so incremental rendering
 * won't work. This disconnects the IntersectionObserver, renders all
 * remaining groups in one shot, removes the sentinel, and marks the
 * renderer as fully complete so subsequent searches don't re-flush.
 *
 * @param {Function} renderCallback - Optional hook fired after full render
 */
function renderAllLazy(renderCallback) {
  if (lazyAllRendered) return;

  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }

  const start = lazyCurrentPage * PAGE_SIZE;
  const remainingGroups = lazyGroups.slice(start);

  if (remainingGroups.length > 0) {
    const html = remainingGroups.map(g => renderDomainCard(g)).join('');
    lazyContainerEl.insertAdjacentHTML('beforeend', html);
  }

  if (lazySentinelEl && lazySentinelEl.parentNode) {
    lazySentinelEl.remove();
  }

  lazyCurrentPage = lazyTotalPages;
  lazyAllRendered = true;

  if (typeof clearGroupCardMap === 'function') {
    clearGroupCardMap();
  }
}

function resetLazyRenderer() {
  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }
  lazyCurrentPage = 0;
  lazyAllRendered = false;
  lazySentinelEl = null;
  lazyGroups = [];
  lazyContainerEl = null;
}

function isLazyAllRendered() {
  return lazyAllRendered;
}