// Optional regression: node --test tests/store-guide-reduced-motion.browser.cjs
const {test}=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.otf':'font/otf'};

test('reduced motion keeps manual guide controls usable while suppressing autoplay',async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://test').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  const base='http://127.0.0.1:'+server.address().port;
  const open=async url=>{await page.goto(base+url);assert.equal(await page.evaluate(()=>pixelStore.ready),true);};
  const play=page.locator('.pixel-play'),replay=page.getByRole('button',{name:'입구부터 다시 안내',exact:true});
  await open('/store-map.html?zone=checkout');
  assert.equal(await play.isEnabled(),true,'guide remains available with reduced motion enabled');
  assert.equal(await replay.isEnabled(),false,'replay needs an existing route');
  await page.clock.runFor(2000);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'idle');
  await play.tap();await page.clock.runFor(600);
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');assert.ok(await page.evaluate(()=>pixelStore.state.travel)>0);
  await play.tap();const paused=await page.locator('#guide-avatar').getAttribute('transform');
  await page.clock.runFor(3000);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'paused');assert.equal(await page.locator('#guide-avatar').getAttribute('transform'),paused);
  await play.tap();await page.clock.runFor(12000);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'completed');
  assert.deepEqual(await page.evaluate(()=>pixelStore.state.position),[50,94]);
  const finished=await page.locator('#guide-avatar').getAttribute('transform');await page.clock.runFor(30000);
  assert.equal(await page.locator('#guide-avatar').getAttribute('transform'),finished);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'completed');
  assert.equal(await replay.isEnabled(),true);await replay.tap();await page.clock.runFor(400);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');

  // The lower start action is also explicit playback, including on reduced-motion phones.
  await open('/store-map.html?zone=checkout');await page.locator('#route-button').tap();await page.clock.runFor(500);
  assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');assert.ok(await page.evaluate(()=>pixelStore.state.travel)>0);

  // A route opened by a link stays still until the user chooses to play it.
  await open('/store-map.html?product=4&journey=marking');
  assert.equal(await page.evaluate(()=>pixelStore.state.mode),'arrived');assert.equal(await play.isEnabled(),true);assert.equal(await play.innerText(),'길 안내 시작');
  const automatic=await page.locator('#guide-avatar').getAttribute('transform');await page.clock.runFor(3000);
  assert.equal(await page.locator('#guide-avatar').getAttribute('transform'),automatic);
  await play.tap();await page.clock.runFor(500);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');
  await page.locator('.character-portrait').tap();assert.equal(await page.evaluate(()=>pixelStore.state.mode),'paused');
  const preview=page.locator('.character-motion input');assert.equal(await preview.isChecked(),false);assert.equal(await preview.isEnabled(),true);
  const pose=await page.locator('.character-stage img').getAttribute('src');await page.clock.runFor(500);assert.equal(await page.locator('.character-stage img').getAttribute('src'),pose);
  await preview.check();await page.clock.runFor(500);assert.notEqual(await page.locator('.character-stage img').getAttribute('src'),pose);
  await preview.uncheck();const still=await page.locator('.character-stage img').getAttribute('src');await page.clock.runFor(1000);assert.equal(await page.locator('.character-stage img').getAttribute('src'),still);
  await page.locator('.character-dialog-close').tap();await page.waitForFunction(()=>!document.querySelector('.character-dialog'));await page.clock.runFor(400);assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');

  // Media-query changes run against the browser's native rendering clock.
  await page.close();
  const nativeContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const native=await nativeContext.newPage();native.on('pageerror',e=>errors.push(e.message));
  await native.goto(base+'/store-map.html?zone=checkout');await native.evaluate(()=>pixelStore.ready);
  await native.locator('.pixel-play').tap();await native.waitForFunction(()=>pixelStore.state.mode==='walking');
  await native.emulateMedia({reducedMotion:'no-preference'});await native.waitForFunction(()=>pixelStore.state.mode==='paused');
  await native.emulateMedia({reducedMotion:'reduce'});await native.waitForFunction(()=>pixelStore.state.mode==='arrived');
  const changed=await native.locator('#guide-avatar').getAttribute('transform');await native.waitForTimeout(300);
  assert.equal(await native.locator('#guide-avatar').getAttribute('transform'),changed);assert.equal(await native.locator('.pixel-play').isEnabled(),true);
  await native.locator('.pixel-play').tap();await native.waitForFunction(()=>pixelStore.state.mode==='walking');
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
