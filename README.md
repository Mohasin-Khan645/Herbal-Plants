# Herbal Guardian

A web app to explore medicinal plants, identify diseases, and chat with an AI assistant (Gemini). The frontend is static (HTML/CSS/JS). A lightweight Node/Express API provides AI endpoints.

## Features
- Home, Plants Library, Disease Identifier, Community, About
- AI Chatbot powered by Google Gemini
- PWA: offline support via service worker and manifest
- Responsive UI (Bootstrap 5)

## Repository structure
```
<csp project>/
├─ index.html, chatbot.html, community.html, about.html, disease.html, plants.html
├─ js/                    # Frontend JS + data
│  ├─ data/               # plants.json, diseases.json
│  ├─ utils.js, main.js, plants.js, disease.js, community.js
├─ HerbalGuardian/
│  ├─ api/                # Node/Express backend (formerly `backend/`)
│  │  └─ server.js
│  ├─ css/                # Styles
│  ├─ images/             # Assets
│  ├─ manifest.json       # PWA manifest
│  ├─ service-worker.js   # PWA service worker
│  ├─ package.json        # Backend package + start script
│  └─ README.md           # Frontend notes (legacy)
└─ README.md              # This file
```

## Requirements
- Node.js 18+ (recommended 20+)
- An internet connection (for Google Generative Language API)

## Environment variables
Create a `.env` file in `HerbalGuardian/` (same folder as `package.json`).

```
# Required
GEMINI_API_KEY=your_google_generative_language_api_key

# Optional
GEMINI_MODEL=gemini-1.5-flash-latest
PORT=3000
```

Notes:
- The server reads `.env` from the current working directory; running from `HerbalGuardian/` ensures it loads.
- Keep your API key private. Do not commit `.env`.

## Install & Run (local)
1) Install dependencies (in the backend folder):
```bash
cd "HerbalGuardian"
npm install
```

2) Start the API server:
```bash
npm start
# runs: node api/server.js
```

3) Open the app in your browser:
- Frontend is served statically by the same server. Visit:
  - http://localhost:3000/
  - http://localhost:3000/chatbot
  - http://localhost:3000/plants
  - http://localhost:3000/disease
  - http://localhost:3000/community

If you prefer a separate static server (e.g., VS Code Live Server), keep the Node server running for API routes and open the static site with `http://localhost:3000` base for API calls.

## Backend API
Base URL: `http://localhost:PORT`

- POST `/api/gemini`
  - Body: `{ "prompt": string, "model?": string }`
  - Response: `{ reply: string, model: string, versionUsed: string }`

- GET `/api/gemini/models`
  - Lists available Gemini models from the API

- GET `/health`
  - Returns `{ ok: true, hasKey: boolean, model: string }`

## Scripts
Inside `HerbalGuardian/package.json`:
- `npm start`: runs `node api/server.js`

## Common issues
- 404 model errors: the server will try fallbacks; verify `GEMINI_API_KEY` and network access.
- CORS: server enables CORS by default. If hosting frontend separately, ensure the API host allows your origin.
- Missing `.env`: requests to `/api/gemini` will return an error if the key is missing.

## Deployment overview
Frontend (static) and backend (Node) need different hosting concerns:

- Frontend (static files):
  - Options: GitHub Pages, Netlify, Vercel (static), any static host.
  - If using GitHub Pages, it serves only static files (no Node runtime).

- Backend (Node/Express at `HerbalGuardian/api/server.js`):
  - Options: Render, Railway, Fly.io, Heroku, Vercel (Node server), AWS/Azure/GCP.
  - Start command: `node api/server.js`
  - Working directory (if configurable): `HerbalGuardian`
  - Environment variables: set `GEMINI_API_KEY` (and optional `GEMINI_MODEL`, `PORT`).

- Frontend → Backend URL:
  - If deploying separately, ensure the frontend JS calls the deployed API base URL (or proxy via the host). By default, the app expects same-origin (`/api/...`).

## After renaming `backend` → `api`
- Start command updated to `node api/server.js` inside `HerbalGuardian/`.
- If you use CI/CD or a deploy platform, update any paths that referenced `HerbalGuardian/backend` to `HerbalGuardian/api`.

## Contributing
- PRs welcome. Keep code readable and avoid leaking secrets.

## License
- MIT (adjust if different).


