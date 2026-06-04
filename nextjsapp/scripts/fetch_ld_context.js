(async () => {
  try {
    const url = 'https://app.launchdarkly.com/sdk/evalx/6a1790fef9013d0a7c8f5882/context';
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const headers = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    const body = await res.text();
    console.log(JSON.stringify({ url, status: res.status, headers, body }));
  } catch (e) {
    console.error(JSON.stringify({ error: String(e), stack: e.stack }));
    process.exit(1);
  }
})();
