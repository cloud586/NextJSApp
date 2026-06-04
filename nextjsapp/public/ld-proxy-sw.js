self.addEventListener('fetch', event => {
  try {
    const url = event.request.url || '';
    if (url.includes('launchdarkly') || url.includes('/sdk/evalx/')) {
      event.respondWith((async () => {
        try {
          const req = event.request;
          let body = null;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            try { body = await req.clone().text(); } catch (e) { body = null; }
          }
          const proxyUrl = 'http://localhost:3001/ld-proxy';
          // serialize original request headers so the proxy can forward them
          const hdrs = {};
          try {
            for (const pair of req.headers.entries()) {
              hdrs[pair[0]] = pair[1];
            }
          } catch (e) {
            // ignore
          }
          const proxyRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url, method: req.method, headers: hdrs, body }),
          });
          const text = await proxyRes.text();
          const headers = new Headers(proxyRes.headers);
          return new Response(text, { status: proxyRes.status, headers });
        } catch (e) {
          return fetch(event.request);
        }
      })());
    }
  } catch (e) {
    // ignore
  }
});
