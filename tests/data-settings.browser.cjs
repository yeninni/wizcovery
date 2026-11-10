// Optional: node --test tests/data-settings.browser.cjs (Playwright + Chromium).
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.otf':'font/otf'};
test('compact settings change visible store data, persist across pages, and reset to live time',async()=>{
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,'http://test').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-11-11T03:00:00+09:00')});
    const base='http://127.0.0.1:'+server.address().port;
    await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);
    const launcher=page.getByRole('button',{name:'데이터 설정',exact:true}),dialog=page.locator('#data-settings-dialog');
    assert.equal(await launcher.count(),1);assert.equal(await dialog.isVisible(),false);
    assert.ok((await launcher.boundingBox()).width<150);
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:700});await launcher.click();
      assert.ok(await dialog.isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
      const edges=await dialog.locator('input,select').evaluateAll(es=>es.map(e=>({left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width})));
      assert.ok(Math.abs(edges[0].left-edges[1].left)<1&&Math.abs(edges[0].width-edges[1].width)<1);
      await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.ok(await launcher.evaluate(e=>e===document.activeElement));
    }
    await launcher.click();await page.getByRole('button',{name:'영업 중',exact:true}).click();
    assert.equal(await dialog.isVisible(),false);assert.equal(await page.locator('#hero-store-state').innerText(),'영업 중');
    let settings=await page.evaluate(()=>WizSim.read());assert.equal(settings.at,'2026-11-14T11:00');assert.equal(settings.mode,'fixed');
    await launcher.click();await page.getByRole('button',{name:'경기 전 혼잡',exact:true}).click();
    assert.equal(await page.locator('.stat strong').nth(1).innerText(),'혼잡');
    await launcher.click();await page.getByRole('button',{name:'인기 95 품절',exact:true}).click();
    for(const id of [586,587]){assert.match(await page.locator('.product').filter({has:page.locator('[data-id="'+id+'"]')}).locator('.stockrow').innerText(),/품절/);}
    await page.goto(base+'/smart.html');await page.getByRole('button',{name:'데이터 설정',exact:true}).click();
    assert.equal(await page.locator('#data-settings-scenario').inputValue(),'soldout');
    await page.locator('#data-settings-at').fill('2026-11-13T16:10');await page.locator('#data-settings-scenario').selectOption('restock');
    await page.getByRole('button',{name:'적용',exact:true}).click();assert.equal(await page.locator('#data-settings-dialog').isVisible(),false);
    assert.equal(await page.evaluate(()=>WizSim.read().scenario),'restock');assert.ok(await page.evaluate(()=>WizSim.data.inventory.every(p=>p.variants.every(v=>v.replenished===30))));
    // Cancelling an unfinished draft must not change the active model.
    await page.getByRole('button',{name:'데이터 설정',exact:true}).click();await page.locator('#data-settings-scenario').selectOption('busy');await page.getByRole('button',{name:'데이터 설정 닫기'}).click();assert.equal(await page.evaluate(()=>WizSim.read().scenario),'restock');
    await page.goto(base+'/pickup.html');await page.getByRole('button',{name:'데이터 설정',exact:true}).click();await page.getByRole('button',{name:'영업 종료',exact:true}).click();
    assert.equal(await page.locator('.available-slots').count(),0);assert.match(await page.locator('#slots').innerText(),/영업 종료/);
    await page.goto(base+'/store-map.html');assert.equal(await page.getByRole('button',{name:'데이터 설정',exact:true}).count(),1);
    await page.getByRole('button',{name:'데이터 설정',exact:true}).click();await page.getByRole('button',{name:'현재 시각으로',exact:true}).click();
    settings=await page.evaluate(()=>WizSim.read());assert.equal(settings.mode,'live');assert.equal(settings.at,'');assert.equal(settings.scenario,'normal');
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
