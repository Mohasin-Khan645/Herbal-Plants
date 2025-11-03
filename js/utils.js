// js/utils.js
const HG_STORAGE_KEYS = {
  favorites: 'hg_favorites',
  chat: 'hg_chat_history'
};

// Helper functions
function qs(sel, el = document) { return el.querySelector(sel); }
function qsa(sel, el = document) { return [...el.querySelectorAll(sel)]; }
function byId(id) { return document.getElementById(id); }

function setYear() {
  const el = byId('year');
  if (el) el.textContent = new Date().getFullYear();
}
setYear();

// Reveal animations
(function observeReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('reveal');
    });
  }, { threshold: 0.1 });

  qsa('.feature-card').forEach(el => obs.observe(el));
})();

// Counter animation
function animateCounters() {
  qsa('[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    let cur = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      cur += step;
      if (cur >= target) {
        cur = target;
        clearInterval(timer);
      }
      el.textContent = cur;
    }, 20);
  });
}

// LocalStorage helpers
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(HG_STORAGE_KEYS.favorites) || '[]');
  } catch {
    return [];
  }
}
function setFavorites(list) {
  localStorage.setItem(HG_STORAGE_KEYS.favorites, JSON.stringify(list));
}

// Gemini API helper via Node.js proxy
async function geminiText(prompt) {
  if (!prompt?.trim()) return '';

  try {
    // ✅ Select API base: relative for localhost, full URL for GitHub Pages
    const url = new URL(window.location.href);
    let urlModel = url.searchParams.get('model');
    if (urlModel && urlModel.startsWith('models/')) urlModel = urlModel.replace(/^models\//, '');
    const apiOverride = url.searchParams.get('api');
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    const apiBase = isLocal ? '' : (apiOverride || (window.HG_API_BASE || 'https://YOUR-API-DOMAIN'));
    const endpoint = apiBase + '/api/gemini';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: urlModel || undefined })
    });

    // Handle non-200 responses
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error || `${res.status} ${res.statusText}`;
      const details = err?.details ? ` Details: ${err.details}` : '';
      const model = err?.model ? ` Model: ${err.model}` : '';
      return `AI error: ${msg}.${model}${details ? ' ' + details : ''}`;
    }

    // Parse and return AI text
    const data = await res.json();
    return data?.reply || 'No response.';
  } catch (e) {
    return 'Network error calling Gemini: ' + (e?.message || e);
  }
}

// Voice input
function setupVoiceInput(inputEl, btnEl, onResult) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    btnEl.disabled = true;
    btnEl.title = 'Voice not supported';
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.continuous = false;
  rec.interimResults = false;

  let listening = false;
  btnEl.addEventListener('click', () => {
    if (listening) {
      rec.stop();
      return;
    }
    rec.start();
  });

  rec.onstart = () => {
    listening = true;
    btnEl.textContent = '🛑';
  };
  rec.onend = () => {
    listening = false;
    btnEl.textContent = '🎙️';
  };
  rec.onresult = e => {
    const text = e.results[0][0].transcript;
    inputEl.value = text;
    if (onResult) onResult(text);
  };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const ver = Date.now().toString(36);
    navigator.serviceWorker.register('HerbalGuardian/service-worker.js?v=' + ver).catch(() => { });
  });
}

