/* Shared browser-only simulation controls. Does not send any data to a server. */
(()=>{
  const root=document.createElement('details');root.className='demo-live-bar';root.setAttribute('aria-label','가상 데이터 시뮬레이션');
  const heading=document.createElement('strong');heading.textContent='DEMO · 가상 매장';
  const status=document.createElement('span');status.setAttribute('aria-live','off');
  const select=document.createElement('select');select.setAttribute('aria-label','시뮬레이션 기준 시각');
  for(const [v,label] of [['live','현재 한국 시각'],['2026-11-14T11:00','토요일 오전 · 상품 탐색'],['2026-11-14T12:50','토요일 경기 전 · 혼잡'],['2026-11-13T17:30','금요일 · 마킹 마감'],['2026-11-14T23:00','영업 종료']])select.add(new Option(label,v));
  const scenario=document.createElement('select');scenario.setAttribute('aria-label','시뮬레이션 상황');for(const [v,label] of [['normal','기본'],['busy','혼잡'],['soldout','인기 95 품절'],['restock','16시 재입고']])scenario.add(new Option(label,v));
  const details=document.createElement('a');details.href='simulator.html';details.textContent='시간·데이터 실험실 →';
  const summary=document.createElement('summary');summary.append(heading,status);const action=document.createElement('span');action.className='demo-toggle';action.textContent='설정';summary.append(action);const controls=document.createElement('div');controls.className='demo-controls';const clockLabel=document.createElement('label');clockLabel.textContent='체험 시각';clockLabel.append(select);const sceneLabel=document.createElement('label');sceneLabel.textContent='매장 상황';sceneLabel.append(scenario);const note=document.createElement('p');note.textContent='실제 재고가 아닌 합성 데이터입니다. 5초마다 갱신되며 실제 주문은 발생하지 않습니다.';controls.append(clockLabel,sceneLabel,details,note);root.append(summary,controls);document.querySelector('main').prepend(root);
  const crowd={closed:'영업 종료',low:'여유',medium:'보통',high:'혼잡'};
  function syncControls(){const settings=WizSim.read();select.value=settings.mode==='live'?'live':settings.at;if(!select.value){const o=new Option('지정 시각 · '+settings.at,settings.at);select.add(o);select.value=settings.at;}scenario.value=settings.scenario;}
  function paint(data){const {meta,store}=data;status.textContent=meta.simulation_time.slice(11,16)+' KST · '+crowd[store.crowd];const stat=document.querySelectorAll('.stat strong');if(stat.length===3){stat[0].textContent=store.open?'약 '+store.checkout_wait_minutes+'분':'영업 종료';stat[1].textContent=crowd[store.crowd];stat[2].textContent='자동 갱신 중';document.querySelectorAll('.stat .extra').forEach((el,i)=>el.textContent=[store.visitors+'명 (가상)','요일·시간대 반영','실제 재고 아님'][i]);}
  const pill=document.querySelector('.mini-title .pill');if(pill)pill.textContent=crowd[store.crowd];
  document.querySelectorAll('.ticket-bottom span').forEach(el=>{if(el.textContent.includes('영업'))el.textContent=store.open?'● 영업 중 (가상)':'● 영업 종료 (가상)'});
  document.querySelectorAll('.ux-marking').forEach(el=>el.dispatchEvent(new Event('wiz-live')));
  }
  const signature=data=>JSON.stringify([data.store,data.inventory,data.marking,data.pickup]);
  let previous=signature(WizSim.data);
  function refresh(){const data=WizSim.apply(WizSim.current());paint(data);syncControls();const next=signature(data);if(next!==previous){previous=next;document.dispatchEvent(new CustomEvent('wiz:tick',{detail:data}));}}
  select.onchange=()=>{WizSim.save({mode:select.value==='live'?'live':'fixed',at:select.value==='live'?'':select.value});refresh()};scenario.onchange=()=>{WizSim.save({scenario:scenario.value});refresh()};
  window.addEventListener('storage',e=>{if(e.key==='wiz-simulation-v1')refresh()});setInterval(refresh,5000);paint(WizSim.data);syncControls();
})();
