(()=>{'use strict';
const $=id=>document.getElementById(id);
const screens=['menu','dispatch','drive','scene','hospitals','finish'];
const calls=[
{name:'Chest pain',age:'62-year-old male',details:'Chest pressure for 45 minutes, diaphoresis and inferior ST elevation. BP 148/92, HR 104.',need:'pci',explain:'Suspected STEMI: PCI-capable transport is appropriate under regional guidelines.'},
{name:'Stroke alert',age:'71-year-old female',details:'Sudden aphasia and right arm weakness 40 minutes ago, glucose 112 mg/dL, suspected LVO.',need:'stroke',explain:'A thrombectomy-capable center may be appropriate for suspected LVO under local protocols.'},
{name:'Major trauma',age:'34-year-old male',details:'High-speed MVC, BP 84/50, altered mental status and abdominal tenderness.',need:'trauma',explain:'Major trauma criteria support an appropriate trauma center.'},
{name:'Pediatric respiratory',age:'5-year-old child',details:'Initially severe respiratory distress, SpO₂ 88%. After oxygen and bronchodilator, speaking in full sentences with SpO₂ 96% and improved work of breathing.',need:'closest',explain:'For this improved, stable fictional patient, the closest appropriate ED can provide evaluation and stabilization; transfer if necessary. Follow local protocols.'},
{name:'Abdominal pain',age:'48-year-old female',details:'Stable abdominal pain, BP 126/80, HR 90, alert and no specialty criteria.',need:'closest',explain:'A nearby appropriate emergency department is reasonable for a stable general medical patient.'}
];
const facilities=[
{name:'Riverside Community ED',miles:4.8,time:7,tags:['ed']},
{name:'Metro Heart & Vascular',miles:12.4,time:16,tags:['pci','ed']},
{name:'Regional Trauma Center',miles:18.6,time:20,tags:['trauma','ed']},
{name:'University Stroke Institute',miles:14.1,time:18,tags:['stroke','ed']},
{name:'Children’s Medical Center',miles:11.2,time:15,tags:['peds','ed']}
];
const S=170,ROAD=66,MAX=125,START={x:0,y:0},SCENE={x:2*S,y:-2*S};
const DESTS=[{x:-2*S,y:-S},{x:3*S,y:-2*S},{x:-3*S,y:2*S},{x:2*S,y:3*S},{x:-S,y:3*S}];
let mission,selected=-1,phase='scene',player={x:0,y:0,a:0,v:0},goal=SCENE,traffic=[],elapsed=0,collisions=0,offroad=0,cooldown=0,paused=false,running=false,last=0,keys={},raf=0;
function show(id){screens.forEach(x=>$(x).classList.toggle('hide',x!==id))}
function begin(){mission=calls[Math.floor(Math.random()*calls.length)];selected=-1;elapsed=0;collisions=0;offroad=0;$('call').innerHTML='<h3>Priority 1 — '+mission.name+'</h3><p>📍 1245 Maple Avenue</p><p>'+mission.age+'</p><p>'+mission.details.split('.')[0]+'.</p>';show('dispatch')}
function setupTraffic(){traffic=[];for(let i=0;i<13;i++){let row=(i%7-3)*S,col=((i*3)%7-3)*S,horizontal=i%2===0;traffic.push({x:horizontal?col+55:row,y:horizontal?row:col+55,a:horizontal?(i%3===0?Math.PI:0):(i%3===0?-Math.PI/2:Math.PI/2),speed:20+i%4*8})}}
function startDrive(p){phase=p;goal=p==='scene'?SCENE:DESTS[selected];player={x:START.x,y:START.y,a:0,v:0};elapsed=0;collisions=0;offroad=0;cooldown=0;paused=false;keys={};setupTraffic();$('pause').textContent='Ⅱ';show('drive');running=true;cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(frame)}
function scene(){running=false;$('report').textContent=mission.age+'. First responder report: '+mission.details;show('scene')}
function choose(){selected=-1;$('transport').disabled=true;$('question').textContent=mission.details+' Choose using current stability, capabilities, distance and local protocols.';$('options').replaceChildren();facilities.forEach((h,i)=>{const b=document.createElement('button');b.className='option';b.textContent=h.name+' — '+h.miles+' mi / '+h.time+' min • '+h.tags.join(', ').toUpperCase();b.onclick=()=>{selected=i;document.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('transport').disabled=false};$('options').appendChild(b)});show('hospitals')}
function finish(){running=false;const correct=mission.need==='closest'?selected===0:facilities[selected].tags.includes(mission.need),hospital=correct?400:0,safe=Math.max(0,250-collisions*45-Math.floor(offroad/2)),efficient=Math.max(0,200-Math.floor(elapsed*1.7));$('score').textContent=(hospital+safe+efficient)+' / 850';$('results').innerHTML='<b>Hospital:</b> '+facilities[selected].name+' ('+(correct?'appropriate':'not the preferred destination')+')<br><b>Driving:</b> '+safe+'/250<br><b>Efficiency:</b> '+efficient+'/200<br><b>Collisions:</b> '+collisions+'<br><br>'+mission.explain;show('finish')}
function nearestGrid(n){return Math.round(n/S)*S}
function roadDistance(x,y){return Math.min(Math.abs(x-nearestGrid(x)),Math.abs(y-nearestGrid(y)))}
function route(){const sx=nearestGrid(player.x),sy=nearestGrid(player.y);const pts=[{x:player.x,y:player.y},{x:sx,y:sy}];let x=sx,y=sy;while(Math.abs(x-goal.x)>1){x+=Math.sign(goal.x-x)*S;pts.push({x,y})}while(Math.abs(y-goal.y)>1){y+=Math.sign(goal.y-y)*S;pts.push({x,y})}return pts}
function update(dt){if(paused)return;const gas=keys.gas||keys.ArrowUp||keys.w,brake=keys.brake||keys.ArrowDown||keys.s,steer=(keys.right||keys.ArrowRight||keys.d?1:0)-(keys.left||keys.ArrowLeft||keys.a?1:0);const onroad=roadDistance(player.x,player.y)<ROAD*.44;
player.v=Math.max(0,Math.min(onroad?MAX:MAX*.42,player.v+(gas?90:brake?-190:-48)*dt));
if(brake)player.v=Math.max(0,player.v-110*dt);
const turnRate=(.5+player.v/MAX*1.9)*steer;
player.a+=turnRate*dt;
player.x+=Math.cos(player.a)*player.v*dt;player.y+=Math.sin(player.a)*player.v*dt;
player.x=Math.max(-4*S,Math.min(4*S,player.x));player.y=Math.max(-4*S,Math.min(4*S,player.y));
if(!onroad&&player.v>8)offroad+=dt*5;
elapsed+=dt;cooldown=Math.max(0,cooldown-dt);
traffic.forEach(v=>{v.x+=Math.cos(v.a)*v.speed*dt;v.y+=Math.sin(v.a)*v.speed*dt;if(Math.abs(v.x)>4*S)v.x=-Math.sign(v.x)*4*S;if(Math.abs(v.y)>4*S)v.y=-Math.sign(v.y)*4*S;if(cooldown===0&&player.v>8&&Math.hypot(v.x-player.x,v.y-player.y)<27){collisions++;cooldown=1.4;player.v*=.3}});
if(Math.hypot(player.x-goal.x,player.y-goal.y)<38&&player.v<48){phase==='scene'?scene():finish()}}
function canvas(){const c=$('road'),d=Math.min(window.devicePixelRatio||1,2),w=c.clientWidth,h=c.clientHeight;if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d)}const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);return{g,w,h}}
function draw(t){const {g,w,h}=canvas();g.fillStyle='#5e977f';g.fillRect(0,0,w,h);
const zoom=Math.min(w/370,h/450)*1.15;
g.save();g.translate(w/2,h*.62);g.rotate(-player.a-Math.PI/2);g.scale(zoom,zoom);g.translate(-player.x,-player.y);
for(let n=-4;n<=4;n++){const v=n*S;g.fillStyle='#a8b3af';g.fillRect(v-ROAD/2-8,-4.5*S,ROAD+16,9*S);g.fillRect(-4.5*S,v-ROAD/2-8,9*S,ROAD+16);g.fillStyle='#334457';g.fillRect(v-ROAD/2,-4.5*S,ROAD,9*S);g.fillRect(-4.5*S,v-ROAD/2,9*S,ROAD);g.strokeStyle='#c7d9de';g.lineWidth=2;g.setLineDash([14,22]);g.beginPath();g.moveTo(v,-4.5*S);g.lineTo(v,4.5*S);g.moveTo(-4.5*S,v);g.lineTo(4.5*S,v);g.stroke();g.setLineDash([])}
for(let x=-4;x<4;x++)for(let y=-4;y<4;y++){const bx=x*S+ROAD*.8,by=y*S+ROAD*.8,bw=S-ROAD*1.6;g.fillStyle=(x+y)%2?'#8c9daf':'#ba8f73';g.fillRect(bx+5,by+8,bw,bw);g.fillStyle=(x+y)%2?'#60768c':'#89644f';g.fillRect(bx,by,bw,bw);g.fillStyle='#f4d887';for(let q=0;q<3;q++)g.fillRect(bx+9+q*16,by+12,7,12)}
const points=route();g.strokeStyle='#61ff9b';g.lineWidth=8;g.lineJoin='round';g.setLineDash([18,13]);g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.setLineDash([]);
g.fillStyle='#ffdb62';g.beginPath();g.arc(goal.x,goal.y,22,0,Math.PI*2);g.fill();g.fillStyle='#112b43';g.font='bold 23px system-ui';g.textAlign='center';g.fillText('★',goal.x,goal.y+8);
function vehicle(x,y,a,color,medic){g.save();g.translate(x,y);g.rotate(a+Math.PI/2);g.fillStyle='#192535';g.fillRect(-13,-19,26,38);g.fillStyle=color;g.fillRect(-11,-21,22,38);g.fillStyle='#87b9d5';g.fillRect(-9,-15,18,10);g.fillStyle=medic?'#e13e50':'#f4c765';g.fillRect(-9,10,18,5);if(medic){g.fillStyle='#ef4054';g.fillRect(-10,-20,9,5);g.fillStyle='#2b9bff';g.fillRect(1,-20,9,5);g.fillStyle='#e43f52';g.font='bold 18px system-ui';g.fillText('+',0,7)}g.restore()}
traffic.forEach(v=>vehicle(v.x,v.y,v.a,'#e8b64f',false));g.restore();
g.save();g.translate(w/2,h*.62);g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(4,15,21,11,0,0,Math.PI*2);g.fill();g.fillStyle='#f3f8ff';g.fillRect(-17,-29,34,56);g.fillStyle='#8ccbe5';g.fillRect(-13,-23,26,16);g.fillStyle='#e74753';g.fillRect(-14,13,28,7);g.fillStyle=Math.floor(t/280)%2?'#ff344e':'#29bfff';g.fillRect(-14,-28,28,6);g.fillStyle='#e53c4c';g.font='bold 23px system-ui';g.textAlign='center';g.fillText('+',0,10);g.restore();
const mw=112,mh=112,mx=w-mw-9,my=9;g.fillStyle='rgba(5,20,39,.89)';g.fillRect(mx,my,mw,mh);const mapScale=mw/(9*S);g.strokeStyle='#72899c';g.lineWidth=5;for(let n=-4;n<=4;n++){let v=(n+4.5)*S*mapScale;g.beginPath();g.moveTo(mx+v,my);g.lineTo(mx+v,my+mh);g.moveTo(mx,my+v);g.lineTo(mx+mw,my+v);g.stroke()}const mp=(x,y)=>[mx+mw/2+x*mapScale,my+mh/2+y*mapScale];const [gx,gy]=mp(goal.x,goal.y),[px,py]=mp(player.x,player.y);g.fillStyle='#ffda5d';g.beginPath();g.arc(gx,gy,6,0,Math.PI*2);g.fill();g.fillStyle='#55eaff';g.beginPath();g.arc(px,py,5,0,Math.PI*2);g.fill();g.strokeStyle='#61ff9b';g.lineWidth=2;g.beginPath();route().forEach((p,i)=>{const [x,y]=mp(p.x,p.y);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();
const remaining=Math.round((Math.abs(goal.x-player.x)+Math.abs(goal.y-player.y))/S*10)/10;
$('phase').textContent=phase==='scene'?'TO SCENE':'TO HOSPITAL';$('distance').textContent=remaining+' blocks • '+Math.round(player.v/MAX*55)+' mph';$('damage').textContent='Hits: '+collisions;
}
function frame(t){if(!running)return;const dt=Math.min(.045,(t-last)/1000||0);last=t;update(dt);if(!running)return;draw(t);raf=requestAnimationFrame(frame)}
function hold(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true;b.setPointerCapture?.(e.pointerId)});const up=e=>{e.preventDefault();keys[key]=false};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',()=>keys[key]=false)}
hold('left','left');hold('right','right');hold('gas','gas');hold('brake','brake');
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();keys[e.key]=true});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};paused=true;$('pause').textContent='▶'});
$('start').onclick=begin;$('again').onclick=begin;$('respond').onclick=()=>startDrive('scene');$('toHospitals').onclick=choose;$('transport').onclick=()=>{if(selected>=0)startDrive('hospital')};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ'};
show('menu');
})();