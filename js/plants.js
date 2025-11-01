// js/plants.js
let PLANTS = [];
let compareMode = false;
let compareSelection = new Set();
let showingFavorites = false;

async function loadPlants(){
  const res = await fetch('/js/data/plants.json');
  PLANTS = await res.json();
}

function plantCard(p){
  const favorites = getFavorites();
  const fav = favorites.includes(p.id);
  return `
    <div class="card h-100">
      <img src="${p.image}" class="card-img-top" alt="${p.name}">
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start">
          <h5 class="card-title mb-1">${p.name}</h5>
          <span class="badge badge-type">${p.type}</span>
        </div>
        <p class="card-text small flex-grow-1">${p.benefits}</p>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success" data-action="read" data-id="${p.id}">Read More</button>
          <button class="btn btn-sm ${fav?'btn-outline-danger favorite':'btn-outline-secondary'}" data-action="fav" data-id="${p.id}">${fav?'♥':'♡'}</button>
          <button class="btn btn-sm btn-outline-dark" data-action="cmp" data-id="${p.id}">${compareMode?'Select':'Compare'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderGrid(){
  const grid = document.getElementById('plantsGrid');
  const q = (document.getElementById('plantSearch').value||'').toLowerCase();
  const t = document.getElementById('plantType').value;

  let list = PLANTS.filter(p => (!t || p.type===t) && (!q || p.name.toLowerCase().includes(q)));
  if (showingFavorites) {
    const favs = new Set(getFavorites());
    list = list.filter(p=>favs.has(p.id));
  }
  grid.innerHTML = list.map(p=>`<div class="col">${plantCard(p)}</div>`).join('') || `<div class="text-muted">No plants found.</div>`;
}

function toggleFavorite(id){
  const list = getFavorites();
  const idx = list.indexOf(id);
  if (idx>-1) list.splice(idx,1); else list.push(id);
  setFavorites(list);
  renderGrid();
}

function bindEvents(){
  document.getElementById('plantSearch').addEventListener('input', renderGrid);
  document.getElementById('plantType').addEventListener('change', renderGrid);
  document.getElementById('favoritesView').addEventListener('click', ()=>{
    showingFavorites = !showingFavorites;
    renderGrid();
  });
  document.getElementById('compareToggle').addEventListener('click', ()=>{
    compareMode = !compareMode; compareSelection.clear();
    document.getElementById('compareBar').classList.toggle('d-none', !compareMode);
    renderGrid();
  });
  document.getElementById('compareShow').addEventListener('click', showCompare);

  document.getElementById('plantsGrid').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.getAttribute('data-id'),10);
    const action = btn.getAttribute('data-action');
    if (action==='fav') toggleFavorite(id);
    if (action==='read') openPlantModal(id);
    if (action==='cmp') {
      if (!compareMode) { compareMode=true; document.getElementById('compareBar').classList.remove('d-none'); }
      if (compareSelection.has(id)) compareSelection.delete(id); else {
        if (compareSelection.size>=2) { alert('You can compare up to 2 plants.'); return; }
        compareSelection.add(id);
      }
      renderGrid();
    }
  });
}

function openPlantModal(id){
  const p = PLANTS.find(x=>x.id===id); if (!p) return;
  document.getElementById('plantModalLabel').textContent = p.name;
  document.getElementById('plantModalImg').src = p.image;
  document.getElementById('plantModalImg').alt = p.name;
  document.getElementById('plantBenefits').textContent = 'Benefits: ' + p.benefits;
  document.getElementById('plantCare').textContent = 'Care: ' + p.care;
  const ask = document.getElementById('askInChat');
  ask.href = 'chatbot.html?prefill=' + encodeURIComponent(`What are the benefits and care tips for ${p.name}?`);

  const aiBtn = document.getElementById('aiDescribeBtn');
  const out = document.getElementById('aiDescribeOut');
  aiBtn.onclick = async ()=>{
    aiBtn.disabled = true; out.textContent='Thinking with AI...';
    const txt = await geminiText(`Provide a concise, friendly, and factual description of the herbal plant "${p.name}". Include main benefits and care.`);
    out.textContent = txt;
    aiBtn.disabled = false;
  };

  new bootstrap.Modal(document.getElementById('plantModal')).show();
}

function showCompare(){
  if (compareSelection.size!==2) { alert('Select 2 plants.'); return; }
  const [aId,bId] = [...compareSelection];
  const A = PLANTS.find(x=>x.id===aId), B = PLANTS.find(x=>x.id===bId);
  const body = document.getElementById('compareBody');
  body.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="border rounded p-2">
          <h5>${A.name} <span class="badge bg-success">${A.type}</span></h5>
          <img src="${A.image}" class="w-100 rounded mb-2" alt="${A.name}">
          <p><strong>Benefits:</strong> ${A.benefits}</p>
          <p><strong>Care:</strong> ${A.care}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-2">
          <h5>${B.name} <span class="badge bg-success">${B.type}</span></h5>
          <img src="${B.image}" class="w-100 rounded mb-2" alt="${B.name}">
          <p><strong>Benefits:</strong> ${B.benefits}</p>
          <p><strong>Care:</strong> ${B.care}</p>
        </div>
      </div>
    </div>
  `;
  new bootstrap.Modal(document.getElementById('compareModal')).show();
}

function applyQueryParams(){
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q) { document.getElementById('plantSearch').value = q; }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadPlants();
  applyQueryParams();
  bindEvents();
  renderGrid();
});