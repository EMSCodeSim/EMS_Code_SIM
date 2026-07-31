const CACHE_NAME='ems-reference-v3';
const OFFLINE_PAGE='/offline-ems-reference.html';
const CORE_ASSETS=[
  OFFLINE_PAGE,
  '/offline-ems-reference.js',
  '/styles/offline-reference.css',
  '/styles/responsive.css',
  '/offline-reference.webmanifest',
  '/icons/ems-reference-192.png',
  '/icons/ems-reference-512.png',
  '/data/ems-reference-pack.json',
  '/downloads/EMS-Reference-Pack.txt',
  '/downloads/EMS-Reference-Pack.md',
  '/downloads/EMS-Reference-Pack.epub',
  '/downloads/EMS-Reference-Pack.pdf'
];
async function cacheAsset(cache,url){try{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response);}catch(_){}}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await Promise.allSettled(CORE_ASSETS.map(url=>cacheAsset(cache,url)));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('ems-reference-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!CORE_ASSETS.includes(url.pathname))return;
  event.respondWith((async()=>{
    try{const response=await fetch(request,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}return response;}
    catch(_){return (await caches.match(request))||(request.mode==='navigate'?(await caches.match(OFFLINE_PAGE)):new Response('Resource unavailable offline',{status:503}));}
  })());
});
