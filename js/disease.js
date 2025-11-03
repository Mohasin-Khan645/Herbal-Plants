// js/disease.js
let SIMILAR = [];

async function loadSimilar(){
  try {
    const res = await fetch('/js/data/diseases.json');
    SIMILAR = await res.json();
  } catch { SIMILAR = []; }
}

function predictByFilename(name){
  const n = name.toLowerCase();
  if (n.includes('brown') || n.includes('spot')) return { disease:'Leaf Spot', confidence:0.78 };
  if (n.includes('powder') || n.includes('mildew')) return { disease:'Powdery Mildew', confidence:0.82 };
  if (n.includes('rust')) return { disease:'Rust', confidence:0.74 };
  if (n.includes('blight')) return { disease:'Blight', confidence:0.69 };
  return { disease:'Nutrient Deficiency (suspected)', confidence:0.55 };
}

function renderSimilar(list){
  const wrap = document.getElementById('similarDiseases');
  if (!list.length) { wrap.innerHTML = '<div class="text-muted">No similar diseases data.</div>'; return; }
  wrap.innerHTML = list.slice(0,4).map(d=>`
    <div class="col-md-6 col-lg-3">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="card-title">${d.name}</h6>
          <p class="small mb-2"><strong>Symptoms:</strong> ${d.symptoms}</p>
          <p class="small"><strong>Treatment:</strong> ${d.treatment}</p>
        </div>
      </div>
    </div>
  `).join('');
}

async function analyze(){
  const input = document.getElementById('leafImage');
  const out = document.getElementById('diseaseResult');
  const askBtn = document.getElementById('askMoreBtn');
  if (!input.files.length) { out.textContent='Please select an image.'; return; }
  const file = input.files[0];

  // preview
  const prev = document.getElementById('imagePreview');
  prev.innerHTML = '';
  const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.onload = ()=> URL.revokeObjectURL(img.src);
  prev.appendChild(img);

  // simulate prediction by filename
  const pred = predictByFilename(file.name);

  // basic guidance
  const guidance = {
    'Leaf Spot': { treat:'Remove affected leaves, apply neem oil weekly.', prevent:'Avoid overhead watering; improve airflow.' },
    'Powdery Mildew': { treat:'Spray baking soda mix or sulfur-based fungicide.', prevent:'Water in morning; reduce humidity.' },
    'Rust': { treat:'Remove infected leaves; use copper fungicide.', prevent:'Keep leaves dry; rotate crops.' },
    'Blight': { treat:'Prune aggressively; apply appropriate fungicide.', prevent:'Sanitize tools; avoid dense planting.' },
    'Nutrient Deficiency (suspected)': { treat:'Use balanced fertilizer; test soil.', prevent:'Maintain soil health and pH.' }
  }[pred.disease];

  out.innerHTML = `
    <div><strong>Probable Disease:</strong> ${pred.disease}</div>
    <div><strong>Confidence:</strong> ${(pred.confidence*100).toFixed(0)}%</div>
    <div class="mt-2"><strong>Treatment:</strong> ${guidance?.treat || 'Consult local extension services.'}</div>
    <div><strong>Prevention:</strong> ${guidance?.prevent || 'Ensure proper watering, sunlight, and spacing.'}</div>
  `;

  // similar diseases
  const matches = SIMILAR.filter(d => d.name.toLowerCase().includes(pred.disease.split(' ')[0].toLowerCase()));
  renderSimilar(matches.length?matches:SIMILAR);

  // enable ask AI
  askBtn.disabled = false;
  askBtn.onclick = async ()=>{
    askBtn.disabled = true;
    const txt = await geminiText(`Analyze a plant leaf with signs of "${pred.disease}" (confidence ${(pred.confidence*100).toFixed(0)}%). Provide concise treatment and prevention using herbal-friendly remedies.`);
    out.innerHTML += `<div class="mt-3 p-2 border rounded bg-white"><strong>AI Advice:</strong><br>${txt}</div>`;
    askBtn.disabled = false;
  };
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadSimilar();
  document.getElementById('analyzeBtn').addEventListener('click', analyze);
});