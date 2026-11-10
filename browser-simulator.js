/* Server-free synthetic data model. Same-time snapshots are reproducible. */
const WizSim = (() => {
  const baseline = JSON.parse(JSON.stringify(products));
  const config = Object.freeze({timezone:'Asia/Seoul',refresh_seconds:5,opening:600,closing:1320,
    games:[null,1110,1110,1110,1110,840,840],weekdayDemand:[.35,.8,.9,1,1.25,1.6,1.45]});
  const key='wiz-simulation-v1';
  let memory={mode:'live',at:'',seed:42,scenario:'normal'};
  const isoMinute=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  function parseTime(raw){if(!raw)return new Date();if(typeof raw==='string'&&!/(Z|[+-]\d\d:\d\d)$/.test(raw))raw+=' +09:00'.trim();const value=new Date(raw);if(!Number.isFinite(value.getTime()))throw Error('올바른 날짜·시간을 입력해 주세요.');return value;}
  function kstValue(date){return new Intl.DateTimeFormat('sv-SE',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date).replace(' ','T');}
  function noise(value){let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);return (hash>>>0)/4294967295;}
  function demand(t,game,day,scenario){let rate=.32;if(game!==null){rate+=2.7*Math.exp(-(((t-(game-65))/60)**2))+.45*Math.exp(-(((t-(game+65))/45)**2))+1.4*Math.exp(-(((t-(game+185))/50)**2))}else rate+=.4*Math.exp(-(((t-840)/95)**2));return rate*config.weekdayDemand[day]*(scenario==='busy'?1.7:1);}
  function snapshot({at='',seed=42,scenario='normal'}={}){
    seed=Number(seed);if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw Error('시드는 0~2147483647 정수입니다.');
    if(!['normal','busy','soldout','restock'].includes(scenario))throw Error('지원하지 않는 상황입니다.');
    const instant=parseTime(at);instant.setTime(Math.floor(instant.getTime()/5000)*5000);const local=kstValue(instant),date=local.slice(0,10),day=(new Date(date+'T12:00:00+09:00').getUTCDay()+6)%7;
    const t=Number(local.slice(11,13))*60+Number(local.slice(14,16))+Number(local.slice(17,19))/60;
    const opened=config.opening,closed=config.closing,game=config.games[day],isOpen=t>=opened&&t<closed,whole=Math.max(opened,Math.min(Math.floor(t),closed));
    const integral=(start)=>{let sum=0;for(let m=start;m<whole;m++)sum+=demand(m+.5,game,day,scenario);if(t>=start&&t<closed)sum+=demand(t,game,day,scenario)*(t-Math.floor(t));return sum;};
    const accumulated=integral(opened),post= scenario==='restock'&&t>=960?integral(960):0;
    const occupancy=isOpen?Math.min(230,Math.round(demand(t,game,day,scenario)*37)):0;
    const crowd=!isOpen?'closed':occupancy>=100?'high':occupancy>=45?'medium':'low';
    const inventory=baseline.map(p=>({id:p.id,name:p.name,category:p.category,price:p.price,zone:p.mapZone||null,pickup_eligible:!p.name.includes('마킹'),variants:Object.entries(p.sizes).map(([size,original])=>{const id=seed+':'+date+':'+p.id+':'+size,initial=original===0?0:original+Math.floor(noise(id+':initial')*18),rate=.025+.075*noise(id+':rate');let onHand=Math.max(0,initial-Math.floor(accumulated*rate));const replenished=scenario==='restock'&&t>=960?30:0;if(replenished)onHand+=Math.max(0,replenished-Math.floor(post*rate));if(scenario==='soldout'&&[1,2,8,586,587].includes(p.id)&&size==='95')onHand=0;return {sku:p.id+'-'+size,size,opening_stock:initial,replenished,on_hand:onHand,available:isOpen?onHand:0,status:!isOpen?'unavailable':onHand===0?'sold_out':onHand<=4?'low_stock':'in_stock'};})}));
    const cutoff=game!==null?Math.min(closed-30,game-60):closed-60,accepting=isOpen&&t<cutoff,queue=accepting?Math.max(0,Math.floor(occupancy*.1)):0,wait=Math.ceil(queue/2)*5;
    const marking={zone:'marking-service',location:'매장 밖 외부 마킹 공간',accepting,status:accepting?'open':'closed',cutoff_at:date+'T'+isoMinute(cutoff)+':00+09:00',queue_people:queue,wait_min:accepting?wait:null,processing_min:accepting?15:null,processing_max:accepting?20:null,total_min:accepting?wait+15:null,total_max:accepting?wait+20:null};
    const slots=[],pickupEnd=game!==null?Math.min(closed,game-30):closed;
    for(let start=opened;start+30<=pickupEnd;start+=30){const capacity=8+Math.floor(noise(seed+':'+date+':slot:'+start)*9),remaining=Math.max(0,capacity-Math.round(demand(start,game,day,scenario)*2.5)),available=isOpen&&start>=t+30&&remaining>0;slots.push({start:date+'T'+isoMinute(start)+':00+09:00',end:date+'T'+isoMinute(start+30)+':00+09:00',capacity,remaining:available?remaining:0,available,reason:available?'available':!isOpen?'store_closed':start<t+30?'lead_time_or_cutoff':'full'});}
    return {meta:{synthetic:true,source:'WIZCOVERY_BROWSER_SIMULATOR',model_version:'browser-1.0',timezone:config.timezone,simulation_time:local+'+09:00',seed,scenario,refresh_seconds:5,weekday:'월화수목금토일'[day],notice:'브라우저에서 생성한 독립 합성 데이터입니다. 실제 경기 일정·재고가 아닙니다.'},schedule:{game_day:game!==null,fictional_game_start:game!==null?isoMinute(game):null,opening:isoMinute(opened),closing:isoMinute(closed)},store:{open:isOpen,visitors:occupancy,crowd,checkout_queue:Math.max(0,Math.round(occupancy*.16-2)),checkout_wait_minutes:Math.ceil(Math.max(0,Math.round(occupancy*.16-2))/3)},inventory,zones:[['uniform','유니폼',.28],['collab','콜라보 제품',.2],['goods1','굿즈 진열대 1',.1],['goods2','굿즈 진열대 2',.1],['goods3','굿즈 진열대 3',.1]].map(([id,name,share])=>({id,name,visitors:Math.round(occupancy*share),crowd:!isOpen?'closed':occupancy*share>=25?'high':occupancy*share>=12?'medium':'low'})),marking,pickup:{lead_minutes:30,slots,notice:'실제 예약·수량 확보 없음'}};
  }
  function read(){try{const v=JSON.parse(localStorage.getItem(key));if(v&&['live','fixed'].includes(v.mode))memory={...memory,...v};}catch{}return {...memory};}
  function save(value){memory={...read(),...value};try{localStorage.setItem(key,JSON.stringify(memory));}catch{}return {...memory};}
  function current(){const value=read();return snapshot({...value,at:value.mode==='live'?'':value.at});}
  let latest;
  function apply(data){latest=data;data.inventory.forEach(item=>{const product=products.find(p=>p.id===item.id);if(product)item.variants.forEach(v=>product.sizes[v.size]=v.available)});return data;}
  apply(current());
  return {snapshot,read,save,current,kstValue,config,apply,get data(){return latest}};
})();
