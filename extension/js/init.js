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
let _pendingRefresh = false;

function scheduleRefresh(delay = 300) {
  _pendingRefresh = true;
  if (_refreshTimer) return;
  _refreshTimer = setTimeout(async () => {
    _refreshTimer = null;
    if (!_pendingRefresh) return;
    _pendingRefresh = false;
    try {
      await renderDashboard();
    } catch (e) {
      console.error('[tab-out] refresh failed:', e);
    }
  }, delay);
}

chrome.tabs.onCreated.addListener(() => scheduleRefresh(0));
chrome.tabs.onRemoved.addListener(() => scheduleRefresh(0));
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.audible !== undefined) {
    scheduleRefresh(500);
  }
});
chrome.tabs.onActivated.addListener(() => scheduleRefresh(200));
chrome.tabs.onAttached.addListener(() => scheduleRefresh(200));
chrome.tabs.onDetached.addListener(() => scheduleRefresh(200));
chrome.windows.onCreated.addListener(() => scheduleRefresh(200));
chrome.windows.onRemoved.addListener(() => scheduleRefresh(200));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleRefresh(0);
});
