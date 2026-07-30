(async function init() {
  await loadSettings();
  await loadWorkspaces();
  await renderDashboard();
  checkAndShowDragHint();
})();

setInterval(() => {
  const timeEl = document.getElementById('timeDisplay');
  if (timeEl) timeEl.textContent = getTimeDisplay();
}, 1000);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.quickLinks) renderQuickLinks();
  if (changes.todos) renderTodos();
});

let _refreshTimer = null;
let _lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 1000;

function scheduleRefresh(delay = 300) {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(async () => {
    _refreshTimer = null;
    const now = Date.now();
    if (now - _lastRefreshTime < MIN_REFRESH_INTERVAL) {
      _refreshTimer = setTimeout(async () => {
        _refreshTimer = null;
        _lastRefreshTime = Date.now();
        try {
          await renderDashboard();
        } catch (e) {
          console.error('[tab-out] refresh failed:', e);
        }
      }, MIN_REFRESH_INTERVAL);
      return;
    }
    _lastRefreshTime = now;
    try {
      await renderDashboard();
    } catch (e) {
      console.error('[tab-out] refresh failed:', e);
    }
  }, delay);
}

chrome.tabs.onCreated.addListener(() => scheduleRefresh(300));
chrome.tabs.onRemoved.addListener(() => scheduleRefresh(300));
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.audible !== undefined) {
    scheduleRefresh(500);
  }
});
chrome.tabs.onActivated.addListener(() => scheduleRefresh(300));
chrome.tabs.onAttached.addListener(() => scheduleRefresh(300));
chrome.tabs.onDetached.addListener(() => scheduleRefresh(300));
chrome.windows.onCreated.addListener(() => scheduleRefresh(300));
chrome.windows.onRemoved.addListener(() => scheduleRefresh(300));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleRefresh(300);
});
