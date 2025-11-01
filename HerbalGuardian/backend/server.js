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
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

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
    const candidates = Array.from(new Set([
      requestedModel,
      withoutLatest,
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro'
    ])).filter(Boolean);

    let lastError = null;
    const apiVersions = ['v1', 'v1beta'];
    for (const candidate of candidates) {
      for (const ver of apiVersions) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${ver}/models/${candidate}:generateContent?key=${GEMINI_API_KEY}`,
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
            lastError = { status: response.status, body: text, candidate, ver };
            continue;
          }
          const msg = data?.error?.message || `${response.status} ${response.statusText}`;
          return res.status(response.status).json({ error: msg, details: text?.slice(0,2000), model: candidate, versionTried: ver });
        }

        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        return res.json({ reply, model: candidate, versionUsed: ver });
      }
    }

    const message = lastError ? `All candidate models failed. Last 404 for '${lastError.candidate}'.` : 'Model call failed.';
    return res.status(404).json({ error: message, details: lastError?.body?.slice(0,2000), lastTried: lastError });
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
