/* ----------------------------------------------------------------
   UI HELPERS
   ---------------------------------------------------------------- */

function playCloseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;

    const duration = 0.25;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const pos = i / data.length;
      const env = pos < 0.1 ? pos / 0.1 : Math.pow(1 - (pos - 0.1) / 0.9, 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);

    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function shootConfetti(x, y) {
  const colors = [
    '#c8713a',
    '#e8a070',
    '#5a7a62',
    '#8aaa92',
    '#5a6b7a',
    '#8a9baa',
    '#d4b896',
    '#b35a5a',
  ];

  const particleCount = 17;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');

    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];

    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      opacity: 1;
    `;
    document.body.appendChild(el);

    const angle   = Math.random() * Math.PI * 2;
    const speed   = 60 + Math.random() * 120;
    const vx      = Math.cos(angle) * speed;
    const vy      = Math.sin(angle) * speed - 80;
    const gravity = 200;

    const startTime = performance.now();
    const duration  = 700 + Math.random() * 200;

    function frame(now) {
      const elapsed  = (now - startTime) / 1000;
      const progress = elapsed / (duration / 1000);

      if (progress >= 1) { el.remove(); return; }

      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      const rotate  = elapsed * 200 * (isCircle ? 0 : 1);

      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${rotate}deg)`;
      el.style.opacity = opacity;

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}

function animateCardOut(card) {
  if (!card) return;

  const rect = card.getBoundingClientRect();
  shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

  card.classList.add('closing');
  setTimeout(() => {
    card.remove();
    checkAndShowEmptyState();
  }, 300);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastText').textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

function checkAndShowEmptyState() {
  const missionsEl = document.getElementById('openTabsMissions');
  if (!missionsEl) return;

  const remaining = missionsEl.querySelectorAll('.mission-card:not(.closing)').length;
  if (remaining > 0) return;

  missionsEl.innerHTML = `
    <div class="missions-empty-state">
      <div class="empty-checkmark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <div class="empty-title">Inbox zero, but for tabs.</div>
      <div class="empty-subtitle">You're free.</div>
    </div>
  `;

  const countEl = document.getElementById('openTabsSectionCount');
  if (countEl) countEl.textContent = '0 domains';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr);
  const now  = new Date();
  const diffMins  = Math.floor((now - then) / 60000);
  const diffHours = Math.floor((now - then) / 3600000);
  const diffDays  = Math.floor((now - then) / 86400000);

  if (diffMins < 1)   return 'just now';
  if (diffMins < 60)  return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hr' + (diffHours !== 1 ? 's' : '') + ' ago';
  if (diffDays === 1) return 'yesterday';
  return diffDays + ' days ago';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateDisplay() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

function getTimeDisplay() {
  return new Date().toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/* ----------------------------------------------------------------
   MODAL UTILITIES
   ---------------------------------------------------------------- */

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let currentPromptKeydownHandler = null;
let currentLinkMenuCloseHandler = null;

function showCustomPrompt(options) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const titleEl = document.getElementById('modalTitle');
    const labelEl = document.getElementById('modalLabel');
    const inputEl = document.getElementById('modalInput');
    const cancelBtn = document.getElementById('modalCancel');
    const confirmBtn = document.getElementById('modalConfirm');
    const closeBtn = document.getElementById('modalClose');

    if (currentPromptKeydownHandler) {
      document.removeEventListener('keydown', currentPromptKeydownHandler);
      currentPromptKeydownHandler = null;
    }

    if (currentLinkMenuCloseHandler) {
      document.removeEventListener('click', currentLinkMenuCloseHandler);
      currentLinkMenuCloseHandler = null;
    }

    titleEl.textContent = options.title || 'Prompt';
    labelEl.textContent = options.label || 'Enter:';
    inputEl.value = options.value || options.defaultValue || '';
    labelEl.style.display = '';
    inputEl.style.display = '';
    confirmBtn.textContent = options.confirmText || 'OK';

    const close = () => {
      modal.style.display = 'none';
      if (currentPromptKeydownHandler) {
        document.removeEventListener('keydown', currentPromptKeydownHandler);
        currentPromptKeydownHandler = null;
      }
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        resolve(null);
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        close();
        resolve(inputEl.value.trim() || null);
      }
    };

    currentPromptKeydownHandler = handleKeydown;

    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(null);
    };

    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(inputEl.value.trim() || null);
    };

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(null);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        close();
        resolve(null);
      }
    };

    modal.style.display = 'flex';
    document.addEventListener('keydown', handleKeydown);
    inputEl.focus();
  });
}

function showQuickLinkModal(options) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const titleEl = document.getElementById('modalTitle');
    const labelEl = document.getElementById('modalLabel');
    const inputEl = document.getElementById('modalInput');
    const labelEl2 = document.getElementById('modalLabel2');
    const inputEl2 = document.getElementById('modalInput2');
    const cancelBtn = document.getElementById('modalCancel');
    const confirmBtn = document.getElementById('modalConfirm');
    const closeBtn = document.getElementById('modalClose');

    if (currentPromptKeydownHandler) {
      document.removeEventListener('keydown', currentPromptKeydownHandler);
      currentPromptKeydownHandler = null;
    }

    if (currentLinkMenuCloseHandler) {
      document.removeEventListener('click', currentLinkMenuCloseHandler);
      currentLinkMenuCloseHandler = null;
    }

    titleEl.textContent = options.title || 'Quick Link';
    labelEl.textContent = 'URL:';
    inputEl.value = options.url || '';
    labelEl.style.display = 'block';
    inputEl.style.display = 'block';

    labelEl2.textContent = 'Title (optional):';
    inputEl2.value = options.title || '';
    labelEl2.style.display = 'block';
    inputEl2.style.display = 'block';

    confirmBtn.textContent = options.confirmText || 'OK';

    const close = () => {
      modal.style.display = 'none';
      if (currentPromptKeydownHandler) {
        document.removeEventListener('keydown', currentPromptKeydownHandler);
        currentPromptKeydownHandler = null;
      }
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        resolve(null);
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        close();
        const url = inputEl.value.trim();
        if (!url) {
          resolve(null);
          return;
        }
        resolve({ url, title: inputEl2.value.trim() });
      }
    };

    currentPromptKeydownHandler = handleKeydown;

    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(null);
    };

    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      const url = inputEl.value.trim();
      if (!url) {
        resolve(null);
        return;
      }
      resolve({ url, title: inputEl2.value.trim() });
    };

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(null);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        close();
        resolve(null);
      }
    };

    modal.style.display = 'flex';
    document.addEventListener('keydown', handleKeydown);
    inputEl.focus();
  });
}

function showCustomConfirm(options) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const titleEl = document.getElementById('modalTitle');
    const labelEl = document.getElementById('modalLabel');
    const inputEl = document.getElementById('modalInput');
    const cancelBtn = document.getElementById('modalCancel');
    const confirmBtn = document.getElementById('modalConfirm');
    const closeBtn = document.getElementById('modalClose');

    if (currentPromptKeydownHandler) {
      document.removeEventListener('keydown', currentPromptKeydownHandler);
      currentPromptKeydownHandler = null;
    }

    titleEl.textContent = options.title || 'Confirm';
    labelEl.textContent = options.message || 'Are you sure?';
    labelEl.style.display = 'block';
    inputEl.style.display = 'none';
    confirmBtn.textContent = options.confirmText || 'Confirm';

    const close = () => {
      modal.style.display = 'none';
      if (currentPromptKeydownHandler) {
        document.removeEventListener('keydown', currentPromptKeydownHandler);
        currentPromptKeydownHandler = null;
      }
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        resolve(false);
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        close();
        resolve(true);
      }
    };

    currentPromptKeydownHandler = handleKeydown;

    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(false);
    };

    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(true);
    };

    closeBtn.onclick = (e) => {
      e.stopPropagation();
      close();
      resolve(false);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        close();
        resolve(false);
      }
    };

    modal.style.display = 'flex';
    document.addEventListener('keydown', handleKeydown);
    confirmBtn.focus();
  });
}