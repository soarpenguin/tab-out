const PREVIEW_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CAPTURE_MIN_INTERVAL = 500;
let currentPreviewTabId = null;
let previewTimeout = null;
let lastCaptureTime = 0;

function clearPreviewTimeout() {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
}

function getCachedPreview(tabId) {
  const entry = PREVIEW_CACHE.get(tabId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    PREVIEW_CACHE.delete(tabId);
    return null;
  }
  return entry.data;
}

function setCachedPreview(tabId, data) {
  PREVIEW_CACHE.set(tabId, {
    data,
    timestamp: Date.now()
  });
}

function clearPreviewCache() {
  PREVIEW_CACHE.clear();
}

function clearPreviewCacheForTab(tabId) {
  PREVIEW_CACHE.delete(tabId);
}

async function captureTabPreview(tabId) {
  if (!tabId || typeof tabId !== 'number') {
    return null;
  }

  const cached = getCachedPreview(tabId);
  if (cached) {
    return cached;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      return null;
    }

    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('brave://')) {
      return null;
    }

    if (!tab.active) {
      return null;
    }

    const now = Date.now();
    if (now - lastCaptureTime < CAPTURE_MIN_INTERVAL) {
      return null;
    }
    lastCaptureTime = now;

    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });

    if (screenshot) {
      setCachedPreview(tabId, screenshot);
      return screenshot;
    }
  } catch (err) {
    // Stale tab ID or transient error — expected, no need to warn
  }

  return null;
}

function getFaviconUrl(url) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return '';
  }
}

function showTabPreview(chipElement) {
  if (!settings || !settings.showTabPreview) return;

  const tabId = parseInt(chipElement.dataset.tabId);
  const tabUrl = chipElement.dataset.tabUrl;
  const tabTitle = chipElement.title || '';

  if (!tabUrl) return;

  if (currentPreviewTabId === tabId) {
    return;
  }

  hideTabPreview();

  currentPreviewTabId = tabId;

  const overlay = createPreviewOverlay(tabTitle, tabUrl);
  document.body.appendChild(overlay);
  positionPreview(overlay, chipElement);
  overlay.classList.add('visible');

  loadPreviewImage(overlay, tabId, tabUrl);
}

function scheduleShowTabPreview(chipElement) {
  clearPreviewTimeout();
  previewTimeout = setTimeout(() => {
    showTabPreview(chipElement);
  }, 150);
}

function createPreviewOverlay(title, url) {
  const overlay = document.createElement('div');
  overlay.className = 'tab-preview-overlay';
  overlay.innerHTML = `
    <div class="tab-preview">
      <div class="tab-preview-image-container">
        <div class="tab-preview-loading"></div>
      </div>
      <div class="tab-preview-info">
        <div class="tab-preview-title">${escapeHtml(title)}</div>
        <div class="tab-preview-url">${escapeHtml(url)}</div>
      </div>
    </div>
  `;
  return overlay;
}

function positionPreview(overlay, chipElement) {
  const chipRect = chipElement.getBoundingClientRect();
  const previewRect = overlay.querySelector('.tab-preview').getBoundingClientRect();
  
  let x = chipRect.left;
  let y = chipRect.bottom + 8;

  const maxX = window.innerWidth - previewRect.width;
  const maxY = window.innerHeight - previewRect.height;

  if (x > maxX) {
    x = maxX;
  }
  if (y > maxY) {
    y = chipRect.top - previewRect.height - 8;
    if (y < 0) {
      y = 8;
    }
  }

  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;
}

async function loadPreviewImage(overlay, tabId, url) {
  const container = overlay.querySelector('.tab-preview-image-container');
  const loading = overlay.querySelector('.tab-preview-loading');

  try {
    const screenshot = await captureTabPreview(tabId);

    if (currentPreviewTabId !== tabId) {
      overlay.remove();
      return;
    }

    if (loading) loading.remove();

    if (screenshot) {
      const img = document.createElement('img');
      img.className = 'tab-preview-image';
      img.src = screenshot;
      img.alt = '';
      container.appendChild(img);
    } else {
      const faviconUrl = getFaviconUrl(url);
      if (faviconUrl) {
        const img = document.createElement('img');
        img.className = 'tab-preview-fallback';
        img.src = faviconUrl;
        img.alt = '';
        container.appendChild(img);
      }
    }
  } catch (err) {
    if (loading) loading.remove();
    const faviconUrl = getFaviconUrl(url);
    if (faviconUrl) {
      const img = document.createElement('img');
      img.className = 'tab-preview-fallback';
      img.src = faviconUrl;
      img.alt = '';
      container.appendChild(img);
    }
  }
}

function hideTabPreview() {
  clearPreviewTimeout();
  const overlays = document.querySelectorAll('.tab-preview-overlay');
  overlays.forEach(overlay => {
    overlay.classList.remove('visible');
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 150);
  });
  currentPreviewTabId = null;
}

function updatePreviewPosition() {
  const overlay = document.querySelector('.tab-preview-overlay');
  const chip = document.querySelector('.page-chip:hover');
  if (overlay && chip) {
    positionPreview(overlay, chip);
  }
}

window.addEventListener('resize', updatePreviewPosition);

function clearPreviewOnRender() {
  hideTabPreview();
}

chrome.tabs.onRemoved.addListener((tabId) => {
  clearPreviewCacheForTab(tabId);
  if (currentPreviewTabId === tabId) {
    hideTabPreview();
  }
});

chrome.tabs.onUpdated.addListener((tabId) => {
  clearPreviewCacheForTab(tabId);
});
