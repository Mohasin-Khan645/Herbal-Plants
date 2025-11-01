// service-worker.js
const CACHE_NAME = 'herbal-guardian-v2';
const ASSETS = [
  './',
  './index.html','./plants.html','./disease.html','./chatbot.html','./about.html','./community.html',
  './HerbalGuardian/css/style.css','./HerbalGuardian/css/responsive.css',
  './js/utils.js','./js/main.js','./js/plants.js','./js/disease.js','./js/chatbot.js','./js/community.js',
  './js/data/plants.json','./js/data/diseases.json',
  './HerbalGuardian/images/logo.png','./HerbalGuardian/images/banner.jpg','./HerbalGuardian/images/tulsi.jpg','./HerbalGuardian/images/neem.jpg','./HerbalGuardian/images/aloe.jpg'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      return res;
    }).catch(()=> cached))
  );
});