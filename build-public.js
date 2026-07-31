'use strict';

const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'dist');
const excludedDirs=new Set(['.git','node_modules','dist','tools','legacy-medical-simulator']);
const excludedRootFiles=new Set(['package.json','package-lock.json','netlify.toml','.gitignore']);
let copied=0;
let bytes=0;

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

function shouldSkip(file,relative){
  if(!relative.includes('/')){
    if(excludedRootFiles.has(relative))return true;
    if(/\.(?:md|zip)$/i.test(relative))return true;
    if(/(?:README|MANIFEST|UPDATE_FILES|CHANGED_FILES|GPT_README)/i.test(relative)&&/\.txt$/i.test(relative))return true;
  }
  return false;
}

function copyDir(source,destination,relativeBase=''){
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    if(entry.isDirectory()&&excludedDirs.has(entry.name))continue;
    const sourcePath=path.join(source,entry.name);
    const relative=relativeBase?`${relativeBase}/${entry.name}`:entry.name;
    const destinationPath=path.join(destination,entry.name);
    if(entry.isDirectory()){
      fs.mkdirSync(destinationPath,{recursive:true});
      copyDir(sourcePath,destinationPath,relative);
    }else if(!shouldSkip(sourcePath,relative)){
      fs.copyFileSync(sourcePath,destinationPath);
      const size=fs.statSync(sourcePath).size;copied++;bytes+=size;
    }
  }
}
copyDir(root,out);

for(const required of ['index.html','_redirects','robots.txt','sitemap.xml','offline-reference-sw.js','emt-prep-module2.js']){
  if(!fs.existsSync(path.join(out,required)))throw new Error(`Build missing required file: ${required}`);
}
if(fs.existsSync(path.join(out,'legacy-medical-simulator')))throw new Error('Legacy simulator archive was copied into the deployment.');
if(fs.existsSync(path.join(out,'tools')))throw new Error('Build tools were copied into the deployment.');

console.log(`Built dist with ${copied} files (${(bytes/1024/1024).toFixed(1)} MB).`);
