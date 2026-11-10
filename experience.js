const WizUX=(()=>{
  const el=(tag,txt,cls='')=>{const n=document.createElement(tag);if(txt)n.textContent=txt;if(cls)n.className=cls;return n;};
  function dialog(title){
    const d=el('dialog','','ux-dialog'),close=el('button','닫기 ×','ux-close');
    close.type='button';close.onclick=()=>d.close();d.append(close,el('h2',title));
    d.addEventListener('close',()=>d.remove());
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
    document.body.append(d);return d;
  }
  function sizeGuide(from='',to=''){
    const d=dialog('유니폼 사이즈 비교');
    const table=el('table');table.append(el('caption','유니폼 사이즈 · 단위 cm'));
    const head=el('tr');['사이즈','가슴 단면','총장'].forEach(t=>head.append(el('th',t)));table.append(head);
    [['90','50','68'],['95','52','70'],['100','54','72'],['105','56','74']].forEach(row=>{
      const tr=el('tr');if([from,to].includes(row[0]))tr.className='emphasis';row.forEach(v=>tr.append(el('td',v)));table.append(tr);
    });
    d.append(table,el('p',(from&&to?from+' → '+to+' 사이즈를 비교해 보세요. ':'')+'평소 편하게 입는 옷의 실측과 겹쳐 입을 옷을 함께 고려하세요.'),el('p','상품별 실측과 교환 조건은 매장에서 확인해 주세요.'));
    d.showModal();
  }
  function sizeButton(from,to){const b=el('button','사이즈표','ux-link');b.type='button';b.onclick=()=>sizeGuide(from,to);return b;}
  const markingEstimate=minute=>({closed:minute>=17*60,wait:[10,15],work:[15,20],total:[25,35],cutoff:'17:00',game:'18:00'});
  function markingCard(){
    const box=el('div','','ux-marking');
    if(typeof WizSim!=='undefined'){
      const render=()=>{
        const d=WizSim.data,m=d.marking;
        box.replaceChildren(el('strong','외부 마킹 예상 시간'),el('div',(d.schedule.game_day?'경기 시작 '+d.schedule.fictional_game_start:'비경기일')+' / 접수 마감 '+m.cutoff_at.slice(11,16)));
        box.append(el('div',m.accepting?'예상 대기 '+m.wait_min+'분 + 작업 '+m.processing_min+'–'+m.processing_max+'분 = 총 '+m.total_min+'–'+m.total_max+'분':'접수 마감 · 현재 신청 불가','timing'));
      };
      render();box.addEventListener('wiz-live',render);return box;
    }
    box.append(el('strong','외부 마킹 예상 시간'),el('div','대기 10–15분 + 작업 15–20분'));return box;
  }
  function notification(kind,order){
    const d=dialog(kind==='reminder'?(order.gameStart?'경기 1시간 전 알림 미리보기':'수령 시간 알림 미리보기'):'픽업 준비 완료 알림 미리보기');
    const wrapper=el('div','','ux-notification');wrapper.append(el('div','WIZCOVERY · 위즈픽업','sender'));
    const game=order.gameStart,reminder=game?String(Number(game.slice(0,2))-1).padStart(2,'0')+game.slice(2):'';
    const msg=kind==='reminder'?(game?'경기 시작 1시간 전이에요!\n경기 '+game+' / 알림 '+reminder+'\n선택한 수령 시간 안에 위즈템을 찾아주세요.':'수령 시간 안내입니다.\n선택한 시간에 위즈템을 찾아주세요.'):'위즈템 픽업 안내입니다.\n선택한 상품과 수령 시간을 확인해 주세요.';
    wrapper.append(el('div',msg+'\n\n상품: '+order.name+'\n사이즈: '+order.size+' · '+order.qty+'개\n수령: '+order.slot+'\n장소: 픽업 창구','bubble'));
    const done=el('button','수령 정보로 돌아가기','ux-action');done.type='button';done.onclick=()=>d.close();d.append(wrapper,done);d.showModal();
  }
  return {sizeGuide,sizeButton,markingCard,markingEstimate,notification};
})();
