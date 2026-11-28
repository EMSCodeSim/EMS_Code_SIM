'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hub=read('roadmap/index.html');
const ids=new Set([...hub.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const tiles=[...hub.matchAll(/<a class="tile"[^>]*href="#([^"]+)"/g)].map(m=>m[1]);
assert.equal(tiles.length,6);
assert.equal(new Set(tiles).size,6);
for(const id of tiles)assert(ids.has(id),'Missing category '+id);
for(const [,href] of hub.matchAll(/href="([^"]+)"/g)){
 if(href.startsWith('#'))assert(ids.has(href.slice(1)),'Missing anchor '+href);
 if(!href.startsWith('/'))continue;
 const p=path.join(root,href.split(/[?#]/)[0]);
 assert([p,p+'.html',path.join(p,'index.html')].some(x=>fs.existsSync(x)&&fs.statSync(x).isFile()),'Missing hub resource '+href);
}
for(const file of ['quiz/emt_quiz.json','quiz/paramedic_quiz.json']){
 const bank=JSON.parse(read(file)),seen=new Set();
 assert(bank.length>=30,file+' too few questions');
 for(const q of bank){
 assert(typeof q.question==='string'&&q.question.trim(),file+' missing stem');
 const key=q.question.trim().toLowerCase().replace(/\s+/g,' ');
 assert(!seen.has(key),'Duplicate '+key);seen.add(key);
 assert(Array.isArray(q.choices)&&q.choices.length===4,'Expected four choices: '+key);
 assert(q.choices.every(c=>typeof c==='string'&&c.trim()),'Empty choice: '+key);
 assert.equal(new Set(q.choices.map(c=>c.trim().toLowerCase())).size,4,'Duplicate choice: '+key);
 assert(q.choices.includes(q.answer),'Invalid answer: '+key);
 assert(typeof q.reason==='string'&&q.reason.trim().length>=20,'Missing rationale: '+key);
 }
 console.log(file+': '+bank.length+' structurally valid questions');
}
console.log('Training hub anchors and local resource paths verified. Structural checks do not establish clinical accuracy.');
