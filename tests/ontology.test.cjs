// Run with: node --test tests/ontology.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function model(){const ctx=vm.createContext({});for(const f of ['catalog.js','ontology.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);return vm.runInContext('WizKnowledge',ctx)}
test('player marking request traverses compatibility and adds kit cost',()=>{const k=model(),f=k.parse('최원준 홈 유니폼 95 마킹하고 싶어');assert.equal(f.supported,true);const bundle=k.search(f).results.find(r=>r.extra);assert.equal(bundle.p.id,4);assert.equal(bundle.total,109000);assert.ok(bundle.relations.some(r=>r.to==='매장 밖 마킹 공간'));k.get('kit:choi-home').stock=0;assert.ok(k.search(f).results.every(r=>!r.extra));});
test('removing compatibility relation removes inferred bundle',()=>{const k=model();k.edges.splice(k.edges.findIndex(e=>e.rel==='compatibleWith'),1);assert.ok(k.search(k.parse('최원준 홈 유니폼 95 마킹')).results.every(r=>!r.extra));});
test('budget and pickup constraints apply to each returned combination',()=>{const k=model();const rs=k.search(k.parse('3만원 이하 오늘 픽업할 응원 굿즈')).results;assert.equal(rs.length,2);assert.ok(rs.every(r=>r.total<=30000&&r.pickup));assert.equal(k.search({...k.parse('유니폼'),budget:'0'}).results.length,0);assert.ok(k.search(k.parse('15000원 미만 굿즈')).results.every(r=>r.total<15000));});
test('sold-out exact size is distinct from alternative sizes',()=>{const k=model(),f=k.parse('최원준 어웨이 유니폼 95'),r=k.search(f);assert.equal(r.results.length,0);assert.equal(r.blocked[0].size,'95');const alt=k.alternatives(f,r.blocked);assert.ok(alt.length>0);assert.ok(alt.every(x=>x.size!=='95'&&x.p.id===2));});
test('unregistered player is not silently ignored; blank shirt alone is not player merchandise',()=>{const k=model();assert.equal(k.parse('강백호 유니폼 95').supported,false);assert.equal(k.search(k.parse('강백호 유니폼 95')).results.length,0);assert.ok(k.search(k.parse('최원준 홈 유니폼 95')).results.every(r=>r.p.id!==4));});
