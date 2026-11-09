const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function ux(){const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'..','experience.js'),'utf8'),c);return vm.runInContext('WizUX',c)}
test('marking simulation closes exactly at the stated cutoff',()=>{const u=ux();assert.equal(u.markingEstimate(16*60+59).closed,false);assert.equal(u.markingEstimate(17*60).closed,true);assert.equal(u.markingEstimate(17*60+10).closed,true);});
test('marking total includes both waiting and processing ranges',()=>{const m=ux().markingEstimate(16*60+30);assert.equal(m.total[0],m.wait[0]+m.work[0]);assert.equal(m.total[1],m.wait[1]+m.work[1]);});
