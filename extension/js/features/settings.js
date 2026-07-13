let settings = {
  showTabAge: true,
  warnOldTabs: true,
  theme: 'warm-light',
  compactMode: false,
  autoGroupByDomain: true,
  showWorkspaceBar: true
};

async function loadSettings() {
  const result = await chrome.storage.local.get('tabOutSettings');
  settings = { ...settings, ...(result.tabOutSettings || {}) };
  applySettings();
}

function applySettings() {
  document.querySelectorAll('.toggle[data-setting]').forEach(toggle => {
    const settingName = toggle.dataset.setting;
    if (settings[settingName]) {
      toggle.classList.add('on');
    } else {
      toggle.classList.remove('on');
    }
  });

  document.querySelectorAll('.setting-select[data-setting]').forEach(select => {
    const settingName = select.dataset.setting;
    if (settings[settingName]) {
      select.value = settings[settingName];
    }
  });
}

function openSettings() {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('settingsDrawer');

  if (!overlay || !drawer) return;

  loadSavedSessions();

  overlay.style.display = 'block';
  setTimeout(() => {
    overlay.classList.add('visible');
    drawer.classList.add('visible');
  }, 10);
}

function closeSettings() {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('settingsDrawer');

  if (!overlay || !drawer) return;

  overlay.classList.remove('visible');
  drawer.classList.remove('visible');

  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
}

async function saveSettings() {
  document.querySelectorAll('.toggle[data-setting]').forEach(toggle => {
    const settingName = toggle.dataset.setting;
    settings[settingName] = toggle.classList.contains('on');
  });

  document.querySelectorAll('.setting-select[data-setting]').forEach(select => {
    const settingName = select.dataset.setting;
    settings[settingName] = select.value;
  });

  await chrome.storage.local.set({ tabOutSettings: settings });
  closeSettings();
  showToast('Settings saved');
}

async function clearAllData() {
  const confirmed = await showCustomConfirm({
    title: 'Clear All Data',
    message: 'Are you sure you want to clear all data including sessions, settings, and history? This cannot be undone.'
  });

  if (!confirmed) return;

  await chrome.storage.local.clear();
  savedSessions = [];
  settings = {
    showTabAge: true,
    warnOldTabs: true,
    theme: 'warm-light',
    compactMode: false,
    autoGroupByDomain: true,
    showWorkspaceBar: true
  };

  renderSavedSessions();
  applySettings();
  showToast('All data cleared');
}

async function suspendTabs() {
  const tabs = await chrome.tabs.query({});
  const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
  const inactiveCount = tabs.length - activeTab.length;

  if (inactiveCount === 0) {
    showToast('No inactive tabs to suspend');
    return;
  }

  for (const tab of tabs) {
    if (tab.id !== activeTab[0]?.id && !tab.pinned) {
      try {
        await chrome.tabs.discard(tab.id);
      } catch (e) {}
    }
  }

  showToast(`Suspended ${inactiveCount} tabs · Freed memory`);
  await renderDashboard();
}