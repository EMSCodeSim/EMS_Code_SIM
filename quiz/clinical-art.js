(function(){
'use strict';
// Decorative domain artwork, not a diagnostic tracing or clinical finding.
const designs={
 'Airway, Respiration & Ventilation': '<path d="M100 22v60m0 0-35 22m35-22 35 22"/><path d="M65 104c-28-24-49 5-47 36 1 26 22 38 47 29V104Zm70 0c28-24 49 5 47 36-1 26-22 38-47 29V104Z"/><path d="M100 82v58" stroke-dasharray="4 8"/>',
 'Cardiology & Resuscitation':'<path d="M100 172 36 112C-8 64 49 21 100 68c51-47 108-4 64 44Z"/><path d="M22 117h39l15-23 18 49 17-33 12 7h55"/>',
 'Trauma':'<path d="M100 18 162 42v58c0 39-26 62-62 82-36-20-62-43-62-82V42Z"/><path d="M100 59v80M60 99h80"/>',
 'Medical Emergencies':'<rect x="35" y="44" width="130" height="113" rx="17"/><path d="M100 66v68M66 100h68"/><path d="M67 44V27h66v17"/>',
 'Obstetrics & Gynecology':'<circle cx="100" cy="54" r="23"/><path d="M53 168c-4-53 9-82 47-82s51 29 47 82"/><path d="M77 139c14-20 32-20 46 0"/>',
 'EMS Operations':'<rect x="24" y="59" width="152" height="92" rx="15"/><path d="M51 59V43h98v16M100 79v52M75 105h50"/><circle cx="54" cy="152" r="11"/><circle cx="146" cy="152" r="11"/>'
};

function caseVisual(question){
 const q=String(question||'').toLowerCase();
 let label='',detail='',drawing='';
 if((q.includes('missed treatment')&&q.includes('qrs widening')) || q.includes('ecg finding is most indicative of hyperkalemia')){
  label='ECG pattern interpretation';detail='Schematic tracing showing tall, narrow T waves and widened QRS complexes. Not a calibrated ECG.';
  drawing='<path d="M8 100h25l9-5 7 5 13-3 8-28 12 54 12-23 10 0 14-51 15 51h19l9-6 8 6 12-3 8-27 12 53 12-23 10 0 14-51 15 51h12" fill="none" stroke="#1b96a9" stroke-width="4" stroke-linejoin="round"/>';
 }else if(q.includes('paradoxical chest wall movement') || (q.includes('paradoxical movement')&&q.includes('chest'))){
  label='Chest wall movement';detail='Simplified chest wall diagram highlighting an unstable segment. Not an assessment substitute.';
  drawing='<path d="M70 15Q46 25 45 53L31 151Q100 182 169 151L155 53Q154 25 130 15" fill="none" stroke="#4785bb" stroke-width="5"/><path d="M100 18v143M47 64Q100 92 153 64M40 93Q100 120 160 93M35 123Q100 148 165 123" fill="none" stroke="#8fb1d0" stroke-width="4"/><path d="M115 79l35-8 8 38-35 8z" fill="#f4b6a0" stroke="#c35c45" stroke-width="4"/><path d="M139 58v-20m0 0-8 8m8-8 8 8" stroke="#c35c45" stroke-width="4" fill="none"/>';
 }else if(q.includes('circumferential chest burns')){
  label='Chest burn distribution';detail='Simplified illustration of circumferential torso involvement, not a clinical photograph.';
  drawing='<path d="M65 20Q45 28 44 57L30 160Q100 179 170 160L156 57Q155 28 135 20" fill="#e7f1f8" stroke="#4785bb" stroke-width="5"/><path d="M45 78Q100 58 155 78L166 143Q100 160 34 143Z" fill="#f2b0a2" stroke="#c65f4b" stroke-width="4"/><path d="M45 90Q100 71 156 90M38 125Q100 143 162 125" fill="none" stroke="#c65f4b" stroke-width="3" stroke-dasharray="7 5"/>';
 }
 if(!drawing)return '';
 const safeLabel=label.replace(/&/g,'&amp;');
 return '<figure class="case-visual"><figcaption><strong>'+safeLabel+'</strong><span>'+detail+'</span></figcaption><svg viewBox="0 0 240 200" role="img" aria-label="'+safeLabel+' schematic">'+drawing+'</svg></figure>';
}
function artwork(topic,question){
 const mapped={'Cardiovascular':'Cardiology & Resuscitation','Patient Assessment':'EMS Operations'}[topic] || topic;
 const specific=caseVisual(question);if(specific)return specific;
 const shape=designs[mapped];if(!shape)return '';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="'+topic.replace(/&/g,'&amp;')+' themed illustration" fill="none" stroke="#6bd3ed" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">'+shape+'</svg>';
 return '<div class="clinical-art" aria-label="Topic illustration"><div class="clinical-art-icon">'+svg+'</div><div><strong>'+topic.replace(/&/g,'&amp;')+'</strong><small>Topic illustration · not a patient finding</small></div></div>';
}
window.EMSCodeSimClinicalArt={artwork};
})();