document.addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  if (action === 'toolbar-search') {
    focusSearch();
    return;
  }

  if (action === 'toolbar-suspend') {
    await suspendTabs();
    return;
  }

  if (action === 'toolbar-save-session') {
    openSaveSessionModal();
    return;
  }

  if (action === 'toolbar-settings') {
    openSettings();
    return;
  }

  if (action === 'close-save-session-modal') {
    closeSaveSessionModal();
    return;
  }

  if (action === 'do-save-session') {
    await saveSession();
    return;
  }

  if (action === 'delete-session') {
    e.stopPropagation();
    const index = parseInt(actionEl.dataset.sessionIndex);
    if (!isNaN(index)) await deleteSession(index);
    return;
  }

  if (action === 'close-drawer') {
    closeSettings();
    return;
  }

  if (action === 'save-settings') {
    await saveSettings();
    return;
  }

  if (action === 'clear-all-data') {
    await clearAllData();
    return;
  }
});

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.toggle[data-setting]');
  if (!toggle) return;

  toggle.classList.toggle('on');
});

document.addEventListener('click', (e) => {
  const sessionItem = e.target.closest('.session-item[data-session-index]');
  if (!sessionItem) return;

  const actionBtn = e.target.closest('.session-action');
  if (actionBtn) return;

  const index = parseInt(sessionItem.dataset.sessionIndex);
  if (!isNaN(index)) restoreSession(index);
});

document.addEventListener('click', (e) => {
  const modal = document.getElementById('saveSessionModal');
  if (!modal) return;

  if (e.target === modal) {
    closeSaveSessionModal();
  }

  const closeBtn = e.target.closest('#saveSessionModalClose');
  if (closeBtn) {
    closeSaveSessionModal();
  }

  const cancelBtn = e.target.closest('#saveSessionModalCancel');
  if (cancelBtn) {
    closeSaveSessionModal();
  }

  const confirmBtn = e.target.closest('#saveSessionModalConfirm');
  if (confirmBtn) {
    saveSession();
  }
});

document.addEventListener('click', (e) => {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('settingsDrawer');

  if (!overlay || !drawer) return;

  if (e.target === overlay) {
    closeSettings();
  }

  const closeBtn = e.target.closest('#drawerClose');
  if (closeBtn) {
    closeSettings();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSettings();
    closeSaveSessionModal();
  }
});