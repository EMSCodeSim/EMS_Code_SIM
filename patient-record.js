(()=>{
  'use strict';
  const ACTIVE_KEY='emscodesim_active_patient_record';
  const RECORD_PREFIX='emscodesim_patient_record_';
  const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  const emptyRecord=(scenario={})=>({
    version:2,
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
    findingHistory:[],
    history:{},
    treatments:[],
    reassessments:[],
    impressions:{primary:'',differentials:[],supporting:[]},
    documentation:{narrative:'',handoff:''}
  });
  const key=id=>`${RECORD_PREFIX}${id}`;
  function normalize(record){
    if(!record)return null;
    record.version=Math.max(2,Number(record.version)||1);
    record.findings=record.findings||{};
    record.findingHistory=Array.isArray(record.findingHistory)?record.findingHistory:[];
    record.history=record.history||{};
    record.treatments=Array.isArray(record.treatments)?record.treatments:[];
    record.reassessments=Array.isArray(record.reassessments)?record.reassessments:[];
    record.impressions=record.impressions||{primary:'',differentials:[],supporting:[]};
    record.documentation=record.documentation||{narrative:'',handoff:''};
    return record;
  }
  function load(id){
    try{return normalize(JSON.parse(localStorage.getItem(key(id||activeId())))||null)}catch{return null}
  }
  function save(record){
    if(!record||!record.id) throw new Error('Patient record requires an id.');
    normalize(record);
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
    const working=clone(record);
    const next=typeof mutator==='function'?(mutator(working)||working):{...working,...mutator};
    return save(next);
  }
  function setFinding(category,value,meta={}){
    return update(record=>{
      const now=new Date().toISOString();
      const previous=record.findings[category];
      if(previous){
        record.findingHistory.push({category,...previous,replacedAt:now});
        record.findingHistory=record.findingHistory.slice(-100);
      }
      record.findings[category]={value,...meta,recordedAt:meta.recordedAt||now,updatedAt:now};
      return record;
    });
  }
  function removeFinding(category){
    return update(record=>{
      const previous=record.findings[category];
      if(previous){
        record.findingHistory.push({category,...previous,removed:true,replacedAt:new Date().toISOString()});
        record.findingHistory=record.findingHistory.slice(-100);
        delete record.findings[category];
      }
      return record;
    });
  }
  function restoreFinding(historyIndex){
    return update(record=>{
      const item=record.findingHistory[historyIndex];
      if(!item)return record;
      const {category,replacedAt,removed,...finding}=item;
      const current=record.findings[category];
      if(current)record.findingHistory.push({category,...current,replacedAt:new Date().toISOString()});
      record.findings[category]={...finding,recordedAt:finding.recordedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      record.findingHistory.splice(historyIndex,1);
      return record;
    });
  }
  function setHistory(category,value){return update(r=>{r.history[category]=value;return r})}
  function addTreatment(treatment){return update(r=>{r.treatments.push({...treatment,time:new Date().toISOString()});return r})}
  function addReassessment(entry){return update(r=>{r.reassessments.push({...entry,time:new Date().toISOString()});return r})}
  function setImpressions(impressions){return update(r=>{r.impressions={...r.impressions,...impressions};return r})}
  function setDocumentation(documentation){return update(r=>{r.documentation={...r.documentation,...documentation};return r})}
  function clear(){const id=activeId();if(id)localStorage.removeItem(key(id));localStorage.removeItem(ACTIVE_KEY);window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated',{detail:null}))}
  function exportJson(){const record=active();return record?JSON.stringify(record,null,2):''}
  window.EMSCodeSimPatientRecord={create,ensure,active,activeId,load,save,update,setFinding,removeFinding,restoreFinding,setHistory,addTreatment,addReassessment,setImpressions,setDocumentation,clear,exportJson};
})();
