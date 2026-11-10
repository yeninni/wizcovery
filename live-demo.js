/* Shared store updates and a compact, opt-in data settings dialog. */
(()=>{
  const crowd={closed:'영업 종료',low:'여유',medium:'보통',high:'혼잡'};
  let syncSettings=()=>{};
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
    syncSettings(data);
  }
  const signature=data=>JSON.stringify([data.store,data.inventory,data.marking,data.pickup]);
  let previous=signature(WizSim.data);
  function refresh(force=false){
    const data=WizSim.apply(WizSim.current());
    paint(data);
    const next=signature(data);
    if(force||next!==previous){previous=next;document.dispatchEvent(new CustomEvent('wiz:tick',{detail:data}));}
  }
  function settingsControl(){
    const button=document.createElement('button');
    button.type='button';button.className='data-settings-launcher';
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','data-settings-dialog');
    button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/><circle cx="7" cy="5" r="2"/><circle cx="13" cy="10" r="2"/><circle cx="8" cy="15" r="2"/></svg><span>데이터 설정</span>';
    const dialog=document.createElement('dialog');
    dialog.id='data-settings-dialog';dialog.className='data-settings-dialog';
    dialog.setAttribute('aria-labelledby','data-settings-title');
    dialog.setAttribute('aria-describedby','data-settings-description');
    dialog.innerHTML=`<div class="data-settings-header"><h2 id="data-settings-title">데모 데이터 설정</h2><button type="button" class="data-settings-close" aria-label="데이터 설정 닫기">×</button></div>
      <form class="data-settings-form">
        <p id="data-settings-description">시간과 매장 상황을 바꿔 화면을 확인하세요.</p>
        <div class="data-settings-presets" role="group" aria-label="빠른 데이터 전환">
          <button type="button" data-preset="open">영업 중</button><button type="button" data-preset="busy">경기 전 혼잡</button>
          <button type="button" data-preset="soldout">인기 95 품절</button><button type="button" data-preset="closed">영업 종료</button>
        </div>
        <label for="data-settings-at">기준 날짜·시간 <span>한국 시간</span></label>
        <input type="datetime-local" id="data-settings-at" required>
        <label for="data-settings-scenario">매장 상황</label>
        <select id="data-settings-scenario"><option value="normal">기본 흐름</option><option value="busy">혼잡</option><option value="soldout">인기 유니폼 95 품절</option><option value="restock">16시 이후 재입고</option></select>
        <p class="data-settings-error" role="alert" hidden></p>
        <div class="data-settings-actions"><button type="button" class="data-settings-reset">현재 시각으로</button><button type="submit" class="primary">적용</button></div>
      </form>`;
    document.body.append(button,dialog);document.body.classList.add('has-data-settings');
    const form=dialog.querySelector('form'),at=dialog.querySelector('#data-settings-at'),scenario=dialog.querySelector('select'),error=dialog.querySelector('.data-settings-error');
    function apply(value){
      try{
        const next={...WizSim.read(),...value};
        WizSim.snapshot({...next,at:next.mode==='live'?'':next.at});
        WizSim.save(next);refresh(true);dialog.close();
      }catch(err){error.textContent=err.message;error.hidden=false;}
    }
    button.onclick=()=>{
      const value=WizSim.read();at.value=value.mode==='fixed'&&value.at?value.at.slice(0,16):WizSim.data.meta.simulation_time.slice(0,16);
      scenario.value=value.scenario;error.hidden=true;dialog.showModal();
    };
    dialog.querySelector('.data-settings-close').onclick=()=>dialog.close();
    dialog.addEventListener('click',event=>{
      if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}
    });
    // Select the next Saturday using the Korean calendar, independent of host timezone.
    function saturday(time){
      const date=new Date(WizSim.kstValue(new Date()).slice(0,10)+'T00:00:00Z');
      date.setUTCDate(date.getUTCDate()+(6-date.getUTCDay()+7)%7);
      return date.toISOString().slice(0,10)+'T'+time;
    }
    const presets={open:['11:00','normal'],busy:['12:50','busy'],soldout:['11:00','soldout'],closed:['23:00','normal']};
    dialog.querySelectorAll('[data-preset]').forEach(preset=>preset.onclick=()=>{
      const [time,situation]=presets[preset.dataset.preset];apply({mode:'fixed',at:saturday(time),scenario:situation});
    });
    form.onsubmit=event=>{event.preventDefault();apply({mode:'fixed',at:at.value,scenario:scenario.value});};
    dialog.querySelector('.data-settings-reset').onclick=()=>apply({mode:'live',at:'',scenario:'normal'});
    return data=>{
      const settings=WizSim.read(),active=settings.mode==='fixed'||settings.scenario!=='normal';
      button.dataset.active=String(active);
      button.title=(settings.mode==='fixed'?'지정 시각':'현재 시각')+' · '+data.meta.simulation_time.slice(0,16).replace('T',' ')+' (한국)';
    };
  }
  syncSettings=settingsControl();
  window.addEventListener('storage',e=>{if(e.key==='wiz-simulation-v1')refresh();});
  setInterval(refresh,5000);
  paint(WizSim.data);
})();
