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
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (settings.theme === 'system') {
      applyTheme(e.matches ? 'dark' : 'warm-light');
    }
  });
}

const THEME_VARIABLES = {
  'warm-light': {
    '--ink': '#1a1613',
    '--paper': '#f8f5f0',
    '--warm-gray': '#e8e2da',
    '--muted': '#9a918a',
    '--accent-amber': '#c8713a',
    '--accent-sage': '#5a7a62',
    '--accent-slate': '#5a6b7a',
    '--accent-rose': '#b35a5a',
    '--status-active': '#3d7a4a',
    '--status-cooling': '#b8892e',
    '--status-abandoned': '#b35a5a',
    '--card-bg': '#fffdf9',
    '--shadow': 'rgba(26, 22, 19, 0.06)'
  },
  'cool-light': {
    '--ink': '#1a1d24',
    '--paper': '#f4f6f8',
    '--warm-gray': '#dde1e6',
    '--muted': '#7a8599',
    '--accent-amber': '#c8713a',
    '--accent-sage': '#4a90a4',
    '--accent-slate': '#5a6b7a',
    '--accent-rose': '#c44569',
    '--status-active': '#3d7a4a',
    '--status-cooling': '#b8892e',
    '--status-abandoned': '#c44569',
    '--card-bg': '#ffffff',
    '--shadow': 'rgba(26, 29, 36, 0.06)'
  },
  'dark': {
    '--ink': '#f0ebe6',
    '--paper': '#1a1613',
    '--warm-gray': '#3a3530',
    '--muted': '#9a918a',
    '--accent-amber': '#d4a574',
    '--accent-sage': '#7ab88a',
    '--accent-slate': '#8ba3b8',
    '--accent-rose': '#d47878',
    '--status-active': '#5aa06a',
    '--status-cooling': '#d4a574',
    '--status-abandoned': '#d47878',
    '--card-bg': '#2a2520',
    '--shadow': 'rgba(0, 0, 0, 0.3)'
  }
};

function applyTheme(theme) {
  const root = document.documentElement;
  const variables = THEME_VARIABLES[theme] || THEME_VARIABLES['warm-light'];
  
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
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

  let themeToApply = settings.theme;
  if (themeToApply === 'system') {
    themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'warm-light';
  }
  applyTheme(themeToApply);
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
  applySettings();
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