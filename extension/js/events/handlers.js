document.addEventListener('click', async (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  if (action === 'close-drag-hint') {
    await markDragHintSeen();
    return;
  }

  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) {
      banner.style.transition = 'opacity 0.4s';
      banner.style.opacity = '0';
      setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400);
    }
    showToast('Closed extra Tab Out tabs');
    return;
  }

  const card = actionEl.closest('.mission-card');

  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement.querySelector('.page-chips-overflow');
    if (overflowContainer) {
      overflowContainer.style.display = 'contents';
      actionEl.remove();
    }
    return;
  }

  if (action === 'focus-tab') {
    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  if (action === 'close-single-tab') {
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;

    const allTabs = await chrome.tabs.query({});
    const match   = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    playCloseSound();

    const chip = actionEl.closest('.page-chip');
    if (chip) {
      const rect = chip.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        document.querySelectorAll('.mission-card').forEach(c => {
          const remaining = c.querySelectorAll('.page-chip[data-action="focus-tab"]').length;
          if (remaining === 0) {
            animateCardOut(c);
          } else {
            const badge = c.querySelector('.open-tabs-badge');
            if (badge) {
              badge.innerHTML = `${ICONS.tabs} ${remaining} tab${remaining !== 1 ? 's' : ''} open`;
            }
            const closeBtn = c.querySelector('.action-btn.close-tabs');
            if (closeBtn) {
              closeBtn.innerHTML = `${ICONS.close} Close all ${remaining} tab${remaining !== 1 ? 's' : ''}`;
            }
          }
        });
      }, 200);
    }

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    showToast('Tab closed');
    return;
  }

  if (action === 'defer-single-tab') {
    e.stopPropagation();
    const tabUrl   = actionEl.dataset.tabUrl;
    const tabTitle = actionEl.dataset.tabTitle || tabUrl;
    if (!tabUrl) return;

    try {
      await saveTabForLater({ url: tabUrl, title: tabTitle });
    } catch (err) {
      console.error('[tab-out] Failed to save tab:', err);
      showToast('Failed to save tab');
      return;
    }

    const allTabs = await chrome.tabs.query({});
    const match   = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    const chip = actionEl.closest('.page-chip');
    if (chip) {
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        document.querySelectorAll('.mission-card').forEach(c => {
          const remaining = c.querySelectorAll('.page-chip[data-action="focus-tab"]').length;
          if (remaining === 0) {
            animateCardOut(c);
          } else {
            const badge = c.querySelector('.open-tabs-badge');
            if (badge) {
              badge.innerHTML = `${ICONS.tabs} ${remaining} tab${remaining !== 1 ? 's' : ''} open`;
            }
            const closeBtn = c.querySelector('.action-btn.close-tabs');
            if (closeBtn) {
              closeBtn.innerHTML = `${ICONS.close} Close all ${remaining} tab${remaining !== 1 ? 's' : ''}`;
            }
          }
        });
      }, 200);
    }

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    showToast('Saved for later');
    await renderDeferredColumn();
    return;
  }

  if (action === 'check-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await checkOffSavedTab(id);

    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('checked');
      setTimeout(() => {
        item.classList.add('removing');
        setTimeout(() => {
          item.remove();
          renderDeferredColumn();
        }, 300);
      }, 800);
    }
    return;
  }

  if (action === 'dismiss-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await dismissSavedTab(id);

    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('removing');
      setTimeout(() => {
        item.remove();
        renderDeferredColumn();
      }, 300);
    }
    return;
  }

  if (action === 'close-domain-tabs') {
    const domainId = actionEl.dataset.domainId;
    const group    = domainGroups.find(g => {
      return 'domain-' + g.domain.replace(/[^a-z0-9]/g, '-') === domainId;
    });
    if (!group) return;

    const urls      = group.tabs.map(t => t.url);
    const useExact  = group.domain === '__landing-pages__' || !!group.label;

    if (useExact) {
      await closeTabsExact(urls);
    } else {
      await closeTabsByUrls(urls);
    }

    await fetchOpenTabs();

    if (card) {
      playCloseSound();
      animateCardOut(card);
    }

    const idx = domainGroups.indexOf(group);
    if (idx !== -1) domainGroups.splice(idx, 1);

    const groupLabel = group.domain === '__landing-pages__' ? 'Homepages' : (group.label || friendlyDomain(group.domain));
    showToast(`Closed ${urls.length} tab${urls.length !== 1 ? 's' : ''} from ${groupLabel}`);

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    const openTabsSectionCount = document.getElementById('openTabsSectionCount');
    if (openTabsSectionCount) {
      openTabsSectionCount.innerHTML = `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;">${ICONS.close} Close all ${openTabs.length} tabs</button>`;
    }
    return;
  }

  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;

    await closeDuplicateTabs(urls, true);
    playCloseSound();

    actionEl.style.transition = 'opacity 0.2s';
    actionEl.style.opacity    = '0';
    setTimeout(() => actionEl.remove(), 200);

    if (card) {
      card.querySelectorAll('.chip-dupe-badge').forEach(b => {
        b.style.transition = 'opacity 0.2s';
        b.style.opacity    = '0';
        setTimeout(() => b.remove(), 200);
      });
      card.querySelectorAll('.open-tabs-badge').forEach(badge => {
        if (badge.textContent.includes('duplicate')) {
          badge.style.transition = 'opacity 0.2s';
          badge.style.opacity    = '0';
          setTimeout(() => badge.remove(), 200);
        }
      });
      card.classList.remove('has-amber-bar');
      card.classList.add('has-neutral-bar');
    }

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    const openTabsSectionCount = document.getElementById('openTabsSectionCount');
    if (openTabsSectionCount) {
      openTabsSectionCount.innerHTML = `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;">${ICONS.close} Close all ${openTabs.length} tabs</button>`;
    }

    showToast('Closed duplicates, kept one copy each');
    return;
  }

  if (action === 'close-all-open-tabs') {
    const allUrls = openTabs
      .filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'))
      .map(t => t.url);
    await closeTabsByUrls(allUrls);
    await fetchOpenTabs();
    playCloseSound();

    document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
      shootConfetti(
        c.getBoundingClientRect().left + c.offsetWidth / 2,
        c.getBoundingClientRect().top  + c.offsetHeight / 2
      );
      animateCardOut(c);
    });

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    const openTabsSectionCount = document.getElementById('openTabsSectionCount');
    if (openTabsSectionCount) {
      openTabsSectionCount.innerHTML = `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;">${ICONS.close} Close all ${openTabs.length} tabs</button>`;
    }

    showToast('All tabs closed. Fresh start.');
    return;
  }

  if (action === 'open-quick-link') {
    let url = actionEl.dataset.linkUrl;
    if (!url) return;
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
      url = 'https://' + url;
    }
    chrome.tabs.create({ url });
    return;
  }

  if (action === 'add-quick-link') {
    const result = await showQuickLinkModal({
      title: 'Add Quick Link'
    });
    if (!result) return;
    let formattedUrl = result.url;
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    await saveQuickLink({ url: formattedUrl, title: result.title || '' });
    renderQuickLinks();
    showToast('Quick link added');
    return;
  }

  if (action === 'edit-quick-link') {
    e.stopPropagation();
    const menu = document.getElementById('linkContextMenu');
    const id = actionEl.dataset.linkId;
    const currentUrl = actionEl.dataset.linkUrl;
    const currentTitle = actionEl.dataset.linkTitle;
    if (!id || !menu) return;

    if (currentLinkMenuCloseHandler) {
      document.removeEventListener('click', currentLinkMenuCloseHandler);
      currentLinkMenuCloseHandler = null;
    }

    const rect = actionEl.getBoundingClientRect();
    const menuWidth = 120;
    const menuHeight = 60;

    let left = rect.left + rect.width / 2 - menuWidth / 2;
    let top = rect.top + rect.height + 8;

    if (left < 0) left = 8;
    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
    if (top + menuHeight > window.innerHeight) top = rect.top - menuHeight - 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.display = 'block';

    menu.dataset.linkId = id;
    menu.dataset.linkUrl = currentUrl;
    menu.dataset.linkTitle = currentTitle;

    const closeMenu = (ev) => {
      menu.style.display = 'none';
      document.removeEventListener('click', closeMenu);
      currentLinkMenuCloseHandler = null;
    };
    currentLinkMenuCloseHandler = closeMenu;
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
    return;
  }

  if (action === 'delete-quick-link') {
    e.stopPropagation();
    const id = actionEl.dataset.linkId;
    if (!id) return;
    await deleteQuickLink(id);
    renderQuickLinks();
    return;
  }

  if (action === 'add-todo') {
    const text = await showCustomPrompt({
      title: 'Add Todo',
      label: 'Enter task:'
    });
    if (!text) return;
    await saveTodo(text);
    renderTodos();
    showToast('Todo added');
    return;
  }

  if (action === 'toggle-todo') {
    const id = actionEl.dataset.todoId;
    if (!id) return;
    await toggleTodo(id);
    renderTodos();
    return;
  }

  if (action === 'delete-todo') {
    e.stopPropagation();
    const id = actionEl.dataset.todoId;
    if (!id) return;
    await deleteTodo(id);
    renderTodos();
    return;
  }
});

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#archiveToggle');
  if (!toggle) return;

  toggle.classList.toggle('open');
  const body = document.getElementById('archiveBody');
  if (body) {
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  }
});

const closeLinkContextMenu = () => {
  const menu = document.getElementById('linkContextMenu');
  if (menu) menu.style.display = 'none';
  if (currentLinkMenuCloseHandler) {
    document.removeEventListener('click', currentLinkMenuCloseHandler);
    currentLinkMenuCloseHandler = null;
  }
};

window.addEventListener('scroll', closeLinkContextMenu);
window.addEventListener('resize', closeLinkContextMenu);

document.addEventListener('click', async (e) => {
  const menuItem = e.target.closest('.link-menu-item');
  if (!menuItem) return;

  const menu = document.getElementById('linkContextMenu');
  if (!menu) return;

  if (currentLinkMenuCloseHandler) {
    document.removeEventListener('click', currentLinkMenuCloseHandler);
    currentLinkMenuCloseHandler = null;
  }

  const menuAction = menuItem.dataset.menuAction;
  const id = menu.dataset.linkId;
  const currentUrl = menu.dataset.linkUrl;
  const currentTitle = menu.dataset.linkTitle;

  menu.style.display = 'none';

  if (menuAction === 'edit') {
    if (!id) return;

    const result = await showQuickLinkModal({
      title: 'Edit Quick Link',
      url: currentUrl,
      title: currentTitle
    });
    if (!result) return;
    if (!result.url.trim()) {
      showToast('URL cannot be empty');
      return;
    }

    let formattedUrl = result.url.trim();
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    await updateQuickLink(id, { url: formattedUrl, title: result.title || '' });
    renderQuickLinks();
    showToast('Quick link updated');
  } else if (menuAction === 'delete') {
    if (!id) return;
    await deleteQuickLink(id);
    renderQuickLinks();
    showToast('Quick link deleted');
  }
});

document.addEventListener('input', async (e) => {
  if (e.target.id !== 'archiveSearch') return;

  const q = e.target.value.trim().toLowerCase();
  const archiveList = document.getElementById('archiveList');
  if (!archiveList) return;

  try {
    const { archived } = await getSavedTabs();

    if (q.length < 2) {
      archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
      return;
    }

    const results = archived.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.url  || '').toLowerCase().includes(q)
    );

    archiveList.innerHTML = results.map(item => renderArchiveItem(item)).join('')
      || '<div style="font-size:12px;color:var(--muted);padding:8px 0">No results</div>';
  } catch (err) {
    console.warn('[tab-out] Archive search failed:', err);
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'searchInput') {
    filterTabs(e.target.value);
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    focusSearch();
  }
  if (e.key === 'Escape') {
    const input = document.getElementById('searchInput');
    if (input && document.activeElement === input) {
      input.value = '';
      filterTabs('');
      input.blur();
    }
  }
});

document.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('[data-action="delete-workspace"]');
  if (deleteBtn) {
    e.stopPropagation();
    const id = deleteBtn.dataset.workspaceId;
    if (id) await deleteWorkspace(id);
    return;
  }

  const wsTab = e.target.closest('[data-action="switch-workspace"]');
  if (wsTab) {
    const id = wsTab.dataset.workspaceId;
    if (id) switchWorkspace(id);
    return;
  }

  const addBtn = e.target.closest('[data-action="add-workspace"]');
  if (addBtn) {
    const name = await showCustomPrompt({
      title: 'New Workspace',
      label: 'Workspace name:',
      defaultValue: '',
    });
    if (name) {
      await addWorkspace(name);
    }
    return;
  }
});

document.addEventListener('contextmenu', async (e) => {
  const wsTab = e.target.closest('[data-action="switch-workspace"]');
  if (!wsTab) return;
  const id = wsTab.dataset.workspaceId;
  if (!id || id === 'all') return;

  e.preventDefault();
  await deleteWorkspace(id);
});

document.addEventListener('dragstart', (e) => {
  const target = e.target.closest('[data-drag-domain]');
  if (!target) return;
  draggedDomain = target.dataset.dragDomain;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', draggedDomain);
  }
  target.classList.add('dragging');
  document.getElementById('workspaceBar').classList.add('drop-active');
  markDragHintSeen();
});

document.addEventListener('dragend', (e) => {
  const target = e.target.closest('[data-drag-domain]');
  if (target) target.classList.remove('dragging');
  draggedDomain = null;
  document.querySelectorAll('.workspace-tab.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.getElementById('workspaceBar').classList.remove('drop-active');
});

document.addEventListener('dragover', (e) => {
  const wsTab = e.target.closest('.workspace-tab[data-workspace-id]');
  if (!wsTab) {
    document.querySelectorAll('.workspace-tab.drag-over').forEach(el => el.classList.remove('drag-over'));
    return;
  }
  const wsId = wsTab.dataset.workspaceId;
  if (wsId === 'all') return;

  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  document.querySelectorAll('.workspace-tab.drag-over').forEach(el => {
    if (el !== wsTab) el.classList.remove('drag-over');
  });
  wsTab.classList.add('drag-over');
});

document.addEventListener('dragleave', (e) => {
  const wsTab = e.target.closest('.workspace-tab');
  if (wsTab && !wsTab.contains(e.relatedTarget)) {
    wsTab.classList.remove('drag-over');
  }
});

document.addEventListener('drop', async (e) => {
  const wsTab = e.target.closest('.workspace-tab[data-workspace-id]');
  if (!wsTab) return;

  const wsId = wsTab.dataset.workspaceId;
  if (wsId === 'all') return;

  e.preventDefault();
  wsTab.classList.remove('drag-over');

  let domain = draggedDomain;
  if (!domain && e.dataTransfer) {
    domain = e.dataTransfer.getData('text/plain');
  }
  if (!domain) return;

  const normalizedDomain = domain.replace(/^www\./, '');

  const ws = workspaces.find(w => w.id === wsId);
  if (!ws) return;

  if (!ws.patterns) ws.patterns = [];
  const alreadyInTarget = ws.patterns.some(p => patternMatchesDomain(p, normalizedDomain));
  if (alreadyInTarget) {
    showToast(`"${domain}" already in ${ws.name}`);
    return;
  }

  workspaces.forEach(w => {
    if (w.id !== 'all' && w.id !== wsId && w.patterns) {
      w.patterns = w.patterns.filter(p => !patternMatchesDomain(p, normalizedDomain));
    }
  });

  ws.patterns.push(normalizedDomain);
  await saveWorkspaces();
  renderWorkspaceBar();
  renderDashboard();
  showToast(`Moved "${domain}" to ${ws.name}`);
});

document.addEventListener('error', (e) => {
  const target = e.target;
  if (target && target.tagName === 'IMG') {
    if (target.classList.contains('chip-favicon') ||
        target.classList.contains('quick-link-favicon') ||
        target.classList.contains('deferred-favicon')) {
      target.style.display = 'none';
    }
  }
}, true);

document.addEventListener('load', (e) => {
  const target = e.target;
  if (target && target.tagName === 'IMG' && target.classList.contains('quick-link-favicon')) {
    const initial = target.previousElementSibling;
    if (initial && initial.classList.contains('quick-link-initial')) {
      initial.style.display = 'none';
    }
  }
}, true);