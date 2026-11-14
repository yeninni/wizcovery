const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function model(globals={}){const c=vm.createContext(globals);for(const f of ['player-roster.js','catalog.js','browser-simulator.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c);return vm.runInContext('WizSim',c)}
const stocks=s=>s.inventory.flatMap(p=>p.variants.map(v=>v.on_hand));
test('browser simulation is deterministic, independent of polling and timezone offset',()=>{const m=model(),a=m.snapshot({at:'2026-11-14T11:00'});assert.equal(JSON.stringify(a),JSON.stringify(m.snapshot({at:'2026-11-14T02:00:00Z'})));m.snapshot({at:'2026-11-14T18:00'});assert.equal(JSON.stringify(a),JSON.stringify(m.snapshot({at:'2026-11-14T11:00'})));assert.equal(a.meta.synthetic,true);});
test('inventory decreases over the day, and only restock increases it',()=>{const m=model();let prev;for(let h=0;h<24;h++){const next=stocks(m.snapshot({at:`2026-11-14T${String(h).padStart(2,'0')}:00`}));assert.ok(next.every(n=>n>=0));if(prev)assert.ok(next.every((n,i)=>n<=prev[i]));prev=next;}const before=stocks(m.snapshot({at:'2026-11-10T15:59:55',scenario:'restock'})),after=stocks(m.snapshot({at:'2026-11-10T16:00',scenario:'restock'}));assert.ok(after.every((n,i)=>n>before[i]));});
test('closed stores retain physical stock and disable pickup and marking',()=>{const m=model(),d=m.snapshot({at:'2026-11-14T23:00'});assert.equal(d.store.open,false);assert.equal(d.marking.accepting,false);assert.equal(d.marking.total_min,null);assert.ok(d.inventory.every(p=>p.variants.every(v=>v.available===0)));assert.ok(d.pickup.slots.every(s=>!s.available));});
test('weekend game peak, marking cutoff and pickup lead time are time-driven',()=>{const m=model(),wk=m.snapshot({at:'2026-11-14T12:50'}),mon=m.snapshot({at:'2026-11-09T13:00'});assert.ok(wk.store.visitors>mon.store.visitors);assert.equal(m.snapshot({at:'2026-11-14T12:59:55'}).marking.accepting,true);assert.equal(m.snapshot({at:'2026-11-14T13:00'}).marking.accepting,false);const slots=m.snapshot({at:'2026-11-10T15:00'}).pickup.slots.filter(s=>s.available);assert.ok(slots.length>0);assert.ok(slots.every(s=>Date.parse(s.start)>=Date.parse('2026-11-10T15:30+09:00')));});
test('scenarios and input validation remain explicit',()=>{const m=model(),data=m.snapshot({at:'2026-11-14T11:00',scenario:'soldout'});assert.ok(data.inventory.filter(p=>[1,2,8].includes(p.id)).every(p=>p.variants.find(v=>v.size==='95').on_hand===0));for(const query of [{at:'bad'},{seed:-1},{scenario:'bogus'}])assert.throws(()=>m.snapshot(query));});

function fixedDate(instant){const RealDate=Date;return class extends RealDate{constructor(...args){super(...(args.length?args:[instant]));}static now(){return new RealDate(instant).getTime();}};}
test('fresh visitors start open with stock, marking and pickup even during Korean nighttime',()=>{
 const m=model({Date:fixedDate('2026-11-14T03:30:00+09:00')});
 assert.equal(m.read().mode,'fixed');assert.equal(m.read().at,'2026-11-14T11:00');assert.equal(m.read().scenario,'normal');
 assert.equal(m.data.store.open,true);assert.equal(m.data.marking.accepting,true);
 assert.ok(m.data.pickup.slots.some(s=>s.available));assert.ok(m.data.inventory.find(p=>p.id===586).variants.some(v=>v.available>0));
 const sunday=model({Date:fixedDate('2026-11-15T00:30:00+09:00')});assert.equal(sunday.read().at,'2026-11-21T11:00');
});
test('saved closed and live choices take priority over the open default',()=>{
 const Date=fixedDate('2026-11-14T03:30:00+09:00');
 for(const settings of [{mode:'fixed',at:'2026-11-14T23:00',seed:42,scenario:'normal'},{mode:'live',at:'',seed:42,scenario:'normal'}]){
  const m=model({Date,localStorage:{getItem:()=>JSON.stringify(settings)}});
  assert.equal(m.read().mode,settings.mode);assert.equal(m.read().at,settings.at);assert.equal(m.data.store.open,false);
 }
});
test('the open default and explicit settings work when browser storage is blocked',()=>{
 const m=model({Date:fixedDate('2026-11-14T03:30:00+09:00'),localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
 assert.equal(m.data.store.open,true);m.save({mode:'fixed',at:'2026-11-14T23:00'});assert.equal(m.current().store.open,false);
});
