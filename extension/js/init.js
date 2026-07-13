(async function init() {
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

loadSettings();