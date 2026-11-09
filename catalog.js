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
  {id:9,name:'고영표 홈 마킹 유니폼 (상품 예시)',player:'고영표',category:'유니폼',price:119000,mapZone:'uniform',kind:'home',tag:'DEMO PLAYER',sizes:{90:3,95:5,100:6,105:2},selected:'95'},
  {id:10,name:'강백호 선데이 마킹 유니폼 (상품 예시)',player:'강백호',category:'유니폼',price:129000,mapZone:'uniform',kind:'sunday',tag:'DEMO PLAYER',sizes:{90:2,95:0,100:7,105:3},selected:'95'},
  {id:11,name:'쿨링 응원 타월 (상품 예시)',category:'응원용품',price:19000,mapZone:null,kind:'towel',tag:'SUMMER DEMO',sizes:{FREE:10},selected:'FREE'}
);
const demoCuration=[
  {id:'tag:starter',name:'입문자용 풀세트',description:'세트 구성 후보를 개별 상품으로 안내해요. 완성 세트나 묶음 주문은 아닙니다.',products:[4,3,5]},
  {id:'tag:away',name:'원정 응원용 패키지',description:'원정 응원 구성 후보예요. 각 상품의 재고와 사이즈를 별도로 확인해 주세요.',products:[2,5]},
  {id:'tag:summer',name:'여름 시즌 쿨링 굿즈',description:'여름 응원을 위한 예시 상품이에요. 냉감 성능은 검증된 상품 정보가 아닙니다.',products:[11]}
];
