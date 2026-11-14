// Optional: node --test tests/dataset-viewer.browser.cjs (Playwright + Chromium).
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.otf':'font/otf'};

test('dataset toggle presents and exports the active data without changing the demonstration',async()=>{
  const server=http.createServer((req,res)=>{
    let name=decodeURIComponent(new URL(req.url,'http://test').pathname).replace(/^\/wizcovery\//,'/');
    if(name==='/')name='/index.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    const context=await browser.newContext(),page=await context.newPage(),errors=[],bad=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
    const base='http://127.0.0.1:'+server.address().port+'/wizcovery/';
    await page.goto(base);await page.evaluate(()=>document.fonts.ready);
    const toggle=page.getByRole('button',{name:'데이터셋',exact:true}),dialog=page.locator('#dataset-dialog');
    const settings=page.getByRole('button',{name:'데이터 설정',exact:true});
    assert.equal(await toggle.count(),1);assert.equal(await dialog.isVisible(),false);
    const before=await page.evaluate(()=>JSON.stringify({settings:WizSim.read(),data:WizSim.data,products}));
    await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    await page.waitForFunction(()=>WizFans.data!==null);
    assert.equal(await page.locator('.dataset-counts dd').nth(0).innerText(),'7개');
    assert.equal(await page.locator('.dataset-counts dd').nth(1).innerText(),'340,910건');
    assert.equal(await page.locator('.dataset-counts dd').nth(2).innerText(),'664,023건');
    assert.equal(await page.locator('.dataset-counts dd').nth(3).innerText(),'3,931개');
    await page.getByRole('tab',{name:'상품 재고',exact:true}).click();
    const counts=await page.evaluate(()=>({products:products.length,skus:WizSim.data.inventory.reduce((n,p)=>n+p.variants.length,0),edges:WizKnowledge.edges.length}));
    assert.equal(await page.locator('.dataset-inventory tbody tr').count(),counts.skus);
    await page.locator('.dataset-scope').selectOption('storefront');
    assert.match(await page.locator('.dataset-inventory-count').innerText(),/상품 18종/);
    await page.locator('.dataset-search').fill('어센틱 95');assert.equal(await page.locator('.dataset-inventory tbody tr').count(),2);
    await page.locator('.dataset-search').fill('존재하지 않는 상품');assert.equal(await page.locator('.dataset-inventory tbody tr').count(),0);
    assert.match(await page.locator('.dataset-inventory').innerText(),/조건에 맞는 데이터가 없습니다/);
    await page.locator('.dataset-search').fill('');await page.locator('.dataset-scope').selectOption('example');
    assert.match(await page.locator('.dataset-inventory-count').innerText(),/상품 11종/);

    await page.getByRole('tab',{name:'매장 서비스'}).click();
    assert.match(await page.locator('.dataset-services').innerText(),/영업 중/);
    const slotTable=page.getByRole('table',{name:'픽업 시간대',exact:true});
    assert.equal(await slotTable.locator('tbody tr').count(),await page.evaluate(()=>WizSim.data.pickup.slots.length));
    await page.getByRole('tab',{name:'온톨로지',exact:true}).click();
    await page.locator('.dataset-relation-filter').selectOption('compatibleWith');
    assert.equal(await page.locator('.dataset-relations tbody tr').count(),1);
    assert.match(await page.locator('.dataset-relations').innerText(),/product:4/);assert.match(await page.locator('.dataset-relations').innerText(),/kit:choi-home/);
    await page.getByRole('tab',{name:'원본 JSON'}).click();
    let exported=JSON.parse(await page.locator('.dataset-json').textContent());
    assert.equal(exported.catalog.length,counts.products);assert.equal(exported.ontology.edges.length,counts.edges);
    assert.equal(exported.players.length,90);assert.equal(exported.curation.length,3);
    assert.deepEqual(exported.simulation,await page.evaluate(()=>WizSim.data));
    assert.equal(await page.evaluate(()=>JSON.stringify({settings:WizSim.read(),data:WizSim.data,products})),before,'viewing the dataset must not change settings, inventory or selected sizes');
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'JSON 내려받기'}).click();
    const download=await downloadPromise;assert.match(download.suggestedFilename(),/^wizcovery-dataset-.*\.json$/);
    const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(downloaded.meta.preview,false);assert.equal(exported.meta.preview,true);
    assert.equal(downloaded.fan_data.purchase_cohorts.length,3931);assert.equal(downloaded.fan_data.membership_cohorts.length,982);
    assert.equal(exported.fan_data.purchase_cohorts.length,20);
    for(const key of ['catalog','simulation','ontology','players','curation'])assert.deepEqual(downloaded[key],exported[key]);

    // Tabs are operable without a pointer.
    await page.getByRole('tab',{name:'원본 JSON'}).focus();await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab',{name:'구매회원 분석'}).getAttribute('aria-selected'),'true');
    await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'회원 구성'}).getAttribute('aria-selected'),'true');
    await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.dataset-launcher').getAttribute('aria-expanded')==='false');
    assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);

    // Each table and the raw JSON stay within the dialog at phone and desktop sizes.
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:800});
      const upper=await toggle.boundingBox(),lower=await settings.boundingBox();
      assert.ok(upper.y+upper.height<lower.y,'dataset is stacked above settings');assert.ok(upper.x>=0&&upper.x+upper.width<=width);
      await toggle.click();
      for(const tab of ['구매회원 분석','회원 구성','상품 재고','매장 서비스','온톨로지','원본 JSON']){
        await page.getByRole('tab',{name:tab,exact:true}).click();
        const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
        assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false,'dialog overflow at '+width+' / '+tab);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      await page.getByRole('button',{name:'데이터셋 닫기',exact:true}).click();
    }

    // Existing scenario controls and other pages share exactly the same data.
    await settings.click();await page.getByRole('button',{name:'인기 95 품절',exact:true}).click();
    await toggle.click();await page.getByRole('tab',{name:'원본 JSON'}).click();
    exported=JSON.parse(await page.locator('.dataset-json').textContent());assert.equal(exported.simulation.meta.scenario,'soldout');
    assert.ok(exported.simulation.inventory.filter(p=>[586,587].includes(p.id)).every(p=>p.variants.find(v=>v.size==='95').available===0));
    for(const route of ['pickup.html','store-map.html','smart.html']){
      await page.goto(base+route);await toggle.click();await page.getByRole('tab',{name:'원본 JSON'}).click();
      const dataset=JSON.parse(await page.locator('.dataset-json').textContent());
      assert.deepEqual(dataset.simulation,exported.simulation);assert.equal(await toggle.count(),1);
    }

    // Updates received from another page are reflected while the dataset stays open.
    await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'상품 재고'}).click();
    const inventoryScroll=page.locator('.dataset-inventory .dataset-table-wrap');
    await inventoryScroll.evaluate(e=>e.scrollLeft=70);
    const second=await context.newPage();await second.goto(base);
    await second.getByRole('button',{name:'데이터 설정',exact:true}).click();await second.getByRole('button',{name:'영업 종료',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.dataset-scenario').textContent.includes('영업 종료'));
    await second.close();
    assert.match(await page.locator('.dataset-scenario').innerText(),/영업 종료/);
    assert.equal(await inventoryScroll.evaluate(e=>e.scrollLeft),70,'live updates preserve the horizontal table position');
    await page.getByRole('tab',{name:'원본 JSON'}).click();assert.equal(JSON.parse(await page.locator('.dataset-json').textContent()).simulation.store.open,false);

    const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base+'store-map.html');
    await mobile.evaluate(()=>scrollTo(0,250));const scroll=await mobile.evaluate(()=>scrollY);
    await mobile.getByRole('button',{name:'데이터셋',exact:true}).tap();await mobile.getByRole('tab',{name:'온톨로지',exact:true}).tap();
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await mobile.getByRole('button',{name:'데이터셋 닫기',exact:true}).tap();
    assert.ok(Math.abs(await mobile.evaluate(()=>scrollY)-scroll)<2,'closing the dataset preserves the map position');
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
