/* ---------- time of day (Morning / Midday / Sunset): lighting only, physics untouched ---------- */
const TOD={
  morning:{n:'Morning',az:100,el:13,sun:[-.72,.62,.2],sunCol:[1.6,1.36,1.06],skyTop:[.14,.33,.76],skyHor:[.58,.7,.88],fog:[.82,.84,.86],far:[.15,.22,.17],fogMul:.55,mist:1},
  midday:{n:'Midday',az:185,el:50,sun:[.44,-.6,.47],sunCol:[1.0,.88,.70],skyTop:[.11,.31,.80],skyHor:[.42,.61,.90],fog:[.60,.71,.86],far:[.17,.27,.14],fogMul:.17,mist:0},
  sunset:{n:'Sunset',az:262,el:9,sun:[.85,.45,.16],sunCol:[2.6,1.3,.5],skyTop:[.22,.32,.6],skyHor:[1.0,.55,.32],fog:[.9,.6,.42],far:[.13,.17,.10],fogMul:.8},
  evening:{n:'Evening',az:292,el:3,sun:[.9,.4,.05],sunCol:[2.2,.95,.42],skyTop:[.11,.17,.42],skyHor:[.95,.48,.3],fog:[.62,.44,.38],far:[.09,.11,.08],fogMul:.9}};
function todKey(){const k=store('ts.tod');return TOD[k]?k:'midday'}
function sunVec(t,H){// real compass placement: morning low in the east, midday high in the south, sunset low in the west; rotated into the hole frame (raw x=east, y=north)
  if(!H||typeof H.rot!=='number'||t.az===undefined){const l=Math.hypot(...t.sun);return t.sun.map(v=>v/l)}
  const az=t.az*Math.PI/180,el=t.el*Math.PI/180,e=Math.sin(az)*Math.cos(el),n=Math.cos(az)*Math.cos(el),cr=Math.cos(H.rot),sr=Math.sin(H.rot);return[e*cr-n*sr,e*sr+n*cr,Math.sin(el)]}
function applyTOD(k,H){const t=TOD[k]||TOD.midday;const v=sunVec(t,H);for(let i=0;i<3;i++)SUN_FRAME[i]=v[i];
  LIGHT.sunCol=t.sunCol.slice();LIGHT.skyTop=t.skyTop.slice();LIGHT.skyHor=t.skyHor.slice();LIGHT.fog=t.fog.slice();LIGHT.far=t.far.slice();LIGHT.fogMul=t.fogMul;LIGHT.mist=t.mist||0;G.tod=k}
const _setHoleT=setHole;setHole=function(H,f){applyTOD(G.mode==='round'&&G.round&&G.round.tod?G.round.tod:todKey(),H);return _setHoleT(H,f)};
