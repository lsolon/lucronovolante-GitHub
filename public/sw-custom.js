// Custom SW logic to ignore keepalive and GA requests
self.addEventListener('fetch', (event) => {
  if (
    event.request.url.includes('google-analytics.com') ||
    event.request.url.includes('googletagmanager.com') ||
    event.request.keepalive
  ) {
    return;
  }
});
