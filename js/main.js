// js/main.js
document.addEventListener('DOMContentLoaded', ()=>{
    // Animated counters on home
    if (document.querySelector('[data-count]')) animateCounters();
  
    // Quick search redirects to plants page with query
    const quickInput = document.getElementById('quickSearch');
    const quickBtn = document.getElementById('quickSearchBtn');
    if (quickBtn && quickInput) {
      const go = ()=>{
        const q = quickInput.value.trim();
        const url = new URL('plants.html', location.href);
        if (q) url.searchParams.set('q', q);
        location.href = url.toString();
      };
      quickBtn.addEventListener('click', go);
      quickInput.addEventListener('keydown', e=>{ if (e.key==='Enter') go(); });
    }
  });