'use strict';

const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..');
const ignoredDirs=new Set(['.git','node_modules','dist','legacy-medical-simulator']);
const errors=[];
const warnings=[];
const files=[];

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()&&ignoredDirs.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);else files.push(full);
  }
}
walk(root);

function rel(file){return path.relative(root,file).split(path.sep).join('/');}
function existsAsSiteTarget(target){
  const clean=target.split('#')[0].split('?')[0];
  if(!clean)return true;
  let full;
  if(clean.startsWith('/'))full=path.join(root,clean.replace(/^\/+/,''));
  else return false;
  const candidates=[full];
  if(clean==='/'||clean.endsWith('/'))candidates.push(path.join(full,'index.html'));
  if(!path.extname(full))candidates.push(full+'.html',path.join(full,'index.html'));
  return candidates.some(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile());
}
function resolveRelativeTarget(htmlFile,target){
  const clean=target.split('#')[0].split('?')[0];
  if(!clean)return true;
  if(clean.startsWith('/'))return existsAsSiteTarget(clean);
  const full=path.resolve(path.dirname(htmlFile),clean);
  const candidates=[full];
  if(clean.endsWith('/'))candidates.push(path.join(full,'index.html'));
  if(!path.extname(full))candidates.push(full+'.html',path.join(full,'index.html'));
  return candidates.some(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile());
}
function shouldIgnoreTarget(target){
  return !target||target.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|javascript:|blob:|about:)/i.test(target)||target.includes('${')||target.includes('{{');
}

// JSON and web manifest validation.
for(const file of files.filter(file=>/\.(?:json|webmanifest)$/i.test(file))){
  try{JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){errors.push(`${rel(file)}: invalid JSON (${error.message})`);}
}

// JavaScript syntax validation.
for(const file of files.filter(file=>/\.js$/i.test(file))){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)errors.push(`${rel(file)}: JavaScript syntax error\n${(result.stderr||result.stdout).trim()}`);
}

// Internal HTML references.
const htmlFiles=files.filter(file=>/\.html?$/i.test(file));
for(const file of htmlFiles){
  const text=fs.readFileSync(file,'utf8');
  const attrPattern=/(?:^|[\s<])(?:href|src|poster|action)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while((match=attrPattern.exec(text))){
    const target=match[1].trim();
    if(shouldIgnoreTarget(target))continue;
    if(target.startsWith('/api/')||target.startsWith('/.netlify/'))continue;
    const ok=target.startsWith('/')?existsAsSiteTarget(target):resolveRelativeTarget(file,target);
    if(!ok)errors.push(`${rel(file)}: missing internal target ${target}`);
  }
  const srcsetPattern=/srcset\s*=\s*["']([^"']+)["']/gi;
  while((match=srcsetPattern.exec(text))){
    for(const item of match[1].split(',')){
      const target=item.trim().split(/\s+/)[0];
      if(shouldIgnoreTarget(target))continue;
      const ok=target.startsWith('/')?existsAsSiteTarget(target):resolveRelativeTarget(file,target);
      if(!ok)errors.push(`${rel(file)}: missing srcset target ${target}`);
    }
  }
  if(file.endsWith('emt-prep/module-2-emt-school-expectations.html')){
    const activities=(text.match(/data-module2-activity=/g)||[]).length;
    if(activities!==7)errors.push(`${rel(file)}: expected 7 Module 2 activities, found ${activities}`);
    if(!text.includes('/emt-prep-module2.js'))errors.push(`${rel(file)}: Module 2 renderer script is not included`);
  }
  if(file!==path.join(root,'med_sim.html')&&text.includes('/med_sim.html'))errors.push(`${rel(file)}: legacy medical simulator is still publicly linked`);
}

// Required offline application shell.
for(const required of [
  'offline-ems-reference.html','offline-ems-reference.js','offline-reference-sw.js',
  'offline-reference.webmanifest','data/ems-reference-pack.json',
  'icons/ems-reference-192.png','icons/ems-reference-512.png'
]){
  if(!fs.existsSync(path.join(root,required)))errors.push(`Missing offline pack asset: ${required}`);
}

// Sitemap targets should exist locally.
const sitemap=path.join(root,'sitemap.xml');
if(fs.existsSync(sitemap)){
  const text=fs.readFileSync(sitemap,'utf8');
  const urls=[...text.matchAll(/<loc>https:\/\/emscodesim\.com([^<]*)<\/loc>/g)].map(match=>match[1]||'/');
  for(const url of urls){if(!existsAsSiteTarget(url))errors.push(`sitemap.xml: missing target ${url}`);}
  if(urls.includes('/med_sim.html'))errors.push('sitemap.xml: legacy medical simulator must not be indexed');
}

// Active serverless functions should not expose the retired AI endpoint.
if(fs.existsSync(path.join(root,'netlify/functions/gpt4-turbo.js')))errors.push('Retired GPT endpoint is still in the active Netlify functions directory');

const uniqueErrors=[...new Set(errors)];
const uniqueWarnings=[...new Set(warnings)];
console.log(`Validated ${htmlFiles.length} HTML files, ${files.filter(file=>/\.js$/i.test(file)).length} JavaScript files, and ${files.filter(file=>/\.(?:json|webmanifest)$/i.test(file)).length} JSON/manifest files.`);
if(uniqueWarnings.length){console.log('\nWarnings:');uniqueWarnings.forEach(item=>console.log(`- ${item}`));}
if(uniqueErrors.length){console.error('\nValidation failed:');uniqueErrors.forEach(item=>console.error(`- ${item}`));process.exit(1);}
console.log('Validation passed: no broken internal references, invalid data files, JavaScript syntax errors, or exposed legacy simulator links were found.');
