const DEFAULT_WORKSPACES = [
  {
    id: 'all',
    name: 'All',
    icon: '🌐',
    patterns: [],
    isPreset: true,
  },
  {
    id: 'development',
    name: 'Development',
    icon: '💻',
    patterns: [
      'github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org',
      'localhost', '127.0.0.1', 'codepen.io', 'codesandbox.io',
      'dev.to', 'medium.com', 'hashnode.dev', 'gitee.com',
    ],
    isPreset: true,
  },
  {
    id: 'ai-tools',
    name: 'AI Tools',
    icon: '🤖',
    patterns: [
      'chat.openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com',
      'gemini.google.com', 'bard.google.com', 'perplexity.ai',
      'deepseek.com', 'chat.deepseek.com', 'platform.deepseek.com',
      'poe.com', 'cursor.sh', 'github.com/copilot',
    ],
    isPreset: true,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    icon: '📚',
    patterns: [
      'docs.', 'developers.', 'developer.', 'documentation.',
      'api.', 'doc.','readthedocs.io', 'mdn.',
      'developers.weixin.qq.com', 'react.dev', 'vuejs.org',
      'nodejs.org', 'python.org', 'rust-lang.org',
      'pkg.go.dev', 'golang.org',
    ],
    isPreset: true,
  },
  {
    id: 'reading',
    name: 'Reading',
    icon: '📖',
    patterns: [
      'medium.com', 'juejin.cn', 'zhihu.com', 'reddit.com',
      'news.ycombinator.com', 'hackernoon.com', 'dev.to',
      'blog.', 'article.', 'substack.com',
    ],
    isPreset: true,
  },
];

let workspaces = [];
let currentWorkspaceId = 'all';

function patternMatchesDomain(pattern, domain) {
  const p = pattern.toLowerCase();
  const d = domain.toLowerCase();
  if (p.startsWith('.') || p.endsWith('.') || p.includes('.')) {
    return d === p || d.endsWith('.' + p) || d.includes(p);
  }
  return d.includes(p);
}

async function loadWorkspaces() {
  try {
    const result = await chrome.storage.local.get(['workspaces', 'currentWorkspaceId']);
    if (result.workspaces && Array.isArray(result.workspaces) && result.workspaces.length > 0) {
      workspaces = result.workspaces;
    } else {
      workspaces = [...DEFAULT_WORKSPACES];
      await chrome.storage.local.set({ workspaces });
    }
    if (result.currentWorkspaceId) {
      currentWorkspaceId = result.currentWorkspaceId;
    }

    let needsSave = false;

    workspaces.forEach(targetWs => {
      if (targetWs.id === 'all' || !targetWs.patterns) return;

      targetWs.patterns.forEach(targetPattern => {
        workspaces.forEach(ws => {
          if (ws.id === 'all' || ws.id === targetWs.id || !ws.patterns) return;

          const hadOverlap = ws.patterns.some(p => {
            if (patternMatchesDomain(p, targetPattern)) return true;
            if (patternMatchesDomain(targetPattern, p)) return true;
            return false;
          });

          if (hadOverlap) {
            ws.patterns = ws.patterns.filter(p => {
              if (patternMatchesDomain(p, targetPattern)) return false;
              if (patternMatchesDomain(targetPattern, p)) return false;
              return true;
            });
            needsSave = true;
          }
        });
      });
    });

    if (needsSave) {
      await saveWorkspaces();
    }
  } catch (err) {
    console.warn('[tab-out] Failed to load workspaces:', err);
    workspaces = [...DEFAULT_WORKSPACES];
  }
}

async function saveWorkspaces() {
  try {
    await chrome.storage.local.set({ workspaces, currentWorkspaceId });
  } catch (err) {
    console.warn('[tab-out] Failed to save workspaces:', err);
  }
}

function tabMatchesWorkspace(tab, workspace) {
  if (workspace.id === 'all') {
    return true;
  }
  if (!workspace.patterns || workspace.patterns.length === 0) {
    return false;
  }
  let hostname = '';
  try {
    hostname = new URL(tab.url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return workspace.patterns.some(pattern => {
    const p = pattern.toLowerCase();
    if (p.startsWith('.') || p.endsWith('.') || p.includes('.')) {
      return hostname === p || hostname.endsWith('.' + p) || hostname.includes(p);
    }
    return hostname.includes(p);
  });
}

function countTabsInWorkspace(workspace) {
  if (workspace.id === 'all') return openTabs.filter(t => !t.isTabOut).length;
  return openTabs.filter(t => !t.isTabOut && tabMatchesWorkspace(t, workspace)).length;
}

function filterDomainGroupsByWorkspace(groups, workspaceId) {
  const workspace = workspaces.find(w => w.id === workspaceId);
  if (!workspace || workspace.id === 'all') return groups;

  return groups
    .map(group => {
      const filteredTabs = group.tabs.filter(tab => tabMatchesWorkspace(tab, workspace));
      if (filteredTabs.length === 0) return null;
      return { ...group, tabs: filteredTabs };
    })
    .filter(Boolean);
}

function renderWorkspaceBar() {
  const bar = document.getElementById('workspaceBar');
  if (!bar) return;

  const tabsHtml = workspaces.map(ws => {
    const count = countTabsInWorkspace(ws);
    const isActive = ws.id === currentWorkspaceId;
    const canDelete = ws.id !== 'all';
    const deleteBtn = canDelete
      ? `<button class="ws-delete" data-action="delete-workspace" data-workspace-id="${ws.id}" title="Delete workspace">
           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
         </button>`
      : '';
    return `
      <div class="workspace-tab ${isActive ? 'active' : ''}" data-workspace-id="${ws.id}" data-action="switch-workspace">
        <span class="ws-icon">${ws.icon}</span>
        <span>${ws.name}</span>
        <span class="ws-count">${count}</span>
        ${deleteBtn}
      </div>`;
  }).join('');

  bar.innerHTML = `
    ${tabsHtml}
    <div class="workspace-add" data-action="add-workspace" title="New workspace">+</div>
  `;
}

function switchWorkspace(workspaceId) {
  currentWorkspaceId = workspaceId;
  saveWorkspaces();
  renderWorkspaceBar();
  renderDashboard();
}

async function addWorkspace(name) {
  if (!name || !name.trim()) return;
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!id) return;
  if (workspaces.some(w => w.id === id)) {
    showToast('Workspace already exists');
    return;
  }
  const newWs = {
    id,
    name: name.trim(),
    icon: '📁',
    patterns: [],
    isPreset: false,
  };
  workspaces.push(newWs);
  await saveWorkspaces();
  renderWorkspaceBar();
  showToast(`Created workspace "${name.trim()}"`);
}

async function deleteWorkspace(id) {
  const ws = workspaces.find(w => w.id === id);
  if (!ws || id === 'all') return;

  const confirmed = await showCustomConfirm({
    title: 'Delete Workspace',
    message: `Delete workspace "${ws.name}"? This cannot be undone.`,
    confirmText: 'Delete',
  });
  if (!confirmed) return;

  workspaces = workspaces.filter(w => w.id !== id);
  if (currentWorkspaceId === id) {
    currentWorkspaceId = 'all';
  }
  await saveWorkspaces();
  renderWorkspaceBar();
  renderDashboard();
  showToast(`Deleted workspace "${ws.name}"`);
}

let draggedDomain = null;

async function checkAndShowDragHint() {
  const result = await chrome.storage.local.get('hasSeenDragHint');
  if (!result.hasSeenDragHint) {
    const overlay = document.getElementById('dragHintOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }
}

async function markDragHintSeen() {
  await chrome.storage.local.set({ hasSeenDragHint: true });
  const overlay = document.getElementById('dragHintOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}