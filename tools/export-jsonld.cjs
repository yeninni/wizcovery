// Run after changing catalog.js or ontology.js: node tools/export-jsonld.cjs
// Writes the JSON-LD graph document that ontology.js serializes to a static file,
// so the vocabulary and the data graph can be read without running the site.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');const context=vm.createContext({});
for(const file of ['player-roster.js','catalog.js','ontology.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const graph=vm.runInContext('WizKnowledge.toJsonLd()',context);
const report=vm.runInContext('WizKnowledge.validateOntology()',context);
fs.writeFileSync(path.join(root,'ontology','graph.jsonld'),JSON.stringify(graph,null,2)+'\n');
console.log(`Exported ${graph['@graph'].length-1} nodes to ontology/graph.jsonld `
  +`(verification: ${report.summary.violations} violations, ${report.summary.warnings} warnings)`);
