const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.otf':'font/otf'};
test('the full dated roster powers the selector and text queries without inventing player merchandise',async()=>{
 const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://test').pathname).replace(/^\/wizcovery\//,'/');if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/wizcovery/smart.html');await page.evaluate(()=>document.fonts.ready);
  const select=page.locator('#player');assert.equal(await select.locator('option').count(),91);assert.equal(await select.locator('optgroup').count(),5);
  const options=await select.locator('option').evaluateAll(es=>es.filter(e=>e.value).map(e=>e.value));assert.deepEqual(options,await page.evaluate(()=>['투수','포수','내야수','외야수','군보류'].flatMap(position=>WizRoster.players.filter(p=>p.position===position).map(p=>p.id))));
  assert.equal(await select.locator('option').filter({hasText:'강백호'}).count(),0);assert.equal(await select.locator('option[value="player:choi"]').innerText(),'최원준 (3번)');
  assert.match(await page.locator('#player-roster-note').innerText(),/2026-11-14/);assert.match(await page.locator('#player-roster-note a').getAttribute('href'),/wikipedia/);
  const anh=await page.evaluate(()=>WizRoster.players.find(p=>p.name==='안현민').id);await select.selectOption(anh);await page.locator('#filters .primary').click();
  assert.match(await page.locator('#conditions').innerText(),/안현민/);assert.match(await page.locator('#results').innerText(),/안현민 선수의 상품 정보가 아직 등록되지 않았습니다/);assert.equal(await page.locator('.result').count(),0);
  const query=async q=>{await page.locator('#query').fill(q);await page.locator('#query-form button').click();};
  await query('장성우 어웨이 마킹키트');assert.equal(await page.locator('.result').count(),1);assert.match(await page.locator('.result h3').innerText(),/장성우/);assert.match(await page.locator('.result-visual img').getAttribute('src'),/584-away-marking-kit/);assert.equal(await select.inputValue(),await page.evaluate(()=>WizRoster.players.find(p=>p.name==='장성우').id));
  await query('소형준 선수 홈 유니폼 95');assert.match(await page.locator('#results').innerText(),/소형준 선수의 상품 정보가 아직 등록되지 않았습니다/);assert.doesNotMatch(await page.locator('#conditions').innerText(),/지원하지 않는/);
  await query('샘 힐리어드 유니폼 100');assert.match(await page.locator('#conditions').innerText(),/힐리어드/);assert.equal(await select.inputValue(),await page.evaluate(()=>WizRoster.players.find(p=>p.name==='힐리어드').id));
  await query('강백호 홈 유니폼 95');assert.equal(await page.locator('.result').count(),0);assert.match(await page.locator('#conditions').innerText(),/지원하지 않는/);
  await query('최원준 홈 유니폼 95 마킹');assert.ok(await page.locator('.result').count()>0);assert.match(await page.locator('#results').innerText(),/마킹 조합/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.locator('.filter-drawer').evaluate(e=>e.open=true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const r=await select.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width+1);assert.equal(await select.locator('option').count(),91);}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
