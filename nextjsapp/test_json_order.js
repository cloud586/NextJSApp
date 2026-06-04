const crypto = require('crypto');

const secret = 'sdk-c74ff13d-1e9b-46c6-9c6a-80ae348ff223';
const userKey = 'anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e';

// What does JSON.stringify produce with default order?
const context1 = { kind: 'user', key: userKey };
const json1 = JSON.stringify(context1);
const hash1 = crypto.createHmac('sha256', secret).update(json1).digest('hex');

// What if we manually construct it in kind-first order?
const context2 = { kind: 'user', key: userKey };
// Get keys in the order we want
const manualJson = JSON.stringify({kind: context2.kind, key: context2.key});
const hash2 = crypto.createHmac('sha256', secret).update(manualJson).digest('hex');

// What LaunchDarkly SDK sends (decoded from URL)
const sdkJson = '{"kind":"user","key":"anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e"}';
const hash3 = crypto.createHmac('sha256', secret).update(sdkJson).digest('hex');

// Current hash we're using
const currentHash = '647bc7b7203cc40972f5471b787239a4d4ee1b2d14edc7b362989beeec718c10';

console.log('JSON.stringify({kind, key}):   ', json1, '-> hash:', hash1);
console.log('Manual {kind, key} order:      ', manualJson, '-> hash:', hash2);
console.log('SDK encoded context:           ', sdkJson, '-> hash:', hash3);
console.log('Current hash we\'re sending:    ', currentHash);
console.log('');
console.log('SDK encoded hash matches:      ', hash3 === currentHash);
