let _renderingInProgress = false;
let _renderPending = false;

async function renderStaticDashboard() {
  if (_renderingInProgress) {
    _renderPending = true;
    return;
  }
  _renderingInProgress = true;

  try {
    if (typeof hideTabPreview === 'function') {
      hideTabPreview();
    }

    const greetingEl = document.getElementById('greeting');
    const timeEl     = document.getElementById('timeDisplay');
    const dateEl     = document.getElementById('dateDisplay');
    if (greetingEl) greetingEl.textContent = getGreeting();
    if (timeEl)     timeEl.textContent     = getTimeDisplay();
    if (dateEl)     dateEl.textContent     = getDateDisplay();

    renderQuickLinks();
    renderTodos();

    await fetchOpenTabs();
    const realTabs = getRealTabs();

    const LANDING_PAGE_PATTERNS = [
      { hostname: 'mail.google.com', test: (p, h) =>
          !h.includes('#inbox/') && !h.includes('#sent/') && !h.includes('#search/') },
      { hostname: 'x.com',               pathExact: ['/home'] },
      { hostname: 'www.linkedin.com',    pathExact: ['/'] },
      { hostname: 'github.com',          pathExact: ['/'] },
      { hostname: 'www.youtube.com',     pathExact: ['/'] },
      ...(typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined' ? LOCAL_LANDING_PAGE_PATTERNS : []),
    ];

    function isLandingPage(url) {
      try {
        const parsed = new URL(url);
        return LANDING_PAGE_PATTERNS.some(p => {
          const hostnameMatch = p.hostname
            ? parsed.hostname === p.hostname
            : p.hostnameEndsWith
              ? parsed.hostname.endsWith(p.hostnameEndsWith)
              : false;
          if (!hostnameMatch) return false;
          if (p.test)       return p.test(parsed.pathname, url);
          if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
          if (p.pathExact)  return p.pathExact.includes(parsed.pathname);
          return parsed.pathname === '/';
        });
      } catch { return false; }
    }

    domainGroups = [];
    const groupMap    = {};
    const landingTabs = [];

    const customGroups = typeof LOCAL_CUSTOM_GROUPS !== 'undefined' ? LOCAL_CUSTOM_GROUPS : [];

    function matchCustomGroup(url) {
      try {
        const parsed = new URL(url);
        return customGroups.find(r => {
          const hostMatch = r.hostname
            ? parsed.hostname === r.hostname
            : r.hostnameEndsWith
              ? parsed.hostname.endsWith(r.hostnameEndsWith)
              : false;
          if (!hostMatch) return false;
          if (r.pathPrefix) return parsed.pathname.startsWith(r.pathPrefix);
          return true;
        }) || null;
      } catch { return null; }
    }

    for (const tab of realTabs) {
      try {
        if (isLandingPage(tab.url)) {
          landingTabs.push(tab);
          continue;
        }

        const customRule = matchCustomGroup(tab.url);
        if (customRule) {
          const key = customRule.groupKey;
          if (!groupMap[key]) groupMap[key] = { domain: key, label: customRule.groupLabel, tabs: [] };
          groupMap[key].tabs.push(tab);
          continue;
        }

        let hostname;
        if (tab.url && tab.url.startsWith('file://')) {
          hostname = 'local-files';
        } else {
          hostname = new URL(tab.url).hostname;
        }
        if (!hostname) continue;

        if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
        groupMap[hostname].tabs.push(tab);
      } catch {}
    }

    if (landingTabs.length > 0) {
      groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landingTabs };
    }

    const landingHostnames = new Set(LANDING_PAGE_PATTERNS.map(p => p.hostname).filter(Boolean));
    const landingSuffixes = LANDING_PAGE_PATTERNS.map(p => p.hostnameEndsWith).filter(Boolean);
    function isLandingDomain(domain) {
      if (landingHostnames.has(domain)) return true;
      return landingSuffixes.some(s => domain.endsWith(s));
    }
    domainGroups = Object.values(groupMap).sort((a, b) => {
      const aIsLanding = a.domain === '__landing-pages__';
      const bIsLanding = b.domain === '__landing-pages__';
      if (aIsLanding !== bIsLanding) return aIsLanding ? -1 : 1;

      const aIsPriority = isLandingDomain(a.domain);
      const bIsPriority = isLandingDomain(b.domain);
      if (aIsPriority !== bIsPriority) return aIsPriority ? -1 : 1;

      return b.tabs.length - a.tabs.length;
    });

    domainGroups = filterDomainGroupsByWorkspace(domainGroups, currentWorkspaceId);

    renderWorkspaceBar();

    const openTabsSection      = document.getElementById('openTabsSection');
    const openTabsMissionsEl   = document.getElementById('openTabsMissions');
    const openTabsSectionCount = document.getElementById('openTabsSectionCount');
    const openTabsSectionTitle = document.getElementById('openTabsSectionTitle');

    const workspaceTabCount = domainGroups.reduce((sum, g) => sum + g.tabs.length, 0);

    clearGroupCardMap();
    clearSearchCache();

    if (domainGroups.length > 0 && openTabsSection) {
      if (openTabsSectionTitle) openTabsSectionTitle.textContent = 'Open tabs';
      openTabsSectionCount.innerHTML = `${domainGroups.length} domain${domainGroups.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-open-tabs" data-total-tabs="${workspaceTabCount}" style="font-size:11px;padding:3px 10px;">${ICONS.close} Close all ${workspaceTabCount} tabs</button>`;

      if (domainGroups.length > PAGE_SIZE) {
        resetLazyRenderer();
        initLazyRenderer(openTabsMissionsEl, domainGroups);
      } else {
        openTabsMissionsEl.innerHTML = domainGroups.map(g => renderDomainCard(g)).join('');
      }
      openTabsSection.style.display = 'block';
    } else if (openTabsSection) {
      openTabsSection.style.display = 'none';
      resetLazyRenderer();
    }

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    checkTabOutDupes();

    try {
      renderSmartSuggestions();
    } catch (e) {
      console.error('[smart-suggestions] Failed to render:', e);
    }

    await renderDeferredColumn();
  } finally {
    _renderingInProgress = false;
    if (_renderPending) {
      _renderPending = false;
      renderDashboard();
    }
  }
}

async function renderDashboard() {
  await renderStaticDashboard();
}

function renderSmartSuggestions() {
  const section = document.getElementById('smartSuggestionsSection');
  const listEl = document.getElementById('smartSuggestionsList');
  const countEl = document.getElementById('smartSuggestionsCount');

  if (!settings.showSmartSuggestions) {
    if (section) section.style.display = 'none';
    return [];
  }

  const suggestions = scoreTabsForSuggestions(openTabs);

  if (!suggestions || suggestions.length === 0) {
    if (section) section.style.display = 'none';
    return [];
  }

  if (section) section.style.display = 'block';

  const cardsHtml = suggestions.map(s => {
    const tab = s.tab;
    let title = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), '');
    title = escapeHtml(title);
    let domain = '';
    try { domain = new URL(tab.url).hostname.replace(/^www\./, ''); } catch {}
    const safeDomain = escapeHtml(domain);
    const safeReason = escapeHtml(s.reason);
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';

    return `
      <div class="suggestion-card" data-action="focus-suggestion-tab" data-tab-id="${tab.id}" data-tab-url="${tab.url}">
        <div class="suggestion-favicon">
          ${faviconUrl ? `<img src="${faviconUrl}" alt="">` : ''}
        </div>
        <div class="suggestion-info">
          <div class="suggestion-title">${title}</div>
          <div class="suggestion-domain">${safeDomain}</div>
        </div>
        <span class="suggestion-reason">${safeReason}</span>
        <button class="suggestion-close" data-action="close-suggestion-tab" data-tab-id="${tab.id}" title="Close tab">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }).join('');

  if (listEl) listEl.innerHTML = cardsHtml;

  if (countEl) {
    countEl.innerHTML = `${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; <button class="action-btn close-tabs" data-action="close-all-suggestions" style="font-size:11px;padding:3px 10px;">Close all ${suggestions.length}</button>`;
  }

  return suggestions;
}
