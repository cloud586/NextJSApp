(async () => {
  try {
    const url = 'http://localhost:3000/api/ld-secure-hash';
    const res = await fetch(url);
    const text = await res.text();
    console.log(JSON.stringify({ status: res.status, text }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ error: String(e), stack: e.stack }, null, 2));
    process.exit(1);
  }
})();
