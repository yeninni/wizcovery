// Optional regression: node --test tests/map-mobile-scroll.browser.cjs
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.otf':'font/otf'};

test('mobile route controls keep the visible map in place and reveal it from the lower action',async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://test').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'no-preference'});
  await context.addInitScript(()=>localStorage.setItem('wiz-simulation-v1',JSON.stringify({mode:'fixed',at:'2026-11-14T11:00',seed:42,scenario:'normal'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const base='http://127.0.0.1:'+server.address().port;
  const open=async()=>{await page.goto(base+'/store-map.html?zone=uniform');assert.equal(await page.evaluate(()=>pixelStore.ready),true);await page.evaluate(()=>document.fonts.ready);};
  const keepScroll=async y=>{await page.waitForTimeout(200);const current=await page.evaluate(()=>scrollY);assert.ok(Math.abs(current-y)<=2,'guide action must keep the page scroll position: '+y+' → '+current);};
  for(const [width,height] of [[320,740],[390,844],[768,1024]]){
   await page.setViewportSize({width,height});await open();
   if(width===390){await page.locator('.map-zoom').tap();await page.locator('.floor-scroll').evaluate(e=>e.scrollLeft=140);}
   await page.locator('.pixel-guide').evaluate(e=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,e.getBoundingClientRect().top+scrollY-24);});
   await page.evaluate(()=>{window.lowerRouteClicks=0;document.querySelector('#route-button').addEventListener('click',()=>window.lowerRouteClicks++);});
   const before=await page.evaluate(()=>({y:scrollY,x:document.querySelector('.floor-scroll').scrollLeft}));
   await page.locator('.pixel-play').tap();assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');
   assert.equal(await page.evaluate(()=>window.lowerRouteClicks),0,'starting beside the map must not activate an off-screen button');
   await keepScroll(before.y);assert.equal(await page.locator('.floor-scroll').evaluate(e=>e.scrollLeft),before.x);
   await page.locator('.pixel-play').tap();assert.equal(await page.evaluate(()=>pixelStore.state.mode),'paused');await keepScroll(before.y);
   await page.locator('.pixel-play').tap();assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');await keepScroll(before.y);
   await page.getByRole('button',{name:'입구부터 다시 안내',exact:true}).tap();await keepScroll(before.y);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

   // A user starting below the map must be brought back to the moving character.
   await open();await page.locator('#route-button').scrollIntoViewIfNeeded();
   const below=await page.evaluate(()=>scrollY);assert.ok(await page.locator('.floor-scroll').evaluate(e=>e.getBoundingClientRect().bottom<0));
   await page.locator('#route-button').tap();
   await page.waitForFunction(()=>{const r=document.querySelector('.floor-scroll').getBoundingClientRect(),guide=document.querySelector('.pixel-guide').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&Math.abs(guide.top-16)<2;});
   assert.ok(await page.evaluate(()=>scrollY)<below,'starting below the map must scroll upward');
   assert.equal(await page.evaluate(()=>pixelStore.state.mode),'walking');
   const revealed=await page.evaluate(()=>scrollY);await keepScroll(revealed);
  }
  // Touch navigation must not change the existing side-by-side desktop layout.
  await page.setViewportSize({width:1440,height:1000});await open();await page.locator('#route-button').scrollIntoViewIfNeeded();
  const desktop=await page.evaluate(()=>scrollY);await page.locator('#route-button').tap();await keepScroll(desktop);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
