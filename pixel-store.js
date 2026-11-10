/* Pixel shop renderer and decorative route guide. Not location tracking. */
const PixelStore=(()=>{
  const NS='http://www.w3.org/2000/svg';
  function create({svg,zones,geometry,project}){
    const el=(tag,attrs={},parent=svg)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.append(n);return n};
    svg.replaceChildren();svg.classList.add('pixel-map');svg.setAttribute('viewBox','-30 30 850 500');svg.setAttribute('aria-label','픽셀 아트 팀스토어 배치도와 유니폼 안내 캐릭터');
    const canvas=document.createElement('canvas');canvas.width=425;canvas.height=250;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const xy=(x,y,z=0)=>{const p=project(x,y,z);return [Math.round((p[0]+30)/2),Math.round((p[1]-30)/2)]};
    const poly=(corners,color)=>{ctx.fillStyle=color;ctx.beginPath();corners.forEach((p,i)=>{const q=xy(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fill()};
    const line=(a,b,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...xy(...a));ctx.lineTo(...xy(...b));ctx.stroke()};
    const block=(x,y,w,d,h,top,left='#b69a7b',right='#9a7b62')=>{poly([[x,y+d,0],[x+w,y+d,0],[x+w,y+d,h],[x,y+d,h]],left);poly([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],right);poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],top)};
    // Chunky floor edge, individual wood tiles, and two cutaway walls.
    poly([[0,100,0],[100,100,0],[100,100,-7],[0,100,-7]],'#a48b71');poly([[100,0,0],[100,100,0],[100,100,-7],[100,0,-7]],'#806a58');
    const woods=['#edddbc','#e5d0aa','#e8d5b2','#f1e2c5'];for(let y=0;y<100;y+=10)for(let x=0;x<100;x+=10){poly([[x,y,0],[x+10,y,0],[x+10,y+10,0],[x,y+10,0]],woods[((x/10)*3+y/10)%4]);line([x,y,0],[x+10,y,0],'#d2b990');if((x+y)%30===0)line([x+2,y+4,0],[x+7,y+4,0],'#ddc49f');}
    poly([[0,0,0],[0,100,0],[0,100,65],[0,0,65]],'#e4ded8');poly([[0,0,0],[100,0,0],[100,0,65],[0,0,65]],'#383942');
    poly([[0,0,60],[100,0,60],[100,0,65],[0,0,65]],'#c9384b');poly([[0,0,60],[0,100,60],[0,100,65],[0,0,65]],'#f6f0e7');
    for(let i=2;i<100;i+=9){line([0,i,4],[0,i,58],'#d5cec6');line([i,0,4],[i,0,58],'#44434c');}
    // A pixel-letter sign on the wall, painted at native sprite resolution.
    const letters={W:['10101','10101','10101','11111','01010'],I:['111','010','010','010','111'],Z:['11111','00010','00100','01000','11111'],C:['0111','1000','1000','1000','0111'],O:['0110','1001','1001','1001','0110'],V:['10001','10001','01010','01010','00100'],E:['1111','1000','1110','1000','1111'],R:['1110','1001','1110','1010','1001'],Y:['10001','01010','00100','00100','00100']};
    let sx=267,sy=55;for(const char of 'WIZCOVERY'){const glyph=letters[char];ctx.fillStyle='#f7efdb';glyph.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')ctx.fillRect(sx+x,sy+y,1,1)}));const advance=glyph[0].length+1;sx+=advance;sy+=Math.round(advance*.486);}
    const fixtureOrder=Object.keys(geometry).sort((a,b)=>{const u=geometry[a],v=geometry[b];return u[0]+u[1]+u[2]+u[3]-v[0]-v[1]-v[2]-v[3]});
    const shirt=(px,py,color)=>{ctx.fillStyle='#2d3038';ctx.fillRect(px-1,py-1,9,9);ctx.fillStyle=color;ctx.fillRect(px,py,7,3);ctx.fillRect(px+1,py+2,5,6);ctx.fillStyle='#d34655';ctx.fillRect(px,py+1,1,2);ctx.fillRect(px+6,py+1,1,2);ctx.fillRect(px+2,py+4,3,1)};
    for(const id of fixtureOrder){const [x,y,w,d,h]=geometry[id],outside=id==='marking-service',goods=id.startsWith('goods'),checkout=['checkout','selfcheckout'].includes(id);
      block(x,y,w,d,h,outside?'#7eafbc':checkout?'#54515b':'#f0dec0',outside?'#4a829c':checkout?'#36313c':'#cfb48d',outside?'#356782':checkout?'#292630':'#a78b6d');
      if(id==='uniform'||id==='lastseason'||id==='uniform-round'){
        line([x+1,y+d/2,h+12],[x+w-1,y+d/2,h+12],'#4a4346',2);line([x+1,y+d/2,0],[x+1,y+d/2,h+12],'#5f5250');line([x+w-1,y+d/2,0],[x+w-1,y+d/2,h+12],'#5f5250');
        for(let j=0;j<(w>10?6:2);j++){const p=xy(x+2+j*(w>10?6:2),y+d/2,h+9);shirt(p[0]-3,p[1],j%3===0?'#e15a67':j%2?'#faf4e6':'#414552');}
      }else if(goods){for(let j=0;j<5;j++){const p=xy(x+w/2,y+3+j*6,h+4);ctx.fillStyle='#252b37';ctx.fillRect(p[0]-2,p[1]-3,4,6);ctx.fillStyle=['#dc4b60','#75b6aa','#eed882'][j%3];ctx.fillRect(p[0]-2,p[1]-3,4,2);ctx.fillStyle='#fff3e4';ctx.fillRect(p[0]-1,p[1],2,1)}}
      else if(checkout){for(let j=0;j<(id==='selfcheckout'?3:1);j++){const p=xy(x+4+j*11,y+d/2,h+7);ctx.fillStyle='#262834';ctx.fillRect(p[0]-4,p[1]-5,9,7);ctx.fillRect(p[0]-1,p[1]+2,3,3);ctx.fillStyle='#9ed3c4';ctx.fillRect(p[0]-3,p[1]-4,7,4);ctx.fillStyle='#d44859';ctx.fillRect(p[0]-5,p[1]+6,13,2)}}
      else if(id==='collab'){for(let j=0;j<8;j++){const p=xy(x+4+(j%4)*6,y+7+Math.floor(j/4)*13,h+2);if(j<4)shirt(p[0]-3,p[1]-4,j%2?'#e47079':'#faf4e6');else{ctx.fillStyle=j%2?'#bd4558':'#f6ecd8';ctx.fillRect(p[0]-3,p[1]-3,6,5);ctx.fillStyle='#6b5b60';ctx.fillRect(p[0]-1,p[1]-2,2,2)}}}
      else if(outside){const p=xy(x+6,y+d/2,h+7);ctx.fillStyle='#353641';ctx.fillRect(p[0]-6,p[1]-5,12,10);ctx.fillStyle='#e8d4ac';ctx.fillRect(p[0]-5,p[1]-4,10,4);ctx.fillStyle='#d45165';ctx.fillRect(p[0]-3,p[1]+3,6,1);const q=xy(x+19,y+d/2,h+2);shirt(q[0]-3,q[1]-2,'#f7eddf')}
      else{for(let j=0;j<6;j++){const p=xy(x+3+j*6,y+d/2,h+1);ctx.fillStyle=j%2?'#d65065':'#f8edcd';ctx.fillRect(p[0]-3,p[1]-2,6,4);ctx.fillStyle='#ac947e';ctx.fillRect(p[0]-2,p[1]-1,4,1)}}
    }
    const entrance=xy(50,95,0);ctx.fillStyle='#db5b68';ctx.fillRect(entrance[0]-13,entrance[1]-3,26,7);ctx.fillStyle='#f2b8b4';for(let x=entrance[0]-11;x<entrance[0]+12;x+=4)ctx.fillRect(x,entrance[1]-2,2,5);
    el('image',{href:canvas.toDataURL(),x:-30,y:30,width:850,height:500,class:'pixel-scene-image','aria-hidden':'true'});
    const path=el('polyline',{id:'path',points:'',class:'pixel-route','aria-hidden':'true'});
    // Transparent, keyboard-accessible hit areas retain all original zone actions.
    for(const id of fixtureOrder){const [x,y,w,d,h]=geometry[id],g=el('g',{class:'fixture pixel-fixture','data-zone':id,role:'button',tabindex:0,'aria-label':zones[id].title,'aria-pressed':'false'});el('polygon',{points:[[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]].map(p=>project(...p).join(',')).join(' '),class:'top-face'},g);const p=project(x+w/2,y+d/2,h+21),label=el('text',{x:p[0],y:p[1],'text-anchor':'middle',class:'pixel-zone-label'},g);label.textContent=id.startsWith('goods')?'굿즈 '+id.slice(-1):id==='uniform-round'?'유니폼':id==='marking-service'?'외부 마킹':zones[id].title;g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});}
    const outdoor=project(72,126,0);const outsideText=el('text',{x:outdoor[0],y:outdoor[1],class:'pixel-outside'});outsideText.textContent='OUTSIDE · 외부 마킹';
    const marker=el('g',{id:'destination-pin','aria-hidden':'true',class:'pixel-destination'});el('path',{d:'M-6-18H6V-6H3V-3H0V0H-3V-6H-6Z',fill:'#e34b63',stroke:'#fff4e1','stroke-width':2},marker);el('rect',{x:-2,y:-14,width:4,height:4,fill:'#fff3da'},marker);
    let frames,artReady=false,artFailed=false,lastDirection='front',lastFrame=1;
    const avatar=el('g',{id:'guide-avatar','aria-hidden':'true',style:'pointer-events:none'});const avatarShadow=el('ellipse',{cx:0,cy:0,rx:15,ry:5,fill:'#544145',opacity:.16},avatar);const avatarImage=el('image',{x:-32,y:-94,width:64,height:96,class:'pixel-sprite character-premium',visibility:'hidden'},avatar);
    const panel=document.createElement('section');panel.className='pixel-guide';panel.setAttribute('aria-label','픽셀 캐릭터 길 안내');panel.setAttribute('aria-busy','true');
    const portraitButton=document.createElement('button');portraitButton.type='button';portraitButton.className='character-portrait';portraitButton.setAttribute('aria-label','위즈메이트 캐릭터 크게 보기');portraitButton.title='위즈메이트 크게 보기';portraitButton.disabled=true;const portrait=document.createElement('img');portrait.alt='갈색 단발머리, 흰색과 빨간색 KT 팬 유니폼을 입은 픽셀 안내 캐릭터';portrait.width=128;portrait.height=192;portrait.hidden=true;portraitButton.append(portrait);const portraitHint=document.createElement('span');portraitHint.textContent='＋';portraitHint.setAttribute('aria-hidden','true');portraitButton.append(portraitHint);
    const info=document.createElement('div');info.className='pixel-guide-copy';const name=document.createElement('strong');name.textContent='위즈메이트와 함께 찾기';const status=document.createElement('span');status.className='pixel-guide-status';status.setAttribute('role','status');status.textContent='입구에서 기다리고 있어요.';const disclaimer=document.createElement('small');disclaimer.textContent='안내 캐릭터 · 실제 위치 추적 아님';info.append(name,status,disclaimer);
    const controls=document.createElement('div');controls.className='pixel-guide-controls';const play=document.createElement('button');play.type='button';play.textContent='길 안내 시작';play.className='pixel-play';const replay=document.createElement('button');replay.type='button';replay.textContent='↺';replay.title='입구부터 다시 안내';replay.setAttribute('aria-label','입구부터 다시 안내');replay.disabled=true;const loopLabel=document.createElement('label');const loop=document.createElement('input');loop.type='checkbox';loop.checked=true;loopLabel.append(loop,document.createTextNode('왕복 안내'));controls.append(play,replay,loopLabel);panel.append(portraitButton,info,controls);svg.closest('.floor-scroll').before(panel);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let route=[],total=0,travel=0,mode='idle',forward=true,hold=0,request=0,last=0,elapsed=0,selected=null,hiddenResume=false;
    function setMode(next,message){mode=next;avatar.dataset.state=next;if(message)status.textContent=message;play.textContent=mode==='walking'?'잠깐 멈추기':mode==='paused'?'계속 걷기':mode==='arrived'?'다시 안내':'길 안내 시작';replay.disabled=!route.length||reduced.matches||!artReady;play.disabled=!selected||reduced.matches||!artReady;play.setAttribute('aria-pressed',String(mode==='walking'));}
    function position(p,d='front',f=1){const changed=d!==lastDirection||f!==lastFrame;lastDirection=d;lastFrame=f;const q=project(p[0],p[1],0);avatar.setAttribute('transform','translate('+q.map(n=>Math.round(n/2)*2).join(',')+')');if(artReady&&changed)avatarImage.setAttribute('href',frames[d][f]);avatar.dataset.x=p[0].toFixed(2);avatar.dataset.y=p[1].toFixed(2);}
    function pointAt(distance){let rest=distance;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(rest<=len||i===route.length-1){const f=len?Math.min(1,rest/len):0;return {p:[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],a,b}}rest-=len}return {p:route[0],a:route[0],b:route[0]};}
    function stop(){if(request)cancelAnimationFrame(request);request=0;last=0;}
    function animate(timestamp){if(reduced.matches){stop();position(route.at(-1)||[50,94]);setMode(route.length?'arrived':'idle','동작 줄이기 설정 · 목적지에 캐릭터를 표시했어요.');return;}if(mode!=='walking'||document.hidden){request=0;return}const delta=last?Math.min((timestamp-last)/1000,.1):0;last=timestamp;elapsed+=delta;
      if(hold>0){hold-=delta;if(hold<=0){if(!forward){forward=true;status.textContent=zones[selected].title+'으로 다시 안내할게요.';}else{forward=false;status.textContent='입구로 돌아오는 중이에요.';}}}
      else{travel=Math.max(0,Math.min(total,travel+(forward?1:-1)*delta*18));const reached=forward?travel>=total:travel<=0;if(reached){if(forward){if(!loop.checked){position(route.at(-1));setMode('arrived',zones[selected].title+'에 도착했어요!');stop();return}status.textContent=zones[selected].title+'에 도착! 잠시 후 입구로 돌아갈게요.';}else status.textContent='입구에 도착했어요. 다시 함께 가요!';hold=1.4;}}
      const q=pointAt(travel);const dx=(q.b[0]-q.a[0])*(forward?1:-1),dy=(q.b[1]-q.a[1])*(forward?1:-1);const d=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy<0?'back':'front';position(q.p,d,hold>0?1:Math.floor(elapsed*7)%4);request=requestAnimationFrame(animate);
    }
    function start(){if(!route.length||reduced.matches)return;if(!artReady){setMode(artFailed?'error':'loading',artFailed?'캐릭터 원화를 불러오지 못했어요. 경로는 지도에서 확인할 수 있어요.':'위즈메이트를 준비하고 있어요…');return;}stop();setMode('walking',forward?zones[selected].title+'으로 안내 중이에요.':'입구로 돌아오는 중이에요.');request=requestAnimationFrame(animate);}
    function setRoute(raw){stop();route=raw?raw.trim().split(/\s+/).map(pair=>pair.split(',').map(Number)):[];total=route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);travel=0;forward=true;hold=0;elapsed=0;path.setAttribute('points',route.map(p=>project(...p,1).join(',')).join(' '));path.classList.toggle('outside-route',route.some(p=>p[1]>100));position(route[0]||[50,94]);if(!route.length){setMode('idle','입구에서 기다리고 있어요. 구역을 고르고 출발해요.');return}if(reduced.matches){position(route.at(-1));setMode('arrived','동작 줄이기 설정 · 목적지에 캐릭터를 표시했어요.');return}start();}
    function select(id){selected=zones[id]?id:null;const g=geometry[id];marker.style.display=g?'':'none';if(g){const [x,y,w,d,h]=g;marker.setAttribute('transform','translate('+project(x+w/2,y+d/2,h+23).join(',')+')');}play.disabled=!selected||reduced.matches||!artReady;}
    play.onclick=()=>{if(mode==='walking'){stop();setMode('paused','잠시 쉬고 있어요. 계속 걷기를 눌러주세요.');return}if(!route.length){document.querySelector('#route-button').click();return}if(mode==='arrived'){travel=0;forward=true;hold=0;}start();};replay.onclick=()=>{travel=0;forward=true;hold=0;start()};
    reduced.addEventListener('change',()=>{stop();if(reduced.matches){position(route.at(-1)||[50,94]);setMode(route.length?'arrived':'idle','동작 줄이기 설정이 적용됐어요.');}else setMode(route.length?'paused':'idle','캐릭터 안내를 시작할 수 있어요.');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='walking'){hiddenResume=true;stop();}else if(!document.hidden&&hiddenResume){hiddenResume=false;if(mode==='walking')start();}});
    function inspectCharacter(){
      if(!artReady)return;
      const resumeGuide=mode==='walking';if(resumeGuide){stop();setMode('paused','잠시 캐릭터를 살펴보고 있어요.');}
      const dialog=document.createElement('dialog');dialog.className='character-dialog';dialog.setAttribute('aria-labelledby','character-dialog-title');
      const close=document.createElement('button');close.type='button';close.className='character-dialog-close';close.textContent='닫기 ×';close.onclick=()=>dialog.close();
      const content=document.createElement('div');content.className='character-dialog-content';
      const stage=document.createElement('div');stage.className='character-stage';
      const art=document.createElement('img');art.src=frames.front[1];art.alt='정면을 보는 위즈메이트';art.width=256;art.height=384;stage.append(art);
      const bio=document.createElement('div');bio.className='character-bio';const label=document.createElement('span');label.className='character-label';label.textContent='YOUR LITTLE GAME-DAY GUIDE';
      const title=document.createElement('h2');title.id='character-dialog-title';title.textContent='안녕, 위즈메이트예요!';
      const description=document.createElement('p');description.textContent='응원하는 마음을 담은 유니폼을 입고, 여러분의 위즈템을 함께 찾아요.';
      const speech=document.createElement('div');speech.className='character-speech';speech.textContent='오늘은 어떤 굿즈를 찾으세요?';
      const views=document.createElement('div');views.className='character-views';views.setAttribute('role','group');views.setAttribute('aria-label','캐릭터 방향 선택');
      let direction='front',previewFrame=1,previewRequest=0,previewStart=null,lastPreview='front:1';
      const names={front:'정면',right:'오른쪽',back:'뒷모습',left:'왼쪽'};
      for(const [id,name] of Object.entries(names)){const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.view=id;button.setAttribute('aria-pressed',String(id===direction));button.onclick=()=>{direction=id;previewStart=null;art.src=frames[id][previewFrame];art.alt=name+'으로 보는 위즈메이트';views.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));};views.append(button);}
      const motionLabel=document.createElement('label');motionLabel.className='character-motion';const motion=document.createElement('input');motion.type='checkbox';motion.checked=!reduced.matches;motion.disabled=reduced.matches;motionLabel.append(motion,document.createTextNode('걷는 모습 미리보기'));
      const hint=document.createElement('small');hint.textContent='캐릭터 안내는 가상 동선이며 실제 위치를 추적하지 않아요.';
      bio.append(label,title,description,speech,views,motionLabel,hint);content.append(stage,bio);dialog.append(close,content);document.body.append(dialog);
      function preview(now){if(!dialog.open)return;if(previewStart===null)previewStart=now;previewFrame=motion.checked&&!reduced.matches?Math.floor((now-previewStart)/150)%4:1;const key=direction+':'+previewFrame;if(key!==lastPreview){art.src=frames[direction][previewFrame];lastPreview=key;}if(motion.checked&&!reduced.matches)previewRequest=requestAnimationFrame(preview);}
      function syncPreview(){if(previewRequest)cancelAnimationFrame(previewRequest);previewStart=null;previewFrame=1;lastPreview=direction+':1';art.src=frames[direction][1];if(motion.checked&&!reduced.matches)previewRequest=requestAnimationFrame(preview);}
      const reducedPreview=()=>{if(reduced.matches){motion.checked=false;motion.disabled=true;}else motion.disabled=false;syncPreview();};
      motion.onchange=syncPreview;reduced.addEventListener('change',reducedPreview);
      dialog.addEventListener('close',()=>{cancelAnimationFrame(previewRequest);reduced.removeEventListener('change',reducedPreview);dialog.remove();if(resumeGuide&&mode==='paused'&&!reduced.matches)start();});
      dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
      dialog.showModal();syncPreview();
    }
    portraitButton.onclick=inspectCharacter;
    position([50,94]);setMode('idle','위즈메이트 원화를 불러오는 중이에요…');
    const ready=CharacterArt.load().then(art=>{
      frames=art.frames;artReady=true;panel.setAttribute('aria-busy','false');portrait.src=art.portrait;portrait.hidden=false;portraitButton.disabled=false;avatarImage.setAttribute('visibility','visible');avatarImage.setAttribute('href',frames[lastDirection][lastFrame]);avatar.dataset.art='premium';
      if(mode==='loading'&&route.length)start();else setMode(mode,mode==='idle'?'입구에서 기다리고 있어요. 초상화를 누르면 크게 볼 수 있어요.':undefined);
      return true;
    }).catch(()=>{artFailed=true;panel.setAttribute('aria-busy','false');portraitButton.disabled=true;avatar.dataset.art='unavailable';setMode('error','캐릭터 원화를 불러오지 못했어요. 지도와 경로는 계속 이용할 수 있습니다.');return false;});
    return {select,setRoute,ready,get state(){return {mode,travel,total,forward,artReady,artFailed,direction:lastDirection,frame:lastFrame,position:[Number(avatar.dataset.x),Number(avatar.dataset.y)]}}};
  }
  return {create};
})();
