let savedSessions = [];

async function loadSavedSessions() {
  const result = await chrome.storage.local.get('savedSessions');
  savedSessions = result.savedSessions || [];
  renderSavedSessions();
}

function renderSavedSessions() {
  const list = document.getElementById('savedSessionsList');
  if (!list) return;

  if (savedSessions.length === 0) {
    list.innerHTML = '<div class="session-empty">No saved sessions yet.</div>';
    return;
  }

  list.innerHTML = savedSessions.map((session, index) => `
    <div class="session-item" data-session-index="${index}">
      <div class="session-icon">💾</div>
      <div class="session-info">
        <div class="session-name">${escapeHtml(session.name)}</div>
        <div class="session-meta">${session.tabCount} tabs · ${formatDate(session.timestamp)}</div>
      </div>
      <button class="session-action" data-action="delete-session" data-session-index="${index}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  `).join('');
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function openSaveSessionModal() {
  const modal = document.getElementById('saveSessionModal');
  const input = document.getElementById('saveSessionInput');
  const desc = document.getElementById('saveSessionDesc');

  if (!modal || !input) return;

  chrome.tabs.query({}, (tabs) => {
    const count = tabs.length;
    desc.textContent = `Save all ${count} tabs as a named session you can restore later.`;
  });

  input.value = '';
  modal.style.display = 'flex';
  input.focus();

  if (currentPromptKeydownHandler) {
    document.removeEventListener('keydown', currentPromptKeydownHandler);
    currentPromptKeydownHandler = null;
  }

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeSaveSessionModal();
    } else if (e.key === 'Enter') {
      e.stopPropagation();
      saveSession();
    }
  };

  currentPromptKeydownHandler = handleKeydown;
  document.addEventListener('keydown', handleKeydown);
}

function closeSaveSessionModal() {
  const modal = document.getElementById('saveSessionModal');
  if (modal) modal.style.display = 'none';

  if (currentPromptKeydownHandler) {
    document.removeEventListener('keydown', currentPromptKeydownHandler);
    currentPromptKeydownHandler = null;
  }
}

async function saveSession() {
  const input = document.getElementById('saveSessionInput');
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    input.style.borderColor = '#b35a5a';
    setTimeout(() => input.style.borderColor = '', 1000);
    return;
  }

  const tabs = await chrome.tabs.query({});
  const sessionData = {
    name,
    tabCount: tabs.length,
    timestamp: Date.now(),
    tabs: tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned
    }))
  };

  savedSessions.unshift(sessionData);
  await chrome.storage.local.set({ savedSessions });
  renderSavedSessions();
  closeSaveSessionModal();
  showToast(`Saved "${name}" (${tabs.length} tabs)`);
}

async function deleteSession(index) {
  savedSessions.splice(index, 1);
  await chrome.storage.local.set({ savedSessions });
  renderSavedSessions();
}

async function restoreSession(index) {
  const session = savedSessions[index];
  if (!session) return;

  for (const tab of session.tabs) {
    await chrome.tabs.create({ url: tab.url, pinned: tab.pinned });
  }

  showToast(`Restored "${session.name}" (${session.tabCount} tabs)`);
}