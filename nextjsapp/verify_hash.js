const crypto = require('crypto');

const secret = 'sdk-c74ff13d-1e9b-46c6-9c6a-80ae348ff223';
const contextJson = '{"key":"anon-ef30b2b5-2007-4afe-b1fc-77eb9e94c20e","kind":"user"}';
const expectedHash = '647bc7b7203cc40972f5471b787239a4d4ee1b2d14edc7b362989beeec718c10';

const hash = crypto.createHmac('sha256', secret).update(contextJson).digest('hex');

console.log('Context:', contextJson);
console.log('Secret:', secret);
console.log('Computed Hash:', hash);
console.log('Expected Hash:', expectedHash);
console.log('Match:', hash === expectedHash);
