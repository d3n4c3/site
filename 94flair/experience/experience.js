(()=>{
const $=s=>document.querySelector(s),E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const I='../images/',p3=n=>String(n).padStart(3,'0'),p2=n=>String(n).padStart(2,'0'),PR=I+'promo-fx/hd/',PF=I+'print-fx/hd/';
const rnd=(a,b)=>a+Math.random()*(b-a),shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const stage=$('#stage'),table=$('#table');
/* fixed card size, set once */
let W=stage.clientWidth,H=stage.clientHeight,mob=W<=760;
const CH=Math.round(mob?Math.min(H*.30,W*.56/.714,245):Math.min(H*.40,355));
document.documentElement.style.setProperty('--ch',CH+'px');
const TOP=mob?178:150,BOT=62,AV=H-TOP-BOT;
const BIG=(inH,ar,wf)=>Math.round(Math.min(CH*inH/3.5,AV*.96,W*wf/ar)); // true relative height, capped to the felt
const card=n=>({f:`${I}cards-fx/hd/${p3(n)}.jpg`,b:`${I}backs-fx/hd/${p3(n)}.jpg`,ar:857/1200,label:'#'+n});
const pb=n=>({f:`${I}powerblast-fx/hd/${p2(n)}.jpg`,b:`${I}powerblast-backs-fx/hd/${p2(n)}.jpg`,ar:857/1200,holo:1,pb:1,label:'Powerblast #'+n});

/* physics */
const live=new Set();let Z=10,sel=null;
(function loop(){for(const c of live){if(!c.el.isConnected){live.delete(c);continue}c.step()}requestAnimationFrame(loop)})();

class Card{
 constructor(d,o={}){
  this.d=d;this.o=o;const el=this.el=E('div','card'+(d.holo?' holo':'')+(d.flat?' flat':'')+(d.date?' date':''));
  el.style.setProperty('--ar',d.ar||.714);el.style.setProperty('--h',(d.h||CH)+'px');
  const inn=this.inn=E('div','in'),f=E('div','f');
  if(d.html){f.innerHTML=d.html}else{const fi=E('img');fi.alt=d.label||'';fi.decoding='async';fi.src=d.f;f.append(fi)}
  const b=E('div','f b');
  if(d.b){const bi=E('img');bi.alt='';bi.loading='lazy';bi.src=d.b;bi.onload=()=>{if((bi.naturalWidth>bi.naturalHeight)!==((d.ar||.714)>1))bi.className='rot'};b.append(bi)}
  else{b.classList.add('blank');b.textContent=d.blank||'Blank back'}
  this.g=E('div','g');f.append(this.g);inn.append(f,b);el.append(inn);
  const rh=E('div','rh','⟳');el.append(rh);
  if(d.info){el.append(E('div','info',d.info))}if(o.ov)el.classList.add('ov');
  Object.assign(this,{x:0,y:0,r:0,s:1,f:0,tx:0,ty:0,tr:0,ts:1,tf:0,vx:0,vy:0,vr:0,vs:0,vf:0,ax:0,ay:0,tax:0,tay:0,ur:0,zoom:1,tz:1,flipped:0});
  this.bind();live.add(this);table.append(el);
 }
 set(p,snap){for(const k in p)this['t'+k]=p[k];if(snap)for(const k in p)this[k]=p[k];return this}
 flip(){this.flipped^=1;this.tf=this.flipped?180:0;this.o.onFlip&&this.o.onFlip(this)}
 step(){
  const k=.1,dm=.74;for(const a of['x','y','r','s','f']){if(this.drag&&(a==='x'||a==='y'))continue;const v='v'+a;this[v]=(this[v]+(this['t'+a]-this[a])*(a==='f'?.09:k))*dm;this[a]+=this[v]}
  if(!this.pinch)this.zoom+=(this.tz-this.zoom)*.15;
  this.ax+=(this.tax-this.ax)*.15;this.ay+=(this.tay-this.ay)*.15;
  this.el.style.transform=`translate(-50%,-50%) translate3d(${this.x.toFixed(1)}px,${this.y.toFixed(1)}px,0) rotate(${(this.r+this.ur).toFixed(2)}deg) scale(${(this.s*this.zoom).toFixed(3)}) rotateX(${this.ax.toFixed(2)}deg) rotateY(${this.ay.toFixed(2)}deg)`;
  this.inn.style.transform=`rotateY(${this.f.toFixed(1)}deg)`;
 }
 glare(cx,cy){const R=this.el.getBoundingClientRect(),px=(cx-R.left)/R.width,py=(cy-R.top)/R.height;
  this.tax=(.5-py)*16;this.tay=(px-.5)*18;this.el.style.setProperty('--gx',px*100+'%');this.el.style.setProperty('--gy',py*100+'%');this.el.style.setProperty('--go',this.d.holo?.9:.5)}
 calm(){this.tax=this.tay=0;this.el.style.setProperty('--go',0)}
 local(cx,cy){const R=this.el.getBoundingClientRect(),mx=R.left+R.width/2,my=R.top+R.height/2,a=-(this.r+this.ur)*Math.PI/180,dx=cx-mx,dy=cy-my;
  const lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a),w=this.el.offsetWidth*this.s*this.zoom,h=this.el.offsetHeight*this.s*this.zoom;return[lx/w+.5,ly/h+.5]}
 bind(){
  const el=this.el,pts=new Map();let sx,sy,ox,oy,moved,hist=[],pd0=0,z0=1,a0=0,u0=0,rot=0,sa=0,lastTap=0,tapT=null;
  el.addEventListener('dblclick',e=>e.preventDefault());
  el.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&!this.drag)this.glare(e.clientX,e.clientY)});
  el.addEventListener('pointerleave',()=>{if(!this.drag)this.calm()});
  el.addEventListener('pointerdown',e=>{
   el.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
   if(sel&&sel!==this)sel.el.classList.remove('sel');sel=this;el.classList.add('sel');
   if(pts.size===2){const[a,b]=[...pts.values()];pd0=Math.hypot(a[0]-b[0],a[1]-b[1]);z0=this.zoom;a0=Math.atan2(b[1]-a[1],b[0]-a[0]);u0=this.ur;this.drag=0;this.pinch=1;moved=1;return}
   this.drag=1;el.style.zIndex=++Z;sx=e.clientX;sy=e.clientY;ox=this.x;oy=this.y;moved=0;hist=[[sx,sy,performance.now()]];
   rot=e.shiftKey||e.target.classList.contains('rh');if(rot){const R=el.getBoundingClientRect();sa=Math.atan2(sy-R.top-R.height/2,sx-R.left-R.width/2);u0=this.ur}
   this.o.onGrab&&this.o.onGrab(this)});
  el.addEventListener('pointermove',e=>{
   if(this.gone){pts.clear();return}if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);
   if(pts.size===2){const[a,b]=[...pts.values()];this.zoom=Math.min(2.4,Math.max(.8,z0*Math.hypot(a[0]-b[0],a[1]-b[1])/pd0));this.ur=u0+(Math.atan2(b[1]-a[1],b[0]-a[0])-a0)*57.2958;return}
   if(!this.drag)return;
   if(rot){const R=el.getBoundingClientRect();this.ur=u0+(Math.atan2(e.clientY-R.top-R.height/2,e.clientX-R.left-R.width/2)-sa)*57.2958;moved=1;return}
   const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)moved=1;
   this.x=ox+dx;this.y=oy+dy;this.tx=this.x;this.ty=this.y;hist.push([e.clientX,e.clientY,performance.now()]);if(hist.length>6)hist.shift();
   const h0=hist[0],dt=Math.max(16,performance.now()-h0[2]);this.tay=Math.max(-20,Math.min(20,(e.clientX-h0[0])/dt*12));this.tax=-Math.max(-16,Math.min(16,(e.clientY-h0[1])/dt*10));this.glare(e.clientX,e.clientY)});
  const up=e=>{
   if(this.gone){pts.clear();this.drag=0;return}pts.delete(e.pointerId);if(pts.size)return;
   if(this.pinch){this.pinch=0;this.tz=1;return}
   if(!this.drag)return;this.drag=0;this.calm();
   if(rot){this.tx=this.x;this.ty=this.y;return}
   const now=performance.now();
   if(!moved){this.tx=this.x=ox;this.ty=this.y=oy;
    if(now-lastTap<330){clearTimeout(tapT);lastTap=0;this.flip()}
    else{lastTap=now;const cx=e.clientX,cy=e.clientY;if(this.o.onSingle)tapT=setTimeout(()=>this.o.onSingle(this,cx,cy),330)}return}
   const h0=hist[0],dt=Math.max(16,now-h0[2]),vx=(e.clientX-h0[0])/dt,vy=(e.clientY-h0[1])/dt;
   this.tx=Math.max(-W/2,Math.min(W/2,this.x+vx*120));this.ty=Math.max(-H/2+40,Math.min(H/2-40,this.y+vy*120));this.tr=this.r+vx*4;
   this.o.onDrop&&this.o.onDrop(this)};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',e=>{if(this.drag||e.shiftKey){e.preventDefault();this.ur+=(e.deltaY>0?7:-7)}},{passive:false});
 }
 reveal(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=this.el;el.classList.remove('pbrev');void el.offsetWidth;el.classList.add('pbrev');if(!el.querySelector('.burst'))el.append(E('span','burst'));setTimeout(()=>el.classList.remove('pbrev'),1200)}
 remove(){this.el.remove();live.delete(this)}
}

/* ---------- table / dealer ---------- */
let onTable=[],discard=[],extras=[];
const pile=$('#pile'),acts=$('#acts'),PX=()=>-W/2+40,PY=()=>H/2-36;
const T=new Set();function later(f,ms){const id=setTimeout(()=>{T.delete(id);f()},ms);T.add(id);return id}
function clearLater(){T.forEach(clearTimeout);T.clear()}
function toPile(cs){cs.forEach((c,i)=>{c.gone=1;c.drag=0;c.pinch=0;c.el.classList.remove('sel','found','ok','dragging','pbrev');if(c.flipped)c.flip();c.tz=1;c.ur=0;
  c.set({x:PX()+i*.4,y:PY()-i*.4,r:rnd(-4,4),s:.34});c.el.style.zIndex=5+discard.length+i;c.el.style.pointerEvents='none'});
 discard.push(...cs);while(discard.length>36)discard.shift().remove();
 pile.hidden=!discard.length;pile.querySelector('span').textContent=discard.length}
pile.onclick=()=>{if(beats[active].tl!=null)return;const back=discard.splice(-Math.min(discard.length,10));back.forEach((c,i)=>{c.gone=0;c.el.style.pointerEvents='';c.el.style.zIndex=++Z;
  c.set({x:(i-(back.length-1)/2)*Math.min(CH*.5,(W-CH)/Math.max(1,back.length-1)),y:H*.12+rnd(-8,8),r:rnd(-6,6),s:1})});extras.push(...back);
 pile.hidden=!discard.length;pile.querySelector('span').textContent=discard.length};
function deal(list){ // list of [data, x, y, r, opts]
 return list.map(([d,x,y,r,o],i)=>{const c=new Card(d,o||{});c.set({x:x*.3,y:H/2+CH,r:rnd(-20,20),s:1},1);c.el.style.zIndex=++Z;
  later(()=>{if(!c.gone)c.set({x,y,r:r||0})},70*i+40);return c})}
function row(n,y,w,gap){const sp=Math.min(w+gap,(W-w-24)/Math.max(1,n-1));return Array.from({length:n},(_,i)=>[(i-(n-1)/2)*sp,y])}
const CW=CH*.714,CY=(TOP-BOT)/2; // table centre slightly above middle
function grid(n,cols){const rows=Math.ceil(n/cols),sx=Math.min(CW+14,(W-CW-24)/Math.max(1,cols-1)),sy=Math.min(CH+14,(AV-CH)/Math.max(1,rows-1));
 return Array.from({length:n},(_,i)=>[((i%cols)-(cols-1)/2)*sx,CY+((i/cols|0)-(rows-1)/2)*sy])}
function btn(t,f){const b=E('button',0,t);b.onclick=f;acts.append(b);return b}
const chip=$('#chip');function say(k,t,h){chip.classList.add('fade');setTimeout(()=>{$('#chipK').textContent=k;$('#chipT').textContent=t;$('#chipH').textContent=h||'';chip.classList.remove('fade')},200)}
function hint(h){$('#chipH').textContent=h}
const lb=$('#lb');lb.onclick=()=>lb.hidden=true;
function light(src,cap){lb.querySelector('img').src=src;lb.querySelector('p').textContent=cap||'';lb.hidden=false}

const PAIRS=[{"k":"002","n":"2","title":"Origin of the Incredible Hulk","src":"The Incredible Hulk (1968) #393, Cover","art":"Dale Keown","flip":0,"M":[[0.81312,0.00034,-29.9356],[0.00226,0.80913,-216.95357]]},{"k":"004","n":"4","title":"Origin of Thor","src":"Journey Into Mystery (1952) #89, Cover","art":"Jack Kirby","flip":0,"M":[[0.92827,0.00271,-46.77918],[-0.00531,0.92869,-166.91902]]},{"k":"005","n":"5","title":"Amazing Spider-Man #1","src":"Web of Spider-Man (1985) #109, Page 2","art":"Rurik Tyler","flip":0,"M":[[1.0965,-0.00557,-70.50635],[-0.00249,1.08428,-24.60087]]},{"k":"006","n":"6","title":"The Origin of Iron Man","src":"Tales of Suspense (1959) #39, Page 1","art":"Don Heck","flip":0,"M":[[1.00011,-0.01738,-63.68698],[0.02421,0.99278,-76.68613]]},{"k":"007","n":"7","title":"Hulk -vs- Thing","src":"Fantastic Four Unlimited (1993) #4, Cover","art":"Herb Trimpe","flip":0,"M":[[1.34167,0.00047,-99.72012],[-0.00047,1.34167,-174.94127]]},{"k":"008","n":"8","title":"Origin of Vulture","src":"The Spectacular Spider-Man (1976) #188, Cover","art":"Sal Buscema","flip":0,"M":[[0.53342,0.00675,-81.52221],[-0.00441,0.53102,-177.83187]]},{"k":"009","n":"9","title":"Origin of Doc Ock","src":"Lethal Foes of Spider-Man (1994) #3, Page 2","art":"Keith Pollard; David Boller","flip":0,"M":[[1.12183,0.00738,-423.71683],[1e-05,1.111,-334.71892]]},{"k":"011","n":"11","title":"Avengers Assemble","src":"The Avengers (1963) Annual #20, Page 56","art":"Mike Mignola","flip":0,"M":[[0.44137,0.00479,-42.54058],[-0.00479,0.44137,-85.11099]]},{"k":"012","n":"12","title":"Origin of Dr. Strange","src":"Marvel Treasury Edition (1974) #6, Page 57","art":"Frank Brunner","flip":0,"M":[[2.19358,-0.0167,-634.2052],[0.0167,2.19358,-877.01276]]},{"k":"015","n":"15","title":"Scorpion -vs- Spider-Man","src":"The Amazing Spider-Man (1963) #20, Cover","art":"Steve Ditko","flip":0,"M":[[2.26585,-0.03121,-18.21014],[0.03313,2.26195,-152.04933]]},{"k":"017","n":"17","title":"Daredevil -vs- Submariner","src":"Daredevil: The Man Without Fear (1964) #7, Cover","art":"Wally Wood","flip":0,"M":[[0.48077,0.00219,-16.49137],[0.00247,0.48084,-124.9405]]},{"k":"018","n":"18","title":"Wedding of Reed & Sue","src":"Fantastic Four (1963) #375, Cover","art":"Tom DeFalco","flip":0,"M":[[1.65346,-0.00772,-489.82165],[-0.00119,1.63198,-607.28132]]},{"k":"019","n":"19","title":"Origin of the Sentinels","src":"Uncanny X-Men (1963) #140, Cover","art":"John Byrne","flip":0,"M":[[1.85751,-0.00381,-292.91806],[-0.01374,1.85238,-379.21217]]},{"k":"021","n":"21","title":"Origin of Silver Surfer","src":"The Incredible Hulk (1968) #414, Page 20","art":"Gary Frank","flip":0,"M":[[0.47694,-0.0017,-19.60152],[0.00561,0.47517,-154.18873]]},{"k":"023","n":"23","title":"Origin of Rhino","src":"The Amazing Spider-Man (1963) #43, Cover","art":"John Romita Sr.","flip":0,"M":[[1.28674,-0.00964,-66.78882],[0.01621,1.28567,-574.52876]]},{"k":"024","n":"24","title":"Peter Meets Mary Jane","src":"Marvel Swimsuit Issue (1992) #2, Page 17","art":"Kirk Jarvinen","flip":0,"M":[[0.85066,0.00694,6.72556],[-0.00694,0.85066,-6.95095]]},{"k":"026","n":"26","title":"Origin of Warlock","src":"The Warlock Chronicles (1993) #1, Cover","art":"Tom Raney","flip":0,"M":[[0.54286,0.00457,-192.63927],[-0.00399,0.52935,-374.92471]]},{"k":"028","n":"28","title":"Mephisto Appears","src":"West Coast Avengers (1985) Annual #8, Page 51","art":"Larry Alexander","flip":0,"M":[[1.44063,0.00683,-1042.46897],[0.00055,1.43736,-345.36125]]},{"k":"029","n":"29","title":"Origin of Morbius","src":"Morbius (1992) #1, Mini-Poster","art":"Ron Wagner; Mike Witherby","flip":0,"M":[[0.65436,0.00244,39.93228],[-0.00636,0.64959,-66.044]]},{"k":"030","n":"30","title":"Origin of Ghost Rider","src":"The Original Ghost Rider (1992) #8, Cover","art":"Mike Ploog","flip":0,"M":[[2.40015,-0.01917,-62.08165],[0.02144,2.40142,-271.37408]]},{"k":"031","n":"31","title":"Thanos Attacks","src":"The Infinity War (1992) #6, Page 14","art":"Ron Lim","flip":0,"M":[[1.46171,-0.00031,-1651.78111],[-0.00996,1.47178,-1737.73967]]},{"k":"034","n":"34","title":"Wolverine vs. Hulk","src":"The Incredible Hulk (1968) #340, Cover","art":"Todd McFarlane","flip":0,"M":[[1.61638,0.0205,-135.52215],[-0.0121,1.64395,-302.61656]]},{"k":"036","n":"36","title":"Origin of the Invaders","src":"The Invaders (1993) #1, Cover","art":"Dave Hoover","flip":0,"M":[[1.49996,-0.00188,-57.31095],[0.00036,1.51956,-194.05824]]},{"k":"039","n":"39","title":"Origin of She-Hulk","src":"The Sensational She-Hulk #1, Cover","art":"John Byrne","flip":0,"M":[[1.36881,-0.05174,-30.55921],[0.03339,1.34126,-227.32272]]},{"k":"041","n":"41","title":"Days of Future Past","src":"X-Men Adventures (1992) #1, Page 12","art":"Andrew Wildman","flip":0,"M":[[0.73766,0.88006,-1640.19411],[-0.88395,0.73363,262.77914]]},{"k":"042","n":"42","title":"Elektra Appears","src":"In-house sketches by Frank Miller","art":"Frank Miller","flip":0,"M":[[2.66343,-0.06421,-2280.59299],[0.05429,2.69377,-368.16289]]},{"k":"043","n":"43","title":"Death of Elektra","src":"Daredevil: The Man Without Fear (1964) #182, Cover","art":"Frank Miller","flip":0,"M":[[1.13633,-0.0235,-204.7739],[0.02842,1.13073,-553.57009]]},{"k":"044","n":"44","title":"Hobgoblin Appears","src":"1987 Marvel Hobgoblin 5-foot store stand-up display","art":"","flip":0,"M":[[2.15467,0.1764,-1652.96349],[-0.17883,2.201,-181.90944]]},{"k":"045","n":"45","title":"Origin of Alpha Flight","src":"Alpha Flight (1983) #128, Page 13","art":"Dario Carrasco Jr.","flip":0,"M":[[1.87615,0.022,-376.92395],[-0.02387,1.89213,-713.51171]]},{"k":"046","n":"46","title":"Ballad of Beta Ray Bill","src":"Thor (1966) #339, Page 20","art":"Walter Simonson","flip":0,"M":[[1.28691,0.00591,-10.1146],[-0.00591,1.28691,-18.89709]]},{"k":"047","n":"47","title":"The Trial of Reed Richards","src":"The Fantastic Four (1963) #262, Page 8","art":"John Byrne","flip":0,"M":[[2.13054,-0.04661,-282.03115],[0.07888,2.08408,11.25366]]},{"k":"048","n":"48","title":"The Black Costume Saga","src":"Marvel Tales (1964) #266, Cover","art":"Ron Lim","flip":0,"M":[[0.5304,-0.0041,-143.63537],[0.00424,0.52993,-198.8154]]},{"k":"049","n":"49","title":"Origin of Puma","src":"Marvel Tales (1964) #271, Cover","art":"Ron Lim","flip":0,"M":[[2.26919,-0.01091,-35.76632],[0.01759,2.25149,-1.73066]]},{"k":"050","n":"50","title":"Silver Sable Inc.","src":"Silver Sable and the Wild Pack (1992) #17, Cover","art":"Steven Butler","flip":0,"M":[[2.82162,0.00426,-120.0911],[-0.00069,2.68328,-424.3025]]},{"k":"053","n":"53","title":"Sabretooth vs. Wolverine","src":"The Uncanny X-Men (1963) #213, Cover","art":"Alan Davis","flip":0,"M":[[1.63736,0.02434,-41.10691],[-0.02305,1.61431,-55.9047]]},{"k":"054","n":"54","title":"Formation of Excalibur","src":"The Uncanny X-Men (1963) #300, Page 1","art":"John Romita Jr.","flip":0,"M":[[1.0274,0.00647,-758.07789],[-0.00012,1.00402,-611.49373]]},{"k":"057","n":"57","title":"The Wedding of Spider-Man & Mary Jane","src":"Web of Spider-Man Annual #4 (1988) wedding pin-up","art":"John Romita Sr. (pencils); John Romita Jr. (inks)","flip":0,"M":[[1.58475,0.20446,-272.00803],[-0.20446,1.58475,-263.70169]]},{"k":"059","n":"59","title":"Armor Wars","src":"Iron Man (1968) Annual #10, Page 50","art":"Bob Layton","flip":0,"M":[[0.89657,0.00201,-2.09293],[0.00536,0.89624,-119.77386]]},{"k":"060","n":"60","title":"Tombstone vs. Spider-Man","src":"The Spectacular Spider-Man (1976) #206, Cover","art":"Sal Buscema","flip":0,"M":[[0.50923,0.00292,-56.73523],[-0.00533,0.50027,-196.06811]]},{"k":"061","n":"61","title":"Origin of Venom","src":"Venom: Lethal Protector (1993) Gold Retailer Incentive, Back Cover","art":"Mark Bagley; Al Milgrom","flip":0,"M":[[2.27417,-0.01319,-98.11151],[-0.00865,2.28782,-310.64587]]},{"k":"062","n":"62","title":"Origin of Typhoid Mary","src":"Daredevil: The Man Without Fear (1964) #254, Page 2","art":"John Romita Jr.","flip":0,"M":[[0.96352,0.00168,-18.01428],[-0.00177,0.96727,-6.1534]]},{"k":"065","n":"65","title":"Captain America vs. The Captain","src":"Captain America (1968) #422, Page 8","art":"","flip":0,"M":[[0.90508,-0.01178,-140.01327],[0.00828,0.89316,-762.1638]]},{"k":"066","n":"66","title":"Universal Guardian","src":"1992 Comic Images Silver Surfer Card Set #66; Unused Corner Box Art","art":"Andy Smith","flip":0,"M":[[2.19923,-0.05138,-12.22215],[-0.01392,2.23687,-119.73786]]},{"k":"067","n":"67","title":"The Cosmic Spider-Man","src":"The Spectacular Spider-Man (1976) #201, Page 21","art":"Sal Buscema","flip":0,"M":[[1.52089,0.0088,-277.41037],[-0.01651,1.50782,-99.29848]]},{"k":"068","n":"68","title":"The Origin of Nomad","src":"Nomad (1990) #1, Cover","art":"S. Clarke Hawbaker","flip":0,"M":[[0.33126,0.00155,4.26569],[0.00058,0.35192,-200.23165]]},{"k":"070","n":"70","title":"Cable Returns from the Future","src":"1992 Impel X-Men Series I by Jim Lee","art":"Jim Lee","flip":0,"M":[[2.58745,0.01755,-168.62261],[-0.00169,2.53998,-111.85538]]},{"k":"072","n":"72","title":"The Creation of Deathlok","src":"Deathlok (1990) #1, Page 28","art":"Jackson Guice","flip":0,"M":[[0.59601,0.00579,-212.67106],[-0.0044,0.59727,-33.53361]]},{"k":"073","n":"73","title":"Origin of the New Warriors","src":"Nova (1993) #1, Page 1","art":"Chris Marrinan","flip":0,"M":[[1.02266,0.00265,-90.40247],[0.00153,1.02785,-88.65658]]},{"k":"076","n":"76","title":"X-Tinction Agenda","src":"X-Tinction Agenda House Ad/Promotional Material; X-Men (1991) #1 Composite (Cyclops)","art":"Jim Lee","flip":0,"M":[[2.6625,-0.00356,-168.92096],[-0.03413,2.65032,-189.89769]]},{"k":"079","n":"79","title":"Origin of Shatterstar","src":"X-Force (1991) Annual #1, Cover","art":"Greg Capullo","flip":0,"M":[[0.77785,-0.01153,-20.13982],[0.0133,0.76053,-205.21292]]},{"k":"080","n":"80","title":"New Mutants No More","src":"The New Mutants (1983) #100, Cover","art":"Rob Liefeld","flip":0,"M":[[1.20896,-0.01282,10.43559],[0.01408,1.23411,-88.04285]]},{"k":"081","n":"81","title":"The Return of Blaze","src":"Ghost Rider & Blaze: Spirits of Vengeance (1992) #1, Mini-Poster","art":"Adam Kubert","flip":0,"M":[[1.80381,-0.00602,-63.62664],[-0.01761,1.79812,2.71038]]},{"k":"082","n":"82","title":"Child of the Future","src":"X-Factor (1986) #66, Cover","art":"Whilce Portacio","flip":0,"M":[[1.88035,0.00443,-269.86225],[0.03242,1.89246,-784.27876]]},{"k":"083","n":"83","title":"The New X-Factor","src":"X-Factor (1986) #71, Cover","art":"Larry Stroman","flip":0,"M":[[0.50357,0.00188,-12.32282],[-0.00158,0.50224,-228.90228]]},{"k":"084","n":"84","title":"Two Teams of X-Men","src":"The Uncanny X-Men (1963) #300, Cover","art":"John Romita Jr.","flip":0,"M":[[1.50705,-0.00123,-146.20008],[-0.01209,1.5125,-251.07813]]},{"k":"086","n":"86","title":"Omega Red vs. Wolverine","src":"X-Men (1991) #5, Cover","art":"Jim Lee","flip":0,"M":[[1.27418,0.02159,-184.50453],[-0.01233,1.26867,-82.93263]]},{"k":"087","n":"87","title":"The Punisher Infiltrates the Mob","src":"The Punisher: War Zone (1993) #8, Cover","art":"John Romita Jr.","flip":0,"M":[[2.87284,0.00487,-65.10218],[-0.01186,2.85872,-298.83676]]},{"k":"088","n":"88","title":"Origin of Carnage","src":"The Amazing Spider-Man (1963) #384, Page 16","art":"Mark Bagley","flip":0,"M":[[3.19983,-0.05087,-1680.84946],[-0.00121,3.23335,-217.04164]]},{"k":"089","n":"89","title":"The New Cage","src":"Cage (1992) #1, Cover","art":"Dwayne Turner","flip":0,"M":[[0.75532,-0.00068,-85.65381],[0.00068,0.75532,-152.7189]]},{"k":"090","n":"90","title":"Outbreak of War Machine","src":"Iron Man (1968) #282, Cover","art":"Kevin Hopgood","flip":0,"M":[[0.99084,-0.00112,-60.90132],[-0.00035,0.97005,-202.14209]]},{"k":"091","n":"91","title":"Death of Mariko","src":"Wolverine (1988) #65, Page 18","art":"Mark Texeira","flip":0,"M":[[1.31346,0.00134,-444.30471],[-0.00344,1.29208,-250.56145]]},{"k":"093","n":"93","title":"The Origin of Nightstalkers","src":"Nightstalkers (1992) #1, Mini-Poster","art":"Andy Kubert (pencils); Adam Kubert (inks)","flip":0,"M":[[2.08367,0.03893,-66.13454],[-0.06097,2.07115,-193.53585]]},{"k":"100","n":"100","title":"Venom: Lethal Protector","src":"Venom: Lethal Protector #1, Cover","art":"Mark Bagley","flip":0,"M":[[1.21482,-0.00206,2.87504],[0.00552,1.20935,1.57408]]},{"k":"101","n":"101","title":"Origin of Punisher 2099","src":"Punisher 2099 (1993) #1, Cover","art":"Tom Morgan","flip":0,"M":[[1.2088,0.00697,1.01705],[-0.00697,1.2088,6.6672]]},{"k":"102","n":"102","title":"The Death of Green Goblin","src":"The Spectacular Spider-Man (1976) #200, Page 30","art":"Sal Buscema","flip":0,"M":[[1.20222,0.00576,1.96409],[0.00828,1.2591,-17.30978]]},{"k":"103","n":"103","title":"Vision vs. Avengers","src":"The Avengers (1963) #360, Cover","art":"Steve Epting","flip":0,"M":[[1.1844,-0.01007,16.58622],[0.01813,1.20722,1.04392]]},{"k":"104","n":"104","title":"Maximum Carnage","src":"Spider-Man Unlimited #2, Cover","art":"Ron Lim","flip":0,"M":[[1.1913,0.00935,5.04844],[0.00599,1.2231,-2.56636]]},{"k":"105","n":"105","title":"The Resurrection of Namor","src":"Namor the Submariner (1990) #37, Page 20","art":"Jae Lee","flip":0,"M":[[1.21148,-0.00061,3.87563],[0.00061,1.21148,3.26968]]},{"k":"106","n":"106","title":"Random Encounter","src":"X-Factor (1986) #88, Page 5","art":"Joe Quesada","flip":0,"M":[[1.2194,-0.00702,2.78363],[0.02008,1.21605,-4.5811]]},{"k":"107","n":"107","title":"Psylocke vs. Revanche","src":"1992 Impel Marvel Universe Series III, Psylocke, #51","art":"Paul Ryan","flip":0,"M":[[1.23132,0.00176,-3.12733],[0.00431,1.21559,2.76604]]},{"k":"108","n":"108","title":"The Coming of Psi-Lord","src":"Fantastic Four (1963) #383, Page 22","art":"Paul Ryan","flip":0,"M":[[1.20603,0.00191,4.80824],[-0.00193,1.21992,0.77706]]},{"k":"109","n":"109","title":"Origin of Thunderstrike","src":"Thunderstrike! (1993) #1, Cover","art":"Ron Frenz","flip":0,"M":[[1.22751,-0.00147,-1.71716],[0.00331,1.22109,-3.1257]]},{"k":"110","n":"110","title":"The Infinity Crusade","src":"The Infinity Crusade (1993) #5, Cover; The Infinity Crusade (1995) #2, Page 36","art":"Ron Lim","flip":0,"M":[[1.22832,-0.00154,-1.28902],[-0.00302,1.2062,7.97324]]},{"k":"113","n":"113","title":"The Death of Illyana","src":"The Uncanny X-Men (1963) #303, Page 22","art":"Richard Bennett","flip":0,"M":[[1.21903,0.00054,0.44116],[0.0055,1.21962,-1.96253]]},{"k":"114","n":"114","title":"Gambit & Rogue","src":"X-Men (1991) #24, Cover","art":"Andy Kubert","flip":0,"M":[[1.21271,-0.00331,3.37568],[0.00454,1.22705,-4.72288]]},{"k":"115","n":"115","title":"Vengeance Appears","src":"Ghost Rider (1990) #46, Page 11","art":"Ron Garney","flip":0,"M":[[1.20957,-0.00057,5.0715],[0.00509,1.20552,3.98553]]},{"k":"116","n":"116","title":"Fall from Grace","src":"Daredevil: The Man Without Fear (1964) #325, Page 39","art":"Scott McDaniel","flip":0,"M":[[1.21781,0.00134,1.06205],[-0.00352,1.20243,10.37345]]},{"k":"117","n":"117","title":"The New Ravage","src":"Ravage 2099 (1993) #12, Page 2","art":"Grant Miehm","flip":0,"M":[[1.21352,0.00197,2.59789],[-0.00197,1.21352,4.00055]]},{"k":"118","n":"118","title":"Magneto vs. Wolverine","src":"Wolverine (1988) #75, Page 4","art":"Adam Kubert","flip":0,"M":[[1.21122,0.01298,-5.17239],[-0.01682,1.19677,15.51099]]},{"k":"120","n":"120","title":"Magneto Returns","src":"The Uncanny X-Men (1963) #304, Page 16","art":"John Romita Jr.","flip":0,"M":[[1.20647,-0.01753,17.19994],[0.0224,1.21986,-3.37987]]},{"k":"123","n":"123","title":"Exodus Appears","src":"X-Factor (1986) #92, Page 14","art":"Joe Quesada","flip":0,"M":[[1.21469,-0.00496,6.12051],[0.00036,1.22,0.19395]]},{"k":"125","n":"125","title":"Return of Zarathos","src":"Ghost Rider & Blaze: Spirits of Vengeance #16, Page 1","art":"Henry Martinez","flip":0,"M":[[1.22788,0.00204,-3.10011],[-0.00745,1.22578,0.94363]]},{"k":"130","n":"130","title":"Venom: The Madness","src":"Venom: The Madness (1993) #2, Page 4","art":"Kelley Jones","flip":0,"M":[[1.20078,0.0092,5.49132],[-0.00895,1.21562,3.40042]]},{"k":"131","n":"131","title":"The Coming of Strange","src":"Doctor Strange (1988) #61, Cover","art":"","flip":0,"M":[[1.22027,0.00073,-0.56735],[0.00537,1.2133,0.98192]]},{"k":"132","n":"132","title":"Suicide Run Begins","src":"Punisher: War Journal (1988) #61, Cover","art":"","flip":0,"M":[[1.21463,-0.00524,2.9481],[-0.00774,1.21516,4.57819]]},{"k":"133","n":"133","title":"The Origin of Legacy","src":"The Silver Surfer (1987) Annual #6, Cover","art":"Joe Phillips","flip":0,"M":[[1.2124,0.00363,1.63128],[0.0024,1.19065,10.44]]},{"k":"134","n":"134","title":"Marvel Boy becomes Justice","src":"New Warriors Ashcan Edition, Back Cover","art":"Craig Brasfield","flip":0,"M":[[1.20187,-0.00306,5.91849],[0.00376,1.21749,0.55721]]},{"k":"135","n":"135","title":"Maximum Carnage Part I","src":"1992 Impel Marvel Universe #120 Carnage","art":"Ron Lim","flip":0,"M":[[1.2253,0.00705,-4.77924],[0.00126,1.21135,4.98339]]},{"k":"136","n":"136","title":"Maximum Carnage Part II","src":"Ghost Rider & Blaze: Spirits of Vengeance #6, Cover","art":"Adam Kubert","flip":0,"M":[[1.22564,0.00659,-6.33327],[0.00587,1.19259,15.90709]]},{"k":"137","n":"137","title":"Maximum Carnage Part III","src":"The Amazing Spider-Man (1963) #384, Page 16","art":"Mark Bagley","flip":0,"M":[[1.20658,-0.00179,5.18922],[-0.01931,1.22503,1.35878]]},{"k":"138","n":"138","title":"Maximum Carnage Part IV","src":"The Amazing Spider-Man (1963) #379, Page 8","art":"Mark Bagley","flip":0,"M":[[1.23606,0.0006,-4.35132],[0.00669,1.24153,-9.60923]]},{"k":"139","n":"139","title":"Maximum Carnage Part V","src":"Amazing Spider-Man (1961) #336, Page 13","art":"Erik Larsen","flip":0,"M":[[1.21543,-0.00335,3.22486],[0.00833,1.22085,-5.73646]]},{"k":"140","n":"140","title":"Maximum Carnage Part VI","src":"Spider-Man vs. Venom TPB (1990), Back Cover","art":"Todd McFarlane","flip":0,"M":[[1.21798,-0.00295,5.95887],[0.00295,1.21798,-1.24011]]},{"k":"141","n":"141","title":"X-Men Blue - Mutant Genesis","src":"X-Men (1991) #26, Cover","art":"Andy Kubert","flip":0,"M":[[1.22392,-0.01661,7.38264],[-0.00422,1.21144,7.90897]]},{"k":"143","n":"143","title":"X-Men Gold - Mutant Genesis","src":"Uncanny X-Men (1963) Annual #17, Page 62","art":"Michael Bair","flip":0,"M":[[1.2117,0.0016,2.2417],[0.00016,1.20657,3.76476]]},{"k":"144","n":"144","title":"X-Force - Mutant Genesis","src":"X-Force (1991) #15, Page 14","art":"Greg Capullo","flip":0,"M":[[1.21248,0.00471,0.17996],[-0.00576,1.21266,5.6141]]},{"k":"145","n":"145","title":"X-Men Blue - Mutant Genesis","src":"X-Men (1991) Annual #1, Cover","art":"Jim Lee","flip":0,"M":[[1.2191,-0.02117,10.81482],[-0.00472,1.22289,1.05082]]},{"k":"146","n":"146","title":"X-Force - Mutant Genesis","src":"X-Force (1991) #23, Cover","art":"Greg Capullo","flip":0,"M":[[1.22711,-0.00713,-1.43462],[-0.00645,1.21736,3.55963]]},{"k":"147","n":"147","title":"X-Force - Mutant Genesis","src":"X-Force (1991) #19, Page 1","art":"Greg Capullo","flip":0,"M":[[1.19636,0.00521,6.45693],[-0.00521,1.19636,12.25104]]},{"k":"149","n":"149","title":"X-Factor - Mutant Genesis","src":"X-Factor (1986) #90, Page 8","art":"Joe Quesada","flip":0,"M":[[1.2112,-0.00341,3.78313],[-0.00954,1.22038,3.48458]]},{"k":"pb02","n":"PB2","title":"Cyclops","src":"X-Men Team Pin-Up","art":"Joe Quesada","flip":0,"M":[[1.21988,0.00676,-1.36836],[0.0001,1.21914,-2.80909]]},{"k":"pb03","n":"PB3","title":"Iron Man","src":"Iron Man (1968) #301, Cover","art":"Kevin Hopgood","flip":0,"M":[[1.20345,-0.00704,9.13709],[-0.00086,1.21077,5.99318]]},{"k":"pb04","n":"PB4","title":"Magneto","src":"The Uncanny X-Men (1963) #269, Page 22","art":"Jim Lee","flip":0,"M":[[1.20439,-0.0147,11.41966],[-0.00845,1.22287,3.04622]]},{"k":"pb06","n":"PB6","title":"Storm","src":"1992 Impel Marvel Universe, Storm, #30","art":"Lee Weeks","flip":0,"M":[[1.20763,-0.01569,13.25318],[-0.02899,1.17557,33.91073]]},{"k":"pb07","n":"PB7","title":"Venom","src":"Venom: Lethal Protector #2","art":"Mark Bagley","flip":0,"M":[[1.21653,-0.00235,3.87791],[-0.0062,1.21355,5.31972]]},{"k":"pb08","n":"PB8","title":"Wolverine","src":"Wolverine (1988) #67, Cover","art":"Mark Texeira","flip":0,"M":[[1.20191,-0.00048,7.41753],[0.0008,1.19799,7.81848]]},{"k":"pb10","n":"PB10","title":"Punisher","src":"Punisher: War Journal (1988) #42, Cover","art":"","flip":0,"M":[[1.19962,-0.00456,7.78963],[0.00456,1.19962,5.93873]]},{"k":"pb11","n":"PB11","title":"Captain America","src":"The Uncanny X-Men (1963) #268, Page 1","art":"Jim Lee","flip":0,"M":[[1.20814,-0.00103,1.55437],[-0.00423,1.2082,5.69712]]},{"k":"pb12","n":"PB12","title":"Gambit","src":"X-Men Annual (Vol. 2, 1992) #1, Page 41","art":"Andy Kubert","flip":0,"M":[[1.1896,0.00313,6.25461],[-0.01561,1.20561,7.62221]]},{"k":"pb13","n":"PB13","title":"Thor","src":"Thor (1966) #400, Page 36","art":"Ron Frenz","flip":0,"M":[[1.20652,-0.01079,11.18976],[0.00702,1.20591,4.26618]]},{"k":"pb15","n":"PB15","title":"Spider-Man","src":"The Amazing Spider-Man (1963) #322, Page 8","art":"Todd McFarlane","flip":0,"M":[[1.21278,-0.00314,4.72057],[0.00314,1.21278,3.56684]]},{"k":"pb16","n":"PB16","title":"Deadpool","src":"Marvel Press Posters #143; Marvel Spotlight Vol. 3 (1993) #6, Cover","art":"Joe Madureira","flip":0,"M":[[1.22934,-0.01431,1.86965],[0.004,1.19899,7.92682]]},{"k":"pb17","n":"PB17","title":"Invisible Woman","src":"The Fantastic Four (1961) #351, Page 12","art":"Mark Bagley","flip":0,"M":[[1.21812,0.01327,-6.44821],[-0.00426,1.20916,7.8669]]}];
const icon=[[1,'#1 The Thing'],[58,'#58 Jubilee'],[94,'#94 Spider-Man 2099'],[57,'#57 The wedding'],[93,'#93 Nightstalkers'],[10,'#10 Xavier'],[44,'#44 Hobgoblin'],[85,'#85 Bishop']];
const randBase=(k,ex=[])=>{const s=new Set();while(s.size<k){const n=1+(Math.random()*150|0);if(!ex.includes(n))s.add(n)}return[...s]};
const fan=(ds,y)=>{const n=ds.length,sp=Math.min(CW*.62,(W-CW-30)/Math.max(1,n-1));return ds.map((d,i)=>{const t=i-(n-1)/2;return[d,t*sp,y+Math.abs(t)*Math.abs(t)*4,t*(mob?5:4)]})};

const TLE=[['May 1994','The first indexed ad: Fantastic Four #388 carries the newsprint “Inaugural Edition” ad.',PF+'adpage-comic.jpg'],
 ['May 1994','The glossy magazine ad, with Powerblast art, runs in Tuff Stuff’s Collect! the same month.',PF+'adpage-mag.jpg'],
 ['June 1994','Tuff Stuff’s Collect! comes with a 4-card promo sheet. “Ships June 1994” is printed on the sheets.',PF+'mg3.jpg'],
 ['June 11–14, 1994','Omega Red vs. Wolverine promo Flairprint, handed out at Diamond’s Annual Retailer Seminar in Baltimore.',PR+'omega-red-wolverine.jpg'],
 ['July 1994','Marvel Age #138 runs the preview, “Where the Past and Future Collide,” with a 4-card sheet in the bag.',PF+'ma1.jpg'],
 ['July 1994','Pages 26–27: Marvel and Fleer reveal that every card is previously published art, freshly colored on computer.',PF+'ma138-p26-27.jpg'],
 ['July 1994','Wizard #35 is polybagged with a sheet reported to be the gold-foil etched version.',PF+'mg1.jpg'],
 ['July 1994','Advance Comics #67 comes with a 4-card sheet.',PF+'mg2.jpg'],
 ['July 1994','Hero Illustrated #13 carries the separate Flairprints ad.',PF+'adpage-flairprints.jpg']];
const beats=[
 {k:'Flair ’94: Hands On',t:'Marvel and Fleer, 1994: 150 cards, each a milestone in Marvel history. Scroll to deal; the cards are yours to hold.',h:'Drag a card. Double-tap to flip.',
  deal:()=>fan(icon.slice(0,mob?4:5).map(([n,l])=>card(n)),CY)},
 {k:'Base set · 150',t:'Thick stock, double UV coated and foil stamped on both sides.',h:'Flip one — every back has its own story.',
  deal:()=>fan(icon.slice(mob?2:3,8).concat([]).map(([n])=>card(n)).slice(0,mob?5:6),CY+CH*.08)},
 {k:'How the art was made',t:'Marvel’s Special Projects team sent previously published black line art, with color guides, to McGrew Color Graphics, which painted it on computer.',h:'',
  deal:()=>artDeal(),acts:()=>{btn('←',()=>{pi=(pi-PER+PAIRS.length)%PAIRS.length;redeal(artDeal())});btn('→',()=>{pi=(pi+PER)%PAIRS.length;redeal(artDeal())});jump=E('select','jump');jump.setAttribute('aria-label','Jump to card');PAIRS.forEach((p,i)=>{const o=E('option',0,(p.k.startsWith('pb')?'PB'+(+p.k.slice(2)):'#'+p.n)+' '+p.title);o.value=i;jump.append(o)});jump.onchange=()=>{pi=+jump.value;redeal(artDeal())};acts.append(jump);const g=btn('Ghost',()=>{const on=stage.classList.toggle('ghost');g.classList.toggle('on',on);if(on)onTable.forEach(c=>{if(c.o.ov){c.ur=0;c.set({x:c.o.hx,y:c.o.hy,r:0})}})})}},
 {k:'Powerblasts · 18',t:'The chase set: prismatic, metallic-enhanced cards, about one in every two packs. Marvel Age had promised 20; eighteen shipped.',h:'Spot the Powerblasts.',
  deal:()=>{const n=mob?4:6,k=2;const ds=shuf([...shuf(Array.from({length:18},(_,i)=>i+1)).slice(0,k).map(pb),...randBase(n-k).map(card)]);
   const g=grid(n,mob?2:3);return ds.map((d,i)=>[d,g[i][0],g[i][1],rnd(-3,3),{onGrab:spot,onFlip:spot}])},
  after:()=>{found=0;hint(`Spot the Powerblasts · 0 of ${onTable.filter(c=>c.d.pb).length}`)}},
 {k:'Flairprints & binder inserts',t:'Flairprints were 6½″ × 10″ case bonuses, almost three cards tall, reusing Powerblast #1–10 art. The five binder inserts reuse Powerblast #11–15 art with no logo, no title and no foil.',h:'Shown at true size: a standard 2½″ × 3½″ card sits beside them for scale.',
  deal:()=>{/* true scale: Flairprint 6.5x10in (checklist notes); binder insert sized like Flairprints; standard card 2.5x3.5in */
   const ppi=mob?Math.min(AV*.86/10,W*.94/13.4):Math.min(AV*.9/10,W*.9/17.2),h=Math.round(10*ppi),w=6.5*ppi,ch=Math.round(3.5*ppi),cw=2.5*ppi;
   const L=mob?[[-w*.52,CY,-2],[w*.52,CY+8,2],[W*.5-cw*.62,CY+h/2-ch*.45,6]]:[[-(cw/2+.5*ppi+w/2),CY,-2],[cw/2+.5*ppi+w/2,CY,2],[0,CY+h/2-ch/2,0]];
   const c=card(randBase(1)[0]);c.h=ch;
   return[[{f:`${I}flairprint-fx/hd/${p2(1+(Math.random()*10|0))}.jpg`,ar:907/1400,h,blank:'Blank · UPC 0 41199 00258 1'},L[0][0],L[0][1],L[0][2]],
    [{f:`${I}binder-fx/hd/${p2(1+(Math.random()*5|0))}.jpg`,ar:907/1400,h,blank:'Completely blank back'},L[1][0],L[1][1],L[1][2]],
    [c,L[2][0],L[2][1],L[2][2]]]}},
 {k:'Promos & promo sheets',t:'Deadpool and Omega Red promo Flairprints went to the trade. Double-sided 5″ × 7″ 4-card sheets came bagged with Wizard #35, Advance Comics #67, Marvel Age #138 and Tuff Stuff’s Collect!. Nine uncut 7⅝″ × 10⅝″ 9-card sheets came in Fleer’s 1994 media press kit, never sold in packs.',h:'Double-tap a sheet to see its back. Tap a card on the 9-card sheet to pop it out.',
  deal:()=>{const it=[{f:PR+'deadpool-flairprint.jpg',ar:.65,flat:1},{f:PR+'omega-red-wolverine.jpg',ar:.65,flat:1},
    {f:PR+'sheet4-foil.jpg',b:PR+'sheet4-released-back.jpg',ar:999/1399,flat:1},{f:PR+'sheet4-unreleased.jpg',b:PR+'sheet4-unreleased-back.jpg',ar:999/1399,flat:1},
    {f:PR+'sheet9-2.jpg',b:PR+'sheet9-2-back.jpg',ar:1018/1400,flat:1,pop:1}];
   if(mob){const L=[it[Math.random()<.5?0:1],it[2],it[3],it[4]],h=Math.round(Math.min(AV*.44,(W/2-18)/.73)),dx=W*.235,dy=AV*.235;
    return L.map((d,i)=>[{...d,h},(i%2?dx:-dx),CY+26+(i<2?-dy:dy),rnd(-3,3),d.pop?{onSingle:pop}:{}])}
   const h=Math.round(Math.min(AV*.66,W*.88/5/.76)),sp=(W*.88-h*.76)/4;
   return it.map((d,i)=>[{...d,h:d.pop?Math.round(h*1.08):h},(i-2)*sp,CY+(i%2?14:-10),rnd(-4,4),d.pop?{onSingle:pop}:{}])}},
...TLE.map((e,k)=>({k:'Release timeline · 1994',t:'Scroll to move through the year, one piece at a time.',tl:k})),
 {k:'Free play',t:'Each Deal opens one pack of 10 cards, base cards unique within the pack.',h:'Pack odds: Powerblast about 1 in 2 packs (about 12 per 24-pack box), per the checklist. Double-tap flips; two fingers twist.',
  deal:()=>openPack(),after:()=>{},acts:()=>{btn('Deal a pack',()=>{{const nc=deal(openPack());onTable.push(...nc);revealDealt(nc)}});
   btn('Gather',()=>all().forEach((c,i)=>c.set({x:i*.5,y:CY-i*.5,r:rnd(-3,3)})));
   btn('Shuffle',()=>all().forEach(c=>{c.set({x:rnd(-W*.38,W*.38),y:CY+rnd(-H*.22,H*.2),r:rnd(-30,30)});c.el.style.zIndex=10+(Math.random()*999|0)}));
   btn('Flip all',()=>all().forEach(c=>c.flip()))}},
];

const all=()=>onTable.concat(extras).filter(c=>c.el.isConnected);
let found=0;function spot(c){if(!c.d.pb||c.el.classList.contains('found'))return;c.el.classList.add('found');found++;const t=onTable.filter(x=>x.d.pb).length;hint(found>=t?`All ${t} found. Those are Powerblasts.`:`Spot the Powerblasts · ${found} of ${t}`)}
const S9=[92,30,56,93,33,59,87,15,133];
function pop(c,cx,cy){if(c.flipped)return;const[u,v]=c.local(cx,cy);if(u<0||u>1||v<0||v>1)return;const i=Math.min(2,u*3|0)+3*Math.min(2,v*3|0),n=S9[i];
 const w=c.el.offsetWidth,h=c.el.offsetHeight,nc=new Card(card(n));nc.set({x:c.x+(u-.5)*w,y:c.y+(v-.5)*h,r:c.r,s:.36},1);nc.el.style.zIndex=++Z;
 nc.set({x:mob?rnd(-W*.3,W*.3):c.x+w*.5+CW*.8+rnd(0,W*.12),y:mob?H*.26:CY+rnd(-H*.15,H*.15),r:rnd(-8,8),s:1});extras.push(nc);hint(`#${n} popped out. Left to right, top to bottom: #92, #30, #56, #93, #33, #59, #87, #15, #133.`)}


/* art match-ups */
let pi=0;const PER=mob?1:3;
function artDeal(){const ps=Array.from({length:PER},(_,i)=>PAIRS[(pi+i)%PAIRS.length]),pos=row(PER,CY-(mob?24:30),CW,mob?16:70);const out=[];
 ps.forEach((p,i)=>{const[x,y]=pos[i],pbk=p.k.startsWith('pb');
  out.push([{f:'align/'+p.k+'.jpg',ar:857/1200,blank:'Original printed art',info:`<b>${pbk?'Powerblast #'+p.n.slice(2):'#'+p.n} ${p.title}</b>${p.src}<br>Art: ${p.art||'unknown'}`},x,y,0,{under:1}]);
  out.push([{...(pbk?pb(+p.k.slice(2)):card(+p.k))},x,y,0,{ov:1,hx:x,hy:y}])});
 if(jump)jump.value=pi;setTimeout(()=>hint(`Pair ${pi+1}${PER>1?'–'+Math.min(PAIRS.length,pi+PER):''} of ${PAIRS.length}. Drag a card aside, or turn on Ghost.`),260);return out}
let jump=null;
/* cinematic timeline */
let tlv=null;
function tlShow(k){if(k<0){if(tlv){const t=tlv;tlv=null;t.classList.add('gone');setTimeout(()=>t.remove(),500)}return}
 if(!tlv){tlv=E('div','tlv');tlv.append(E('div','tline'));TLE.forEach((e,i)=>{const it=E('figure','tli');const im=E('img');im.src=e[2];im.alt=e[1];im.decoding='async';it.append(im,E('figcaption',0,`<b>${e[0]}</b>${e[1]}`));const d=E('i','tdot');d.style.left=(8+84*i/(TLE.length-1))+'%';tlv.append(it,d)});stage.insertBefore(tlv,$('#chip'));requestAnimationFrame(()=>tlv.classList.add('in'))}
 [...tlv.querySelectorAll('.tli')].forEach((it,i)=>{const d=i-k;it.style.transform=`translate(-50%,-50%) translateX(${d*(mob?W*.92:Math.min(W*.42,600))}px) scale(${d?0.78:1}) rotate(${d*1.5}deg)`;it.style.opacity=d===0?1:Math.abs(d)===1?.28:0;it.classList.toggle('on',!d)});
 [...tlv.querySelectorAll('.tdot')].forEach((d,i)=>d.classList.toggle('on',i<=k))}
/* Pack composition, from the checklist (d3n4c3.com/94flair, index.html): hobby box = 24 packs x 10 cards;
   Powerblast chase "inserted 1 in every 2 packs (about 12 per box)"; ~1.52 base sets per box => the Powerblast takes a base slot.
   Flairprints were a case bonus and binder inserts came in binders, so neither appears in packs. */
let packs=0;
function openPack(){const hit=Math.random()<.5,base=randBase(hit?9:10).map(card),ds=[...base];
 if(hit)ds.splice(Math.random()*10|0,0,pb(1+(Math.random()*18|0)));
 const y=CY+((packs++%3)-1)*(mob?CH*.28:CH*.22);
 return fan(ds,y).map(([d,x,yy,r])=>[d,x,yy,r,FP])}
function revealDealt(cs){cs.forEach((c,i)=>{if(c.d.pb)later(()=>{if(!c.gone)c.reveal()},500+70*i)})}
const FP={onFlip:c=>{if(c.d.pb&&!c.flipped)c.reveal()}};
/* scroll = dealer */
const steps=$('#steps'),dots=$('#dots');beats.forEach(()=>{steps.append(E('div','step'));dots.append(E('i'))});
let active=-1;
function go(i){if(i===active)return;active=i;clearLater();[...dots.children].forEach((d,j)=>d.classList.toggle('on',j===i));
 const b=beats[i];say(b.k,b.t,b.h);acts.innerHTML='';stage.classList.remove('ghost');if(lb)lb.hidden=true;
 toPile([...live].filter(c=>!c.gone));extras=[];onTable=[];
 if(b.tl!=null){tlShow(b.tl);reconcile();return}
 tlShow(-1);b.acts&&b.acts();onTable=deal(b.deal());const L=b.deal.length;onTable.forEach(c=>{if(c.o.under)c.el.style.zIndex=5});
 if(b.k==='Free play')revealDealt(onTable);b.after&&b.after();reconcile()}
function redeal(list){toPile([...live].filter(c=>!c.gone));extras=[];onTable=deal(list);onTable.forEach(c=>{if(c.o.under)c.el.style.zIndex=5})}
function reconcile(){const keep=new Set(onTable.concat(extras));const stray=[...live].filter(c=>!c.gone&&!keep.has(c));if(stray.length)toPile(stray);
 discard.forEach((c,i)=>{if(c.el.isConnected){c.drag=0;c.set({x:PX()+i*.4,y:PY()-i*.4,s:.34})}})}
let se=0;addEventListener('scroll',()=>{clearTimeout(se);se=setTimeout(()=>{onScroll();reconcile()},160)},{passive:true});
function onScroll(){const st=$('#story').offsetTop,sh=steps.firstChild.offsetHeight;const i=Math.max(0,Math.min(beats.length-1,Math.floor((scrollY-st+innerHeight*.35)/sh)));go(i)}
let tick=0;addEventListener('scroll',()=>{if(!tick){tick=1;requestAnimationFrame(()=>{tick=0;onScroll()})}},{passive:true});
addEventListener('resize',()=>{W=stage.clientWidth;H=stage.clientHeight});
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('dblclick',e=>e.preventDefault());
onScroll();
})();

/* outro tear: real checklist behind, navigate past full tear */
(function(){const o=document.getElementById('outro');if(!o)return;const pk=document.getElementById('opeek');let q=0,fr=null,gone=0;
function nav(){if(gone)return;gone=1;try{localStorage.setItem('flair94-tour-asked','1')}catch(e){}o.classList.add('go');setTimeout(()=>{location.href='/94flair/'},180)}
function u(){q=0;const r=o.getBoundingClientRect(),h=o.offsetHeight-innerHeight;const p=Math.max(0,Math.min(1,-r.top/Math.max(1,h)));
 if(!fr&&r.top<innerHeight*2.5){fr=document.createElement('iframe');fr.src='/94flair/?embed=1';fr.setAttribute('tabindex','-1');fr.setAttribute('aria-hidden','true');fr.setAttribute('scrolling','no');pk.append(fr)}
 const t=Math.min(1,p/.7);o.style.setProperty('--p',t.toFixed(3));o.classList.toggle('done',t>.85);if(p>=.985)nav()}
addEventListener('scroll',()=>{if(!q){q=1;requestAnimationFrame(u)}},{passive:true});addEventListener('resize',u);
addEventListener('wheel',e=>{if(e.deltaY>0&&o.classList.contains('done')&&innerHeight+scrollY>=document.documentElement.scrollHeight-2)nav()},{passive:true});
let ty=0;addEventListener('touchstart',e=>{ty=e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{if(ty-e.touches[0].clientY>60&&o.classList.contains('done')&&innerHeight+scrollY>=document.documentElement.scrollHeight-2)nav()},{passive:true});
addEventListener('pageshow',e=>{if(e.persisted){gone=0;o.classList.remove('go')}});u()})();
