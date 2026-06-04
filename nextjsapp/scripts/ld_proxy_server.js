const http = require('http');
const { URL } = require('url');
// Load local env (if present) so `LD_SECURE_MODE_SECRET` is available to the proxy
try {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // ignore if dotenv not installed or file missing
}

const PORT = process.env.LD_PROXY_PORT ? Number(process.env.LD_PROXY_PORT) : 3001;

async function forward(url, method, headers, body) {
  const fetchOptions = { method };
  const hdrs = {};
  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([k, v]) => {
      hdrs[k.toLowerCase()] = v;
    });
  }
  // If there's a body and no content-type, default to JSON
  if (body != null && !hdrs['content-type']) {
    hdrs['content-type'] = 'application/json';
  }
  if (Object.keys(hdrs).length > 0) fetchOptions.headers = hdrs;
  if (body != null) fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  const responseHeaders = {};
  res.headers.forEach((v, k) => (responseHeaders[k] = v));
  return { status: res.status, headers: responseHeaders, body: text };
}

const server = http.createServer(async (req, res) => {
  try {
    // enable CORS for local debugging
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/ld-proxy') {
      res.writeHead(404, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'not found' }));
    }

    if (req.method === 'GET') {
      const target = url.searchParams.get('url');
      if (!target) return res.end(JSON.stringify({ error: 'missing url' }));
      // If the GET target contains a context encoded in the path, try to
      // decode it for logging and comparison.
      try {
        const u = new URL(target);
        if (u.pathname.includes('/contexts/')) {
          const parts = u.pathname.split('/contexts/');
          const enc = parts[1].split('/')[0];
          try {
            const decoded = Buffer.from(enc, 'base64').toString('utf8');
            console.info('[LD-proxy] decoded-context', { encoded: enc, decoded: decoded.slice(0,1000), url: target });
            // If we have a local secret, compute canonical hash for comparison
            const secret = process.env.LD_SECURE_MODE_SECRET || process.env.LD_SECURE_MODE_KEY;
            if (secret) {
              function stableStringify(v) {
                if (v === null || typeof v !== 'object') return JSON.stringify(v);
                if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
                const keys = Object.keys(v).filter(k => v[k] !== undefined).sort();
                return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
              }
              const parsed = JSON.parse(decoded);
              const canonical = stableStringify(parsed);
              const crypto = require('crypto');
              const h = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
              console.info('[LD-proxy] decoded-hash-compare', { canonicalSample: canonical.slice(0,1000), computedHash: h, url: target });
              try {
                const fs = require('fs');
                const p = require('path').join(__dirname, 'ld_hash_pairs.log');
                const entry = JSON.stringify({ ts: Date.now(), url: target, decoded: decoded, canonical: canonical, hash: h }) + '\n';
                  fs.appendFileSync(p, entry);
                  console.info('[LD-proxy] wrote-pair', { path: p, sample: entry.slice(0,200) });
              } catch (e) {}
            }
          } catch (e) {
            // ignore decode errors
          }
        }
      } catch (e) {}

      const forwarded = await forward(target, 'GET', undefined, undefined);
      res.writeHead(forwarded.status, forwarded.headers);
      return res.end(forwarded.body);
    }

    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = body ? JSON.parse(body) : {};
      const { url: target, method: m = 'GET', headers, body: b } = payload;
      if (!target) return res.end(JSON.stringify({ error: 'missing url' }));
      // If we have a local secure-mode secret available, compute and append
      // the HMAC for REPORT requests so the upstream accepts secure-mode contexts.
      let finalTarget = target;
      try {
        const secret = process.env.LD_SECURE_MODE_SECRET || process.env.LD_SECURE_MODE_KEY;
        if (secret && m === 'REPORT' && b) {
          try {
            const crypto = require('crypto');
            // deterministic JSON canonicalization to match LaunchDarkly SDK
            function stableStringify(v) {
              if (v === null || typeof v !== 'object') return JSON.stringify(v);
              if (Array.isArray(v)) {
                const items = v
                  .map(stableStringify)
                  .filter((s) => s !== undefined && s !== 'null');
                return '[' + items.join(',') + ']';
              }
              const keys = Object.keys(v)
                .filter((k) => v[k] !== undefined && v[k] !== null && !(typeof v[k] === 'object' && Object.keys(v[k] || {}).length === 0 && !Array.isArray(v[k])))
                .sort();
              return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
            }
            const clientRaw = typeof b === 'string' ? b : JSON.stringify(b);
            const canonical = typeof b === 'string' ? b : stableStringify(b);
            const h = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
            console.info('[LD-proxy] hash-debug', { clientRaw: clientRaw.slice(0,1000), canonicalSample: canonical.slice(0,1000), hash: h });
            try {
              const fs = require('fs');
              const p = require('path').join(__dirname, 'ld_hash_pairs.log');
              const entry = JSON.stringify({ ts: Date.now(), url: finalTarget, clientRaw: clientRaw, canonical: canonical, hash: h }) + '\n';
              fs.appendFileSync(p, entry);
              console.info('[LD-proxy] wrote-pair', { path: p, sample: entry.slice(0,200) });
            } catch (e) {}
            if (!/\?h=/.test(finalTarget)) {
              finalTarget = finalTarget + (finalTarget.includes('?') ? '&' : '?') + 'h=' + h;
            }
          } catch (e) {
            console.warn('[LD-proxy] hash-debug failed', String(e));
          }
        }
        // Always persist a sample of the client raw and canonicalized JSON
        if (b) {
          try {
            function stableStringify(v) {
              if (v === null || typeof v !== 'object') return JSON.stringify(v);
              if (Array.isArray(v)) {
                const items = v
                  .map(stableStringify)
                  .filter((s) => s !== undefined && s !== 'null');
                return '[' + items.join(',') + ']';
              }
              const keys = Object.keys(v)
                .filter((k) => v[k] !== undefined && v[k] !== null && !(typeof v[k] === 'object' && Object.keys(v[k] || {}).length === 0 && !Array.isArray(v[k])))
                .sort();
              return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
            }
            const fs = require('fs');
            const p = require('path').join(__dirname, 'ld_hash_pairs.log');
            const clientRaw = typeof b === 'string' ? b : JSON.stringify(b);
            const canonical = typeof b === 'string' ? b : stableStringify(b);
            const entry = JSON.stringify({ ts: Date.now(), url: finalTarget, clientRaw: clientRaw, canonical: canonical, hash: null }) + '\n';
            fs.appendFileSync(p, entry);
            console.info('[LD-proxy] wrote-pair', { path: p, sample: entry.slice(0,200) });
          } catch (e) {}
        }
      } catch (e) {}

      console.info('[LD-proxy] forward', { target: finalTarget, method: m, headers, hasBody: b != null, bodySample: typeof b === 'string' ? b.slice(0,200) : JSON.stringify(b)?.slice(0,200) });
      const forwarded = await forward(finalTarget, m, headers, b);
      console.info('[LD-proxy] response', { status: forwarded.status, headers: forwarded.headers && Object.keys(forwarded.headers).slice(0,10), respSample: typeof forwarded.body === 'string' ? forwarded.body.slice(0,200) : JSON.stringify(forwarded.body)?.slice(0,200) });
      res.writeHead(forwarded.status, forwarded.headers);
      return res.end(forwarded.body);
    }

    res.writeHead(405, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => console.log(`LD proxy listening on http://localhost:${PORT}`));
