const crypto = require('crypto');

const secret = 'sdk-c74ff13d-1e9b-46c6-9c6a-80ae348ff223';

// What YOUR backend is hashing (alphabetical order)
const yourHash = '{"key":"anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e","kind":"user"}';

// What the SDK is sending (kind first, then key)
const sdkOrder = '{"kind":"user","key":"anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e"}';

// What LaunchDarkly expects
const expectedHash = '647bc7b7203cc40972f5471b787239a4d4ee1b2d14edc7b362989beeec718c10';

const hash1 = crypto.createHmac('sha256', secret).update(yourHash).digest('hex');
const hash2 = crypto.createHmac('sha256', secret).update(sdkOrder).digest('hex');

console.log('Your backend hash input:', yourHash);
console.log('Your computed hash:    ', hash1);
console.log('');
console.log('SDK order:             ', sdkOrder);
console.log('Hash if SDK order:     ', hash2);
console.log('');
console.log('Expected hash:         ', expectedHash);
console.log('SDK order matches LD:  ', hash2 === expectedHash);
