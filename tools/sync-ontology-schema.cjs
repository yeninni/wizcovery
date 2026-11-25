// Run after editing ontology/schema.jsonld: node tools/sync-ontology-schema.cjs
// ontology.js는 브라우저에서 바로 실행되는 일반 스크립트라 어휘를 파일로 읽지 않고 내장한다.
// 이 도구가 schema.jsonld의 사본을 SCHEMA:START / SCHEMA:END 사이에 다시 써 넣는다.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const schema=JSON.parse(fs.readFileSync(path.join(root,'ontology','schema.jsonld'),'utf8'));
const file=path.join(root,'ontology.js');
const source=fs.readFileSync(file,'utf8');
const start='  // SCHEMA:START',end='  // SCHEMA:END';
const head=source.indexOf(start),tail=source.indexOf(end);
if(head<0||tail<0||tail<head)throw new Error('SCHEMA:START / SCHEMA:END markers not found in ontology.js');
const body=JSON.stringify(schema,null,2).split('\n').join('\n  ');
const block=start+'\n  const SCHEMA='+body+';\n';
fs.writeFileSync(file,source.slice(0,head)+block+source.slice(tail));
console.log('Synced ontology/schema.jsonld into ontology.js ('
  +schema['@graph'].filter(entry=>[].concat(entry['@type']).includes('owl:Class')).length+' classes, '
  +schema['@graph'].filter(entry=>[].concat(entry['@type']).includes('owl:ObjectProperty')).length+' object properties, '
  +schema['@graph'].filter(entry=>[].concat(entry['@type']).includes('sh:NodeShape')).length+' shapes)');
