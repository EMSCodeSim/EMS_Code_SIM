(()=>{
  'use strict';

  const ACTIVE_KEY='emscodesim_active_patient_record';
  const RECORD_PREFIX='emscodesim_patient_record_';
  const CURRENT_VERSION=2;

  const FIELD_DEFINITIONS={
    scene_size_up:{label:'Scene size-up and first impression',aliases:['scene_assessment','scene_sizeup']},
    airway:{label:'Airway',aliases:['airway_assessment']},
    breathing:{label:'Breathing quality',aliases:['breathing_assessment','breathing_quality']},
    perfusion:{label:'Circulation and perfusion',aliases:['perfusion_assessment']},
    blood_pressure:{label:'Blood pressure',aliases:['bp','bloodPressure','blood pressure']},
    pulse:{label:'Pulse',aliases:['heart_rate','heartRate']},
    respirations:{label:'Respiratory rate',aliases:['respiratory_rate','respiratoryRate','rr']},
    spo2:{label:'SpO₂',aliases:['oxygen_saturation','oxygenSaturation','pulse_ox']},
    breath_sounds:{label:'Breath sounds',aliases:['breathSounds','lung_sounds','lungSounds']},
    blood_glucose:{label:'Blood glucose',aliases:['bgl','glucose','bloodGlucose']},
    temperature:{label:'Temperature',aliases:['temp']},
    pupils:{label:'Pupils',aliases:['pupil']},
    skin:{label:'Skin signs',aliases:['skin_signs','skinSigns']},
    mental_status:{label:'Mental status',aliases:['avpu','aao','orientation','mentalStatus']},
    sample:{label:'SAMPLE history',aliases:['sample_history']},
    motor_sensory:{label:'Motor and sensory',aliases:['motor_sensory_assessment']},
    chest_assessment:{label:'Chest assessment',aliases:['chest']},
    trauma_assessment:{label:'Rapid trauma assessment',aliases:['trauma']},
    abdominal_assessment:{label:'Abdominal assessment',aliases:['abdominal']},
    pediatric_assessment_triangle:{label:'Pediatric Assessment Triangle',aliases:['pat']},
    clinical_impression:{label:'Clinical impression',aliases:['impression']},
    pcr_handoff:{label:'PCR and handoff',aliases:['handoff']}
  };

  const ALIAS_TO_KEY={};
  Object.entries(FIELD_DEFINITIONS).forEach(([canonical,definition])=>{
    ALIAS_TO_KEY[canonical.toLowerCase()]=canonical;
    (definition.aliases||[]).forEach(alias=>{ALIAS_TO_KEY[String(alias).toLowerCase()]=canonical});
  });

  const key=id=>`${RECORD_PREFIX}${id}`;
  const clone=value=>{
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  function normalizeKey(category){
    const raw=String(category??'').trim();
    if(!raw)return'';
    return ALIAS_TO_KEY[raw.toLowerCase()]||raw.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  }

  function labelFor(category){
    const normalized=normalizeKey(category);
    if(FIELD_DEFINITIONS[normalized]?.label)return FIELD_DEFINITIONS[normalized].label;
    return normalized.replace(/^treatment_\d+$/,'Treatment').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }

  function normalizeFinding(category,finding){
    const normalized=normalizeKey(category);
    const source=(finding&&typeof finding==='object'&&!Array.isArray(finding))?finding:{value:finding};
    const value=source.value??source.finding??source.details??'';
    const normality=source.normality||(source.status==='abnormal'?'not-normal':source.status==='normal'?'normal':'');
    const status=source.status||(normality==='not-normal'?'abnormal':normality==='normal'?'normal':'');
    return {
      ...source,
      key:normalized,
      label:source.label||labelFor(normalized),
      value,
      finding:source.finding??value,
      normality,
      status,
      recordedAt:source.recordedAt||new Date().toISOString()
    };
  }

  function chooseNewest(a,b){
    if(!a)return b;
    if(!b)return a;
    return String(b.recordedAt||'').localeCompare(String(a.recordedAt||''))>=0?b:a;
  }

  function normalizeRecord(record){
    if(!record||typeof record!=='object')return null;
    const normalized={
      ...record,
      version:CURRENT_VERSION,
      findings:{},
      history:{...(record.history||{})},
      treatments:Array.isArray(record.treatments)?record.treatments:[],
      reassessments:Array.isArray(record.reassessments)?record.reassessments:[],
      impressions:{primary:'',differentials:[],supporting:[],...(record.impressions||{})},
      documentation:{narrative:'',handoff:'',...(record.documentation||{})}
    };
    Object.entries(record.findings||{}).forEach(([category,finding])=>{
      const canonical=normalizeKey(category);
      if(!canonical)return;
      normalized.findings[canonical]=chooseNewest(normalized.findings[canonical],normalizeFinding(canonical,finding));
    });
    return normalized;
  }

  const emptyRecord=(scenario={})=>normalizeRecord({
    version:CURRENT_VERSION,
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

  function activeId(){return localStorage.getItem(ACTIVE_KEY)||''}

  function load(id){
    const recordId=id||activeId();
    if(!recordId)return null;
    try{
      const raw=localStorage.getItem(key(recordId));
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      const normalized=normalizeRecord(parsed);
      if(!normalized)return null;
      const changed=parsed.version!==CURRENT_VERSION||JSON.stringify(parsed.findings||{})!==JSON.stringify(normalized.findings||{});
      if(changed){
        normalized.migratedAt=new Date().toISOString();
        normalized.updatedAt=normalized.updatedAt||normalized.migratedAt;
        localStorage.setItem(key(normalized.id),JSON.stringify(normalized));
      }
      return normalized;
    }catch{return null}
  }

  function save(record){
    const normalized=normalizeRecord(record);
    if(!normalized?.id)throw new Error('Patient record requires an id.');
    normalized.updatedAt=new Date().toISOString();
    localStorage.setItem(key(normalized.id),JSON.stringify(normalized));
    localStorage.setItem(ACTIVE_KEY,normalized.id);
    window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated',{detail:normalized}));
    return normalized;
  }

  function active(){return load(activeId())}
  function create(scenario){return save(emptyRecord(scenario))}
  function ensure(scenario){
    const current=active();
    if(current&&(!scenario||!scenario.id||current.scenarioId===scenario.id))return current;
    return create(scenario||{});
  }
  function update(mutator){
    const record=active();
    if(!record)throw new Error('No active patient record.');
    const draft=clone(record);
    const next=typeof mutator==='function'?(mutator(draft)||draft):{...draft,...mutator};
    return save(next);
  }
  function setFinding(category,value,meta={}){
    const canonical=normalizeKey(category);
    if(!canonical)throw new Error('Finding category is required.');
    return update(r=>{
      r.findings[canonical]=normalizeFinding(canonical,{value,...meta,recordedAt:meta.recordedAt||new Date().toISOString()});
      return r;
    });
  }
  function getFinding(category,record=active()){
    if(!record)return null;
    return record.findings?.[normalizeKey(category)]||null;
  }
  function hasFinding(category,record=active()){return Boolean(getFinding(category,record))}
  function listFindings(record=active()){return Object.entries(record?.findings||{})}
  function setHistory(category,value){return update(r=>{r.history[normalizeKey(category)||category]=value;return r})}
  function addTreatment(treatment){return update(r=>{r.treatments.push({...treatment,time:treatment?.time||new Date().toISOString()});return r})}
  function addReassessment(entry){return update(r=>{r.reassessments.push({...entry,time:entry?.time||new Date().toISOString()});return r})}
  function setImpressions(impressions){return update(r=>{r.impressions={...r.impressions,...impressions};return r})}
  function setDocumentation(documentation){return update(r=>{r.documentation={...r.documentation,...documentation};return r})}
  function clear(){const id=activeId();if(id)localStorage.removeItem(key(id));localStorage.removeItem(ACTIVE_KEY)}
  function exportJson(){const record=active();return record?JSON.stringify(record,null,2):''}

  window.EMSCodeSimPatientRecord={
    CURRENT_VERSION,FIELD_DEFINITIONS,normalizeKey,labelFor,normalizeFinding,normalizeRecord,
    create,ensure,active,activeId,load,save,update,setFinding,getFinding,hasFinding,listFindings,
    setHistory,addTreatment,addReassessment,setImpressions,setDocumentation,clear,exportJson
  };
})();
