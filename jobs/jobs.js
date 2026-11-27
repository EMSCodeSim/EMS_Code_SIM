'use strict';
const el=id=>document.getElementById(id);
const fields=['keyword','state','category'];
let jobs=[];
function activeDeadline(j,today){
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(date(j.closes))return j.closes>=today;
 return j.closes==null&&['open-until-filled','until-applicant-identified'].includes(j.deadlineType)&&typeof j.deadlineSource==='string'&&j.deadlineSource.startsWith('https://')&&date(j.verifiedOn)&&j.verifiedOn<=today&&Date.parse(today)-Date.parse(j.verifiedOn)<=7*86400000;
}
function render(){
 const q=el('keyword').value.trim().toLowerCase(),s=el('state').value.trim().toLowerCase(),c=el('category').value;
 const today=new Date().toISOString().slice(0,10);
 const visible=jobs.filter(j=>j&&j.approved===true&&typeof j.title==='string'&&typeof j.employer==='string'&&typeof j.state==='string'&&activeDeadline(j,today)&&typeof j.applyUrl==='string'&&j.applyUrl.startsWith('https://')&&(!c||j.category===c)&&j.state.toLowerCase().includes(s)&&[j.title,j.employer,j.city,j.category].join(' ').toLowerCase().includes(q));
 el('results').replaceChildren();
 el('status').textContent=visible.length?visible.length+' matching jobs':'No verified active listings match your search. Check the career portals below.';
 for(const j of visible){
 const card=document.createElement('article');
 for(const [tag,value] of [['h3',j.title],['p',[j.employer,j.city,j.state].filter(Boolean).join(' · ')],['p',j.salary||'Salary not published'],['p',j.closes?'Closes: '+j.closes:(j.deadlineType==='open-until-filled'?'Open until filled':'Open until applicant identified')+' · Verified '+j.verifiedOn]]){
 const node=document.createElement(tag);node.textContent=value;card.append(node);}
 const link=document.createElement('a');link.href=j.applyUrl;link.textContent='Apply on employer website';card.append(link);el('results').append(card);
 }
}
for(const id of fields)el(id).addEventListener('input',render);
fetch('./jobs.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('load');return r.json()}).then(data=>{if(!Array.isArray(data))throw Error('format');jobs=data;render()}).catch(()=>{el('status').textContent='Listings temporarily unavailable. Use the career portals below.'});
