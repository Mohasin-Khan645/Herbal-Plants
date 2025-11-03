// LocalStorage keys
const HG_COMM_KEYS = {
  mapPins: 'hg_comm_map_pins',
  qa: 'hg_comm_qa',
  exchange: 'hg_comm_exchange',
  events: 'hg_comm_events',
  impact: 'hg_comm_impact',
  profile: 'hg_comm_profile'
};

function readLS(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}
function writeLS(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

// Impact counters
function getImpact(){ return readLS(HG_COMM_KEYS.impact, {spots:0, vols:0, workshops:0}); }
function setImpact(x){ writeLS(HG_COMM_KEYS.impact, x); renderImpact(); }
function renderImpact(){
  const i = getImpact();
  const s = id=>{ const el = document.getElementById(id); if (el) el.textContent = i[id.replace('count','').toLowerCase()] || 0; };
  s('countSpots'); s('countVols'); s('countEvents');
}

// Profile
function getProfile(){ return readLS(HG_COMM_KEYS.profile, {name:'Anonymous', interests:'', lang:'en'}); }
function saveProfile(p){ writeLS(HG_COMM_KEYS.profile, p); }
function openProfile(){
  const p = getProfile();
  const name = document.getElementById('profName'); if (name) name.value = p.name||'';
  const ints = document.getElementById('profInterests'); if (ints) ints.value = p.interests||'';
  const lang = document.getElementById('profLang'); if (lang) lang.value = p.lang||'en';
  new bootstrap.Modal(document.getElementById('profileModal')).show();
}
function saveProfileFromUI(){
  const p = getProfile();
  p.name = (document.getElementById('profName').value||'').trim() || 'Anonymous';
  p.interests = (document.getElementById('profInterests').value||'').trim();
  p.lang = (document.getElementById('profLang').value||'en');
  saveProfile(p);
  bootstrap.Modal.getInstance(document.getElementById('profileModal'))?.hide();
  renderQA(); renderEx(); renderEv();
}

// Map logic
let map, markersLayer;
function initMap(){
  const el = document.getElementById('map'); if (!el) return;
  map = L.map('map').setView([20.5937, 78.9629], 5); // India center approx
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  map.on('click', e=>{
    const ll = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    const inp = document.getElementById('locLatLng'); if (inp) inp.value = ll;
  });
  renderPins();
}

function getPins(){ return readLS(HG_COMM_KEYS.mapPins, []); }
function savePins(p){ writeLS(HG_COMM_KEYS.mapPins, p); }
function renderPins(){
  if (!markersLayer) return; markersLayer.clearLayers();
  const pins = getPins();
  pins.forEach(pin=>{
    const [lat,lng] = pin.latlng;
    const marker = L.marker([lat,lng]);
    marker.bindPopup(`<strong>${pin.title}</strong><br><span class="tag">${pin.type}</span><br>${pin.desc||''}`);
    markersLayer.addLayer(marker);
  });
}

function addPin(){
  const title = document.getElementById('locTitle').value.trim();
  const type = document.getElementById('locType').value;
  const desc = document.getElementById('locDesc').value.trim();
  const ll = document.getElementById('locLatLng').value.trim();
  if (!title || !ll) return alert('Please provide a title and lat,lng (click the map).');
  const parts = ll.split(',').map(s=>parseFloat(s.trim()));
  if (parts.length!==2 || parts.some(isNaN)) return alert('Invalid coordinates.');
  const pins = getPins();
  pins.push({ id: Date.now(), title, type, desc, latlng: parts });
  savePins(pins);
  if (type === 'Adopt-a-Spot') {
    const imp = getImpact(); imp.spots += 1; setImpact(imp);
  }
  document.getElementById('locTitle').value = '';
  document.getElementById('locDesc').value = '';
  document.getElementById('locLatLng').value = '';
  renderPins();
}

// Q&A
function getQA(){ return readLS(HG_COMM_KEYS.qa, []); }
function saveQA(list){ writeLS(HG_COMM_KEYS.qa, list); }
function postQA(){
  const title = document.getElementById('qaTitle').value.trim();
  const body = document.getElementById('qaBody').value.trim();
  if (!title || !body) return alert('Please fill title and details.');
  const list = getQA();
  const prof = getProfile();
  list.push({ id: Date.now(), title, body, votes: 0, createdAt: Date.now(), answers: [], author: prof.name });
  saveQA(list);
  document.getElementById('qaTitle').value = '';
  document.getElementById('qaBody').value = '';
  renderQA();
}
function voteQA(id, delta){
  const list = getQA();
  const it = list.find(x=>x.id===id); if (!it) return;
  it.votes += delta; if (it.votes < 0) it.votes = 0;
  saveQA(list); renderQA();
}
function answerQA(id){
  const txt = prompt('Your answer'); if (!txt) return;
  const list = getQA();
  const it = list.find(x=>x.id===id); if (!it) return;
  it.answers.push({ id: Date.now(), text: txt, votes: 0 });
  saveQA(list); renderQA();
}
function voteAns(qid, aid, delta){
  const list = getQA();
  const q = list.find(x=>x.id===qid); if (!q) return;
  const a = q.answers.find(x=>x.id===aid); if (!a) return;
  a.votes += delta; if (a.votes < 0) a.votes = 0;
  saveQA(list); renderQA();
}
function renderQA(){
  const wrap = document.getElementById('qaList'); if (!wrap) return;
  const sort = (document.getElementById('qaSort')||{value:'top'}).value;
  const list = getQA().slice().sort((a,b)=> sort==='top' ? (b.votes-a.votes || b.createdAt-a.createdAt) : (b.createdAt - a.createdAt));
  wrap.innerHTML = list.map(q=>`
    <div class="post">
      <div class="d-flex justify-content-between align-items-start">
        <h6 class="mb-1">${q.title}</h6>
        <div class="d-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-success" data-act="q-up" data-id="${q.id}">▲</button>
          <span class="px-2">${q.votes}</span>
          <button class="btn btn-sm btn-outline-secondary" data-act="q-down" data-id="${q.id}">▼</button>
        </div>
      </div>
      <div class="small text-muted">${new Date(q.createdAt).toLocaleString()} • by ${q.author||'Anonymous'}</div>
      <p class="mb-2">${q.body}</p>
      <div class="mb-2"><button class="btn btn-sm btn-outline-dark" data-act="q-ans" data-id="${q.id}">Answer</button></div>
      <div class="ps-2">
        ${(q.answers||[]).sort((a,b)=>b.votes-a.votes).map(a=>`
          <div class="border-start ps-2 mb-1">
            <div class="d-flex justify-content-between">
              <div>${a.text}</div>
              <div class="d-flex align-items-center gap-1">
                <button class="btn btn-sm btn-outline-success" data-act="a-up" data-qid="${q.id}" data-aid="${a.id}">▲</button>
                <span class="px-2">${a.votes}</span>
                <button class="btn btn-sm btn-outline-secondary" data-act="a-down" data-qid="${q.id}" data-aid="${a.id}">▼</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('') || '<div class="text-muted">No questions yet. Be the first!</div>';
}

// Exchange
function getEx(){ return readLS(HG_COMM_KEYS.exchange, []); }
function saveEx(list){ writeLS(HG_COMM_KEYS.exchange, list); }
function postEx(){
  const type = document.getElementById('exType').value;
  const item = document.getElementById('exItem').value.trim();
  const notes = document.getElementById('exNotes').value.trim();
  if (!item) return alert('Please provide an item name.');
  const list = getEx();
  const prof = getProfile();
  list.push({ id: Date.now(), type, item, notes, createdAt: Date.now(), taken: false, author: prof.name });
  saveEx(list);
  document.getElementById('exItem').value = '';
  document.getElementById('exNotes').value = '';
  renderEx();
}
function toggleTaken(id){
  const list = getEx();
  const it = list.find(x=>x.id===id); if (!it) return;
  it.taken = !it.taken; saveEx(list); renderEx();
}
function renderEx(){
  const wrap = document.getElementById('exList'); if (!wrap) return;
  const q = (document.getElementById('exSearch').value||'').toLowerCase();
  const list = getEx().slice().sort((a,b)=>b.createdAt-a.createdAt).filter(x=> !q || x.item.toLowerCase().includes(q) || x.type.toLowerCase().includes(q));
  wrap.innerHTML = list.map(x=>`
    <div class="post">
      <div class="d-flex justify-content-between">
        <div>
          <div><span class="tag">${x.type}</span> <strong>${x.item}</strong></div>
          <div class="small text-muted">${new Date(x.createdAt).toLocaleString()} • by ${x.author||'Anonymous'}</div>
          <div>${x.notes||''}</div>
        </div>
        <div class="text-end">
          <button class="btn btn-sm ${x.taken?'btn-secondary':'btn-success'}" data-act="ex-take" data-id="${x.id}">${x.taken?'Taken':'Available'}</button>
        </div>
      </div>
    </div>
  `).join('') || '<div class="text-muted">No listings yet.</div>';
}

// Events
function getEv(){ return readLS(HG_COMM_KEYS.events, []); }
function saveEv(list){ writeLS(HG_COMM_KEYS.events, list); }
function postEv(){
  const title = document.getElementById('evTitle').value.trim();
  const date = document.getElementById('evDate').value;
  const location = document.getElementById('evLocation').value.trim();
  const notes = document.getElementById('evNotes').value.trim();
  if (!title || !date) return alert('Please provide title and date/time.');
  const list = getEv();
  const prof = getProfile();
  list.push({ id: Date.now(), title, date, location, notes, rsvped: false, createdAt: Date.now(), author: prof.name });
  saveEv(list);
  document.getElementById('evTitle').value = '';
  document.getElementById('evDate').value = '';
  document.getElementById('evLocation').value = '';
  document.getElementById('evNotes').value = '';
  const imp = getImpact(); imp.workshops += 1; setImpact(imp);
  renderEv();
  scheduleEventReminder(date, title, location);
}
function toggleRSVP(id){
  const list = getEv(); const it = list.find(x=>x.id===id); if (!it) return;
  it.rsvped = !it.rsvped; saveEv(list);
  const imp = getImpact(); imp.vols = Math.max(0, imp.vols + (it.rsvped?1:-1)); setImpact(imp);
  renderEv();
}
function renderEv(){
  const wrap = document.getElementById('evList'); if (!wrap) return;
  const filter = (document.getElementById('evFilter')||{value:'all'}).value;
  const now = Date.now();
  let list = getEv().slice().sort((a,b)=> new Date(a.date) - new Date(b.date));
  if (filter==='mine') list = list.filter(x=>x.rsvped);
  if (filter==='future') list = list.filter(x=> new Date(x.date).getTime() >= now);
  wrap.innerHTML = list.map(x=>`
    <div class="post">
      <div class="d-flex justify-content-between">
        <div>
          <div><strong>${x.title}</strong></div>
          <div class="small text-muted">${new Date(x.date).toLocaleString()} • ${x.location||'TBA'} • by ${x.author||'Anonymous'}</div>
          <div>${x.notes||''}</div>
        </div>
        <div class="text-end">
          <button class="btn btn-sm ${x.rsvped?'btn-secondary':'btn-success'}" data-act="ev-rsvp" data-id="${x.id}">${x.rsvped?'RSVP’d':'RSVP'}</button>
        </div>
      </div>
    </div>
  `).join('') || '<div class="text-muted">No events yet.</div>';
}

// Notifications (local, requires page open)
let notificationsEnabled = false;
async function enableNotifications(){
  if (!('Notification' in window)) return alert('Notifications not supported in this browser.');
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  notificationsEnabled = (perm === 'granted');
  if (notificationsEnabled) new Notification('Notifications enabled for Herbal Guardian events.');
}
function scheduleEventReminder(dateStr, title, location){
  if (!notificationsEnabled) return;
  const when = new Date(dateStr).getTime();
  const now = Date.now();
  const ms = when - now - (30*60*1000); // 30 min before
  if (ms <= 0 || ms > 7*24*60*60*1000) return; // ignore past or beyond 7 days
  setTimeout(()=>{
    try { new Notification('Event Reminder', { body: `${title} at ${location||'TBA'} in 30 minutes` }); } catch {}
  }, ms);
}

// Bindings
function bindCommunity(){
  // Map
  const addBtn = document.getElementById('addLocationBtn'); if (addBtn) addBtn.addEventListener('click', addPin);
  const resetImp = document.getElementById('resetImpact'); if (resetImp) resetImp.addEventListener('click', ()=>{ setImpact({spots:0, vols:0, workshops:0}); });
  const profBtn = document.getElementById('profileBtn'); if (profBtn) profBtn.addEventListener('click', openProfile);
  const profSave = document.getElementById('profSave'); if (profSave) profSave.addEventListener('click', saveProfileFromUI);
  const notifBtn = document.getElementById('enableNotifs'); if (notifBtn) notifBtn.addEventListener('click', enableNotifications);

  // Q&A
  const qaPost = document.getElementById('qaPost'); if (qaPost) qaPost.addEventListener('click', postQA);
  const qaSort = document.getElementById('qaSort'); if (qaSort) qaSort.addEventListener('change', renderQA);
  const qaList = document.getElementById('qaList'); if (qaList) qaList.addEventListener('click', e=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act==='q-up') return voteQA(parseInt(btn.getAttribute('data-id'),10), +1);
    if (act==='q-down') return voteQA(parseInt(btn.getAttribute('data-id'),10), -1);
    if (act==='q-ans') return answerQA(parseInt(btn.getAttribute('data-id'),10));
    if (act==='a-up') return voteAns(parseInt(btn.getAttribute('data-qid'),10), parseInt(btn.getAttribute('data-aid'),10), +1);
    if (act==='a-down') return voteAns(parseInt(btn.getAttribute('data-qid'),10), parseInt(btn.getAttribute('data-aid'),10), -1);
  });

  // Exchange
  const exPost = document.getElementById('exPost'); if (exPost) exPost.addEventListener('click', postEx);
  const exSearch = document.getElementById('exSearch'); if (exSearch) exSearch.addEventListener('input', renderEx);
  const exList = document.getElementById('exList'); if (exList) exList.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-act="ex-take"]'); if (!btn) return;
    toggleTaken(parseInt(btn.getAttribute('data-id'),10));
  });

  // Events
  const evPost = document.getElementById('evPost'); if (evPost) evPost.addEventListener('click', postEv);
  const evFilter = document.getElementById('evFilter'); if (evFilter) evFilter.addEventListener('change', renderEv);
  const evList = document.getElementById('evList'); if (evList) evList.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-act="ev-rsvp"]'); if (!btn) return;
    toggleRSVP(parseInt(btn.getAttribute('data-id'),10));
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  try { initMap(); } catch {}
  renderImpact();
  renderQA();
  renderEx();
  renderEv();
  bindCommunity();
});
