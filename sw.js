self.addEventListener('install', (e) => {
  console.log('[Service Worker] Terinstal');
});

self.addEventListener('fetch', (e) => {
  // Syarat dasar agar Chrome mengenali web ini sebagai PWA
});
