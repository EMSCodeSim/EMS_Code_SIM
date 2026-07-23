(function(){
  'use strict';
  const measurementId='G-5QLPK4025C';
  const consentKey='emscodesim:analytics-consent';
  let loaded=false;
  function loadAnalytics(){
    if(loaded)return;loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',measurementId,{anonymize_ip:true});
    const script=document.createElement('script');
    script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }
  function getChoice(){try{return localStorage.getItem(consentKey);}catch(e){return null;}}
  function saveChoice(value){try{localStorage.setItem(consentKey,value);}catch(e){} }
  function removeBanner(){const b=document.getElementById('privacyBanner');if(b)b.remove();}
  function choose(value){saveChoice(value);removeBanner();if(value==='allow')loadAnalytics();window.dispatchEvent(new CustomEvent('emscodesim:privacy-choice',{detail:value}));}
  function showBanner(){
    if(document.getElementById('privacyBanner'))return;
    const banner=document.createElement('aside');banner.id='privacyBanner';banner.className='privacy-banner';banner.setAttribute('aria-label','Analytics privacy choice');
    banner.innerHTML='<strong>Help improve EMSCodeSim</strong><p>EMSCodeSim uses optional Google Analytics to understand which free guides and training tools are useful. Progress data stays on this device.</p><div class="privacy-actions"><button class="allow" type="button" data-choice="allow">Allow analytics</button><button class="decline" type="button" data-choice="decline">Not now</button><a href="/privacy.html">Privacy details</a></div>';
    banner.addEventListener('click',function(e){const button=e.target.closest('[data-choice]');if(button)choose(button.dataset.choice);});
    document.body.appendChild(banner);
  }
  window.EMSCodeSimPrivacy={reset:function(){saveChoice('');showBanner();},choice:getChoice,allow:function(){choose('allow');},decline:function(){choose('decline');}};
  document.addEventListener('DOMContentLoaded',function(){const choice=getChoice();if(choice==='allow')loadAnalytics();else if(choice!=='decline')showBanner();});
})();
