/* Review-only layout helpers. No network requests or publishing side effects. */
(()=>{
  const filter=document.querySelector('.filter-drawer');
  if(filter){const desktop=matchMedia('(min-width: 851px)');const sync=()=>filter.open=desktop.matches;sync();desktop.addEventListener('change',sync);}
  if(document.body.dataset.page==='map'){
    const toolbar=document.querySelector('.view-toolbar'),floor=document.querySelector('.floor-scroll');
    const zoom=document.createElement('button');zoom.type='button';zoom.className='map-zoom';zoom.textContent='지도 확대 ＋';zoom.setAttribute('aria-pressed','false');
    zoom.onclick=()=>{const active=floor.classList.toggle('map-zoomed');zoom.textContent=active?'전체 보기 －':'지도 확대 ＋';zoom.setAttribute('aria-pressed',String(active));if(!active)floor.scrollLeft=0;};toolbar.append(zoom);
    const list=document.createElement('div');list.className='map-zone-list';list.setAttribute('aria-label','매장 구역 바로 선택');
    const update=()=>list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapZone===selected)));
    for(const [id,z] of Object.entries(zones)){const b=document.createElement('button');b.type='button';b.dataset.mapZone=id;b.textContent=id==='marking-service'?'외부 마킹':z.title;b.onclick=()=>{select(id);update()};list.append(b)}
    document.querySelector('.legend').after(list);update();document.querySelectorAll('[data-zone]').forEach(el=>el.addEventListener('click',update));
  }
})();
