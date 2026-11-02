/* water hazard options: after a ball comes to rest in a penalty area, pick how to take relief (+1 stroke in every case) */
const PEN_DZ={'augusta:11':1,'augusta:14':1,'augusta:15':1};// holes with a designated drop zone (placed short of the hazard on the play line)
function penValid(H,x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return false;if(x<=H.X0+1||x>=H.X1-1||y<=H.Y0+1||y>=H.Y1-1)return false;const s=H.surfAt(x,y);return s!==S_WATER&&s!==S_OB}
function penClear(H,x,y,r){for(let a=0;a<8;a++){const s=H.surfAt(x+Math.cos(a/8*TAU)*r,y+Math.sin(a/8*TAU)*r);if(s===S_WATER||s===S_OB)return false}return penValid(H,x,y)}
function penOptions(H,from,entry,fallback){const cup=H.cup,o=[];
  // 1 stroke and distance: replay from the previous spot
  if(penValid(H,from.x,from.y))o.push({k:'replay',t:'Replay from previous spot',s:'Stroke and distance',x:from.x,y:from.y});
  // 2 back on the line: keep the point of entry between the hole and the drop
  {let dx=entry.x-cup.x,dy=entry.y-cup.y,L=Math.hypot(dx,dy);if(L>.5){dx/=L;dy/=L;for(let s=2;s<160;s+=1){const x=entry.x+dx*s,y=entry.y+dy*s;if(penClear(H,x,y,1.2)&&H.surfAt(x,y)!==S_SAND){o.push({k:'line',t:'Drop on the line',s:'Back from the point of entry',x,y});break}}}}
  // 3 drop zone (where the hole has one) or a lateral drop near the point of entry
  if(PEN_DZ[H.course.id+':'+H.hi]){let best=null;const ln=H.line;for(let s=Math.max(0,H.yards-260);s<H.yards;s+=2){const p=pointAt(ln,s);if(!penClear(H,p[0],p[1],5))continue;const sf=H.surfAt(p[0],p[1]);if(sf!==S_FW&&sf!==S_ROUGH)continue;
      // must be short of the hazard (no water between here and the green is fine: the hazard is between the drop zone and the green)
      if(Math.hypot(p[0]-cup.x,p[1]-cup.y)<Math.hypot(entry.x-cup.x,entry.y-cup.y)-2)continue;best={x:p[0],y:p[1]}}
    if(best)o.push({k:'dz',t:'Drop zone',s:'Designated drop area',x:best.x,y:best.y})}
  if(!o.some(q=>q.k==='dz')&&penValid(H,fallback.x,fallback.y))o.push({k:'lateral',t:'Drop near point of entry',s:'Within two club-lengths, no nearer the hole',x:fallback.x,y:fallback.y});
  if(!o.length)o.push({k:'replay',t:'Replay from previous spot',s:'Stroke and distance',x:Number.isFinite(from.x)?from.x:0,y:Number.isFinite(from.y)?from.y:0});
  return o}
let penTimer=0;
function penInit(){if($('pen'))return;const st=document.createElement('style');st.textContent=`#pen{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;min-width:300px;max-width:92vw;background:rgba(12,18,24,.92);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:14px 14px 10px;color:#fff;font-family:inherit;display:none;box-shadow:0 10px 40px rgba(0,0,0,.45)}
#pen.on{display:block}#pen .ph{font-weight:800;letter-spacing:.14em;font-size:13px;color:#7fd3ff;margin-bottom:2px}#pen .ps{font-size:12px;opacity:.75;margin-bottom:10px}
#pen button{display:flex;align-items:center;gap:10px;width:100%;margin:6px 0;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer;touch-action:manipulation}
#pen button:hover,#pen button:focus{background:rgba(127,211,255,.18);outline:none;border-color:#7fd3ff}#pen .pk{flex:none;width:24px;height:24px;border-radius:6px;background:#7fd3ff;color:#0c1218;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px}
#pen .pt{font-weight:700;font-size:14px}#pen .pd{font-size:11px;opacity:.7}#pen .pa{font-size:11px;opacity:.55;text-align:right;margin-top:4px}`;document.head.appendChild(st);
  const d=document.createElement('div');d.id='pen';document.body.appendChild(d);
  document.addEventListener('keydown',e=>{if(G.phase!=='pen')return;const n=+e.key;if(n>=1&&n<=G.penOpts.length){e.preventDefault();e.stopPropagation();penPick(n-1)}},true)}
function penShow(opts){penInit();G.penOpts=opts;const H=G.H,d=$('pen');
  d.innerHTML='<div class="ph">PENALTY AREA</div><div class="ps">'+(G.round&&G.round.players&&G.round.players.length>1?(G.round.players[G.cur].name+' · '):'')+'+1 stroke · choose your relief</div>'+opts.map((q,i)=>'<button data-i="'+i+'"><span class="pk">'+(i+1)+'</span><span><div class="pt">'+q.t+'</div><div class="pd">'+q.s+' · '+Math.round(Math.hypot(q.x-H.cup.x,q.y-H.cup.y))+' yds to pin</div></span></button>').join('')+'<div class="pa" id="penA"></div>';
  d.querySelectorAll('button').forEach(b=>{b.onclick=e=>{e.stopPropagation();penPick(+b.dataset.i)};b.ontouchend=e=>{e.preventDefault();e.stopPropagation();penPick(+b.dataset.i)}});
  d.onpointerdown=e=>e.stopPropagation();d.onmousedown=e=>e.stopPropagation();
  d.classList.add('on');const def=opts.length-1;let left=15;$('penA').textContent='Auto: option '+(def+1)+' in '+left+'s';clearInterval(penTimer);
  penTimer=setInterval(()=>{if(G.phase!=='pen'){clearInterval(penTimer);return}left--;const a=$('penA');if(a)a.textContent='Auto: option '+(def+1)+' in '+left+'s';if(left<=0){clearInterval(penTimer);penPick(def)}},1000);
  setTimeout(()=>{const b=d.querySelector('button');if(b&&G.phase==='pen')try{b.focus({preventScroll:true})}catch(e){}},50)}
function penPick(i){if(G.phase!=='pen')return;const q=G.penOpts[i];if(!q)return;clearInterval(penTimer);const H=G.H,b=G.ball;
  let x=q.x,y=q.y;if(!penValid(H,x,y)){const lp=G.penFrom;x=lp.x;y=lp.y}if(!Number.isFinite(x)||!Number.isFinite(y)){x=0;y=0}
  b.x=x;b.y=y;b.surf=H.surfAt(x,y);if(q.k==='replay'&&G.penFrom.surf===S_TEE)b.surf=S_TEE;
  G.penLast={k:q.k,x,y};$('pen').classList.remove('on');toast('PENALTY',q.t+' · +1',1400);
  G.phase='rest';G.restT=99}
const _finishShotP=finishShot;finishShot=function(){const a=G.anim,res=a&&a.res;const wet=res&&res.kind==='water'&&G.mode==='round';
  _finishShotP();if(!wet||G.phase==='holed')return;const H=G.H;
  const land=a.land||{x:res.x,y:res.y};const fb={x:G.ball.x,y:G.ball.y};// the default drop the base rules picked (last land before the water)
  const entry=penValid(H,fb.x,fb.y)?fb:{x:Number.isFinite(land.x)?land.x:a.from.x,y:Number.isFinite(land.y)?land.y:a.from.y};
  G.penFrom={x:a.from.x,y:a.from.y,surf:G.lastPos&&G.lastPos.surf};const opts=penOptions(H,a.from,entry,fb);
  if(opts.length<2&&opts[0].k!=='replay'){return}// nothing to choose
  clearTimeout(toastT);$('toast').classList.remove('on');G.phase='pen';penShow(opts)};
