/* Pasko Photo Magic PWA: service worker, install prompt, launch splash video. */
(() => {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = document.createElement('style');
  css.textContent = `
  #pwaSplash{position:fixed;inset:0;z-index:2000;background:#0e1a30;display:grid;place-items:center;transition:opacity .5s ease}
  #pwaSplash.out{opacity:0;pointer-events:none}
  #pwaSplash video{width:100%;height:100%;object-fit:cover}
  #pwaSplash button{position:absolute;right:16px;top:calc(env(safe-area-inset-top,0px) + 14px);height:40px;padding:0 16px;border:0;border-radius:999px;background:#ffffff26;color:#fff;font:600 14px "Trebuchet MS",Arial,sans-serif;cursor:pointer}
  #pwaSplash button:focus-visible,.pwa-bar button:focus-visible{outline:3px solid #f0b429;outline-offset:2px}
  .pwa-bar{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translateX(-50%);z-index:70;display:flex;align-items:center;gap:10px;max-width:calc(100% - 24px);padding:10px 12px 10px 16px;border-radius:14px;background:#fffdf7f2;box-shadow:0 12px 30px #053a1f33;font:500 14px "Trebuchet MS",Arial,sans-serif;color:#053a1f}
  .pwa-bar .go{height:36px;padding:0 16px;border:0;border-radius:10px;background:#d92d2d;color:#fff;font:600 14px inherit;cursor:pointer;white-space:nowrap}
  .pwa-bar .x{width:36px;height:36px;border:0;background:none;font-size:20px;color:#4f6b5b;cursor:pointer}`;
  document.head.appendChild(css);

  /* ---- 1. service worker ---- */
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

  /* ---- 2. launch splash: only when opened from the home screen, once per session ---- */
  try {
    if (standalone && !sessionStorage.getItem('paskoSplash')) {
      sessionStorage.setItem('paskoSplash', '1');
      const portrait = matchMedia('(orientation: portrait)').matches;
      const box = document.createElement('div'); box.id = 'pwaSplash'; box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Pasko Photo Magic');
      const v = document.createElement('video'); v.playsInline = true; v.preload = 'auto';
      v.src = '/splash/pasko-splash-' + (portrait ? 'portrait' : 'landscape') + '.mp4';
      const skip = document.createElement('button'); skip.textContent = 'Skip';
      box.append(v, skip); document.body.appendChild(box);
      const done = () => { box.classList.add('out'); setTimeout(() => box.remove(), 600); };
      v.addEventListener('ended', done); v.addEventListener('error', done); skip.addEventListener('click', done);
      setTimeout(done, 8000);                       // safety net
      if (reduce) done(); else v.play().catch(() => { v.muted = true; v.play().catch(done); });  // retry muted if sound is blocked
    }
  } catch (e) {}

  /* ---- 3. install prompt ---- */
  if (standalone) return;
  const KEY = 'paskoInstallDismissed';
  const dismissed = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  function bar(text, action, onGo) {
    if (dismissed() || document.querySelector('.pwa-bar')) return;
    const b = document.createElement('div'); b.className = 'pwa-bar'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Install app');
    const p = document.createElement('span'); p.textContent = text; b.appendChild(p);
    if (action) { const g = document.createElement('button'); g.className = 'go'; g.textContent = action; g.onclick = () => { onGo(); b.remove(); }; b.appendChild(g); }
    const x = document.createElement('button'); x.className = 'x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
    x.onclick = () => { try { localStorage.setItem(KEY, '1'); } catch (e) {} b.remove(); }; b.appendChild(x);
    document.body.appendChild(b);
  }
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    bar('Add Pasko Magic to your home screen', 'Install', async () => { e.prompt(); await e.userChoice; });
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (ios) setTimeout(() => bar('To install: tap Share, then Add to Home Screen.'), 4000);
  addEventListener('appinstalled', () => document.querySelector('.pwa-bar')?.remove());
})();
