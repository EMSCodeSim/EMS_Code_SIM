'use strict';
const STORAGE='emsEncyclopediaStudyV1';
const FAVORITES='emsEncyclopediaFavorites';
const $=s=>document.querySelector(s);
const slug=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={data:null,progress:loadProgress(),quiz:[],index:0,correct:0,answers:[],locked:false};

function loadProgress(){
  try{return {...{topics:{},totalCorrect:0,totalAnswered:0,streak:0},...JSON.parse(localStorage.getItem(STORAGE)||'{}')};}
  catch{return {topics:{},totalCorrect:0,totalAnswered:0,streak:0};}
}
function saveProgress(){localStorage.setItem(STORAGE,JSON.stringify(state.progress));renderStats();renderReviewQueue();}
function topicRecord(id){return state.progress.topics[id]||{correct:0,wrong:0,lastResult:null,lastSeen:null};}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sample(list,count){return shuffle(list).slice(0,Math.min(count,list.length));}

async function init(){
  const response=await fetch('/data/ems-encyclopedia.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Encyclopedia data could not load');
  state.data=await response.json();
  fillCategories();bind();renderStats();renderReviewQueue();
  const params=new URLSearchParams(location.search);
  if(params.get('topic'))startSingleTopic(params.get('topic'));
}
function fillCategories(){
  $('#studyCategory').insertAdjacentHTML('beforeend',state.data.categories.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)}</option>`).join(''));
}
function bind(){
  $('#startQuiz').onclick=buildQuiz;
  $('#nextQuestion').onclick=nextQuestion;
  $('#quitQuiz').onclick=finishQuiz;
  $('#newQuiz').onclick=showSetup;
  $('#retryMissed').onclick=retryMissed;
  $('#clearProgress').onclick=()=>{if(confirm('Reset all EMS Encyclopedia study history?')){state.progress={topics:{},totalCorrect:0,totalAnswered:0,streak:0};saveProgress();}};
  ['studyCategory','questionCount','studySet'].forEach(id=>$('#'+id).addEventListener('change',updateAvailability));
  updateAvailability();
}
function availableTopics(){
  const category=$('#studyCategory').value,set=$('#studySet').value;
  const favorites=new Set(JSON.parse(localStorage.getItem(FAVORITES)||'[]'));
  return state.data.entries.filter(t=>{
    const id=slug(t.term),r=topicRecord(id);
    if(category!=='all'&&t.category!==category)return false;
    if(set==='review'&&!(r.wrong>r.correct||r.lastResult==='wrong'))return false;
    if(set==='new'&&(r.correct+r.wrong)>0)return false;
    if(set==='saved'&&!favorites.has(id))return false;
    return true;
  });
}
function updateAvailability(){
  if(!state.data)return;
  const available=availableTopics().length;
  $('#setupMessage').textContent=available?`${available} topics available for this study set.`:'No topics currently match this study set.';
  $('#startQuiz').disabled=!available;
}
function buildQuiz(){
  const count=Number($('#questionCount').value),topics=sample(availableTopics(),count);
  if(!topics.length)return;
  startQuiz(topics);
}
function startSingleTopic(topicId){
  const topic=state.data.entries.find(t=>slug(t.term)===topicId);
  if(topic)startQuiz([topic]);
}
function startQuiz(topics){
  state.quiz=topics.map(makeQuestion);state.index=0;state.correct=0;state.answers=[];state.locked=false;
  $('#setupPanel').hidden=true;$('#resultsPanel').hidden=true;$('#quizPanel').hidden=false;
  renderQuestion();window.scrollTo({top:0,behavior:'smooth'});
}
function makeQuestion(topic){
  const mode=Math.random()<.72?'term':'takeaway';
  const distractorPool=state.data.entries.filter(t=>t.term!==topic.term&&(t.category===topic.category||Math.random()<.15));
  const distractors=sample(distractorPool,3);
  if(mode==='term')return {topic,mode,prompt:topic.summary,correct:topic.term,choices:shuffle([topic.term,...distractors.map(t=>t.term)])};
  return {topic,mode,prompt:`Which field takeaway best matches “${topic.term}”?`,correct:topic.remember,choices:shuffle([topic.remember,...distractors.map(t=>t.remember)])};
}
function renderQuestion(){
  const q=state.quiz[state.index];state.locked=false;
  $('#quizProgress').textContent=`Question ${state.index+1} of ${state.quiz.length}`;
  $('#quizScore').textContent=`${state.correct} correct`;
  $('#quizProgressBar').style.width=`${(state.index/state.quiz.length)*100}%`;
  $('#questionCategory').textContent=q.topic.categoryTitle;
  $('#questionPrompt').textContent=q.mode==='term'?`Which EMS term matches this description?\n${q.prompt}`:q.prompt;
  $('#answerChoices').innerHTML=q.choices.map((choice,i)=>`<button type="button" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${escapeHtml(choice)}</button>`).join('');
  $('#answerFeedback').hidden=true;$('#answerFeedback').className='answer-feedback';$('#nextQuestion').hidden=true;
  $('#answerChoices').onclick=e=>{const button=e.target.closest('button[data-answer]');if(button&&!state.locked)gradeAnswer(Number(button.dataset.answer));};
}
function gradeAnswer(choiceIndex){
  const q=state.quiz[state.index],choice=q.choices[choiceIndex],correct=choice===q.correct,id=slug(q.topic.term);
  state.locked=true;if(correct)state.correct++;
  const record=topicRecord(id);record[correct?'correct':'wrong']++;record.lastResult=correct?'correct':'wrong';record.lastSeen=new Date().toISOString();state.progress.topics[id]=record;
  state.progress.totalAnswered++;if(correct){state.progress.totalCorrect++;state.progress.streak++;}else state.progress.streak=0;
  state.answers.push({topic:q.topic,correct,selected:choice});saveProgress();
  [...$('#answerChoices').children].forEach((button,i)=>{button.disabled=true;const value=q.choices[i];if(value===q.correct)button.classList.add('correct');else if(i===choiceIndex)button.classList.add('wrong');});
  const feedback=$('#answerFeedback');feedback.hidden=false;feedback.classList.add(correct?'correct':'wrong');
  feedback.innerHTML=`<strong>${correct?'Correct.':'Review this topic.'}</strong><p>${escapeHtml(q.topic.details)}</p><p><b>Field takeaway:</b> ${escapeHtml(q.topic.remember)}</p><a href="/ems-encyclopedia.html#${id}">Open full encyclopedia entry</a>`;
  $('#nextQuestion').hidden=false;$('#nextQuestion').textContent=state.index===state.quiz.length-1?'See results':'Next question';
}
function nextQuestion(){if(state.index>=state.quiz.length-1)finishQuiz();else{state.index++;renderQuestion();}}
function finishQuiz(){
  if(!state.answers.length){showSetup();return;}
  $('#quizPanel').hidden=true;$('#resultsPanel').hidden=false;$('#quizProgressBar').style.width='100%';
  const total=state.answers.length,pct=Math.round((state.correct/total)*100),missed=state.answers.filter(a=>!a.correct);
  $('#resultHeading').textContent=pct>=90?'Strong recall':pct>=70?'Good progress':'Build this area';
  $('#resultSummary').textContent=`You answered ${state.correct} of ${total} correctly (${pct}%). ${missed.length?`${missed.length} topic${missed.length===1?'':'s'} were added to your review queue.`:'No weak topics were added.'}`;
  const categoryMap={};state.answers.forEach(a=>{const k=a.topic.categoryTitle;categoryMap[k]??={right:0,total:0};categoryMap[k].total++;if(a.correct)categoryMap[k].right++;});
  $('#resultBreakdown').innerHTML=Object.entries(categoryMap).map(([name,v])=>`<div><strong>${v.right}/${v.total}</strong><span>${escapeHtml(name)}</span></div>`).join('');
  $('#missedTopics').innerHTML=missed.length?`<h3>Review these topics</h3>${missed.map(a=>`<a href="/ems-encyclopedia.html#${slug(a.topic.term)}"><strong>${escapeHtml(a.topic.term)}</strong><span>${escapeHtml(a.topic.summary)}</span></a>`).join('')}`:'<div class="perfect-result">All selected topics were correct.</div>';
  $('#retryMissed').hidden=!missed.length;renderStats();renderReviewQueue();window.scrollTo({top:0,behavior:'smooth'});
}
function retryMissed(){const topics=state.answers.filter(a=>!a.correct).map(a=>a.topic);if(topics.length)startQuiz(topics);}
function showSetup(){$('#quizPanel').hidden=true;$('#resultsPanel').hidden=true;$('#setupPanel').hidden=false;updateAvailability();window.scrollTo({top:0,behavior:'smooth'});}
function renderStats(){
  const records=Object.values(state.progress.topics),mastered=records.filter(r=>r.correct>=2&&r.correct>r.wrong).length,review=records.filter(r=>r.wrong>r.correct||r.lastResult==='wrong').length;
  $('#masteredCount').textContent=mastered;$('#reviewCount').textContent=review;$('#accuracyValue').textContent=state.progress.totalAnswered?`${Math.round(state.progress.totalCorrect/state.progress.totalAnswered*100)}%`:'—';$('#streakValue').textContent=state.progress.streak||0;
}
function renderReviewQueue(){
  if(!state.data)return;
  const list=state.data.entries.map(topic=>({topic,record:topicRecord(slug(topic.term))})).filter(x=>x.record.wrong>x.record.correct||x.record.lastResult==='wrong').sort((a,b)=>(b.record.wrong-b.record.correct)-(a.record.wrong-a.record.correct)).slice(0,12);
  $('#reviewQueue').innerHTML=list.length?list.map(({topic,record})=>`<article><div><strong>${escapeHtml(topic.term)}</strong><span>${escapeHtml(topic.summary)}</span></div><div class="review-meta"><small>${record.correct} correct · ${record.wrong} missed</small><a href="/ems-encyclopedia-study.html?topic=${slug(topic.term)}">Practice</a></div></article>`).join(''):'<div class="empty-review"><strong>No weak topics yet.</strong><span>Complete a study quiz and missed entries will appear here.</span></div>';
}
init().catch(err=>{console.error(err);$('#setupMessage').textContent='The encyclopedia data could not load. Confirm /data/ems-encyclopedia.json is uploaded.';$('#startQuiz').disabled=true;});
