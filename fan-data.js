/* Observed member aggregates. Demographic filters do not infer product preference. */
const WizFans=(()=>{
  let dataset=null,pending=null;
  const fields=['gender','age_group','region'];
  function validate(value){
    if(value?.meta?.data_kind!=='observed_aggregates'||!Array.isArray(value.purchase_cohorts)||!Array.isArray(value.membership_cohorts)||!Array.isArray(value.yearly))throw Error('회원 집계 자료 형식을 확인해 주세요.');
    const sum=(rows,key)=>rows.reduce((total,row)=>{if(!Number.isSafeInteger(row[key])||row[key]<0)throw Error('회원 집계 수량을 확인해 주세요.');return total+row[key];},0);
    if(sum(value.purchase_cohorts,'buyer_observations')!==value.meta.purchase_observations||sum(value.membership_cohorts,'member_observations')!==value.meta.membership_observations)throw Error('회원 집계 합계가 일치하지 않습니다.');
    for(const year of value.yearly){const rows=value.purchase_cohorts.filter(row=>row.year===year.year);if(sum(rows,'buyer_observations')!==year.buyer_observations||sum(rows,'purchase_count')!==year.purchase_count)throw Error('연도별 구매 합계가 일치하지 않습니다.');}
    return value;
  }
  function load(){
    if(dataset)return Promise.resolve(dataset);
    if(!pending)pending=fetch('data/fan-segments.json?v=20261115-fans').then(response=>{if(!response.ok)throw Error('회원 집계 자료를 불러오지 못했습니다.');return response.json();}).then(validate).then(value=>dataset=value).catch(error=>{pending=null;throw error;});
    return pending;
  }
  const matches=(row,filters)=>fields.every(key=>!filters[key]||row[key]===filters[key]);
  function purchases(filters={}){
    const rows=(dataset?.purchase_cohorts||[]).filter(row=>(!filters.year||row.year===Number(filters.year))&&matches(row,filters));
    const total={buyer_observations:0,purchase_count:0,single_purchase_buyers:0,two_to_four_buyers:0,five_to_nine_buyers:0,ten_plus_buyers:0,multiple_purchase_buyers:0,unknown_region_count:0};
    for(const row of rows){for(const key of Object.keys(total))if(key!=='unknown_region_count')total[key]+=row[key];if(row.region==='미상')total.unknown_region_count+=row.buyer_observations;}
    const n=total.buyer_observations;
    return {rows,...total,mean_purchase_count:n?total.purchase_count/n:null,multiple_purchase_share:n?total.multiple_purchase_buyers/n:null,unknown_region_share:n?total.unknown_region_count/n:null};
  }
  function membership(filters={}){
    const rows=(dataset?.membership_cohorts||[]).filter(row=>matches(row,filters));
    const count=rows.reduce((n,row)=>n+row.member_observations,0),unknown=rows.filter(row=>row.region==='미상').reduce((n,row)=>n+row.member_observations,0);
    return {rows,member_observations:count,unknown_region_count:unknown,composition_share:dataset?count/dataset.meta.membership_observations:null,unknown_region_share:count?unknown/count:null};
  }
  const series=filters=>(dataset?.meta.purchase_years||[]).map(year=>({year,...purchases({...filters,year})}));
  function create({purchasePanel,memberPanel,table,onReady}){
    const number=n=>n.toLocaleString('ko-KR'),percent=n=>n===null?'—':(n*100).toFixed(1)+'%';
    const selectors=[['gender','성별'],['age_group','연령대'],['region','지역']];
    const filtersMarkup=withYear=>`<div class="fan-filters">${withYear?'<label>연도<select data-fan-filter="year" aria-label="구매회원 연도"></select></label>':''}${selectors.map(([key,label])=>`<label>${label}<select data-fan-filter="${key}" aria-label="${withYear?'구매회원':'회원 구성'} ${label}"></select></label>`).join('')}<button type="button" class="fan-reset">조건 초기화</button></div>`;
    const loadMarkup='<div class="fan-load" role="status"><span>업로드 자료의 집계값을 불러오는 중입니다.</span><button type="button" class="fan-retry" hidden>다시 불러오기</button></div>';
    purchasePanel.innerHTML=`<h3>연도별 구매회원 분석</h3><p>업로드한 구매회원 자료를 연도·성별·연령대·지역으로 집계했습니다. 구매횟수는 원본 항목을 그대로 사용합니다.</p>${loadMarkup}<div class="fan-content" hidden>${filtersMarkup(true)}<dl class="fan-stats"></dl><div class="fan-insight" role="status"></div><div class="fan-charts"><section><h4>선택한 집단의 구매빈도</h4><div class="fan-frequency"></div></section><section><h4>같은 조건의 연도별 구매회원 관측</h4><div class="fan-year-chart"></div><p>제공된 7개 연도만 표시 · 2020·2021년 자료 없음</p></section></div><details class="fan-quality"><summary>자료 기준·결측값 안내</summary><p>원본 1행을 1회원 관측으로 집계했습니다. 연도 간 같은 회원인지 확인할 ID가 없어 누적 관측 수는 고유 인원수와 다릅니다. 지역 공란은 ‘미상’으로 유지했고, 연령대는 제공 분류를 사용했습니다. 구매횟수의 세부 정의와 연도별 집계 종료일은 제공처 확인이 필요합니다.</p></details><details class="fan-model"><summary>구매빈도 예측 모델 · 오프라인 검증 결과</summary><div></div></details><div class="fan-downloads"><a href="data/fan-data.xlsx" download>가공 엑셀 ↓</a><a href="data/purchase-cohorts.csv" download>구매회원 CSV ↓</a></div><p class="fan-row-count"></p><div class="fan-rows"></div><div class="fan-pagination"><button type="button" data-page-step="-1">이전</button><span role="status"></span><button type="button" data-page-step="1">다음</button></div></div>`;
    memberPanel.innerHTML=`<h3>전체 회원 구성</h3><p>회원 구성 원본 664,023행을 성별·연령대·지역으로 집계했습니다. 기준 연도가 없어 연도별 구매율의 분모로 사용하지 않습니다.</p>${loadMarkup}<div class="fan-content" hidden>${filtersMarkup(false)}<dl class="fan-stats"></dl><p class="fan-member-note"></p><div class="fan-downloads"><a href="data/fan-data.xlsx" download>가공 엑셀 ↓</a><a href="data/membership-cohorts.csv" download>회원 구성 CSV ↓</a></div><p class="fan-row-count"></p><div class="fan-rows"></div><div class="fan-pagination"><button type="button" data-page-step="-1">이전</button><span role="status"></span><button type="button" data-page-step="1">다음</button></div></div>`;
    let initialized=false;
    const states=[{panel:purchasePanel,kind:'purchase',page:0},{panel:memberPanel,kind:'membership',page:0}];
    const read=state=>Object.fromEntries([...state.panel.querySelectorAll('[data-fan-filter]')].map(select=>[select.dataset.fanFilter,select.value]));
    function stats(panel,items){panel.querySelector('.fan-stats').replaceChildren(...items.map(([label,value])=>{const box=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;box.append(dt,dd);return box;}));}
    function rows(state,result){
      const isPurchase=state.kind==='purchase',key=isPurchase?'buyer_observations':'member_observations';
      const sorted=[...result.rows].sort((a,b)=>b[key]-a[key]||(b.year||0)-(a.year||0)||a.gender.localeCompare(b.gender,'ko')||a.age_group.localeCompare(b.age_group,'ko')||a.region.localeCompare(b.region,'ko'));
      const pages=Math.max(1,Math.ceil(sorted.length/40));state.page=Math.min(state.page,pages-1);
      const offset=state.page*40,shown=sorted.slice(offset,offset+40);
      state.panel.querySelector('.fan-row-count').textContent='조건에 맞는 집단 '+number(sorted.length)+'개 · '+(sorted.length?number(offset+1)+'–'+number(offset+shown.length):'0')+' 표시';
      const values=isPurchase?shown.map(row=>[row.year,row.gender,row.age_group,row.region,number(row.buyer_observations),number(row.purchase_count),row.mean_purchase_count.toFixed(2),percent(row.multiple_purchase_share)]):shown.map(row=>[row.gender,row.age_group,row.region,number(row.member_observations),percent(row.composition_share)]);
      table(state.panel.querySelector('.fan-rows'),isPurchase?'구매회원 집단별 집계':'전체 회원 구성 집단별 집계',isPurchase?['연도','성별','연령대','지역','회원 관측','구매횟수 합계','평균 횟수','2회 이상 비중']:['성별','연령대','지역','회원 관측','전체 구성 비중'],values);
      state.panel.querySelector('[data-page-step="-1"]').disabled=state.page===0;state.panel.querySelector('[data-page-step="1"]').disabled=state.page===pages-1;
      state.panel.querySelector('.fan-pagination span').textContent=(state.page+1)+' / '+pages+' 페이지';
    }
    function paint(state){
      if(!dataset)return;
      const filters=read(state);
      if(state.kind==='membership'){
        const result=membership(filters);
        stats(state.panel,[['선택한 회원 관측',number(result.member_observations)+'건'],['전체 회원 구성 비중',percent(result.composition_share)],['선택한 집단',number(result.rows.length)+'개'],['지역 미상 비중',percent(result.unknown_region_share)]]);
        state.panel.querySelector('.fan-member-note').textContent='기준 연도 미제공 · 전체 회원 구성 원본과 비교한 구성 비중입니다. 연간 구매 전환율·개인별 재구매율을 의미하지 않습니다.';
        rows(state,result);return;
      }
      const result=purchases(filters),n=result.buyer_observations,year=filters.year||'전체 제공 연도 누적';
      stats(state.panel,[['구매회원 관측',number(n)+'건'],['구매횟수 합계',number(result.purchase_count)+'회'],['관측당 평균 구매',result.mean_purchase_count===null?'—':result.mean_purchase_count.toFixed(2)+'회'],['연내 2회 이상 비중',percent(result.multiple_purchase_share)]]);
      const selected=selectors.map(([key,label])=>filters[key]||label+' 전체').join(' · ');
      const trend=series(filters),previous=trend.find(row=>row.year===Number(filters.year)-1);
      let insight=(filters.year?year+'년':year)+' · '+selected+'\n';
      insight+=n?'구매회원 관측 '+number(n)+'건, 평균 구매횟수 '+result.mean_purchase_count.toFixed(2)+'회입니다. 지역 미상 '+number(result.unknown_region_count)+'건('+percent(result.unknown_region_share)+')을 포함합니다.':'선택한 조건에 해당하는 구매회원 관측이 없습니다.';
      if(n&&previous?.buyer_observations){const change=(n/previous.buyer_observations-1)*100;insight+='\n'+previous.year+'년 제공자료 대비 관측 수 '+(change>=0?'+':'')+change.toFixed(2)+'%. 연도별 집계기간의 일치 여부는 확인이 필요합니다.';}
      state.panel.querySelector('.fan-insight').textContent=insight;
      const frequency=state.panel.querySelector('.fan-frequency');frequency.replaceChildren();
      for(const [label,key] of [['1회','single_purchase_buyers'],['2–4회','two_to_four_buyers'],['5–9회','five_to_nine_buyers'],['10회 이상','ten_plus_buyers']]){
        const row=document.createElement('div');row.className='fan-bar';const name=document.createElement('span');name.textContent=label;
        const track=document.createElement('div');track.className='fan-bar-track';const bar=document.createElement('span');bar.style.width=(n?result[key]/n*100:0)+'%';track.append(bar);
        const value=document.createElement('strong');value.textContent=number(result[key])+'건 · '+percent(n?result[key]/n:null);row.append(name,track,value);frequency.append(row);
      }
      const chart=state.panel.querySelector('.fan-year-chart');chart.replaceChildren();const max=Math.max(1,...trend.map(row=>row.buyer_observations));
      for(const row of trend){const item=document.createElement('div');item.className='fan-year';item.dataset.year=row.year;item.dataset.selected=String(Number(filters.year)===row.year);const value=document.createElement('span');value.textContent=number(row.buyer_observations);const track=document.createElement('div');track.className='fan-year-track';const bar=document.createElement('span');bar.style.height=(row.buyer_observations/max*100)+'%';track.append(bar);const label=document.createElement('span');label.textContent=row.year;item.append(value,track,label);chart.append(item);}
      rows(state,result);
    }
    function initialize(){
      if(initialized)return;initialized=true;
      for(const state of states){
        const source=state.kind==='purchase'?dataset.purchase_cohorts:dataset.membership_cohorts;
        for(const select of state.panel.querySelectorAll('[data-fan-filter]')){
          const ageRank=value=>value==='10대 미만'?0:parseInt(value)||999;
          const key=select.dataset.fanFilter,values=key==='year'?[...dataset.meta.purchase_years].reverse():[...new Set(source.map(row=>row[key]))].sort((a,b)=>key==='age_group'?ageRank(a)-ageRank(b)||a.localeCompare(b,'ko'):a.localeCompare(b,'ko'));
          const all=document.createElement('option');all.value='';all.textContent=key==='year'?'전체 연도 누적':'전체';select.append(all);
          for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}
          if(key==='year')select.value=Math.max(...dataset.meta.purchase_years);
          select.onchange=()=>{state.page=0;paint(state);};
        }
        state.panel.querySelector('.fan-reset').onclick=()=>{state.page=0;for(const select of state.panel.querySelectorAll('[data-fan-filter]'))select.value=select.dataset.fanFilter==='year'?Math.max(...dataset.meta.purchase_years):'';paint(state);};
        for(const button of state.panel.querySelectorAll('[data-page-step]'))button.onclick=()=>{state.page+=Number(button.dataset.pageStep);paint(state);};
        state.panel.querySelector('.fan-content').hidden=false;paint(state);
      }
      const model=dataset.model_evaluation,content=purchasePanel.querySelector('.fan-model>div');
      const p=document.createElement('p');p.textContent='2022–2024년 구매회원 관측으로 학습하고 2025년 '+number(model.test_observations)+'건에서 검증했습니다. 대상은 해당 연도 구매회원 중 2회 이상 구매 여부입니다. ROC-AUC '+model.test_metrics.roc_auc.toFixed(3)+'(0.5는 무작위 순위 기준)로, 단순 집단별 통계 대비 개선을 확인하지 못했습니다. 상품 취향·다음 연도 개인 재구매 예측을 의미하지 않습니다.';content.append(p);
    }
    function ensure(){
      if(initialized)return Promise.resolve(dataset);
      for(const state of states){const status=state.panel.querySelector('.fan-load');status.hidden=false;status.querySelector('span').textContent='업로드 자료의 집계값을 불러오는 중입니다.';status.querySelector('button').hidden=true;}
      return load().then(()=>{initialize();for(const state of states)state.panel.querySelector('.fan-load').hidden=true;onReady();return dataset;}).catch(()=>{for(const state of states){const status=state.panel.querySelector('.fan-load');status.querySelector('span').textContent='회원 집계 자료를 불러오지 못했습니다.';status.querySelector('button').hidden=false;}return null;});
    }
    for(const state of states)state.panel.querySelector('.fan-retry').onclick=ensure;
    return {ensure};
  }
  return {load,purchases,membership,series,create,get data(){return dataset}};
})();
