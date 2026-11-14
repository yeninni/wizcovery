/* Read-only presentation view of the catalog, relationship model and active snapshot. */
const WizDataset = (() => {
  const relationNames={forPlayer:'선수',locatedIn:'위치',appliedAt:'작업 장소',compatibleWith:'호환 마킹지',hasDesign:'디자인',taggedAs:'큐레이션',supports:'수령 방법',hasVariant:'사이즈별 SKU',hasNumber:'등번호'};
  const crowdNames={closed:'영업 종료',low:'여유',medium:'보통',high:'혼잡'};
  const stockNames={unavailable:'영업 종료',sold_out:'품절',low_stock:'품절 임박',in_stock:'구매 가능'};
  const scenarioNames={normal:'기본 흐름',busy:'혼잡',soldout:'인기 유니폼 95 품절',restock:'16시 이후 재입고'};
  const slotReasons={available:'선택 가능',store_closed:'영업 종료',lead_time_or_cutoff:'준비시간·마감 기준',full:'정원 마감'};
  const number=value=>value.toLocaleString('ko-KR');
  function snapshot(data){
    return {
      meta:{synthetic:true,timezone:'Asia/Seoul',notice:'사진·상품명은 업로드 자료를 포함하며, 가격·재고·선수·경기·운영 값과 관계는 시연용 예시입니다.'},
      settings:WizSim.read(),
      catalog:products.map(p=>({id:p.id,name:p.name,category:p.category,price:p.price,design:p.kind,player:p.player||null,map_zone:p.mapZone||null,storefront:p.storefront!==false,image:p.image||null,sizes:Object.keys(p.sizes)})),
      players:demoPlayers,
      curation:demoCuration,
      ontology:{nodes:WizKnowledge.nodes.map(node=>{
        const {source,stock,...fields}=node;
        if(source)fields.product_id=source.id;
        // Dynamic SKU stock belongs to simulation.inventory, not the graph's initial values.
        if(node.type==='MarkingKit')fields.demo_stock=stock;
        return fields;
      }),edges:WizKnowledge.edges},
      simulation:data
    };
  }
  function create(settingsButton){
    const tools=document.createElement('div');tools.className='data-tools';
    settingsButton.before(tools);
    const button=document.createElement('button');button.type='button';button.className='dataset-launcher';
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','dataset-dialog');button.setAttribute('aria-expanded','false');
    button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="4" rx="6" ry="2.5"/><path d="M4 4v11c0 3.3 12 3.3 12 0V4M4 9.5c0 3.3 12 3.3 12 0"/></svg><span>데이터셋</span>';
    tools.append(button,settingsButton);
    const dialog=document.createElement('dialog');dialog.id='dataset-dialog';dialog.className='dataset-dialog';
    dialog.setAttribute('aria-labelledby','dataset-title');dialog.setAttribute('aria-describedby','dataset-description');
    dialog.innerHTML=`<div class="dataset-header"><div><span class="dataset-eyebrow">PRESENTATION DATA</span><h2 id="dataset-title">시연 데이터셋</h2></div><button type="button" class="dataset-close" aria-label="데이터셋 닫기" autofocus>×</button></div>
      <div class="dataset-body">
        <p id="dataset-description">사진·상품명은 업로드 자료를 포함합니다. 가격·재고·선수·경기·운영 값과 관계는 시연용 예시입니다.</p>
        <div class="dataset-context"><span class="dataset-badge">예시 데이터</span><span class="dataset-clock"></span><span class="dataset-scenario"></span></div>
        <dl class="dataset-counts"></dl>
        <div class="dataset-tabs" role="tablist" aria-label="데이터셋 분류">
          <button type="button" role="tab" id="dataset-tab-inventory" aria-controls="dataset-panel-inventory" aria-selected="true" data-dataset-tab="inventory">상품·재고</button>
          <button type="button" role="tab" id="dataset-tab-services" aria-controls="dataset-panel-services" aria-selected="false" tabindex="-1" data-dataset-tab="services">매장·서비스</button>
          <button type="button" role="tab" id="dataset-tab-ontology" aria-controls="dataset-panel-ontology" aria-selected="false" tabindex="-1" data-dataset-tab="ontology">온톨로지</button>
          <button type="button" role="tab" id="dataset-tab-json" aria-controls="dataset-panel-json" aria-selected="false" tabindex="-1" data-dataset-tab="json">원본 JSON</button>
        </div>
        <section class="dataset-panel" id="dataset-panel-inventory" role="tabpanel" aria-labelledby="dataset-tab-inventory">
          <h3>상품과 사이즈별 재고</h3><p>전체 상품에는 관계 검색을 위해 만든 예시 상품도 포함됩니다. 보유 재고와 판매 가능 수량을 함께 확인하세요.</p>
          <div class="dataset-filters"><label>상품 검색<input type="search" class="dataset-search" placeholder="상품명·선수·사이즈" aria-label="데이터셋 상품 검색"></label><label>상품 범위<select class="dataset-scope"><option value="all">전체 상품</option><option value="storefront">사진 상품</option><option value="example">관계 시연용 상품</option></select></label></div>
          <p class="dataset-inventory-count" role="status"></p><div class="dataset-inventory"></div>
        </section>
        <section class="dataset-panel" id="dataset-panel-services" role="tabpanel" aria-labelledby="dataset-tab-services" hidden><h3>매장과 서비스 상태</h3><p>선택한 시각·상황으로 계산한 값입니다. 데이터 설정에서 시나리오를 바꾸면 함께 반영됩니다.</p><div class="dataset-services"></div></section>
        <section class="dataset-panel" id="dataset-panel-ontology" role="tabpanel" aria-labelledby="dataset-tab-ontology" hidden><h3>온톨로지 관계 데이터</h3><p>상품을 선수·디자인·사이즈·위치·마킹지와 연결해 조건 검색에 사용합니다. 관계를 선택해 실제 연결 예시를 확인하세요.</p><label class="dataset-relation-label">관계 종류<select class="dataset-relation-filter"><option value="">전체 관계</option></select></label><p class="dataset-relation-count" role="status"></p><div class="dataset-relations"></div></section>
        <section class="dataset-panel" id="dataset-panel-json" role="tabpanel" aria-labelledby="dataset-tab-json" hidden><h3>현재 데이터 원본</h3><p>상품·선수·큐레이션·온톨로지와 현재 시뮬레이션 값을 하나의 JSON으로 확인합니다.</p><pre class="dataset-json" tabindex="0" aria-label="데이터셋 원본 JSON"></pre></section>
        <div class="dataset-footer"><span>현재 화면에 적용된 데이터 · 한국 시간</span><button type="button" class="dataset-download">JSON 내려받기 ↓</button></div>
      </div>`;
    document.body.append(dialog);
    const find=selector=>dialog.querySelector(selector);
    const tabs=[...dialog.querySelectorAll('[data-dataset-tab]')];
    const search=find('.dataset-search'),scope=find('.dataset-scope'),relationFilter=find('.dataset-relation-filter');
    let active='inventory',data=WizSim.data,renderedSnapshot='';
    function table(target,label,headers,rows){
      const wrap=document.createElement('div');wrap.className='dataset-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',label);
      const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=label;table.append(caption);
      const head=document.createElement('thead'),tr=document.createElement('tr');
      for(const title of headers){const th=document.createElement('th');th.scope='col';th.textContent=title;tr.append(th);}head.append(tr);table.append(head);
      const body=document.createElement('tbody');
      for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');if(Array.isArray(value)){td.append(document.createTextNode(value[0]));const small=document.createElement('small');small.textContent=value[1];td.append(small);}else td.textContent=value;tr.append(td);}body.append(tr);}
      table.append(body);wrap.append(table);target.replaceChildren(wrap);
      if(!rows.length){const empty=document.createElement('p');empty.textContent='조건에 맞는 데이터가 없습니다.';target.append(empty);}
    }
    function inventory(){
      const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean),rows=[],ids=new Set();
      for(const item of data.inventory){
        const product=products.find(p=>p.id===item.id),shown=product.storefront!==false;
        if(scope.value==='storefront'&&!shown||scope.value==='example'&&shown)continue;
        for(const variant of item.variants){
          if(!terms.every(t=>(item.name+' '+(product.player||'')+' '+variant.size).toLowerCase().includes(t)))continue;
          ids.add(item.id);rows.push([[item.name,'#'+item.id+' · '+(shown?'사진 상품':'관계 시연용')],variant.size,number(item.price)+'원',variant.opening_stock,variant.on_hand,variant.available,stockNames[variant.status]]);
        }
      }
      find('.dataset-inventory-count').textContent='상품 '+ids.size+'종 · 사이즈별 재고 '+rows.length+'건';
      table(find('.dataset-inventory'),'상품·사이즈별 합성 재고',['상품','사이즈','예시 가격','개점 재고','보유 재고','판매 가능','상태'],rows);
    }
    function services(){
      const target=find('.dataset-services');target.replaceChildren();
      const section=(title,headers,rows)=>{const heading=document.createElement('h4');heading.textContent=title;const content=document.createElement('div');target.append(heading,content);table(content,title,headers,rows);};
      const {store,schedule,marking,pickup}=data;
      section('매장 운영',['항목','현재 값'],[
        ['영업 상태',store.open?'영업 중':'영업 종료'],['매장 인원',store.visitors+'명'],['혼잡도',crowdNames[store.crowd]],['계산 대기',store.checkout_wait_minutes+'분'],['영업 시간',schedule.opening+'–'+schedule.closing],['가상 경기',schedule.game_day?schedule.fictional_game_start+' 시작':'비경기일']
      ]);
      section('외부 마킹',['항목','현재 값'],[
        ['접수',marking.accepting?'접수 가능':'접수 마감'],['위치',marking.location],['접수 마감',marking.cutoff_at.slice(11,16)],['대기 인원',marking.queue_people+'명'],['대기 시간',marking.wait_min===null?'접수 불가':marking.wait_min+'분'],['대기 + 작업',marking.total_min===null?'접수 불가':marking.total_min+'–'+marking.total_max+'분']
      ]);
      section('구역별 혼잡도',['구역','인원','혼잡도'],data.zones.map(z=>[z.name,z.visitors+'명',crowdNames[z.crowd]]));
      section('픽업 시간대',['수령 시간','정원','선택 가능 수량','상태'],pickup.slots.map(slot=>[slot.start.slice(11,16)+'–'+slot.end.slice(11,16),slot.capacity,slot.remaining,slotReasons[slot.reason]]));
    }
    for(const relation of new Set(WizKnowledge.edges.map(e=>e.rel))){const option=document.createElement('option');option.value=relation;option.textContent=relationNames[relation]+' · '+relation;relationFilter.append(option);}
    function ontology(){
      const edges=WizKnowledge.edges.filter(edge=>!relationFilter.value||edge.rel===relationFilter.value);
      const node=id=>[WizKnowledge.get(id)?.name||id,id];
      find('.dataset-relation-count').textContent='전체 개체 '+WizKnowledge.nodes.length+'개 · 표시 관계 '+edges.length+'건 / 전체 '+WizKnowledge.edges.length+'건';
      table(find('.dataset-relations'),'온톨로지 관계',['출발 개체','관계','연결 개체'],edges.map(edge=>[node(edge.from),[relationNames[edge.rel]||edge.rel,edge.rel],node(edge.to)]));
    }
    function render(){
      if(!dialog.open)return;
      const positions=[...dialog.querySelectorAll('.dataset-panel:not([hidden]) .dataset-table-wrap')].map(wrap=>wrap.scrollLeft);
      find('.dataset-clock').textContent=data.meta.simulation_time.slice(0,16).replace('T',' ')+' · 한국';
      find('.dataset-scenario').textContent=(data.store.open?'영업 중':'영업 종료')+' · '+scenarioNames[data.meta.scenario]+' · 시드 '+data.meta.seed;
      const counts=[['상품',products.length+'종'],['사이즈별 재고',data.inventory.reduce((sum,p)=>sum+p.variants.length,0)+'건'],['선수 예시',demoPlayers.length+'명'],['온톨로지 관계',WizKnowledge.edges.length+'건']];
      find('.dataset-counts').replaceChildren(...counts.map(([label,value])=>{const box=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;box.append(dt,dd);return box;}));
      if(active==='inventory')inventory();
      if(active==='services')services();
      if(active==='ontology')ontology();
      if(active==='json')find('.dataset-json').textContent=JSON.stringify(snapshot(data),null,2);
      dialog.querySelectorAll('.dataset-panel:not([hidden]) .dataset-table-wrap').forEach((wrap,i)=>wrap.scrollLeft=positions[i]||0);
      renderedSnapshot=JSON.stringify(data);
    }
    function activate(tab){
      active=tab.dataset.datasetTab;
      for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;find('#'+item.getAttribute('aria-controls')).hidden=!selected;}
      render();
    }
    for(const tab of tabs)tab.onclick=()=>activate(tab);
    find('.dataset-tabs').onkeydown=event=>{
      const index=tabs.indexOf(document.activeElement);if(index<0)return;
      const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
      if(next===undefined)return;event.preventDefault();activate(tabs[next]);tabs[next].focus();
    };
    search.oninput=inventory;scope.onchange=inventory;relationFilter.onchange=ontology;
    button.onclick=()=>{if(dialog.open){dialog.close();return;}data=WizSim.data;dialog.showModal();button.setAttribute('aria-expanded','true');render();};
    find('.dataset-close').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>button.setAttribute('aria-expanded','false'));
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
    find('.dataset-download').onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(data),null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='wizcovery-dataset-'+data.meta.simulation_time.slice(0,16).replace('T','-').replace(':','')+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    return current=>{data=current;if(dialog.open&&JSON.stringify(data)!==renderedSnapshot)render();};
  }
  return {create};
})();
