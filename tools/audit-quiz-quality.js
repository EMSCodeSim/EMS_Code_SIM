#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const banks=['emt_quiz.json','paramedic_quiz.json'];
let issues=0;
for(const file of banks){
 const questions=JSON.parse(fs.readFileSync(path.join(__dirname,'..','quiz',file),'utf8'));
 const seen=new Set();
 const answerPositionCounts=[0,0,0,0];
 const warnings=[];
 questions.forEach((q,i)=>{
  const label=file+':'+(i+1);
  const choices=q.choices||q.options;
  if(!q.question||!Array.isArray(choices)||choices.length!==4||new Set(choices).size!==4||!choices.includes(q.answer)||!q.reason?.trim()){console.error('ERROR '+label+' invalid question/answer/choices/rationale');issues++}
  if(Array.isArray(choices)) { const answerIndex=choices.indexOf(q.answer); if(answerIndex>=0&&answerIndex<4) answerPositionCounts[answerIndex]++; }
  const normalized=(q.question||'').trim().toLowerCase();
  if(seen.has(normalized))warnings.push(label+' duplicate stem');
  seen.add(normalized);
  if(/^(what|which|who|where|define|name)\b/i.test(q.question||'')&&!/patient|present|scene|following|next|first|priority|most|best/i.test(q.question||''))warnings.push(label+' recall-only stem; consider scenario');
  if(/^(Follow ABCs and resuscitation priorities|Identify the reversible cause, protect the airway|Airway and breathing threats take priority|Identify life threats early, control hemorrhage|Follow legal, ethical, and system priorities)/.test(q.reason||''))warnings.push(label+' generic rationale');
  if((q.choices||[]).some(c=>/^(do nothing|ignore|leave immediately|call police|kidney|liver|stomach|digestive system)$/i.test(c)))warnings.push(label+' potentially implausible distractor');
 });
 console.log(file+': '+questions.length+' questions, '+warnings.length+' review flags; answer positions '+answerPositionCounts.join('/'));
 warnings.forEach(w=>console.log('REVIEW '+w));
}
if(issues)process.exitCode=1;
