async function renderDeferredColumn() {
  const column         = document.getElementById('deferredColumn');
  const list           = document.getElementById('deferredList');
  const empty          = document.getElementById('deferredEmpty');
  const countEl        = document.getElementById('deferredCount');
  const archiveEl      = document.getElementById('deferredArchive');
  const archiveCountEl = document.getElementById('archiveCount');
  const archiveList    = document.getElementById('archiveList');

  if (!column) return;

  try {
    const { active, archived } = await getSavedTabs();

    if (active.length === 0 && archived.length === 0) {
      column.style.display = 'none';
      return;
    }

    column.style.display = 'block';

    if (active.length > 0) {
      countEl.textContent = `${active.length} item${active.length !== 1 ? 's' : ''}`;
      list.innerHTML = active.map(item => renderDeferredItem(item)).join('');
      list.style.display = 'block';
      empty.style.display = 'none';
    } else {
      list.style.display = 'none';
      countEl.textContent = '';
      empty.style.display = 'block';
    }

    if (archived.length > 0) {
      archiveCountEl.textContent = `(${archived.length})`;
      archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
      archiveEl.style.display = 'block';
    } else {
      archiveEl.style.display = 'none';
    }

  } catch (err) {
    console.warn('[tab-out] Could not load saved tabs:', err);
    column.style.display = 'none';
  }
}

function renderDeferredItem(item) {
  let domain = '';
  try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  const ago = timeAgo(item.savedAt);

  return `
    <div class="deferred-item" data-deferred-id="${item.id}">
      <input type="checkbox" class="deferred-checkbox" data-action="check-deferred" data-deferred-id="${item.id}">
      <div class="deferred-info">
        <a href="${item.url}" target="_blank" rel="noopener" class="deferred-title" title="${(item.title || '').replace(/"/g, '&quot;')}">
          <img src="${faviconUrl}" alt="" class="deferred-favicon" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px">${item.title || item.url}
        </a>
        <div class="deferred-meta">
          <span>${domain}</span>
          <span>${ago}</span>
        </div>
      </div>
      <button class="deferred-dismiss" data-action="dismiss-deferred" data-deferred-id="${item.id}" title="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>`;
}

function renderArchiveItem(item) {
  const ago = item.completedAt ? timeAgo(item.completedAt) : timeAgo(item.savedAt);
  return `
    <div class="archive-item">
      <a href="${item.url}" target="_blank" rel="noopener" class="archive-item-title" title="${(item.title || '').replace(/"/g, '&quot;')}">
        ${item.title || item.url}
      </a>
      <span class="archive-item-date">${ago}</span>
    </div>`;
}

function renderQuickLinks() {
  getQuickLinks().then(links => {
    const listEl = document.getElementById('quickLinksList');
    const emptyEl = document.getElementById('quickLinksEmpty');
    if (!listEl || !emptyEl) return;

    if (links.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = links.map(link => {
      let hostname = '';
      let faviconUrl = '';
      let initial = '';
      try {
        const urlObj = new URL(link.url);
        hostname = urlObj.hostname.replace(/^www\./, '');
        faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
        initial = hostname.charAt(0).toUpperCase();
      } catch {}
      const safeUrl = (link.url || '').replace(/"/g, '&quot;');
      const escapedTitle = escapeHtml(link.title || hostname || link.url);
      const escapedHostname = escapeHtml(hostname || link.url);
      return `
        <div class="quick-link-item" data-action="open-quick-link" data-link-url="${safeUrl}" title="${escapedTitle}">
          <div class="quick-link-initial" data-initial-for="${escapedHostname}">${initial}</div>
          ${faviconUrl ? `<img class="quick-link-favicon" src="${faviconUrl}" alt="" data-hostname="${escapedHostname}">` : ''}
          <button class="quick-link-menu" data-action="edit-quick-link" data-link-id="${link.id}" data-link-url="${safeUrl}" data-link-title="${escapeHtml(link.title || hostname || link.url)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
          </button>
        </div>`;
    }).join('');
  });
}

function renderTodos() {
  getTodos().then(todos => {
    const listEl = document.getElementById('todoList');
    const emptyEl = document.getElementById('todoEmpty');
    if (!listEl || !emptyEl) return;

    if (todos.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = todos.map(todo => {
      const escapedText = escapeHtml(todo.text);
      return `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
          <input type="checkbox" class="todo-checkbox" data-action="toggle-todo" data-todo-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
          <span class="todo-text">${escapedText}</span>
          <button class="todo-delete" data-action="delete-todo" data-todo-id="${todo.id}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>`;
    }).join('');
  });
}