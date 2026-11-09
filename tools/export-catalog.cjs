// Run after changing catalog.js: node tools/export-catalog.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'catalog.js'),'utf8'),context);
const data=JSON.parse(vm.runInContext('JSON.stringify(products)',context));
fs.writeFileSync(path.join(root,'backend','catalog.json'),JSON.stringify(data,null,2)+'\n');
console.log(`Exported ${data.length} demo products to backend/catalog.json`);
