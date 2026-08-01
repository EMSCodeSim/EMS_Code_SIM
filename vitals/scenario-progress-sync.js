(()=>{
  'use strict';
  const api=window.EMSCodeSimPatientRecord;
  const record=api?.active?.();
  if(!record)return;

  const STEP_PATHS={
    asthma:['/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    stroke:['/vitals/airway-assessment.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/respiratory-rate-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/motor-sensory-assessment.html','/vitals/bgl-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/pcr-handoff.html'],
    hypoglycemia:['/vitals/airway-assessment.html','/vitals/avpu-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/respiratory-rate-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/bgl-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    trauma:['/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/chest-assessment.html','/vitals/trauma-assessment.html','/vitals/abdominal-assessment.html','/vitals/perfusion-assessment.html','/vitals/pcr-handoff.html'],
    pediatric:['/vitals/pediatric-assessment-triangle.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/perfusion-assessment.html','/vitals/sample-history.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html']
  };

  const scenarioId=record.scenarioId||record.id;
  const paths=STEP_PATHS[scenarioId];
  if(!paths)return;

  const has=key=>api.hasFinding?.(key,record)||false;
  const completeForPath=path=>{
    switch(path){
      case'/vitals/airway-assessment.html':return has('airway');
      case'/vitals/breathing-assessment.html':return has('breathing');
      case'/vitals/respiratory-rate-scenario.html':return has('respirations');
      case'/vitals/breath-sounds-scenario.html':return has('breath_sounds');
      case'/vitals/pulse-scenario.html':return has('pulse');
      case'/vitals/bp-scenario.html':return has('blood_pressure');
      case'/vitals/pulse-ox-scenario.html':return has('spo2');
      case'/vitals/bgl-scenario.html':return has('blood_glucose');
      case'/vitals/avpu-scenario.html':return has('mental_status');
      case'/vitals/motor-sensory-assessment.html':return has('motor_sensory');
      case'/vitals/chest-assessment.html':return has('chest_assessment');
      case'/vitals/trauma-assessment.html':return has('trauma_assessment');
      case'/vitals/abdominal-assessment.html':return has('abdominal_assessment');
      case'/vitals/perfusion-assessment.html':return has('perfusion');
      case'/vitals/pediatric-assessment-triangle.html':return has('pediatric_assessment_triangle');
      case'/vitals/sample-history.html':return has('sample')||Object.keys(record.history||{}).length>0;
      case'/vitals/clinical-impression.html':return has('clinical_impression')||Boolean(record.impressions?.primary);
      case'/vitals/treatment-reassessment.html':return has('treatment_reassessment')||(record.treatments||[]).length>0||(record.reassessments||[]).length>0;
      case'/vitals/pcr-handoff.html':return has('pcr_handoff')||Boolean(record.documentation?.narrative||record.documentation?.handoff);
      default:return false;
    }
  };

  const stateKey=`emscodesim_scenario_${scenarioId}`;
  let state={done:[],complete:false};
  try{state={...state,...JSON.parse(localStorage.getItem(stateKey)||'{}')}}catch{}
  const done=paths.map((path,index)=>completeForPath(path)?index:null).filter(index=>index!==null);
  state.done=done;
  if(done.length!==paths.length)state.complete=false;
  localStorage.setItem(stateKey,JSON.stringify(state));
})();
