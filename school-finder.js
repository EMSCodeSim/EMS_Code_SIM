(function(){
  'use strict';
  const form=document.getElementById('schoolFinderForm');
  if(!form) return;

  const locationInput=document.getElementById('schoolLocation');
  const levelInput=document.getElementById('schoolLevel');
  const formatInput=document.getElementById('schoolFormat');
  const stateInput=document.getElementById('schoolState');
  const useLocationButton=document.getElementById('useMyLocation');
  const status=document.getElementById('finderStatus');
  const resultHeading=document.getElementById('finderResultHeading');
  const mapsLink=document.getElementById('mapsSearchLink');
  const webLink=document.getElementById('webSearchLink');
  const stateLink=document.getElementById('stateSearchLink');
  const registryLink=document.getElementById('registryStateLink');
  const accreditationCard=document.getElementById('accreditationCard');
  const accreditationLink=document.getElementById('accreditationLink');
  const finderKey='emscodesim:schoolFinder';
  let coordinateQuery='';

  const programLabels={emr:'EMR',emt:'EMT',aemt:'AEMT',paramedic:'Paramedic'};
  const formatLabels={any:'',inperson:'in-person',hybrid:'hybrid',evening:'evening or weekend',accelerated:'accelerated'};

  function setStatus(message,isError){
    status.textContent=message||'';
    status.classList.toggle('error',!!isError);
  }

  function buildSearch(){
    const location=locationInput.value.trim();
    const level=programLabels[levelInput.value]||'EMT';
    const format=formatLabels[formatInput.value]||'';
    const state=stateInput.value;
    const stateName=stateInput.options[stateInput.selectedIndex] ? stateInput.options[stateInput.selectedIndex].text : '';
    const place=coordinateQuery||location||(stateName&&stateName!=='Choose a state' ? stateName : 'near me');
    const formatText=format ? ' '+format : '';
    const core=level+' training program'+formatText;

    mapsLink.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(core+' '+place);
    webLink.href='https://www.google.com/search?q='+encodeURIComponent(core+' '+place+' tuition schedule');

    if(state){
      stateLink.href='https://www.google.com/search?q='+encodeURIComponent('site:.gov '+stateName+' approved '+level+' training programs EMS');
      stateLink.closest('.finder-result').classList.remove('is-disabled');
      stateLink.removeAttribute('aria-disabled');
    }else{
      stateLink.href='#';
      stateLink.closest('.finder-result').classList.add('is-disabled');
      stateLink.setAttribute('aria-disabled','true');
    }

    registryLink.href='https://www.nremt.org/resources/state-ems-offices';
    accreditationLink.href='https://coaemsp.org/paramedic-ems-students-accreditation/';
    accreditationCard.hidden=!(levelInput.value==='paramedic'||levelInput.value==='aemt');

    resultHeading.textContent='Search options for '+level+(location?' near '+location:(state?' in '+stateName:''));
    document.getElementById('finderResults').hidden=false;
    setStatus('Search links are ready. Verify approval directly with the state EMS office before paying tuition.');

    try{
      localStorage.setItem(finderKey,JSON.stringify({location:coordinateQuery?'':location,level:levelInput.value,format:formatInput.value,state:state}));
    }catch(e){}
  }

  form.addEventListener('submit',function(event){
    event.preventDefault();
    coordinateQuery='';
    if(!locationInput.value.trim()&&!stateInput.value){
      setStatus('Enter a city or ZIP code, choose a state, or use your current location.',true);
      locationInput.focus();
      return;
    }
    buildSearch();
  });

  [levelInput,formatInput,stateInput].forEach(function(control){
    control.addEventListener('change',function(){
      if(!document.getElementById('finderResults').hidden) buildSearch();
    });
  });

  useLocationButton.addEventListener('click',function(){
    if(!navigator.geolocation){
      setStatus('Location access is not supported by this browser. Enter a city or ZIP code instead.',true);
      return;
    }
    useLocationButton.disabled=true;
    setStatus('Requesting your location…');
    navigator.geolocation.getCurrentPosition(function(position){
      coordinateQuery=position.coords.latitude.toFixed(5)+','+position.coords.longitude.toFixed(5);
      locationInput.value='Current location';
      useLocationButton.disabled=false;
      buildSearch();
    },function(){
      useLocationButton.disabled=false;
      setStatus('Location was not available. Enter a city or ZIP code instead.',true);
    },{enableHighAccuracy:false,timeout:10000,maximumAge:600000});
  });

  try{
    const saved=JSON.parse(localStorage.getItem(finderKey)||'null');
    if(saved){
      locationInput.value=saved.location||'';
      if(saved.level&&levelInput.querySelector('option[value="'+saved.level+'"]')) levelInput.value=saved.level;
      if(saved.format&&formatInput.querySelector('option[value="'+saved.format+'"]')) formatInput.value=saved.format;
      if(saved.state&&stateInput.querySelector('option[value="'+saved.state+'"]')) stateInput.value=saved.state;
    }
  }catch(e){}

  const compareKey='emscodesim:schoolCompare';
  const compareFields=[...document.querySelectorAll('[data-school-compare] input,[data-school-compare] select,[data-school-compare] textarea')];
  const saveButton=document.getElementById('saveSchoolCompare');
  const clearButton=document.getElementById('clearSchoolCompare');
  const compareStatus=document.getElementById('compareStatus');

  function showCompareStatus(message){
    compareStatus.textContent=message;
    window.clearTimeout(showCompareStatus.timer);
    showCompareStatus.timer=window.setTimeout(function(){compareStatus.textContent='';},3000);
  }
  try{
    const savedCompare=JSON.parse(localStorage.getItem(compareKey)||'{}');
    compareFields.forEach(function(field){if(Object.prototype.hasOwnProperty.call(savedCompare,field.id)) field.value=savedCompare[field.id];});
  }catch(e){}
  saveButton.addEventListener('click',function(){
    const data={};
    compareFields.forEach(function(field){data[field.id]=field.value;});
    try{localStorage.setItem(compareKey,JSON.stringify(data));showCompareStatus('School comparison saved on this device.');}
    catch(e){showCompareStatus('Unable to save in this browser.');}
  });
  clearButton.addEventListener('click',function(){
    compareFields.forEach(function(field){field.value='';});
    try{localStorage.removeItem(compareKey);}catch(e){}
    showCompareStatus('School comparison cleared.');
  });
})();
