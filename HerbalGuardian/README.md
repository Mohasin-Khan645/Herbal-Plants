<!-- README.md -->
# Herbal Guardian – Smart Herbal Plant Awareness

Features
- Home with hero, counters, quick search, AI Help.
- Plant Library: search, filter by type, favorites (LocalStorage), compare 2, modal details, AI description.
- Disease Identifier: image upload, simulated detection (by filename), confidence, similar diseases, AI advice.
- AI Chatbot: Gemini-powered Q&A, voice input, suggestions, LocalStorage history.
- PWA: Offline support via service worker and manifest.
- Responsive layout with Bootstrap 5.

Getting Started
1. Place in a static server (VS Code Live Server or any HTTP server).
2. Add images under `images/`: `logo.png`, `banner.jpg`, `tulsi.jpg`, `neem.jpg`, `aloe.jpg` (and others).
3. Put your Gemini API key in `js/utils.js` at `GEMINI_API_KEY`.
4. Open `index.html` in a browser (preferably via http://).

Notes
- Without an API key, AI features will show a friendly disabled message.
- To simulate diseases, name test images with keywords like `powdery`, `mildew`, `brown-spots`, `rust`, `blight`.
- Data can be expanded by adding entries to `data/plants.json` and `data/diseases.json`.

Future Ideas
- TensorFlow.js for actual image classification.
- Firebase Auth + Firestore for community sharing and saved data.
- Weather API for climate-based care tips.