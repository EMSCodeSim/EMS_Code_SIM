(()=>{
  'use strict';

  const ACTIVE_KEY='emscodesim_active_patient_record';
  const RECORD_PREFIX='emscodesim_patient_record_';
  const CURRENT_VERSION=3;

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
    pain:{label:'Pain / OPQRST',aliases:['pain_opqrst','opqrst']},
    motor_sensory:{label:'Motor and sensory',aliases:['motor_sensory_assessment']},
    chest_assessment:{label:'Chest assessment',aliases:['chest']},
    trauma_assessment:{label:'Rapid trauma assessment',aliases:['trauma']},
    abdominal_assessment:{label:'Abdominal assessment',aliases:['abdominal']},
    pediatric_assessment_triangle:{label:'Pediatric Assessment Triangle',aliases:['pat']},
    gcs:{label:'Glasgow Coma Scale',aliases:['glasgow_coma_scale']},
    rule_of_nines:{label:'Rule of Nines',aliases:['nines']},
    clinical_impression:{label:'Clinical impression',aliases:['impression']},
    pcr_handoff:{label:'PCR and handoff',aliases:['handoff']}
  };

  const VITAL_KEYS=new Set([
    'blood_pressure','pulse','respirations','spo2','breath_sounds',
    'blood_glucose','temperature','pupils','skin','mental_status'
  ]);
  const HISTORY_KEYS=new Set(['sample','pain']);

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
  const now=()=>new Date().toISOString();

  function normalizeKey(category){
    const raw=String(category??'').trim();
    if(!raw)return'';
    const lower=raw.toLowerCase();
    const sanitized=lower.replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    return ALIAS_TO_KEY[lower]||ALIAS_TO_KEY[sanitized]||sanitized;
  }

  function labelFor(category){
    const normalized=normalizeKey(category);
    if(FIELD_DEFINITIONS[normalized]?.label)return FIELD_DEFINITIONS[normalized].label;
    return normalized.replace(/^treatment_\d+$/,'Treatment').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }

  function eventCategory(keyName,type='finding'){
    if(type==='treatment'||type==='reassessment')return'treatment';
    const normalized=normalizeKey(keyName);
    if(VITAL_KEYS.has(normalized))return'vital';
    if(HISTORY_KEYS.has(normalized))return'history';
    if(type==='documentation')return'documentation';
    return'assessment';
  }

  function scalar(value){
    if(value==null)return'';
    if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
    if(Array.isArray(value))return value.map(item=>scalar(item)).filter(Boolean).join('; ');
    if(typeof value==='object'){
      return value.value||value.finding||value.details||value.description||value.name||value.label||JSON.stringify(value);
    }
    return String(value);
  }

  function makeEventId(type,keyName,recordedAt,sequence=0){
    const stamp=String(recordedAt||now()).replace(/[^0-9]/g,'');
    const random=Math.random().toString(36).slice(2,8);
    return `${type||'event'}-${normalizeKey(keyName)||'general'}-${stamp}-${sequence}-${random}`;
  }

  function normalizeFinding(category,finding){
    const normalized=normalizeKey(category);
    const source=(finding&&typeof finding==='object'&&!Array.isArray(finding))?finding:{value:finding};
    const value=source.value??source.finding??source.details??'';
    const normality=source.normality||(['abnormal','not-normal'].includes(source.status)?'not-normal':source.status==='normal'?'normal':'');
    const status=['abnormal','not-normal'].includes(source.status)?'abnormal':source.status==='normal'?'normal':(normality==='not-normal'?'abnormal':normality==='normal'?'normal':'');
    const recordedAt=source.recordedAt||now();
    return {
      ...source,
      key:normalized,
      label:source.label||labelFor(normalized),
      value,
      finding:source.finding??value,
      normality,
      status,
      recordedAt,
      eventId:source.eventId||''
    };
  }

  function eventDetails(source={}){
    const parts=[];
    const add=value=>{const text=scalar(value).trim();if(text&&!parts.includes(text))parts.push(text)};
    add(source.details);
    add(source.detail);
    add(source.interpretation);
    add(source.context);
    add(source.expectedResponse);
    add(source.nextAction);
    add(source.scenario);
    add(source.documentation);
    add(source.note);
    if(Array.isArray(source.findings))source.findings.forEach(item=>add(Array.isArray(item)?`${item[0]}: ${item[1]}`:item));
    return parts.join(' • ');
  }

  function normalizeCareEvent(event,index=0){
    if(!event||typeof event!=='object')return null;
    const type=event.type||'finding';
    const eventKey=normalizeKey(event.key||event.categoryKey||event.assessment||type);
    const recordedAt=event.recordedAt||event.time||now();
    const sequence=Number.isFinite(Number(event.sequence))?Number(event.sequence):index+1;
    const value=scalar(event.value??event.finding??event.description??event.name??event.response??'');
    return {
      ...event,
      id:event.id||event.eventId||`legacy-${type}-${eventKey||'general'}-${String(recordedAt).replace(/[^0-9]/g,'')}-${sequence}`,
      eventId:event.eventId||event.id||'',
      type,
      category:event.category||eventCategory(eventKey,type),
      key:eventKey,
      label:event.label||labelFor(eventKey||type),
      value,
      details:event.details||eventDetails(event),
      recordedAt,
      sequence
    };
  }

  function chooseNewest(a,b){
    if(!a)return b;
    if(!b)return a;
    return String(b.recordedAt||'').localeCompare(String(a.recordedAt||''))>=0?b:a;
  }

  function appendEvent(record,event){
    record.careLog=Array.isArray(record.careLog)?record.careLog:[];
    const normalized=normalizeCareEvent(event,record.careLog.length);
    if(!normalized)return null;
    const duplicate=record.careLog.some(item=>item.id===normalized.id||(
      item.type===normalized.type&&item.key===normalized.key&&item.recordedAt===normalized.recordedAt&&item.value===normalized.value
    ));
    if(!duplicate)record.careLog.push(normalized);
    return normalized;
  }

  function legacyFindingEvent(keyName,finding,index){
    const normalized=normalizeFinding(keyName,finding);
    return normalizeCareEvent({
      id:normalized.eventId||`legacy-finding-${normalizeKey(keyName)}-${String(normalized.recordedAt).replace(/[^0-9]/g,'')}-${index}`,
      type:'finding',
      category:eventCategory(keyName,'finding'),
      key:keyName,
      label:normalized.label,
      value:normalized.value,
      details:eventDetails(normalized),
      status:normalized.status,
      normality:normalized.normality,
      source:normalized.source||'',
      recordedAt:normalized.recordedAt,
      sequence:index+1
    },index);
  }

  function legacyTreatmentEvent(item,index){
    const recordedAt=item.time||item.recordedAt||now();
    const value=item.description||item.name||item.treatmentLabel||item.treatment||item.value||'Treatment recorded';
    return normalizeCareEvent({
      id:item.eventId||`legacy-treatment-${String(recordedAt).replace(/[^0-9]/g,'')}-${index}`,
      type:'treatment',category:'treatment',key:'treatment',label:'Treatment',value,
      details:eventDetails(item),recordedAt,sequence:index+1,source:item.source||''
    },index);
  }

  function legacyReassessmentEvent(item,index){
    const recordedAt=item.time||item.recordedAt||now();
    const value=item.description||item.documentation||item.response||item.nextAction||item.value||'Patient reassessed';
    return normalizeCareEvent({
      id:item.eventId||`legacy-reassessment-${String(recordedAt).replace(/[^0-9]/g,'')}-${index}`,
      type:'reassessment',category:'treatment',key:'reassessment',label:'Reassessment',value,
      details:eventDetails(item),recordedAt,sequence:index+1,source:item.source||''
    },index);
  }

  function reconcileLegacyEvents(record){
    const existing=Array.isArray(record.careLog)?record.careLog:[];
    const candidates=[];
    Object.entries(record.findings||{}).forEach(([category,finding],index)=>candidates.push(legacyFindingEvent(category,finding,index)));
    (record.treatments||[]).forEach((item,index)=>candidates.push(legacyTreatmentEvent(item,index)));
    (record.reassessments||[]).forEach((item,index)=>candidates.push(legacyReassessmentEvent(item,index)));
    candidates.forEach(candidate=>{
      if(!candidate)return;
      const found=existing.some(item=>item.id===candidate.id||(
        item.type===candidate.type&&item.key===candidate.key&&item.recordedAt===candidate.recordedAt&&item.value===candidate.value
      ));
      if(!found)existing.push(candidate);
    });
    return existing.map((event,index)=>normalizeCareEvent(event,index)).filter(Boolean);
  }

  function normalizeRecord(record){
    if(!record||typeof record!=='object')return null;
    const normalized={
      ...record,
      version:CURRENT_VERSION,
      findings:{},
      history:{...(record.history||{})},
      treatments:Array.isArray(record.treatments)?record.treatments.map(item=>({...item})):[],
      reassessments:Array.isArray(record.reassessments)?record.reassessments.map(item=>({...item})):[],
      careLog:Array.isArray(record.careLog)?record.careLog.map(item=>({...item})):[],
      impressions:{primary:'',differentials:[],supporting:[],...(record.impressions||{})},
      documentation:{narrative:'',handoff:'',...(record.documentation||{})}
    };
    Object.entries(record.findings||{}).forEach(([category,finding])=>{
      const canonical=normalizeKey(category);
      if(!canonical)return;
      normalized.findings[canonical]=chooseNewest(normalized.findings[canonical],normalizeFinding(canonical,finding));
    });
    normalized.careLog=reconcileLegacyEvents(normalized);
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
    startedAt:now(),
    updatedAt:now(),
    findings:{},
    history:{},
    treatments:[],
    reassessments:[],
    careLog:[],
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
      const changed=parsed.version!==CURRENT_VERSION||!Array.isArray(parsed.careLog)||JSON.stringify(parsed.findings||{})!==JSON.stringify(normalized.findings||{})||JSON.stringify(parsed.careLog||[])!==JSON.stringify(normalized.careLog||[]);
      if(changed){
        normalized.migratedAt=now();
        normalized.updatedAt=normalized.updatedAt||normalized.migratedAt;
        localStorage.setItem(key(normalized.id),JSON.stringify(normalized));
      }
      return normalized;
    }catch{return null}
  }

  function save(record){
    const normalized=normalizeRecord(record);
    if(!normalized?.id)throw new Error('Patient record requires an id.');
    normalized.updatedAt=now();
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
    return update(record=>{
      const recordedAt=meta.recordedAt||now();
      const eventId=meta.eventId||makeEventId('finding',canonical,recordedAt,(record.careLog||[]).length+1);
      const finding=normalizeFinding(canonical,{value,...meta,recordedAt,eventId});
      record.findings[canonical]=finding;
      appendEvent(record,{
        id:eventId,eventId,type:'finding',category:eventCategory(canonical,'finding'),key:canonical,
        label:finding.label,value:finding.value,details:eventDetails(finding),status:finding.status,
        normality:finding.normality,source:finding.source||'',recordedAt
      });
      return record;
    });
  }

  function getFinding(category,record=active()){
    if(!record)return null;
    return record.findings?.[normalizeKey(category)]||null;
  }
  function hasFinding(category,record=active()){return Boolean(getFinding(category,record))}
  function listFindings(record=active()){return Object.entries(record?.findings||{})}

  function setHistory(category,value,meta={}){
    const canonical=normalizeKey(category)||String(category||'history');
    return update(record=>{
      const recordedAt=meta.recordedAt||now();
      const eventId=meta.eventId||makeEventId('history',canonical,recordedAt,(record.careLog||[]).length+1);
      record.history[canonical]=value;
      appendEvent(record,{id:eventId,eventId,type:'history',category:'history',key:canonical,label:meta.label||labelFor(canonical),value:scalar(value),details:eventDetails(meta),source:meta.source||'',recordedAt});
      return record;
    });
  }

  function addTreatment(treatment={}){
    return update(record=>{
      const recordedAt=treatment.time||treatment.recordedAt||now();
      const eventId=treatment.eventId||makeEventId('treatment','treatment',recordedAt,(record.careLog||[]).length+1);
      const item={...treatment,eventId,time:recordedAt,recordedAt};
      record.treatments.push(item);
      appendEvent(record,{id:eventId,eventId,type:'treatment',category:'treatment',key:'treatment',label:treatment.label||'Treatment',value:treatment.description||treatment.name||treatment.treatmentLabel||treatment.treatment||treatment.value||'Treatment recorded',details:eventDetails(treatment),source:treatment.source||'',recordedAt});
      return record;
    });
  }

  function addReassessment(entry={}){
    return update(record=>{
      const recordedAt=entry.time||entry.recordedAt||now();
      const eventId=entry.eventId||makeEventId('reassessment','reassessment',recordedAt,(record.careLog||[]).length+1);
      const item={...entry,eventId,time:recordedAt,recordedAt};
      record.reassessments.push(item);
      appendEvent(record,{id:eventId,eventId,type:'reassessment',category:'treatment',key:'reassessment',label:entry.label||'Reassessment',value:entry.description||entry.documentation||entry.response||entry.nextAction||entry.value||'Patient reassessed',details:eventDetails(entry),source:entry.source||'',recordedAt});
      return record;
    });
  }

  function setImpressions(impressions={}){
    return update(record=>{
      const previousPrimary=record.impressions?.primary||'';
      record.impressions={...record.impressions,...impressions};
      const primary=impressions.primary||'';
      if(primary&&primary!==previousPrimary){
        const recordedAt=impressions.updatedAt||impressions.recordedAt||now();
        appendEvent(record,{id:impressions.eventId||makeEventId('impression','clinical_impression',recordedAt,(record.careLog||[]).length+1),type:'impression',category:'assessment',key:'clinical_impression',label:'Clinical impression',value:primary,details:eventDetails(impressions),source:impressions.source||'',recordedAt});
      }
      return record;
    });
  }

  function setDocumentation(documentation={}){
    return update(record=>{
      const previousNarrative=record.documentation?.narrative||'';
      const previousHandoff=record.documentation?.handoff||'';
      record.documentation={...record.documentation,...documentation};
      const recordedAt=documentation.updatedAt||documentation.recordedAt||now();
      const labels=[];
      if(documentation.narrative&&documentation.narrative!==previousNarrative)labels.push('PCR narrative saved');
      if(documentation.handoff&&documentation.handoff!==previousHandoff)labels.push('Verbal handoff saved');
      if(labels.length){
        appendEvent(record,{id:documentation.eventId||makeEventId('documentation','pcr_handoff',recordedAt,(record.careLog||[]).length+1),type:'documentation',category:'documentation',key:'pcr_handoff',label:'PCR and handoff',value:labels.join(' and '),details:'Final documentation updated.',source:documentation.source||'',recordedAt});
      }
      return record;
    });
  }

  function mergeCareLog(events=[]){
    return update(record=>{
      (Array.isArray(events)?events:[]).forEach(event=>appendEvent(record,event));
      return record;
    });
  }

  function listCareLog(record=active(),filter='all'){
    const events=(record?.careLog||[]).map((event,index)=>normalizeCareEvent(event,index)).filter(Boolean);
    const filtered=filter==='vitals'||filter==='vital'?events.filter(event=>event.category==='vital'):
      filter==='treatments'||filter==='treatment'?events.filter(event=>event.category==='treatment'):events;
    return filtered.sort((a,b)=>{
      const aTime=new Date(a.recordedAt||0).getTime();
      const bTime=new Date(b.recordedAt||0).getTime();
      const time=(Number.isFinite(aTime)?aTime:0)-(Number.isFinite(bTime)?bTime:0);
      return time||Number(a.sequence||0)-Number(b.sequence||0);
    });
  }

  function clear(){const id=activeId();if(id)localStorage.removeItem(key(id));localStorage.removeItem(ACTIVE_KEY)}
  function exportJson(){const record=active();return record?JSON.stringify(record,null,2):''}

  window.EMSCodeSimPatientRecord={
    CURRENT_VERSION,FIELD_DEFINITIONS,VITAL_KEYS,normalizeKey,labelFor,normalizeFinding,normalizeRecord,
    create,ensure,active,activeId,load,save,update,setFinding,getFinding,hasFinding,listFindings,
    setHistory,addTreatment,addReassessment,setImpressions,setDocumentation,mergeCareLog,listCareLog,
    clear,exportJson
  };
})();
