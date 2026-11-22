# Pasko Photo Magic PWA: how to add it

Copy everything in this folder into the repo's `public/` folder (Vite/Lovable) so they sit at the site root:
  /manifest.webmanifest  /sw.js  /pwa.js  /offline.html  /favicon.png  /icons/*  /splash/*

Then edit the <head> of index.html (see the reply for the exact lines) and add
  <script src="/pwa.js" defer></script>
before </body>.

Vercel: if the app is a single-page app with a catch-all rewrite to /index.html, make sure the rewrite
does not swallow /sw.js, /manifest.webmanifest, /offline.html, /icons, /splash. Files in public/ are served first, so this is normally fine.
