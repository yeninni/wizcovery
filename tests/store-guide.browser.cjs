// Optional browser regression suite: node --test tests/store-guide.browser.cjs
// Requires Playwright and Chromium. CHROMIUM_EXECUTABLE can select a system browser.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.otf':'font/otf'};

test('guide finishes one round trip, remains stopped, and only restarts on request',async()=>{
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://test').pathname);const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();await page.clock.install();
  await page.goto('http://127.0.0.1:'+server.address().port+'/store-map.html?zone=checkout');assert.equal(await page.evaluate(()=>pixelStore.ready),true);
  await page.locator('.pixel-play').click();await page.clock.runFor(12000);
  let state=await page.evaluate(()=>pixelStore.state);assert.equal(state.mode,'completed');assert.deepEqual(state.position,[50,94]);assert.equal(state.travel,0);
  const stopped=await page.locator('#guide-avatar').getAttribute('transform');await page.clock.runFor(30000);assert.equal(await page.locator('#guide-avatar').getAttribute('transform'),stopped);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'completed');
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(100);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'completed');assert.deepEqual(await page.evaluate(()=>pixelStore.state.position),[50,94]);await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.runFor(100);
  await page.locator('.pixel-play').click();await page.clock.runFor(400);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');assert.ok(await page.evaluate(()=>pixelStore.state.travel)>0);
  await page.locator('#reset').click();await page.locator('.pixel-guide-controls input').uncheck();await page.locator('.pixel-play').click();await page.clock.runFor(8000);state=await page.evaluate(()=>pixelStore.state);assert.equal(state.mode,'arrived');assert.deepEqual(state.position,[62,81]);
  await page.clock.runFor(15000);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'arrived');
  await page.locator('#reset').click();assert.equal(await page.evaluate(()=>pixelStore.state.mode),'idle');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
