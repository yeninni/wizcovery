// Optional browser regression: node --test tests/storefront.browser.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.otf':'font/otf'};

test('uploaded photos appear in the project-site catalog, filters, search and pickup links',async()=>{
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://test');
    let name=decodeURIComponent(url.pathname).replace(/^\/wizcovery\//,'/');
    if(name==='/')name='/index.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    const page=await browser.newPage(),errors=[],bad=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('response',res=>{if(res.status()>=400)bad.push(res.url());});
    await page.addInitScript(()=>localStorage.setItem('wiz-simulation-v1',JSON.stringify({mode:'fixed',at:'2026-11-14T11:00',seed:42,scenario:'normal'})));
    const base='http://127.0.0.1:'+server.address().port+'/wizcovery/';
    await page.goto(base);await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.product').count(),18);
    assert.equal(await page.locator('.art svg').count(),0);
    assert.equal(await page.locator('.product-photo').count(),18);
    await page.locator('.product-photo').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
    const photos=await page.locator('.product-photo').evaluateAll(images=>images.map(img=>({src:img.currentSrc,loaded:img.complete&&img.naturalWidth>0,fit:getComputedStyle(img).objectFit})));
    assert.equal(new Set(photos.map(p=>p.src)).size,18);
    assert.ok(photos.every(p=>p.loaded&&p.fit==='contain'&&p.src.includes('/wizcovery/assets/products/')));
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'catalog overflow at '+width);
      const frames=await page.locator('.art.has-photo').evaluateAll(es=>es.map(e=>({width:e.clientWidth,height:e.clientHeight})));
      assert.ok(frames.every(r=>Math.abs(r.width-r.height)<2),'square photo frames at '+width);
    }
    await page.locator('[data-cat="마킹키트"]').click();assert.equal(await page.locator('.product').count(),3);
    await page.locator('[data-cat="의류"]').click();assert.equal(await page.locator('.product').count(),1);
    assert.match(await page.locator('.product h3').innerText(),/정조대왕/);
    await page.locator('[data-cat="전체"]').click();await page.locator('#search').fill('빅 인형 크로스백');
    assert.equal(await page.locator('.product').count(),1);assert.match(await page.locator('.product-photo').getAttribute('src'),/596-vic-plush-crossbody/);
    await page.locator('.pickup-link').click();await page.waitForURL('**/pickup.html?product=596&size=FREE');
    assert.equal(await page.locator('#product').inputValue(),'596');assert.equal(await page.locator('#size').inputValue(),'FREE');
    await page.goto(base+'smart.html');
    await page.locator('.result-visual img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    assert.ok(await page.locator('.result-visual img').count()>0);
    assert.equal(await page.locator('.service-notice,#demo-settings,a[href="simulator.html"]').count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
