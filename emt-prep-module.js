(function(){
'use strict';
const notePrefix='emscodesim:emt-prep:notes:';
function safeGet(key){try{return localStorage.getItem(key)||'';}catch(e){return '';}}
function safeSet(key,val){try{localStorage.setItem(key,val);}catch(e){}}

document.querySelectorAll('[data-module-note]').forEach((field)=>{
  const key=notePrefix+field.dataset.moduleNote;
  field.value=safeGet(key);
  field.addEventListener('input',()=>safeSet(key,field.value));
});

document.querySelectorAll('[data-lesson-timer]').forEach((timer)=>{
  const display=timer.querySelector('strong');
  let remaining=1800, interval=null;
  const render=()=>{const m=Math.floor(remaining/60),s=remaining%60;display.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');};
  const stop=()=>{if(interval){clearInterval(interval);interval=null;}};
  timer.querySelector('[data-timer-action="start"]').addEventListener('click',()=>{if(interval||remaining<=0)return;interval=setInterval(()=>{remaining-=1;render();if(remaining<=0){stop();display.textContent='Complete';}},1000);});
  timer.querySelector('[data-timer-action="pause"]').addEventListener('click',stop);
  timer.querySelector('[data-timer-action="reset"]').addEventListener('click',()=>{stop();remaining=1800;render();});
  render();
});

document.querySelectorAll('.module-quiz').forEach((form)=>{
  const result=form.querySelector('.quiz-result');
  form.addEventListener('submit',(event)=>{
    event.preventDefault();
    const questions=[...form.querySelectorAll('.quiz-question')];
    let answered=0,correct=0;
    questions.forEach((q)=>{
      q.classList.remove('is-correct','is-incorrect');
      const chosen=q.querySelector('input:checked');
      const explanation=q.querySelector('.answer-explanation');
      if(chosen){
        answered+=1;
        const ok=Number(chosen.value)===Number(q.dataset.answer);
        correct+=ok?1:0;
        q.classList.add(ok?'is-correct':'is-incorrect');
        q.querySelectorAll('label').forEach((label)=>label.classList.remove('correct-answer'));
        const right=q.querySelector('input[value="'+q.dataset.answer+'"]');
        if(right)right.closest('label').classList.add('correct-answer');
      }
      if(explanation)explanation.hidden=false;
    });
    if(answered<questions.length){result.textContent='Answer all '+questions.length+' questions before scoring.';return;}
    const message=correct===questions.length?'Excellent foundation.':correct>=4?'Strong start—review the explanation for the missed item.':'Review the lesson sections connected to the missed questions, then try again.';
    result.textContent=correct+' of '+questions.length+' correct. '+message;
    result.focus?.();
  });
  const reset=form.querySelector('.quiz-reset');
  if(reset)reset.addEventListener('click',()=>{
    form.reset();
    form.querySelectorAll('.quiz-question').forEach(q=>{q.classList.remove('is-correct','is-incorrect');q.querySelectorAll('label').forEach(l=>l.classList.remove('correct-answer'));const e=q.querySelector('.answer-explanation');if(e)e.hidden=true;});
    result.textContent='';
  });
});
})();
