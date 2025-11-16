// js/disease.js
let SIMILAR = [];

async function loadSimilar(){
  try {
    const res = await fetch('/js/data/diseases.json');
    SIMILAR = await res.json();
  } catch { SIMILAR = []; }
}

async function analyzeImageWithAI(file) {
  // Convert image to base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });

  const prompt = `First, determine if this image shows a plant leaf. If it does not appear to be a plant leaf (e.g., it's a person, object, or non-plant image), respond with: {"is_plant": false, "message": "This does not appear to be a plant leaf image. Please upload an image of a plant leaf for disease analysis."}

If it is a plant leaf, analyze it for diseases and ALWAYS provide the most likely disease or condition, even if uncertain:
1. The most likely disease or condition (1-2 words, always provide one)
2. Confidence level (0-1)
3. Brief symptoms (1 sentence, max 20 words)
4. Treatment (1 sentence, max 20 words, herbal/natural methods)
5. Prevention (1 sentence, max 15 words)

Respond in JSON format: {"is_plant": true, "disease": "Disease Name", "confidence": 0.85, "symptoms": "brief description", "treatment": "brief advice", "prevention": "brief tips"}`;

  try {
    const apiKey = window.HG_GEMINI_API_KEY || '';
    if (!apiKey) {
      return { disease: 'API Key Not Configured', confidence: 0, symptoms: 'Please configure Gemini API key', treatment: 'N/A', prevention: 'N/A' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64
              }
            }
          ]
        }]
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Try to parse JSON response
    try {
      const result = JSON.parse(reply);
      if (result.is_plant === false) {
        return {
          disease: 'Invalid Image',
          confidence: 0,
          symptoms: result.message || 'This does not appear to be a plant leaf image. Please upload an image of a plant leaf for disease analysis.',
          treatment: 'N/A',
          prevention: 'N/A'
        };
      }
      return {
        disease: result.disease || 'Unable to identify',
        confidence: result.confidence || 0.5,
        symptoms: result.symptoms || 'Analysis incomplete',
        treatment: result.treatment || 'Consult expert',
        prevention: result.prevention || 'Maintain plant health'
      };
    } catch (parseError) {
      // If JSON parsing fails, check if it's a non-plant message
      if (reply.includes('does not appear to be a plant leaf') || reply.includes('is_plant') && reply.includes('false')) {
        return {
          disease: 'Invalid Image',
          confidence: 0,
          symptoms: 'This does not appear to be a plant leaf image. Please upload an image of a plant leaf for disease analysis.',
          treatment: 'N/A',
          prevention: 'N/A'
        };
      }
      // If JSON parsing fails, extract info from text
      return {
        disease: reply.includes('Leaf Spot') ? 'Leaf Spot' :
                reply.includes('Powdery Mildew') ? 'Powdery Mildew' :
                reply.includes('Rust') ? 'Rust' :
                reply.includes('Blight') ? 'Blight' : 'Unknown Condition',
        confidence: 0.6,
        symptoms: reply,
        treatment: 'See AI response below',
        prevention: 'General plant care'
      };
    }
  } catch (e) {
    return { disease: 'Analysis Failed', confidence: 0, symptoms: e.message, treatment: 'Try again or consult expert', prevention: 'N/A' };
  }
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
  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.style.maxWidth = '300px';
  img.style.maxHeight = '300px';
  img.onload = () => URL.revokeObjectURL(img.src);
  prev.appendChild(img);

  // Show loading
  out.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><br>Analyzing image with AI...</div>';

  // Analyze with AI
  const pred = await analyzeImageWithAI(file);

  out.innerHTML = `
    <div><strong>Probable Disease:</strong> ${pred.disease}</div>
    <div><strong>Confidence:</strong> ${(pred.confidence*100).toFixed(0)}%</div>
    <div class="mt-2"><strong>Symptoms:</strong> ${pred.symptoms}</div>
    <div class="mt-2"><strong>Treatment:</strong> ${pred.treatment}</div>
    <div><strong>Prevention:</strong> ${pred.prevention}</div>
  `;

  // similar diseases - only show if it's a valid plant disease
  if (pred.disease !== 'Invalid Image' && pred.disease !== 'Analysis Failed') {
    const matches = SIMILAR.filter(d => d.name.toLowerCase().includes(pred.disease.split(' ')[0].toLowerCase()));
    renderSimilar(matches.length ? matches : SIMILAR);
  } else {
    renderSimilar([]); // Clear similar diseases for invalid images
  }

  // enable ask AI
  askBtn.disabled = false;
  askBtn.onclick = async ()=>{
    askBtn.disabled = true;
    const txt = await geminiText(`Give brief additional treatment options for "${pred.disease}" in plants. Focus on 2-3 herbal remedies. Keep response under 100 words.`);
    out.innerHTML += `<div class="mt-3 p-2 border rounded bg-white"><strong>AI Additional Advice:</strong><br>${txt}</div>`;
    askBtn.disabled = false;
  };
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadSimilar();
  document.getElementById('analyzeBtn').addEventListener('click', analyze);
});
