const V='burmalda-v7';
const CORE=['./','index.html','manifest.webmanifest'];
const EXTRA=['icon-192.png','icon-512.png','maskable-512.png','favicon.png','apple-touch-icon.png',
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'];
const HOSTS=['cdnjs.cloudflare.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];
const good=r=>r&&(r.ok||r.type==='opaque');
const store=(c,req,res)=>good(res)?c.put(req,res.clone()):0;
const net=(r,ms)=>new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('timeout')),ms);fetch(r).then(x=>{clearTimeout(t);ok(x)},e=>{clearTimeout(t);no(e)})});

self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(V);
 await Promise.all(CORE.map(async u=>{const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok)throw new Error(u);await c.put(u,r)}));
 await Promise.allSettled(EXTRA.map(async u=>{const r=await fetch(u,{cache:'reload'});await store(c,u,r)}));
 await self.skipWaiting()})()));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k!==V)await caches.delete(k);
 if(self.registration.navigationPreload)await self.registration.navigationPreload.enable();
 await self.clients.claim()})()));

self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET')return;
 const same=u.origin===location.origin;
 if(!same&&!HOSTS.includes(u.hostname))return;   // Supabase и всё чужое — мимо кэша
 if(same&&u.pathname.endsWith('/sw.js'))return;

 if(r.mode==='navigate'){                          // HTML: сеть с таймаутом → кэш
  e.respondWith((async()=>{
   const c=await caches.open(V);
   try{const p=await e.preloadResponse,n=p||await net(r,4000);if(n.ok)c.put('index.html',n.clone());return n}
   catch{return(await c.match(r,{ignoreSearch:true}))||(await c.match('index.html'))||(await c.match('./'))||Response.error()}})());
  return}

 e.respondWith((async()=>{                         // остальное: из кэша, обновляем в фоне
  const c=await caches.open(V),hit=await c.match(r);
  const upd=fetch(r).then(n=>{store(c,r,n);return n}).catch(()=>null);
  if(hit){e.waitUntil(upd);return hit}
  return(await upd)||Response.error()})())});
