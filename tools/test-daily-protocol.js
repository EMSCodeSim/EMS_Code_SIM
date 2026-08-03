'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/protocol-drills.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'daily-protocol.html'),'utf8');
const js=fs.readFileSync(path.join(root,'daily-protocol.js'),'utf8');
const errors=[];
if(!Array.isArray(data.packages)||!data.packages.length)errors.push('At least one protocol package is required.');
if(!Array.isArray(data.drills)||data.drills.length<6)errors.push('At least six demonstration drills are required.');
const packageIds=new Set(data.packages.map(item=>item.id));
const drillIds=new Set();
for(const drill of data.drills){
  if(!drill.id||drillIds.has(drill.id))errors.push(`Missing or duplicate drill id: ${drill.id}`);drillIds.add(drill.id);
  if(!packageIds.has(drill.packId))errors.push(`${drill.id}: unknown package ${drill.packId}`);
  if(!Array.isArray(drill.levels)||!drill.levels.length)errors.push(`${drill.id}: missing levels`);
  if(!drill.review||!drill.scenario||!drill.summary)errors.push(`${drill.id}: incomplete workflow`);
  if(!Array.isArray(drill.questions)||drill.questions.length<3)errors.push(`${drill.id}: expected at least three questions`);
  if(!Array.isArray(drill.scenario?.choices)||!drill.scenario.choices.some(choice=>choice.correct))errors.push(`${drill.id}: no correct scenario choice`);
  for(const question of drill.questions||[]){if(!Array.isArray(question.options)||question.answer<0||question.answer>=question.options.length)errors.push(`${drill.id}: invalid question answer`);}
}
for(const required of ['/styles/daily-protocol.css','/daily-protocol.js','/data/protocol-pack-template.json'])if(!html.includes(required))errors.push(`HTML missing ${required}`);
for(const marker of ['emscodesimDailyProtocolV1','importPack','currentStreak','gradeQuestions'])if(!js.includes(marker))errors.push(`JavaScript missing ${marker}`);
if(errors.length){console.error('Daily protocol validation failed:\n- '+errors.join('\n- '));process.exit(1);}
console.log(`Daily protocol validation passed: ${data.packages.length} package and ${data.drills.length} drills.`);
