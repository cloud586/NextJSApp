const crypto = require('crypto');

const secret = 'sdk-c74ff13d-1e9b-46c6-9c6a-80ae348ff223';
const userKey = 'anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e';

// Option 1: Hash just the user key (as stated in the initial explanation)
const hash1 = crypto.createHmac('sha256', secret).update(userKey).digest('hex');

// Option 2: Hash the full context (what we're currently doing)
const contextJson = '{"key":"anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e","kind":"user"}';
const hash2 = crypto.createHmac('sha256', secret).update(contextJson).digest('hex');

// Option 3: Hash the context in SDK order
const sdkOrder = '{"kind":"user","key":"anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e"}';
const hash3 = crypto.createHmac('sha256', secret).update(sdkOrder).digest('hex');

// What we're sending to LaunchDarkly
const sentHash = '647bc7b7203cc40972f5471b787239a4d4ee1b2d14edc7b362989beeec718c10';

console.log('Hash of just user key:          ', hash1);
console.log('Hash of context (our order):    ', hash2);
console.log('Hash of context (SDK order):    ', hash3);
console.log('');
console.log('Hash being sent to LD:          ', sentHash);
console.log('');
console.log('Matches user key only:          ', hash1 === sentHash);
console.log('Matches context (our order):    ', hash2 === sentHash);
console.log('Matches context (SDK order):    ', hash3 === sentHash);
