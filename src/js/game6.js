/* ---------- gimmes (Off / 2 ft / 3 ft) ---------- */
function gimmeFt(){return(G.mode==='round'&&G.round&&G.round.gimme)||0}
function gimmeCheck(){const g=gimmeFt();if(!g||G.phase==='holed'||G.phase==='gimme'||!G.H||!G.ball)return false;const b=G.ball,H=G.H;
  if(b.surf!==S_GREEN&&b.surf!==S_FRINGE)return false;const d=Math.hypot(b.x-H.cup.x,b.y-H.cup.y)*3;if(!(d<=g)||G.strokes<1)return false;doGimme(d);return true}
function gimmePanel(v){const e=$('pFt');if(e&&e.parentElement)e.parentElement.style.visibility=v?'':'hidden'}
function doGimme(d){G.phase='gimme';G.sw=null;gimmePanel(false);G.gimmes=(G.gimmes||0)+1;showGimme(d);
  setTimeout(()=>{if(G.phase!=='gimme')return;const H=G.H;G.strokes++;G.putts=(G.putts||0)+1;G.lastPos={x:G.ball.x,y:G.ball.y,surf:G.ball.surf};G.ball.x=H.cup.x;G.ball.y=H.cup.y;G.phase='holed';gimmePanel(true);sfx('cup');if(G.onHoled)G.onHoled()},1500)}
function showGimme(d){const el=$('gimme');$('gimmeS').textContent=(isMP()?G.round.players[G.cur].name+' · ':'')+(d<1?Math.round(d*12)+' in':d.toFixed(1)+' ft')+' · +1 stroke';
  el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(showGimme.t);showGimme.t=setTimeout(()=>el.classList.remove('on'),1500)}
const _setAddressG=setAddress;setAddress=function(f){gimmePanel(true);_setAddressG(f);gimmeCheck()};
const _nextAddressG=nextAddress;nextAddress=function(){if(G.mode==='round'&&gimmeCheck())return;_nextAddressG()};
// rounds with gimmes never write all-time records
function gimmeRound(){return!!(G.round&&G.round.gimme)}
const _recSaveG=recSave;recSave=function(R){if(gimmeRound())return;return _recSaveG(R)};
const _storeG=store;store=function(k,v){if(arguments.length>1&&gimmeRound()&&(k==='ts.rec'||String(k).indexOf('ts.recp.')===0))return;return _storeG.apply(this,arguments)};
