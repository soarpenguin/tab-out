/* ----------------------------------------------------------------
   TAB AGE — calculate and format how long a tab has been open
   ---------------------------------------------------------------- */

function getTabAgeInfo(lastAccessed) {
  const now = Date.now();
  const diffMs = now - lastAccessed;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let text = '';
  let level = 'fresh';

  if (diffMins < 1) {
    text = 'just now';
  } else if (diffMins < 60) {
    text = `${diffMins}m`;
  } else if (diffHours < 24) {
    text = `${diffHours}h`;
  } else {
    text = `${diffDays}d`;
  }

  if (diffDays >= 2) {
    level = 'danger';
  } else if (diffDays >= 1) {
    level = 'warn';
  }

  return { text, level, diffMs, diffHours, diffDays };
}

/* ----------------------------------------------------------------
   OVERFLOW CHIPS ("+N more" expand button in domain cards)
   ---------------------------------------------------------------- */

function buildOverflowChips(hiddenTabs, urlCounts = {}) {
  const hiddenChips = hiddenTabs.map(tab => {
    const label    = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), '');
    const count    = urlCounts[tab.url] || 1;
    const dupeTag  = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl   = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
    let domain = '';
    try { domain = new URL(tab.url).hostname.replace(/^www\./, ''); } catch {}
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';
    const ageInfo = getTabAgeInfo(tab.lastAccessed || Date.now());
    const ageClass = ageInfo.level !== 'fresh' ? ` tab-age-${ageInfo.level}` : '';
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}" draggable="true" data-drag-domain="${domain}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <span class="tab-age${ageClass}">${ageInfo.text}</span>
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="Save for later">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="Close this tab">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="page-chips-overflow" style="display:none">${hiddenChips}</div>
    <div class="page-chip page-chip-overflow clickable" data-action="expand-chips">
      <span class="chip-text">+${hiddenTabs.length} more</span>
    </div>`;
}