// 시안용 공통 상품 데이터. 실제 상품·가격·재고와 다릅니다.
const products=[{id:1,name:'2026 홈 마킹 유니폼',player:'최원준',category:'유니폼',price:119000,zone:'B',kind:'home',tag:'FAN FAVORITE',sizes:{90:8,95:4,100:12,105:6},selected:'95'},{id:2,name:'2026 어웨이 마킹 유니폼',player:'최원준',category:'유니폼',price:119000,zone:'B',kind:'away',tag:'AWAY EDITION',sizes:{90:3,95:0,100:7,105:4},selected:'95'},{id:3,name:'위즈 클래식 볼캡',category:'모자',price:35000,zone:'A',kind:'cap',tag:'BEST PICK',sizes:{FREE:16},selected:'FREE'},{id:4,name:'2026 홈 레플리카 유니폼',category:'유니폼',price:89000,zone:'B',kind:'home',tag:'ESSENTIAL',sizes:{90:5,95:9,100:14,105:8},selected:'95'},{id:5,name:'위즈 응원 타월',category:'응원용품',price:15000,zone:'C',kind:'towel',tag:'CHEER TOGETHER',sizes:{FREE:24},selected:'FREE'},{id:6,name:'위즈 유니폼 키링',category:'액세서리',price:12000,zone:'D',kind:'key',tag:'LITTLE WIZ',sizes:{FREE:0},selected:'FREE'}];
products.push({id:7,name:'수원 콜라보 굿즈 세트',category:'액세서리',price:22000,zone:'입구 앞',mapZone:'collab',kind:'key',tag:'SUWON COLLAB',sizes:{FREE:8},selected:'FREE'},{id:8,name:'콜라보 팝업 유니폼',category:'유니폼',price:129000,zone:'오른쪽 팝업',mapZone:'collab',kind:'away',tag:'COLLAB POP-UP',sizes:{90:3,95:4,100:0,105:6},selected:'95'});

// 제공된 최신 배치도 기준. 응원타월의 정확한 위치는 미확인.
products.forEach(p=>{p.mapZone=p.category==='유니폼'?'uniform':null;if([7,8].includes(p.id))p.mapZone='collab';});

// 선수와 신규 상품은 관계망 시연용입니다. 실제 소속·등번호·판매 상품을 의미하지 않습니다.
const demoPlayers=[
  {id:'player:choi',name:'최원준',number:'53'},
  {id:'player:ko',name:'고영표',number:'1'},
  {id:'player:kang',name:'강백호',number:'50'}
];
products.push(
  {id:9,name:'고영표 홈 마킹 유니폼',player:'고영표',category:'유니폼',price:119000,mapZone:'uniform',kind:'home',tag:'DEMO PLAYER',sizes:{90:3,95:5,100:6,105:2},selected:'95'},
  {id:10,name:'강백호 선데이 마킹 유니폼',player:'강백호',category:'유니폼',price:129000,mapZone:'uniform',kind:'sunday',tag:'DEMO PLAYER',sizes:{90:2,95:0,100:7,105:3},selected:'95'},
  {id:11,name:'쿨링 응원 타월',category:'응원용품',price:19000,mapZone:null,kind:'towel',tag:'SUMMER DEMO',sizes:{FREE:10},selected:'FREE'}
);
const demoCuration=[
  {id:'tag:starter',name:'입문자용 풀세트',description:'세트 구성 후보를 개별 상품으로 안내해요. 완성 세트나 묶음 주문은 아닙니다.',products:[590,597,594]},
  {id:'tag:away',name:'원정 응원용 패키지',description:'원정 응원 구성 후보예요. 각 상품의 재고와 사이즈를 별도로 확인해 주세요.',products:[591,594]},
  {id:'tag:summer',name:'여름 시즌 쿨링 굿즈',description:'여름 응원을 위한 상품을 모았어요.',products:[583,580]}
];

// Replace the storefront's illustration-only sample assortment with the uploaded photos.
// Legacy IDs remain available for saved links and the existing relationship-model examples.
products.forEach(p=>{p.storefront=false;});
const uploadedGoods=[
  {id:586,name:'2026 어센틱 홈 유니폼',category:'유니폼',price:169000,kind:'home',image:'586-authentic-home-uniform.jpg'},
  {id:587,name:'2026 어센틱 어웨이 유니폼',category:'유니폼',price:169000,kind:'away',image:'587-authentic-away-uniform.jpg'},
  {id:588,name:'2026 클린 홈 유니폼',category:'유니폼',price:129000,kind:'home',image:'588-clean-home-uniform.jpg'},
  {id:589,name:'2026 클린 어웨이 유니폼',category:'유니폼',price:129000,kind:'away',image:'589-clean-away-uniform.jpg'},
  {id:590,name:'2026 레플리카 홈 유니폼',category:'유니폼',price:89000,kind:'home',image:'590-replica-home-uniform.jpg'},
  {id:591,name:'2026 레플리카 어웨이 유니폼',category:'유니폼',price:89000,kind:'away',image:'591-replica-away-uniform.jpg'},
  {id:580,name:'빅또리 썸머 유니폼',category:'유니폼',price:129000,kind:'summer',image:'580-bigttori-summer-uniform.jpg'},
  {id:583,name:'2025 정조대왕 쿨링 티셔츠',category:'의류',price:39000,kind:'tshirt',image:'583-jeongjo-cooling-tshirt.jpg'},
  {id:597,name:'또리 캐릭터 자수 볼캡',category:'모자',price:35000,kind:'cap',image:'597-ttori-embroidered-cap.jpg'},
  {id:594,name:'GRID 전사 머플러',category:'응원용품',price:25000,kind:'muffler',image:'594-grid-muffler.jpg'},
  {id:600,name:'버스트 오브 매직 니트 머플러',category:'응원용품',price:35000,kind:'muffler',image:'600-burst-magic-knit-muffler.jpg'},
  {id:595,name:'또리 인형 크로스백',category:'액세서리',price:29000,kind:'bag',image:'595-ttori-plush-crossbody.jpg'},
  {id:596,name:'빅 인형 크로스백',category:'액세서리',price:29000,kind:'bag',image:'596-vic-plush-crossbody.jpg'},
  {id:598,name:'로고 에코백',category:'액세서리',price:22000,kind:'bag',image:'598-logo-eco-bag.jpg'},
  {id:599,name:'로고프린트 3단 우산',category:'액세서리',price:24000,kind:'umbrella',image:'599-logo-folding-umbrella.jpg'},
  {id:584,name:'어웨이 마킹키트 · 장성우 22',category:'마킹키트',price:20000,kind:'marking-kit',image:'584-away-marking-kit.jpg'},
  {id:585,name:'핑크 클라우드 마킹키트 · 장성우 22',category:'마킹키트',price:22000,kind:'marking-kit',image:'585-pink-cloud-marking-kit.jpg'},
  {id:593,name:'빅또리 빅토리 마킹키트 · 장성우 22',category:'마킹키트',price:20000,kind:'marking-kit',image:'593-bigttori-victory-marking-kit.jpg'}
];
// Photos and product names come from the uploads. Prices, stock and sizes remain
// presentation data, using the same browser simulator as the existing catalog.
uploadedGoods.forEach(p=>{
  const clothing=['유니폼','의류'].includes(p.category);
  products.push({...p,image:'assets/products/'+p.image,storefront:true,
    mapZone:p.category==='마킹키트'?'marking-sheet':p.category==='유니폼'?'uniform':null,
    sizes:clothing?{90:5,95:8,100:12,105:6}:{FREE:16},selected:clothing?'95':'FREE'});
});
// Front views also illustrate the corresponding existing marked-uniform variants.
for(const [id,sourceId] of [[1,586],[2,587],[4,590],[9,586]]){
  const p=products.find(p=>p.id===id),source=products.find(p=>p.id===sourceId);
  p.image=source.image;p.imageAlt=source.name+' 앞면';
}
