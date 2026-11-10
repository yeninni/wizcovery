/* Refresh shared browser-generated store data without exposing development controls. */
(()=>{
  const crowd={closed:'영업 종료',low:'여유',medium:'보통',high:'혼잡'};
  function paint(data){
    const {meta,store}=data;
    const stat=document.querySelectorAll('.stat strong');
    if(stat.length===3){
      stat[0].textContent=store.open?'약 '+store.checkout_wait_minutes+'분':'영업 종료';
      stat[1].textContent=crowd[store.crowd];
      stat[2].textContent='자동 갱신 중';
      document.querySelectorAll('.stat .extra').forEach((el,i)=>{
        el.textContent=[store.visitors+'명',meta.simulation_time.slice(11,16)+' 기준','5초 간격'][i];
      });
    }
    const heroState=document.querySelector('#hero-store-state');
    if(heroState){heroState.textContent=store.open?'영업 중':'영업 종료';heroState.dataset.open=String(store.open);}
    const dot=document.querySelector('.store-status-dot');
    if(dot)dot.style.background=store.open?'#177454':'#a0a5ad';
    const pill=document.querySelector('.mini-title .pill');
    if(pill)pill.textContent=crowd[store.crowd];
    document.querySelectorAll('.ticket-bottom span').forEach(el=>{
      if(el.textContent.includes('영업'))el.textContent=store.open?'● 영업 중':'● 영업 종료';
    });
    document.querySelectorAll('.ux-marking').forEach(el=>el.dispatchEvent(new Event('wiz-live')));
  }
  const signature=data=>JSON.stringify([data.store,data.inventory,data.marking,data.pickup]);
  let previous=signature(WizSim.data);
  function refresh(){
    const data=WizSim.apply(WizSim.current());
    paint(data);
    const next=signature(data);
    if(next!==previous){previous=next;document.dispatchEvent(new CustomEvent('wiz:tick',{detail:data}));}
  }
  window.addEventListener('storage',e=>{if(e.key==='wiz-simulation-v1')refresh();});
  setInterval(refresh,5000);
  paint(WizSim.data);
})();
