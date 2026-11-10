let category='전체';const $=s=>document.querySelector(s);const money=n=>n.toLocaleString('ko-KR');
function render(){
 const q=$('#search').value.trim().toLowerCase().split(/\s+/);
 const shown=products.filter(p=>p.storefront!==false&&(category==='전체'||p.category===category)&&q.every(w=>(p.name+' '+(p.player||'')+' '+Object.keys(p.sizes).join(' ')).toLowerCase().includes(w))&&(!$('#available').checked||p.sizes[p.selected]>0));
 $('#count').textContent=shown.length+'개 상품';
 $('#products').innerHTML=shown.length?shown.map(p=>{
  const stock=p.sizes[p.selected],name=productTitle(p),location={uniform:'유니폼 구역',collab:'콜라보 구역','marking-sheet':'마킹지 구역'}[p.mapZone]||'위치 확인 중';
  const status=!WizSim.data.store.open?'영업 종료':stock===0?'선택 사이즈 품절':stock<=4?'재고 '+stock+'개 · 품절 임박':'재고 '+stock+'개';
  return `<article class="product"><div class="art ${p.kind}${p.image?' has-photo':''}">${productArt(p)}</div><div class="info"><div class="category">${p.category}</div><h3>${name}</h3><div class="price">${money(p.price)}<small>원</small></div>${p.category==='유니폼'?`<button type="button" class="ux-link" data-fit="${p.id}">사이즈표</button>`:'<span class="guide-spacer" aria-hidden="true"></span>'}<div class="sizes" aria-label="${name} 사이즈">${Object.keys(p.sizes).map(size=>`<button data-id="${p.id}" data-size="${size}" aria-pressed="${size===p.selected}" class="${size===p.selected?'selected ':''}${p.sizes[size]===0?'sold':''}" aria-label="${size} 사이즈${p.sizes[size]===0?', 품절':''}">${size}</button>`).join('')}</div><div class="stockrow"><b class="${!stock?'out':stock<=4?'low':''}">${status}</b><span>${p.selected}</span></div><div class="product-action"><span>${location}</span><button class="route-btn" data-route="${p.id}">${stock?'위치 확인':'대체 상품'} ↗</button></div>${stock&&!p.name.includes('마킹')?`<a class="pickup-link" href="pickup.html?product=${p.id}&size=${encodeURIComponent(p.selected)}">픽업 신청</a>`:'<span class="pickup-spacer" aria-hidden="true"></span>'}</div></article>`;
 }).join(''):'<div class="empty">조건에 맞는 상품이 없습니다.<br>검색어나 분류를 변경하세요.</div>';
}
$('#search').addEventListener('input',render);$('#available').addEventListener('change',render);document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{category=b.dataset.cat;document.querySelectorAll('[data-cat]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});render()});
function show(p){
 if(p.sizes[p.selected]>0){location.href='store-map.html?product='+p.id+'&size='+encodeURIComponent(p.selected);return;}
 $('#modal-label').textContent=WizSim.data.store.open?'대체 상품':'영업시간 안내';$('#modal-title').textContent=productTitle(p);
 const content=$('#modal-content');content.replaceChildren();const intro=document.createElement('p');
 if(!WizSim.data.store.open){intro.textContent='현재 매장은 영업 종료 상태입니다. 영업시간에 다시 확인해 주세요.';content.append(intro);}
 else{
 intro.textContent=p.selected+' 사이즈는 품절입니다. 다른 사이즈 또는 상품을 확인하세요.';content.append(intro);
 for(const size of Object.keys(p.sizes).filter(size=>p.sizes[size]>0)){const b=document.createElement('button');b.className='primary secondary';b.textContent='동일 상품 · '+size+' 사이즈 · 재고 '+p.sizes[size]+'개';b.onclick=()=>show({...p,selected:size});content.append(b);}
 products.filter(a=>a.id!==p.id&&a.category===p.category&&Object.values(a.sizes).some(n=>n>0)).forEach(a=>{const b=document.createElement('button');b.className='primary secondary';b.textContent=productTitle(a)+' · '+money(a.price)+'원';b.onclick=()=>show({...a,selected:Object.keys(a.sizes).find(size=>a.sizes[size]>0)});content.append(b);});
 }
 if(p.category==='유니폼')content.append(WizUX.sizeButton(p.selected,''));
 if(!$('#detail').open)$('#detail').showModal();
}
$('#products').onclick=e=>{const fit=e.target.closest('[data-fit]');if(fit){WizUX.sizeGuide(products.find(p=>p.id===Number(fit.dataset.fit)).selected,'');return;}const size=e.target.closest('[data-size]');if(size){products.find(p=>p.id===Number(size.dataset.id)).selected=size.dataset.size;render()}const route=e.target.closest('[data-route]');if(route)show(products.find(p=>p.id===Number(route.dataset.route)))};$('.close').onclick=()=>$('#detail').close();$('#modal-done').onclick=()=>$('#detail').close();$('#detail').onclick=e=>{if(e.target===$('#detail')){const r=$('#detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#detail').close()}};render();document.addEventListener('wiz:tick',()=>render());
