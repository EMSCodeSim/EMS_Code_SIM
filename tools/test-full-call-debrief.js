
'use strict';
const assert=require('assert');const fs=require('fs');
const js=fs.readFileSync('vitals/scenario-debrief.js','utf8');const html=fs.readFileSync('vitals/scenario-debrief.html','utf8');
['criticalErrors','coachingPriorities','categoryScores','EMSCodeSimDebriefEngine'].forEach(x=>assert(js.includes(x),`Debrief engine missing ${x}`));
['criticalSection','criticalList','priorityList','categoryScores'].forEach(x=>assert(html.includes(x),`Debrief interface missing ${x}`));
assert(js.includes("['contraindicated','unsafe']"),'Unsafe treatments must be surfaced as critical errors.');
assert(js.includes("clinical*.45+treatment*.35+communication*.20"),'Weighted clinical score is missing.');
console.log('Full-call debrief test passed: weighted categories, critical errors, and prioritized coaching are present.');
