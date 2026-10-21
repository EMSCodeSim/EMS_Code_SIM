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
function artwork(topic){
 const shape=designs[topic];if(!shape)return '';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="'+topic.replace(/&/g,'&amp;')+' themed illustration" fill="none" stroke="#6bd3ed" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">'+shape+'</svg>';
 return '<div class="clinical-art" aria-label="Topic illustration"><div class="clinical-art-icon">'+svg+'</div><div><strong>'+topic.replace(/&/g,'&amp;')+'</strong><small>Topic illustration · not a patient finding</small></div></div>';
}
window.EMSCodeSimClinicalArt={artwork};
})();