const CACHE_NAME='ems-reference-v2';
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

async function cacheAsset(cache,url){
  try{
    const response=await fetch(url,{cache:'reload'});
    if(response.ok)await cache.put(url,response);
  }catch(_){/* Best-effort caching keeps one optional file from breaking install. */}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // The HTML shell is required; the remaining files are cached independently.
    await cache.add(OFFLINE_PAGE);
    await Promise.allSettled(CORE_ASSETS.filter(url=>url!==OFFLINE_PAGE).map(url=>cacheAsset(cache,url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('ems-reference-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(!event.data||event.data.type!=='GET_CACHE_STATUS'||!event.ports?.[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const keys=await cache.keys();
    event.ports[0].postMessage({type:'CACHE_STATUS',cached:keys.length,total:CORE_ASSETS.length});
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(!CORE_ASSETS.includes(url.pathname))return;

  if(request.mode==='navigate'||request.destination==='document'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
        return response;
      }catch(_){
        return (await caches.match(request))||(await caches.match(OFFLINE_PAGE))||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
      return response;
    }catch(_){
      return new Response('Resource unavailable offline',{status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
