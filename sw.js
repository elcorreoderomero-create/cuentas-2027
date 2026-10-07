// Cache only this app's public shell, never authentication or financial requests.
const ROOT = new URL('./', self.location.href).pathname;
const CACHE = 'cuentas-2027-shell-v5';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([ROOT,ROOT+'manifest.webmanifest',ROOT+'icon-192.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cuentas-2027-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(ROOT,copy)));}
      return response;
    }).catch(()=>caches.match(ROOT)));
  }else if(/\.(js|css|png)$/.test(url.pathname)){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
      return response;
    })));
  }
});
