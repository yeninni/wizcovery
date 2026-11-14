const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=JSON.parse(fs.readFileSync(path.join(root,'data/fan-segments.json'),'utf8'));
function model(fetcher=async()=>({ok:true,json:async()=>structuredClone(source)})){
  const context=vm.createContext({fetch:fetcher});vm.runInContext(fs.readFileSync(path.join(root,'fan-data.js'),'utf8'),context);return vm.runInContext('WizFans',context);
}
test('published aggregates match the original workbook counts and do not deduplicate demographic matches',async()=>{
  const fans=model();await fans.load();
  assert.equal(fans.data.meta.purchase_observations,340910);assert.equal(fans.data.meta.membership_observations,664023);
  assert.equal(fans.data.purchase_cohorts.length,3931);assert.equal(fans.data.membership_cohorts.length,982);
  const result=fans.purchases({year:2025});
  assert.equal(result.buyer_observations,74885);assert.equal(result.purchase_count,228017);assert.equal(result.multiple_purchase_buyers,33373);assert.equal(result.unknown_region_count,41144);
  assert.equal(result.single_purchase_buyers+result.two_to_four_buyers+result.five_to_nine_buyers+result.ten_plus_buyers,result.buyer_observations);
});
test('cross filters use observed intersections and weighted purchase means',async()=>{
  const fans=model();await fans.load();const before=JSON.stringify(fans.data);
  const filtered=fans.purchases({year:'2025',gender:'여성',age_group:'20대',region:'경기도 수원시'});
  // These figures were independently counted in the 2025 source worksheet.
  assert.equal(filtered.buyer_observations,1615);assert.equal(filtered.purchase_count,7381);assert.equal(filtered.multiple_purchase_buyers,1006);
  assert.equal(filtered.mean_purchase_count,7381/1615);assert.equal(filtered.multiple_purchase_share,1006/1615);
  const female20=fans.purchases({year:2025,gender:'여성',age_group:'20대'});assert.equal(female20.buyer_observations,15821);
  assert.equal(JSON.stringify(fans.data),before);
});
test('missing regions stay separate and missing years are not filled or interpolated',async()=>{
  const fans=model();await fans.load();const unknown=fans.purchases({year:2025,region:'미상'});
  assert.equal(unknown.buyer_observations,41144);assert.equal(unknown.unknown_region_share,1);
  assert.deepEqual(Array.from(fans.series({gender:'여성'}),r=>r.year),[2017,2018,2019,2022,2023,2024,2025]);
  const absent=fans.purchases({year:2020});assert.equal(absent.buyer_observations,0);assert.equal(absent.mean_purchase_count,null);assert.equal(absent.multiple_purchase_share,null);
});
test('membership is a separate undated snapshot and all-year purchase observations are weighted',async()=>{
  const fans=model();await fans.load();const members=fans.membership({year:2017});
  assert.equal(members.member_observations,664023);assert.equal(members.composition_share,1);
  const female=fans.membership({gender:'여성'});assert.equal(female.member_observations,272485);assert.equal(female.composition_share,272485/664023);
  const all=fans.purchases();assert.equal(all.buyer_observations,340910);
  assert.equal(all.mean_purchase_count,all.purchase_count/340910);assert.equal('conversion_rate' in members,false);
});
test('data loads once, and a failed request can be retried without exposing a partial dataset',async()=>{
  let requests=0;const fans=model(async()=>{requests++;if(requests===1)return {ok:false};return {ok:true,json:async()=>structuredClone(source)};});
  await assert.rejects(fans.load());assert.equal(fans.data,null);await Promise.all([fans.load(),fans.load()]);await fans.load();assert.equal(requests,2);
  const broken=model(async()=>({ok:true,json:async()=>({...structuredClone(source),meta:{...source.meta,purchase_observations:1}})}));
  await assert.rejects(broken.load(),/집계 합계/);assert.equal(broken.data,null);
});
