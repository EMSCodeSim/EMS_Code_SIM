(()=>{
  'use strict';
  const ACTIVE_KEY='emscodesim_active_patient_record';
  const RECORD_PREFIX='emscodesim_patient_record_';
  const emptyRecord=(scenario={})=>({
    version:1,
    id:scenario.id||`patient-${Date.now()}`,
    scenarioId:scenario.id||'',
    title:scenario.title||'Practice Patient',
    patient:scenario.patient||'',
    dispatch:scenario.dispatch||'',
    scene:scenario.scene||'',
    goal:scenario.goal||'',
    profile:scenario.profile||null,
    startedAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    findings:{},
    history:{},
    treatments:[],
    reassessments:[],
    impressions:{primary:'',differentials:[],supporting:[]},
    documentation:{narrative:'',handoff:''}
  });
  const key=id=>`${RECORD_PREFIX}${id}`;
  function load(id){
    try{return JSON.parse(localStorage.getItem(key(id||activeId())))||null}catch{return null}
  }
  function save(record){
    if(!record||!record.id) throw new Error('Patient record requires an id.');
    record.updatedAt=new Date().toISOString();
    localStorage.setItem(key(record.id),JSON.stringify(record));
    localStorage.setItem(ACTIVE_KEY,record.id);
    window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated',{detail:record}));
    return record;
  }
  function activeId(){return localStorage.getItem(ACTIVE_KEY)||''}
  function active(){return load(activeId())}
  function create(scenario){return save(emptyRecord(scenario))}
  function ensure(scenario){
    const current=active();
    if(current&&(!scenario||!scenario.id||current.scenarioId===scenario.id)) return current;
    return create(scenario||{});
  }
  function update(mutator){
    const record=active();
    if(!record) throw new Error('No active patient record.');
    const next=typeof mutator==='function'?(mutator(structuredClone(record))||record):{...record,...mutator};
    return save(next);
  }
  function setFinding(category,value,meta={}){
    return update(r=>{r.findings[category]={value,...meta,recordedAt:new Date().toISOString()};return r});
  }
  function setHistory(category,value){return update(r=>{r.history[category]=value;return r})}
  function addTreatment(treatment){return update(r=>{r.treatments.push({...treatment,time:new Date().toISOString()});return r})}
  function addReassessment(entry){return update(r=>{r.reassessments.push({...entry,time:new Date().toISOString()});return r})}
  function setImpressions(impressions){return update(r=>{r.impressions={...r.impressions,...impressions};return r})}
  function setDocumentation(documentation){return update(r=>{r.documentation={...r.documentation,...documentation};return r})}
  function clear(){const id=activeId();if(id)localStorage.removeItem(key(id));localStorage.removeItem(ACTIVE_KEY)}
  function exportJson(){const record=active();return record?JSON.stringify(record,null,2):''}
  window.EMSCodeSimPatientRecord={create,ensure,active,activeId,load,save,update,setFinding,setHistory,addTreatment,addReassessment,setImpressions,setDocumentation,clear,exportJson};
})();
