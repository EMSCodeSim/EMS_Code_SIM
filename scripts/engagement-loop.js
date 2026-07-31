(function(){
  'use strict';
  const tools=[
    ['Blood Pressure Simulator','/vitals/bp.html'],['Pulse Trainer','/vitals/pulse.html'],['Pulse Oximeter Simulator','/vitals/pulse-ox.html'],['Blood Glucose Simulator','/vitals/bgl.html'],['Breath Sound Simulator','/vitals/breath-sound-simulator.html'],['GCS Trainer','/vitals/gcs.html'],['Stroke Assessment Trainer','/vitals/stroke.html'],['Pupil Simulator','/vitals/pupil.html']
  ];
  function dayIndex(){const d=new Date(),s=new Date(d.getFullYear(),0,0);return Math.floor((d-s)/86400000);}
  document.addEventListener('DOMContentLoaded',function(){
    if(document.querySelector('.practice-next')||document.body.dataset.noEngagement==='true')return;
    const path=location.pathname;let title='',copy='',primary='',primaryUrl='',secondary='',secondaryUrl='';
    if(path.startsWith('/quiz/')){const tool=tools[dayIndex()%tools.length];title='Turn today’s review into hands-on practice';copy='Use one short simulator to reinforce assessment skills after the quiz.';primary='Practice '+tool[0];primaryUrl=tool[1];secondary='Browse all training tools';secondaryUrl='/ems-training-tools.html';}
    else if(path.startsWith('/vitals/')||path.startsWith('/APGAR/')){title='Keep your daily practice streak going';copy='Finish with today’s short EMT or paramedic review, then return tomorrow for a new activity.';primary='Take today’s quiz';primaryUrl='/quiz/';secondary='Browse all training tools';secondaryUrl='/ems-training-tools.html';}
    else return;
    const box=document.createElement('section');box.className='practice-next';box.setAttribute('aria-label','Continue practicing');box.innerHTML='<span class="practice-next-label">Next five-minute step</span><h2>'+title+'</h2><p>'+copy+'</p><div class="practice-next-actions"><a href="'+primaryUrl+'">'+primary+'</a><a class="secondary" href="'+secondaryUrl+'">'+secondary+'</a></div>';
    const footer=document.querySelector('footer,.site-footer');if(footer)footer.parentNode.insertBefore(box,footer);else document.body.appendChild(box);
  });
})();
