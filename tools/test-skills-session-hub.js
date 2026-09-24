const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const page = read('skills-session.html');
const script = read('skills-session.js');
const mode = read('skills-session-mode.js');
const css = read('styles/skills-session.css');
const home = read('index.html');
const career = read('career.js');
const netlify = read('netlify.toml');
const narratives = JSON.parse(read('netlify/functions/data/narrative-lab-scenarios.json'));

must(page.includes('Run a BLS call in order. Think out loud. Then write it.'), 'Boot Camp hero headline is missing');
['Start Assessment Breakdown','Run a Full Call','Write the Narrative'].forEach(text => must(page.includes(text), `Hero action missing: ${text}`));
must((page.match(/class="assessment-card"/g) || []).length === 8, 'Boot Camp must contain eight assessment-section cards');
['Scene size-up','General impression','Initial / primary assessment','History','Secondary / focused exam','Vital signs','Treatment and reassessment','Handoff and documentation'].forEach((text, index) => {
  must(page.includes(text), `Assessment section ${index + 1} missing: ${text}`);
});
must((page.match(/<strong>Say this<\/strong>/g) || []).length === 8, 'Every assessment section needs a Say this prompt');
must((page.match(/<strong>Think this<\/strong>/g) || []).length === 8, 'Every assessment section needs a Think this prompt');
must((page.match(/Common critical error/g) || []).length === 8, 'Every assessment section needs a common critical error');
must((page.match(/Mark section practiced today/g) || []).length === 8, 'Every assessment section needs local practice tracking');

must(page.includes('Initial Assessment Video Lab') && page.includes('<video controls'), 'Initial Assessment Video Lab player shelf is missing');
must((page.match(/data-video-check=/g) || []).length === 7, 'Video Lab needs seven timed checklist items');
must((page.match(/data-video-answer=/g) || []).length === 5, 'Video Lab needs five decision questions');
must(page.includes('Additional assessment video shelf') && page.includes('Add an instructor-approved video URL or file later'), 'Future video structure is missing');

['/vitals/full-vitals-set.html','/vitals/bp.html','/vitals/pulse.html','/vitals/respiratory-rate.html','/vitals/pulse-ox.html','/vitals/bgl.html','/vitals/skin.html','/vitals/pupil.html','/vitals/avpu.html','/vitals/breath-sound-simulator.html'].forEach(url => must(page.includes(url), `Vitals wiring missing: ${url}`));
must(page.includes('case=horse_crush&amp;training=learning') && page.includes('case=horse_crush&amp;training=assessment'), 'Horse-crush Learning/Assessment links are missing');
must(page.includes('case=asthma&amp;training=learning') && page.includes('case=asthma&amp;training=assessment'), 'Asthma Learning/Assessment links are missing');
must((page.match(/data-debrief=/g) || []).length === 2 && (page.match(/data-question=/g) || []).length === 12, 'Both calls need six-question thinking debriefs');
must(page.includes('scenario=horse-crush') && page.includes('scenario=shortness-of-breath'), 'Narrative Lab links must retain the same cases');
must(page.includes('PCR Narrative Coach') && page.includes('AI Narrative Writing Lab'), 'Both existing narrative tools must remain wired');
must(page.includes('not affiliated with NREMT') && page.includes('does not award certification or determine pass/fail status'), 'Practice disclaimer is incomplete');
must(page.includes('not a lecture deck') && page.includes('Suggested total: 90 minutes'), 'Host notes must stay small and self-paced');

must(script.includes("mode', 'bootcamp") && script.includes('stationAliases'), 'Boot Camp deep-link and station-alias logic is missing');
must(script.includes("['assessment','vitals','initial','trauma','medical','narrative','final']"), 'Required path deep links are incomplete');
must(script.includes("emscodesim_bls_bootcamp_sections_v1") && script.includes('localStorage'), 'Local section progress is missing');
must(script.includes('every(field => field.value.trim().length >= 3)') && script.includes('data-unlock'), 'Thinking debrief must gate later steps');
must(css.includes('.assessment-card') && css.includes('@media(max-width:820px)') && css.includes('.vertical-stepper'), 'Mobile accordion or vertical stepper styling is missing');
must(mode.includes("params.get('mode') === 'bootcamp'") && mode.includes('bootcampMode'), 'Back bar must support Boot Camp and embedded tools');
must(mode.includes('Back to ${bootcamp ? \'BLS Boot Camp\''), 'Boot Camp back-bar label is missing');

must(page.includes('data-bootcamp-interact=') && page.includes('bootcamp-interact.js'), 'Interactive Boot Camp mounts/scripts are missing');
must(page.includes('id="final-challenge"') && page.includes('data-bootcamp-interact="final-challenge"'), 'Final Boot Camp Challenge section is missing');
must(page.includes('id="interactProgress"') && page.includes('bootcamp-roadmap'), 'Interactive progress roadmap is missing');
['scene-quickcheck','impression-decision','primary-life-threat','history-trainer','vitals-trainer','treatment-skill','handoff-radio','mini-respiratory'].forEach(id => {
  must(page.includes(`data-bootcamp-interact="${id}"`), `Interactive mount missing: ${id}`);
});
must(fs.existsSync(path.join(root, 'scripts/bootcamp-interact.js')) && fs.existsSync(path.join(root, 'scripts/bootcamp-interact-data.js')), 'Boot Camp interact scripts are missing from /scripts');
must(fs.existsSync(path.join(root, 'styles/bootcamp-interact.css')), 'Boot Camp interact stylesheet is missing');
const interact = read('scripts/bootcamp-interact.js');
const interactData = read('scripts/bootcamp-interact-data.js');
must(interact.includes('quickCheck') && interact.includes('finalChallenge') && interact.includes('emscodesim_bls_bootcamp_interact_v1'), 'Interact engine is incomplete');
must(interactData.includes('scene-quickcheck') && interactData.includes('final-challenge') && interactData.includes('Follow local protocols'), 'Interact content/data safety notes are incomplete');

must(netlify.includes('from = "/bls-bootcamp"') && netlify.includes('to = "/skills-session"'), '/bls-bootcamp alias is missing');
must(home.includes('<span>BLS Boot Camp</span><strong>Assessment, vitals, full call, narrative →</strong>'), 'Homepage Boot Camp card copy is missing');
must(home.includes('<strong>BLS Boot Camp</strong><small>Assessment sections, vitals, full calls, and narrative</small>'), 'Homepage desktop navigation label is missing');
must(career.includes("new Option('BLS Boot Camp'"), 'Shared mobile navigation label is missing');

must(narratives.some(item => item.id === 'horse-crush'), 'Horse-crush case is not available to the AI Narrative Lab');
const asthma = narratives.find(item => item.id === 'shortness-of-breath');
must(asthma && /park/i.test(`${asthma.dispatch} ${asthma.scene}`), 'Asthma narrative case must match the park scenario');

const linkedPages = ['abc-training.html','nremt-skill-sheets.html','pcr-narrative-coach.html','narrative-writing-lab.html','quiz/emt_practice_exam.html','vitals/full-vitals-set.html','vitals/bp.html','vitals/pulse.html','vitals/respiratory-rate.html','vitals/pulse-ox.html','vitals/bgl.html','vitals/skin.html','vitals/pupil.html','vitals/avpu.html','vitals/gcs.html','vitals/visual-airway-assessment.html','vitals/breathing-assessment.html','vitals/perfusion-assessment.html','vitals/sample-history.html','vitals/pain-opqrst.html','vitals/visual-trauma-body-exam.html','vitals/breath-sound-simulator.html','vitals/treatment-reassessment.html','vitals/scenario-launcher.html','vitals/visual-patient.html'];
linkedPages.forEach(file => must(read(file).includes('skills-session-mode.js?v=2'), `${file} is missing the Boot Camp return-bar script`));

console.log('BLS Boot Camp verified: eight assessment sections, interactive drills, video decisions, vitals wiring, two gated full calls, final challenge, same-case narratives, deep-link aliases, mobile states, and disclaimers are present.');
