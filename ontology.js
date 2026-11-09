/* 관계 데이터와 추론 규칙. 재고는 catalog.js의 동일 SKU 데이터를 참조한다. */
const WizKnowledge = (() => {
  const nodes = [
    {id:'player:choi',type:'Player',name:'최원준'},
    {id:'zone:uniform',type:'Zone',name:'유니폼 진열대'},
    {id:'zone:collab',type:'Zone',name:'콜라보 제품'},
    {id:'zone:marking-sheet',type:'Zone',name:'마킹지'},
    {id:'zone:checkout',type:'Zone',name:'계산대'},
    {id:'zone:marking-service',type:'Service',name:'매장 밖 마킹 공간'},
    {id:'service:pickup',type:'Service',name:'위즈픽업'},
    {id:'kit:choi-home',type:'MarkingKit',name:'최원준 홈 마킹지',price:20000,evidence:'demo',stock:5}
  ];
  const edges = [
    {from:'kit:choi-home',rel:'forPlayer',to:'player:choi'},
    {from:'kit:choi-home',rel:'locatedIn',to:'zone:marking-sheet'},
    {from:'kit:choi-home',rel:'appliedAt',to:'zone:marking-service'},
    {from:'product:4',rel:'compatibleWith',to:'kit:choi-home',evidence:'demo'}
  ];
  products.forEach(p=>{
    const id='product:'+p.id;
    nodes.push({id,type:'Product',name:p.name,source:p});
    if(p.player==='최원준')edges.push({from:id,rel:'forPlayer',to:'player:choi'});
    if(p.mapZone)edges.push({from:id,rel:'locatedIn',to:'zone:'+p.mapZone});
    if(!p.name.includes('마킹'))edges.push({from:id,rel:'supports',to:'service:pickup',evidence:'demo'});
    for(const [size,stock] of Object.entries(p.sizes)){
      const sku=id+':'+size;nodes.push({id:sku,type:'SKU',name:size,stock});edges.push({from:id,rel:'hasVariant',to:sku});
    }
  });
  const get=id=>nodes.find(n=>n.id===id);
  const related=(id,rel)=>edges.filter(e=>e.from===id&&e.rel===rel).map(e=>get(e.to));
  function parse(raw){
    const q=raw.trim();const size=q.match(/(?:^|\D)(90|95|100|105)(?!\d)/)?.[1]||'';
    let budget='';const won=q.match(/(\d+(?:\.\d+)?)\s*만\s*원/);const plain=q.match(/(\d[\d,]*)\s*원/);
    if(won)budget=String(Number(won[1])*10000);else if(plain)budget=String(Number(plain[1].replaceAll(',','')));
    const kind=/타월|타올/.test(q)?'응원용품':/유니폼/.test(q)?'유니폼':/모자|볼캡/.test(q)?'모자':/키링/.test(q)?'액세서리':'';
    const keywords=['수원','콜라보','키링','볼캡'].filter(k=>q.includes(k));
    const supported=!q||!!(size||budget||kind||keywords.length||/최원준|마킹|픽업|홈|어웨이|원정|응원|굿즈/.test(q));
    const residue=q.replace(/최원준|마킹|픽업|유니폼|타월|타올|모자|볼캡|키링|수원|콜라보|어웨이|원정|홈|응원|굿즈|오늘|경기장|구장|사이즈|이하|미만|미리|사고|싶어|싶다|찾아줘|찾고|추천|가능한|가능|하고|할|에서|받을|받고|있는|해줘|주세요|으로|까지|짜리|원|만|\d|[\s,.?!]/g,'').replace(/^[은는이가을를의와과도]+$/,'');
    return {size,budget,kind,player:q.includes('최원준')?'player:choi':'',marking:q.includes('마킹'),pickup:q.includes('픽업'),style:/어웨이|원정/.test(q)?'away':q.includes('홈')?'home':'',keywords,exclusive:q.includes('미만'),supported:supported&&!residue,unknown:residue};
  }
  function search(f){
    const results=[];const blocked=[];
    if(f.supported===false)return {results,blocked};
    for(const p of products){
      const id='product:'+p.id,kit=related(id,'compatibleWith')[0];
      const directPlayer=related(id,'forPlayer').some(n=>n.id===f.player);
      const kitPlayer=kit&&related(kit.id,'forPlayer').some(n=>n.id===f.player);
      if(f.kind&&p.category!==f.kind)continue;
      if(f.style&&p.kind!==f.style)continue;
      if(f.keywords?.some(k=>!p.name.includes(k)))continue;
      if(f.player&&!directPlayer&&!(f.marking&&kitPlayer))continue;
      const premarked=p.name.includes('마킹');
      if(f.marking&&!premarked&&!kit)continue;
      if(f.pickup&&(!related(id,'supports').some(n=>n.id==='service:pickup')||(f.marking&&kit)))continue;
      const extra=f.marking&&!premarked&&kit?kit:null;
      const total=p.price+(extra?.price||0);
      if(f.budget!==''&&f.budget!=null&&(f.exclusive?total>=Number(f.budget):total>Number(f.budget)))continue;
      const sizes=f.size?[f.size]:Object.keys(p.sizes);
      for(const size of sizes){
        if(!Object.hasOwn(p.sizes,size))continue;
        if(p.sizes[size]===0||(extra&&extra.stock===0)){blocked.push({p,size,reason:p.sizes[size]===0?'선택 사이즈 품절':'마킹지 품절'});continue;}
        const relations=[{from:p.name,rel:'사이즈별 재고',to:size+' · '+p.sizes[size]+'개'}];
        const reasons=['공통 상품 데이터에서 '+size+' 사이즈 재고 '+p.sizes[size]+'개 확인'];
        if(f.player){relations.push({from:extra?extra.name:p.name,rel:'관련 선수',to:'최원준'});reasons.push(extra?'최원준 마킹지와 연결 가능한 조합 (호환성 예시)':'최원준 선수 상품으로 등록됨');}
        if(extra){relations.push({from:p.name,rel:'호환 예시',to:extra.name},{from:extra.name,rel:'작업 장소',to:'매장 밖 마킹 공간'});reasons.push('유니폼 + 마킹지 합계 '+total.toLocaleString('ko-KR')+'원 · 작업비 별도 확인');}
        else if(f.marking&&premarked)reasons.push('마킹이 포함된 상품 예시 · 추가 마킹 작업 불필요');
        if(f.budget)reasons.push('예시 상품 합계가 예산 '+Number(f.budget).toLocaleString('ko-KR')+'원 '+(f.exclusive?'미만':'이하'));
        if(f.pickup){relations.push({from:p.name,rel:'수령 방법 예시',to:'위즈픽업'});reasons.push('추가 마킹 작업이 없는 픽업 대상 · 시간대 선택 필요');}
        const zone=related(id,'locatedIn')[0];if(zone)relations.push({from:p.name,rel:'위치',to:zone.name});
        results.push({p,size,extra,total,reasons,relations,pickup:!premarked&&!extra});
      }
    }
    results.sort((a,b)=>a.total-b.total||a.p.id-b.p.id||Number(a.size)-Number(b.size));return {results,blocked};
  }
  function alternatives(f,blocked){
    if(!blocked.length||!f.size)return [];
    const same=search({...f,size:''}).results.filter(r=>blocked.some(b=>b.p.id===r.p.id)&&r.size!==f.size);
    return same.slice(0,4).map(r=>({...r,difference:f.size+' → '+r.size+' 사이즈 변경. 착용감이 다르므로 사이즈 확인 필요'}));
  }
  return {nodes,edges,get,related,parse,search,alternatives};
})();
