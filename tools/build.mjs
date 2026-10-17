import { mkdir, rm, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'dist/site'); await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const copied=[];
async function copy(path){
 const target=resolve(out,path);await mkdir(dirname(target),{recursive:true});await copyFile(resolve(root,path),target);copied.push(path);
}
async function tree(dir){
 for(const item of await readdir(resolve(root,dir),{withFileTypes:true})){
  if(item.isSymbolicLink()||item.name.startsWith('.'))continue;
  const path=dir+'/'+item.name;if(item.isDirectory())await tree(path);
  else if(/\.(html|css|js|json|svg|png|jpe?g|webp|ico|woff2?)$/.test(item.name))await copy(path);
 }
}
for(const file of ['index.html','site.js','style.css','_headers','robots.txt','sitemap.xml'])await copy(file);
for(const dir of ['agents','app','assets','blog','data','login','offers','post','profile','studio'])await tree(dir);
// Engineering plans and evidence live in docs/ too. Only the pre-existing public guide is published.
await copy('docs/index.html');
// Exactly one reviewed, fictional public sample. No customer inputs or operations ledgers are published.
const sample=JSON.parse(await readFile(resolve(root,'operations/data/pilot-sample.json'),'utf8'));
if(sample.fictional!==true||sample.status!=='DRAFT_ONLY'||sample.assets.length!==12||sample.assets.some(asset=>asset.status!=='DRAFT_ONLY'||asset.publication_receipt!==null))throw new Error('Public sample must remain fictional and unpublished');
await writeFile(resolve(out,'offers/sample/data.json'),JSON.stringify(sample,null,2)+'\n');copied.push('offers/sample/data.json');
await mkdir(resolve(root,'.local'),{recursive:true});
await writeFile(resolve(root,'.local/site-manifest.json'),JSON.stringify({files:copied.sort()},null,2)+'\n');
console.log(`Built ${copied.length} curated public files in dist/site. No workers, plans, secrets or database files.`);
