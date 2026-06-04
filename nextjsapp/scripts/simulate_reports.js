(async function(){
  const proxy = 'http://localhost:3001/ld-proxy';
  const sdkPrefix = 'https://app.launchdarkly.com/sdk/evalx/6a1790fef9013d0a7c8f5882';
  const fetchJson = async (payload) => {
    const res = await fetch(proxy, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const txt = await res.text();
    console.log('proxy->', payload.method, payload.url, '=>', res.status);
    return txt;
  };

  const reports = [
    { kind: 'user', key: 'anon-sim-1' },
    { kind: 'user', key: 'anon-sim-2', custom: { a: 1, b: null } },
    { kind: 'user', key: 'anon-sim-3', custom: { list: [1,2,3] } },
  ];

  for (const r of reports) {
    await fetchJson({ url: sdkPrefix + '/context', method: 'REPORT', headers: { 'content-type': 'application/json' }, body: r });
    await new Promise((r) => setTimeout(r, 300));
  }

  // Encoded context GETs
  for (const r of reports) {
    const enc = Buffer.from(JSON.stringify(r)).toString('base64');
    const target = sdkPrefix + '/contexts/' + enc;
    await fetchJson({ url: target, method: 'GET' });
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('done');
})();
