// js/utils.js
const HG_STORAGE_KEYS = {
  favorites: 'hg_favorites',
  chat: 'hg_chat_history'
};
-
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

// ✅ Gemini API helper - supports both backend proxy and direct client calls
const GEMINI_API_KEY = window.HG_GEMINI_API_KEY || '';

async function geminiText(prompt) {
  if (!prompt?.trim()) return '';

  try {
    const url = new URL(window.location.href);
    let urlModel = url.searchParams.get('model');
    if (urlModel && urlModel.startsWith('models/')) urlModel = urlModel.replace(/^models\//, '');
    const apiOverride = url.searchParams.get('api');
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    
    // Determine backend URL: local uses relative path, remote uses configured base
    let apiBase = '';
    if (isLocal) {
      // Local: try relative path to backend
      apiBase = '';
    } else {
      // Remote: use override or configured base
      apiBase = apiOverride || (window.HG_API_BASE || '');
    }
    
    // Try backend API first (if we have a valid base or we're local)
    const shouldTryBackend = isLocal || (apiBase && apiBase !== 'https://YOUR-API-DOMAIN' && apiBase !== '');
    
    if (shouldTryBackend) {
      const endpoint = apiBase + '/api/gemini';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: urlModel || undefined })
        });

        if (res.ok) {
          const data = await res.json();
          return data?.reply || 'No response.';
        }
        // If backend fails, fall through to direct API call
        console.warn('Backend API returned error, trying direct API call');
      } catch (backendError) {
        console.warn('Backend API failed, trying direct API call:', backendError);
        // Fall through to direct API call
      }
    }
    
    // Direct client-side API call (fallback for GitHub Pages or when backend unavailable)
    const apiKey = GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY' ? GEMINI_API_KEY : '';
    
    if (!apiKey) {
      if (isLocal) {
        return '⚠️ Backend server not running and API key not configured. Please either:\n1. Start the backend server (cd HerbalGuardian && npm start), or\n2. Set window.HG_GEMINI_API_KEY in js/config.js with your Gemini API key.';
      } else {
        return '⚠️ Gemini API key not configured. Please set window.HG_GEMINI_API_KEY in js/config.js with your actual API key from https://makersuite.google.com/app/apikey';
      }
    }
    
    const model = urlModel || 'gemini-1.5-flash-latest';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `${res.status} ${res.statusText}`;
      return `AI error: ${errorMsg}`;
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    return reply;
    
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

