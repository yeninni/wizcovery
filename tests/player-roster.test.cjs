const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function model(){const context=vm.createContext({});for(const file of ['player-roster.js','catalog.js','ontology.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',file),'utf8'),context);return vm.runInContext('({roster:WizRoster,knowledge:WizKnowledge})',context);}
test('dated KT roster includes all position groups, development players and military separately',()=>{
 const {roster}=model();assert.equal(roster.meta.roster_date,'2026-11-14');assert.equal(roster.players.length,90);
 assert.equal(new Set(roster.players.map(p=>p.id)).size,90);assert.equal(new Set(roster.players.map(p=>p.name)).size,90);
 for(const [position,count] of [['투수',37],['포수',8],['내야수',14],['외야수',18],['군보류',13]])assert.equal(roster.players.filter(p=>p.position===position).length,count);
 assert.equal(roster.players.filter(p=>p.status==='development').length,12);assert.ok(roster.players.filter(p=>p.status==='military').every(p=>p.number===null));
 assert.equal(roster.players.some(p=>p.name==='강백호'),false);assert.equal(roster.players.some(p=>p.name==='이강철'),false);
});
test('all roster names use the same parser and preserve player identity in ordinary questions',()=>{
 const {roster,knowledge}=model();for(const player of roster.players){const f=knowledge.parse(player.name+' 선수 홈 유니폼 95');assert.equal(f.supported,true,player.name);assert.equal(f.player,player.id,player.name);assert.equal(f.size,'95');assert.equal(f.style,'home');}
 for(const query of ['샘 힐리어드 홈 유니폼 100','데이비스 대니엘 유니폼 95','로건 앨런 홈 유니폼']){const f=knowledge.parse(query);assert.equal(f.supported,true,query);assert.ok(roster.get(f.player),query);}
});
test('number relations distinguish a real zero jersey from an unprovided military number',()=>{
 const {roster,knowledge}=model();assert.equal(roster.get('player:choi').number,'3');assert.equal(roster.get('player:ko').number,'1');
 const zero=roster.players.find(p=>p.name==='이정범');assert.equal(knowledge.related(zero.id,'hasNumber')[0].name,'0');
 for(const player of roster.players.filter(p=>p.status==='military'))assert.equal(knowledge.related(player.id,'hasNumber').length,0);
 for(const edge of knowledge.edges){assert.ok(knowledge.get(edge.from),'missing from '+edge.from);assert.ok(knowledge.get(edge.to),'missing to '+edge.to);}
});
test('recognized players without merchandise do not fall back to unrelated generic products',()=>{
 const {knowledge}=model();const f=knowledge.parse('안현민 유니폼 95');assert.equal(f.supported,true);assert.equal(knowledge.hasPlayerProducts(f.player),false);
 assert.equal(knowledge.search(f).results.length,0);assert.equal(knowledge.search(f).blocked.length,0);
 assert.equal(knowledge.parse('미등록선수 유니폼 95').supported,false);assert.equal(knowledge.parse('강백호 유니폼 95').supported,false);
 const kit=knowledge.parse('장성우 어웨이 마킹키트');assert.equal(knowledge.hasPlayerProducts(kit.player),true);assert.equal(knowledge.search(kit).results[0].p.id,584);
});
