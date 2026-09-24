const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const engine = read('scripts/bootcamp-interact.js');
const data = read('scripts/bootcamp-interact-data.js');
const css = read('styles/bootcamp-interact.css');
const page = read('skills-session.html');

const types = ['quickCheck','clinicalDecision','assessmentChallenge','fieldTip','commonMistake','whyItMatters','vitalsTrainer','spotProblem','historyTrainer','skillWalkthrough','radioReport','lessonChallenge','miniScenario','finalChallenge'];
types.forEach(type => must(engine.includes(type), `Renderer missing for ${type}`));

must(engine.includes("STORAGE_KEY = 'emscodesim_bls_bootcamp_interact_v1'"), 'Interact progress storage key missing');
must(engine.includes('[data-bootcamp-interact]') && engine.includes('markComplete'), 'Mount/complete wiring missing');
must(css.includes('.bci-widget') && css.includes('@media(max-width:820px)'), 'Interact CSS/mobile rules missing');
must(data.includes('local protocols') && data.includes('medical direction'), 'Clinical safety language missing from content');
must(!/epinephrine\s+\d+\s*mg|give\s+\d+\s*mg of/i.test(data), 'Avoid hard-coded medication dosing statements in Boot Camp interact content');

const mounts = [...page.matchAll(/data-bootcamp-interact="([^"]+)"/g)].map(m => m[1]);
must(mounts.length >= 15, `Expected many interact mounts, found ${mounts.length}`);
mounts.forEach(id => must(data.includes(`'${id}'`) || data.includes(`"${id}"`), `Data missing for mount ${id}`));

console.log(`Boot Camp interact components verified: ${types.length} renderers, ${mounts.length} page mounts, progress key, and safety notes present.`);
