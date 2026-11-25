// Run with: node --test tests/ontology.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function model(){const ctx=vm.createContext({});for(const f of ['player-roster.js','catalog.js','ontology.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);return vm.runInContext('WizKnowledge',ctx)}
// vm 안에서 만든 개체는 다른 전역의 프로토타입을 가지므로 깊은 비교 전에 일반 개체로 옮긴다.
const plain=value=>JSON.parse(JSON.stringify(value));
test('player marking request traverses compatibility and adds kit cost',()=>{const k=model(),f=k.parse('최원준 홈 유니폼 95 마킹하고 싶어');assert.equal(f.supported,true);const bundle=k.search(f).results.find(r=>r.extra);assert.equal(bundle.p.id,4);assert.equal(bundle.total,109000);assert.ok(bundle.relations.some(r=>r.to==='매장 밖 마킹 공간'));k.get('kit:choi-home').stock=0;assert.ok(k.search(f).results.every(r=>!r.extra));});
test('removing compatibility relation removes only the matching player bundle',()=>{const k=model();k.edges.splice(k.edges.findIndex(e=>e.from==='product:4'&&e.to==='kit:choi-home'),1);assert.ok(k.search(k.parse('최원준 홈 유니폼 95 마킹')).results.every(r=>!r.extra));assert.ok(k.search(k.parse('안현민 홈 유니폼 95')).results.some(r=>r.extra));});
test('budget and pickup constraints apply to each returned combination',()=>{const k=model();const rs=k.search(k.parse('3만원 이하 오늘 픽업할 응원 굿즈')).results;assert.ok(rs.length>0);assert.ok(rs.some(r=>r.p.id===594));assert.ok(rs.every(r=>r.total<=30000&&r.pickup));assert.equal(k.search({...k.parse('유니폼'),budget:'0'}).results.length,0);assert.ok(k.search(k.parse('15000원 미만 굿즈')).results.every(r=>r.total<15000));});
test('sold-out exact size is distinct from alternative sizes',()=>{const k=model();k.get('product:591').source.sizes['95']=0;const f=k.parse('최원준 어웨이 유니폼 95'),r=k.search(f);assert.equal(r.results.length,0);assert.equal(r.blocked[0].size,'95');const alt=k.alternatives(f,r.blocked);assert.ok(alt.length>0);assert.ok(alt.every(x=>x.size!=='95'&&[2,591].includes(x.p.id)&&(!x.extra||x.extra.playerId===f.player)));});
test('unregistered player is not silently ignored; explicitly unmarked shirts are not player merchandise',()=>{const k=model();assert.equal(k.parse('미등록선수 유니폼 95').supported,false);assert.equal(k.search(k.parse('미등록선수 유니폼 95')).results.length,0);assert.ok(k.search({...k.parse('최원준 홈 유니폼 95'),marking:false}).results.every(r=>r.p.id!==4));});

test('registered player products preserve identity and design without reviving archived demos',()=>{const k=model();const ko=k.search(k.parse('고영표 홈 유니폼 95')).results;assert.ok(ko.some(r=>r.p.player==='고영표'));assert.ok(ko.some(r=>r.extra?.playerId==='player:ko'));assert.ok(ko.every(r=>r.relations.some(edge=>edge.to==='고영표')));const kit=k.search(k.parse('장성우 어웨이 마킹키트'));assert.equal(kit.results.length,1);assert.equal(kit.results[0].p.id,584);assert.equal(kit.results[0].p.player,'장성우');assert.equal(k.parse('강백호 선데이 유니폼 95').supported,false);assert.ok(k.search({}).results.every(r=>r.p.id!==10));});
test('curation queries traverse tag relations without misclassifying away towels',()=>{const k=model();for(const q of ['입문자용 풀세트','원정 응원용 패키지','여름 시즌 쿨링 굿즈']){const f=k.parse(q);assert.equal(f.supported,true,q);const rs=k.search(f).results;assert.ok(rs.length>0,q);assert.ok(rs.every(r=>k.related('product:'+r.p.id,'taggedAs').some(t=>t.id===f.tag)),q);}const away=k.search(k.parse('원정 응원용 패키지')).results;assert.ok(away.some(r=>r.p.id===594));});

// --- JSON-LD 직렬화와 온톨로지 검증 -------------------------------------------
test('toJsonLd() builds a schema.org aligned document from the nodes and edges', () => {
  const k = model(), doc = k.toJsonLd(), context = doc['@context'];
  assert.equal(context['@version'], 1.1);
  for (const prefix of ['rdf', 'schema', 'wiz', 'xsd']) assert.equal(typeof context[prefix], 'string', prefix);
  assert.equal(context.wiz, 'https://yeninni.github.io/wizcovery/ontology/wiz/');
  for (const rel of ['forPlayer', 'compatibleWith', 'locatedIn', 'appliedAt', 'hasDesign', 'taggedAs', 'supports', 'hasVariant', 'hasNumber']) {
    assert.deepEqual(plain(context[rel]), { '@id': 'wiz:' + rel, '@type': '@id' }, rel);
    assert.deepEqual(context[rel].length, undefined);
  }
  assert.equal(doc['@graph'].length, k.nodes.length + 1);
  assert.equal(doc['@graph'][0]['@type'], 'wiz:OntologyGraph');
  assert.deepEqual(plain(doc['@graph'][0]['wiz:vocabulary']), { '@id': 'wiz:' });
  const nodes = doc['@graph'].slice(1), ids = new Set(nodes.map(node => node['@id']));
  assert.equal(ids.size, k.nodes.length);
  for (const node of k.nodes) {
    assert.ok(ids.has(k.toIri(node.id)), node.id);
    assert.equal(k.fromIri(k.toIri(node.id)), node.id, node.id);
  }
  // 모든 문장이 한 번씩, 출발 개체의 속성으로만 표현된다.
  const relations = Object.entries(context).filter(([, spec]) => spec && spec['@type'] === '@id').map(([name]) => name);
  let references = 0;
  for (const node of nodes) for (const name of relations) if (node[name]) references += [].concat(node[name]).length;
  assert.equal(references, k.edges.length);
  for (const edge of k.edges) {
    const source = nodes.find(node => node['@id'] === k.toIri(edge.from));
    assert.ok([].concat(source[edge.rel] || []).some(value => value['@id'] === k.toIri(edge.to)), edge.from + ' → ' + edge.to);
  }
  // 문서에 쓰인 키는 모두 @context가 정의하므로 확장했을 때 절대 IRI가 된다.
  for (const node of nodes) for (const key of Object.keys(node)) assert.ok(key.startsWith('@') || Object.hasOwn(context, key), key);
  assert.equal(JSON.stringify(k.toJsonLd()), JSON.stringify(doc));
});

test('a marking kit exports its player, zone, service and number as IRI references', () => {
  const k = model(), doc = k.toJsonLd(), entry = id => doc['@graph'].find(node => node['@id'] === k.toIri(id));
  const kit = entry('kit:choi-home');
  assert.equal(kit['@type'], 'wiz:MarkingKit');
  assert.equal(kit.name, '최원준 홈 마킹지');
  assert.equal(kit.price, 20000);
  assert.equal(kit.number, 3);
  assert.deepEqual(plain(kit.forPlayer), { '@id': k.toIri('player:choi') });
  assert.deepEqual(plain(kit.locatedIn), { '@id': k.toIri('zone:marking-sheet') });
  assert.deepEqual(plain(kit.appliedAt), { '@id': k.toIri('zone:marking-service') });
  assert.equal(k.fromIri(kit.forPlayer['@id']), 'player:choi');
  assert.equal(entry('number:player:choi').numberValue, 3);
  assert.equal(entry('product:4').category, '유니폼');
  assert.equal(entry('product:4').archived, false);
  assert.equal(entry('product:4/95')['@type'], 'wiz:SKU');
  assert.equal(entry('product:4/95').stock, 9);
  assert.deepEqual(plain(entry('player:choi').relationEvidence), { hasNumber: 'published_roster_snapshot' });
  // 마킹지가 여러 선수 분이므로 상품의 호환 관계는 값이 여럿인 배열이 된다.
  const compatible = [].concat(entry('product:4').compatibleWith);
  assert.equal(compatible.length, k.related('product:4', 'compatibleWith').length);
  assert.ok(compatible.some(reference => reference['@id'] === k.toIri('kit:choi-home')));
});

test('the embedded vocabulary stays identical to ontology/schema.jsonld', () => {
  const k = model();
  const file = path.join(__dirname, '..', 'ontology', 'schema.jsonld');
  assert.deepEqual(plain(k.vocabulary), JSON.parse(fs.readFileSync(file, 'utf8')), 'run: node tools/sync-ontology-schema.cjs');
  const classes = new Map();
  const properties = new Map();
  for (const entry of k.vocabulary['@graph']) {
    const types = [].concat(entry['@type']);
    if (types.includes('owl:Class')) classes.set(entry['@id'], entry);
    if (types.includes('owl:ObjectProperty')) properties.set(entry['@id'], entry);
  }
  for (const name of ['Product', 'Player', 'MarkingKit', 'JerseyNumber', 'Zone', 'Service', 'Design', 'CurationTag', 'SKU']) assert.ok(classes.has('wiz:' + name), name);
  const expected = {
    forPlayer: ['wiz:Product', 'wiz:Player'],
    compatibleWith: ['wiz:Product', 'wiz:MarkingKit'],
    locatedIn: ['wiz:Product', 'wiz:Zone'],
    appliedAt: ['wiz:MarkingKit', 'wiz:Service'],
    hasDesign: ['wiz:Product', 'wiz:Design'],
    taggedAs: ['wiz:Product', 'wiz:CurationTag'],
    supports: ['wiz:Product', 'wiz:Service'],
    hasVariant: ['wiz:Product', 'wiz:SKU'],
    hasNumber: ['wiz:Player', 'wiz:JerseyNumber']
  };
  for (const [name, [domain, range]] of Object.entries(expected)) {
    const entry = properties.get('wiz:' + name);
    assert.ok(entry, name);
    assert.deepEqual(plain(entry['rdfs:domain']), { '@id': domain }, name);
    assert.deepEqual(plain(entry['rdfs:range']), { '@id': range }, name);
  }
  // 마킹지는 상품의 하위 클래스이므로 forPlayer/locatedIn의 상품 도메인이 그대로 적용된다.
  assert.deepEqual(plain(classes.get('wiz:MarkingKit')['rdfs:subClassOf']), { '@id': 'wiz:Product' });
});

test('the documented graph conforms and reports its known warnings', () => {
  const k = model(), report = k.validateOntology();
  assert.equal(report.conforms, true);
  assert.deepEqual(plain(report.summary), { violations: 0, warnings: 27, info: 0 });
  assert.equal(report.counts.nodes, k.nodes.length);
  assert.equal(report.counts.edges, k.edges.length);
  assert.equal(report.counts.classes.Product, 29);
  assert.equal(report.counts.classes.MarkingKit, k.nodes.filter(node => node.type === 'MarkingKit').length);
  assert.equal(report.counts.relations.compatibleWith, 180);
  assert.equal(report.warnings.filter(result => result.code === 'KIT_WITHOUT_NUMBER').length, 26);
  assert.equal(report.warnings.filter(result => result.code === 'UNRESOLVED_PLAYER_NAME').length, 1);
  for (const result of report.results) {
    assert.ok(result.code && result.severity && result.message && result.focusNode);
    assert.ok(['violation', 'warning', 'info'].includes(result.severity));
  }
  // 검증은 그래프를 바꾸지 않고, 경고만으로는 통과를 막지 않는다.
  assert.deepEqual(plain(k.validateOntology()), plain(k.validateOntology()));
});

test('validation reports range, domain, reference and relation problems structurally', () => {
  const k = model();
  k.edges.push({ from: 'product:4', rel: 'compatibleWith', to: 'design:home' });
  k.edges.push({ from: 'player:choi', rel: 'locatedIn', to: 'zone:uniform' });
  k.edges.push({ from: 'product:4', rel: 'appliedAt', to: 'kit:missing' });
  k.edges.push({ from: 'product:4', rel: 'sponsoredBy', to: 'player:choi' });
  const report = k.validateOntology(), of = code => report.violations.filter(result => result.code === code);
  assert.equal(report.conforms, false);
  assert.equal(of('RANGE_VIOLATION').length, 1);
  assert.equal(of('RANGE_VIOLATION')[0].focusNode, 'product:4');
  assert.equal(of('RANGE_VIOLATION')[0].value, 'design:home');
  assert.match(of('RANGE_VIOLATION')[0].message, /MarkingKit/);
  assert.equal(of('DOMAIN_VIOLATION').length, 1);
  assert.equal(of('DOMAIN_VIOLATION')[0].focusNode, 'player:choi');
  assert.match(of('DOMAIN_VIOLATION')[0].message, /wiz:Product/);
  assert.equal(of('BROKEN_REFERENCE').length, 1);
  assert.equal(of('BROKEN_REFERENCE')[0].value, 'kit:missing');
  assert.equal(of('UNKNOWN_RELATION').length, 1);
  assert.equal(of('UNKNOWN_RELATION')[0].path, 'sponsoredBy');
  // 중복 문장은 경고로만 남는다.
  k.edges.push({ from: 'product:4', rel: 'compatibleWith', to: 'kit:choi-home' });
  assert.equal(k.validateOntology().warnings.filter(result => result.code === 'DUPLICATE_EDGE').length, 1);
});

test('an archived product linked to an active player contradicts the graph', () => {
  const k = model();
  k.edges.push({ from: 'product:10', rel: 'forPlayer', to: 'player:ko' });
  const direct = k.validateOntology().violations.filter(result => result.code === 'ARCHIVED_PLAYER_LINK');
  assert.equal(direct.length, 1);
  assert.equal(direct[0].focusNode, 'product:10');
  assert.equal(direct[0].value, 'player:ko');
  const throughKit = model();
  throughKit.edges.push({ from: 'product:10', rel: 'compatibleWith', to: 'kit:ko-home' });
  const kits = throughKit.validateOntology().violations.filter(result => result.code === 'ARCHIVED_PLAYER_LINK');
  assert.equal(kits.length, 1);
  assert.equal(kits[0].value, 'kit:ko-home');
  assert.match(kits[0].message, /고영표/);
});

test('kit numbers and literals are checked against the declared types', () => {
  const k = model();
  k.get('kit:choi-home').number = '9';
  k.get('product:4').source.price = '무료';
  const report = k.validateOntology();
  assert.ok(report.violations.some(result => result.code === 'KIT_NUMBER_MISMATCH' && result.focusNode === 'kit:choi-home'));
  const price = report.violations.filter(result => result.code === 'PRODUCT_PRICE_INVALID' && result.focusNode === 'product:4');
  assert.ok(price.length > 0);
  assert.match(price[0].message, /가격/);
  // 없는 상품을 가리키는 SKU는 고아로 남는다.
  k.nodes.push({ id: 'product:4:XXXL', type: 'SKU', name: 'XXXL', stock: 1 });
  assert.ok(k.validateOntology().warnings.some(result => result.code === 'ORPHAN_SKU' && result.focusNode === 'product:4:XXXL'));
});

test('the published JSON-LD file matches the graph the site serves', () => {
  const file = path.join(__dirname, '..', 'ontology', 'graph.jsonld');
  assert.ok(fs.existsSync(file), 'run: node tools/export-jsonld.cjs');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), plain(model().toJsonLd()), 'run: node tools/export-jsonld.cjs');
});
