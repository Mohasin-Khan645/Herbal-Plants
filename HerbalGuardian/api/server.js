import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Load .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📂 Paths
const FRONTEND_PATH = path.join(__dirname, "../../");          // csp project root
const JS_PATH = path.join(__dirname, "../../js");              // js (in root)

// ✅ Serve frontend + js folder
app.use(express.static(FRONTEND_PATH));
app.use("/HerbalGuardian", express.static(path.join(FRONTEND_PATH, "HerbalGuardian"))); // support HerbalGuardian assets
app.use("/js", express.static(JS_PATH));

app.use(cors());
app.use(express.json());

// ✅ HTML routes
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

app.get("/chatbot", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "chatbot.html"));
});

app.get("/community", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "community.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "about.html"));
});

app.get("/disease", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "disease.html"));
});

app.get("/plants", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "plants.html"));
});

// ✅ Helper: Get available models from API that support generateContent
async function getAvailableModels() {
  const models = new Set();
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`),
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
    ]);
    const [j1, j2] = await Promise.all([
      r1.json().catch(() => ({})),
      r2.json().catch(() => ({}))
    ]);
    
    // Extract model names (remove 'models/' prefix) that support generateContent
    [j1, j2].forEach((j, index) => {
      if (j.models && Array.isArray(j.models)) {
        j.models.forEach(m => {
          if (m.name) {
            // Check if model supports generateContent method
            const supportedMethods = m.supportedGenerationMethods || [];
            if (supportedMethods.includes('generateContent')) {
              const name = m.name.replace(/^models\//, '');
              models.add(name);
            }
          }
        });
      }
    });
  } catch (e) {
    console.error("Error fetching available models:", e);
  }
  return Array.from(models);
}

// ✅ Gemini AI route
app.post("/api/gemini", async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });
  if (!GEMINI_API_KEY)
    return res.status(500).json({ error: "Missing GEMINI_API_KEY." });

  try {
    let requestedModel = (model || MODEL || '').toString().trim();
    if (requestedModel.startsWith('models/')) requestedModel = requestedModel.replace(/^models\//, '');
    const withoutLatest = requestedModel.endsWith('-latest') ? requestedModel.replace(/-latest$/, '') : requestedModel;
    
    // Get available models first
    const availableModels = await getAvailableModels();
    console.log("Available models:", availableModels);
    
    // Prioritize available models, then add fallbacks
    const availableGeminiModels = availableModels.filter(m => 
      m.includes('gemini') && 
      (m.includes('flash') || m.includes('pro'))
    );
    
    // Build candidate list: prioritize available models first, then fallbacks
    const candidates = Array.from(new Set([
      requestedModel,
      withoutLatest,
      // Add available models first (highest priority)
      ...availableGeminiModels,
     // Modern fallback models only
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro-exp'
    ])).filter(Boolean);

    // Filter to prioritize valid candidates, but keep fallbacks if needed
    const validCandidates = candidates.filter(c => {
      // If we got available models, prefer those
      if (availableModels.length > 0) {
        return availableModels.some(av => 
          av === c || 
          av.replace(/-latest$/, '') === c ||
          av === c + '-001' ||
          av.replace(/-001$/, '') === c ||
          c.replace(/-latest$/, '') === av ||
          c.replace(/-001$/, '') === av
        );
      }
      return true; // If no available models, try all
    });
    
    // Use valid candidates if we have them, otherwise try all candidates
    const modelsToTry = (validCandidates.length > 0 && availableModels.length > 0) 
      ? validCandidates 
      : candidates;
    
    let lastError = null;
    // Try v1 first (more stable), then v1beta
    const apiVersions = ['v1', 'v1beta'];
    
    for (const candidate of modelsToTry) {
      for (const ver of apiVersions) {
        // For v1beta, try without -latest and -001 suffixes
        let modelName = candidate;
        if (ver === 'v1beta') {
          modelName = modelName.replace(/-latest$/, '');
          modelName = modelName.replace(/-001$/, '');
        }
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${ver}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        const text = await response.text().catch(() => "");
        let data = {};
        try { data = JSON.parse(text || '{}'); } catch {}

        if (!response.ok) {
          const statusText = data?.error?.status || '';
          if (response.status === 404 || statusText === 'NOT_FOUND') {
            lastError = { status: response.status, body: text, candidate: modelName, ver };
            continue;
          }
          const msg = data?.error?.message || `${response.status} ${response.statusText}`;
          return res.status(response.status).json({ error: msg, details: text?.slice(0,2000), model: modelName, versionTried: ver });
        }

        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        return res.json({ reply, model: modelName, versionUsed: ver });
      }
    }

    // If all failed, return helpful error with available models
    const message = lastError 
      ? `All candidate models failed. Last 404 for '${lastError.candidate}' using ${lastError.ver}.` 
      : 'Model call failed.';
    return res.status(404).json({ 
      error: message, 
      details: lastError?.body?.slice(0,2000), 
      lastTried: lastError,
      availableModels: availableModels.length > 0 ? availableModels.slice(0, 10) : 'Could not fetch available models',
      suggestion: 'Try visiting /api/gemini/models to see available models'
    });
  } catch (err) {
    console.error("Error calling Gemini:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔎 List available models
app.get("/api/gemini/models", async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY." });
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`),
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
    ]);
    const [j1, j2] = await Promise.all([r1.json().catch(()=>({})), r2.json().catch(()=>({}))]);
    res.json({ v1: j1, v1beta: j2 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ❤️ Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, hasKey: Boolean(GEMINI_API_KEY), model: MODEL });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
