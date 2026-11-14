const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.otf':'font/otf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};

test('uploaded member data is the default dataset, with independent filters, downloads and retry on phones',async()=>{
 const server=http.createServer((req,res)=>{
  let name=decodeURIComponent(new URL(req.url,'http://test').pathname).replace(/^\/wizcovery\//,'/');if(name==='/')name='/index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext(),page=await context.newPage(),errors=[];let requests=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/data/fan-segments.json'))requests++;});
  const base='http://127.0.0.1:'+server.address().port+'/wizcovery/';await page.goto(base);assert.equal(requests,0,'member data is loaded only on demand');
  const toggle=page.getByRole('button',{name:'데이터셋',exact:true}),panel=page.locator('#dataset-panel-purchases');
  await toggle.click();await page.waitForFunction(()=>WizFans.data!==null);
  assert.equal(await page.getByRole('tab',{name:'구매회원 분석',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.getByRole('combobox',{name:'구매회원 연도'}).inputValue(),'2025');
  assert.equal(await panel.locator('.fan-stats dd').nth(0).innerText(),'74,885건');
  assert.equal(await panel.locator('.fan-stats dd').nth(1).innerText(),'228,017회');
  assert.match(await panel.locator('.fan-insight').innerText(),/54\.9%/);
  assert.equal(await panel.locator('.fan-rows tbody tr').count(),40);
  const first=await panel.locator('.fan-rows tbody tr').first().innerText();await panel.getByRole('button',{name:'다음',exact:true}).click();
  assert.match(await panel.locator('.fan-pagination span').innerText(),/^2 \/ /);assert.notEqual(await panel.locator('.fan-rows tbody tr').first().innerText(),first);
  await panel.getByRole('button',{name:'이전',exact:true}).click();assert.equal(await panel.locator('.fan-rows tbody tr').first().innerText(),first);
  await page.getByRole('combobox',{name:'구매회원 성별'}).selectOption('여성');await page.getByRole('combobox',{name:'구매회원 연령대'}).selectOption('20대');await page.getByRole('combobox',{name:'구매회원 지역'}).selectOption('경기도 수원시');
  assert.equal(await panel.locator('.fan-stats dd').nth(0).innerText(),'1,615건');assert.equal(await panel.locator('.fan-stats dd').nth(1).innerText(),'7,381회');
  assert.equal(await panel.locator('.fan-rows tbody tr').count(),1);assert.equal(await panel.locator('.fan-year').count(),7);
  assert.deepEqual(await panel.locator('.fan-year').evaluateAll(es=>es.map(e=>Number(e.dataset.year))),[2017,2018,2019,2022,2023,2024,2025]);
  await page.getByRole('combobox',{name:'구매회원 연도'}).selectOption('2022');assert.doesNotMatch(await panel.locator('.fan-insight').innerText(),/2019년 제공자료 대비/);
  await page.getByRole('combobox',{name:'구매회원 연도'}).selectOption('2025');await page.getByRole('combobox',{name:'구매회원 연령대'}).selectOption('90대');
  assert.equal(await panel.locator('.fan-stats dd').nth(0).innerText(),'0건');assert.equal(await panel.locator('.fan-stats dd').nth(2).innerText(),'—');
  assert.equal(await panel.getByRole('button',{name:'다음',exact:true}).isDisabled(),true);assert.match(await panel.locator('.fan-rows').innerText(),/조건에 맞는 데이터가 없습니다/);
  await panel.getByRole('button',{name:'조건 초기화',exact:true}).click();assert.equal(await panel.locator('.fan-stats dd').nth(0).innerText(),'74,885건');
  const downloadPromise=page.waitForEvent('download');await panel.getByRole('link',{name:'가공 엑셀'}).click();const download=await downloadPromise;
  assert.deepEqual(fs.readFileSync(await download.path()),fs.readFileSync(path.join(root,'data/fan-data.xlsx')));

  await page.getByRole('tab',{name:'회원 구성',exact:true}).click();const members=page.locator('#dataset-panel-members');
  assert.equal(await members.locator('[data-fan-filter=year]').count(),0);assert.equal(await members.locator('.fan-stats dd').nth(0).innerText(),'664,023건');
  await page.getByRole('combobox',{name:'회원 구성 성별'}).selectOption('여성');assert.equal(await members.locator('.fan-stats dd').nth(0).innerText(),'272,485건');
  await page.getByRole('button',{name:'데이터셋 닫기',exact:true}).click();await page.getByRole('button',{name:'데이터 설정',exact:true}).click();await page.getByRole('button',{name:'영업 종료',exact:true}).click();
  await toggle.click();await page.getByRole('tab',{name:'구매회원 분석',exact:true}).click();assert.equal(await panel.locator('.fan-stats dd').nth(0).innerText(),'74,885건');
  assert.equal(await page.evaluate(()=>WizSim.data.store.open),false);assert.equal(requests,1);

  const mobile=await browser.newPage({viewport:{width:320,height:800},hasTouch:true,isMobile:true});mobile.on('pageerror',e=>errors.push(e.message));
  let attempts=0;await mobile.route('**/data/fan-segments.json?*',route=>++attempts===1?route.fulfill({status:503,body:'temporary failure'}):route.continue());
  await mobile.goto(base+'store-map.html');await mobile.getByRole('button',{name:'데이터셋',exact:true}).tap();
  const retry=mobile.locator('#dataset-panel-purchases .fan-retry');await retry.waitFor({state:'visible'});
  assert.equal(await mobile.getByRole('button',{name:'전체 데이터 JSON 내려받기'}).isDisabled(),true);await retry.tap();await mobile.waitForFunction(()=>WizFans.data!==null);assert.equal(attempts,2);
  for(const name of ['구매회원 분석','회원 구성','상품 재고','원본 JSON']){
   await mobile.getByRole('tab',{name,exact:true}).tap();assert.equal(await mobile.locator('#dataset-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false,name+' stays in the phone dialog');
  }
  await mobile.getByRole('tab',{name:'구매회원 분석',exact:true}).tap();
  const edges=await mobile.locator('#dataset-panel-purchases [data-fan-filter]').evaluateAll(es=>es.map(e=>({left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width})));
  assert.ok(Math.abs(edges[0].left-edges[2].left)<1&&Math.abs(edges[1].left-edges[3].left)<1);assert.ok(edges.every(e=>Math.abs(e.width-edges[0].width)<1));
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
