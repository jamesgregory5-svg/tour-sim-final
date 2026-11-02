/* ---------- shareable end-of-round scorecard image (2D canvas, offline) ---------- */
function cardData(r){const c=CID[r.cid];const P=cpar(c,r.tee),Y=c.tees[r.tee].y;const holes=[];for(let i=0;i<r.n;i++)holes.push({n:r.start+i+1,par:P[r.start+i],y:Y[r.start+i]});
  const pls=(r.players&&r.players.length>1?r.players:[{name:ownerName(),sc:r.sc,pt:r.pt,fir:r.fir,gir:r.gir,dr:r.dr}]).map(p=>{const sc=holes.map((h,i)=>p.sc[i]||0);const tot=sc.reduce((a,b)=>a+b,0),par=holes.reduce((a,h,i)=>a+(sc[i]?h.par:0),0);
    const fwN=holes.filter(h=>h.par>3).length,fw=holes.filter((h,i)=>h.par>3&&p.fir&&p.fir[i]).length,gir=holes.filter((h,i)=>p.gir&&p.gir[i]).length,putts=(p.pt||[]).slice(0,r.n).reduce((a,b)=>a+(b||0),0),ld=Math.max(0,...(p.dr||[]).map(x=>x||0));
    return{name:p.name,sc,tot,tp:tot-par,fw,fwN,gir,putts,ld}});
  const best=Math.min(...pls.map(p=>p.tp));return{cid:r.cid,course:c.name,home:!!c.home,loc:c.loc,date:r.d||todayKey(),tee:c.tees[r.tee].n,yards:holes.reduce((a,h)=>a+h.y,0),holes,players:pls,mp:pls.length>1,best,gimme:r.gimme||0,label:r.n===18?'18 holes':r.start?'Back 9':'Front 9'}}
function drawCard(d){const halves=[];const a=d.holes.filter(h=>h.n<=9),b=d.holes.filter(h=>h.n>9);if(a.length)halves.push(a);if(b.length)halves.push(b);
  const cols=d.holes.length+halves.length+(halves.length>1?1:0)+1;const lw=230,cw=Math.max(54,Math.floor((1100-80-lw)/cols)),W=Math.max(1100,lw+cols*cw+80),rowH=52,nP=d.players.length;
  const H=190+rowH*(3+nP)+(d.mp?44:150)+44;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const F=(w,s)=>w+' '+s+'px "Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif';
  // background + header band
  let gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#0b1b14');gr.addColorStop(1,'#10291e');g.fillStyle=gr;g.fillRect(0,0,W,H);
  gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#0f3b2a');gr.addColorStop(1,'#16583d');g.fillStyle=gr;g.fillRect(0,0,W,150);g.fillStyle='#34e0a1';g.fillRect(0,150,W,5);
  g.fillStyle='#fff';g.font=F(900,44);g.textBaseline='alphabetic';g.fillText(d.course.toUpperCase(),40,70);let x=40+g.measureText(d.course.toUpperCase()).width+18;
  if(d.home){g.font=F(800,16);const tw=g.measureText('HOME COURSE').width+22;g.fillStyle='#ffd27a';g.beginPath();g.roundRect(x,44,tw,30,6);g.fill();g.fillStyle='#1b1405';g.fillText('HOME COURSE',x+11,65)}
  g.fillStyle='rgba(255,255,255,.82)';g.font=F(600,20);g.fillText(`${d.date}  ·  ${d.tee} tees  ·  ${d.yards.toLocaleString()} yds  ·  ${d.label}`,40,112);
  g.textAlign='right';g.font=F(900,30);g.fillStyle='#fff';g.fillText('TOUR SIM',W-40,66);g.font=F(600,15);g.fillStyle='rgba(255,255,255,.6)';g.fillText(VERSION+(d.gimme?'':''),W-40,90);
  if(d.gimme){g.font=F(800,15);const t='GIMMES ON';const tw=g.measureText(t).width+20;g.fillStyle='#ffd27a';g.beginPath();g.roundRect(W-40-tw,100,tw,26,6);g.fill();g.fillStyle='#1b1405';g.fillText(t,W-50,118)}
  g.textAlign='left';
  // grid columns
  const colsX=[];let cx=40+lw;const cells=[];for(let k=0;k<halves.length;k++){for(const h of halves[k]){cells.push({h});colsX.push(cx);cx+=cw}cells.push({sum:k,lab:halves[k][0].n<=9?'OUT':'IN'});colsX.push(cx);cx+=cw}
  if(halves.length>1){cells.push({tot:1,lab:'TOT'});colsX.push(cx);cx+=cw}cells.push({tp:1,lab:'+/-'});colsX.push(cx);cx+=cw;
  let y=190;const ctr=(t,xx,yy,col,font)=>{g.fillStyle=col;g.font=font;g.textAlign='center';g.fillText(String(t),xx+cw/2,yy);g.textAlign='left'};
  const row=(label,fn,bg,bold)=>{g.fillStyle=bg;g.fillRect(40,y-34,cx-40,rowH-6);g.fillStyle='#fff';g.font=F(bold?800:700,19);g.fillText(label,56,y);cells.forEach((c,k)=>fn(c,colsX[k]));y+=rowH};
  const hsum=(hs,f)=>hs.reduce((a,h)=>a+f(h),0);
  row('HOLE',(c,X)=>ctr(c.h?c.h.n:c.lab,X,y,c.h?'#fff':'#34e0a1',F(800,18)),'rgba(52,224,161,.16)',1);
  row('YARDS',(c,X)=>ctr(c.h?c.h.y:c.lab==='OUT'||c.lab==='IN'?hsum(halves[c.sum],h=>h.y):c.tot?d.yards:'',X,y,'rgba(255,255,255,.7)',F(600,15)),'rgba(255,255,255,.04)');
  row('PAR',(c,X)=>ctr(c.h?c.h.par:c.lab==='OUT'||c.lab==='IN'?hsum(halves[c.sum],h=>h.par):c.tot?hsum(d.holes,h=>h.par):'',X,y,'#fff',F(700,18)),'rgba(255,255,255,.07)');
  const idx=h=>d.holes.indexOf(h);
  for(const p of d.players){const win=d.mp&&p.tp===d.best;
    row((win?'★ ':'')+p.name.toUpperCase(),(c,X)=>{const yy=y;if(c.h){const s=p.sc[idx(c.h)];if(!s)return;const df=s-c.h.par;const mx=X+cw/2,my=yy-7;g.lineWidth=2.2;g.strokeStyle='#fff';
        if(df<=-1){g.beginPath();g.arc(mx,my,17,0,TAU);g.stroke();if(df<=-2){g.beginPath();g.arc(mx,my,13,0,TAU);g.stroke()}}
        else if(df>=1){g.strokeRect(mx-16,my-16,32,32);if(df>=2)g.strokeRect(mx-12,my-12,24,24)}
        ctr(s,X,yy,'#fff',F(800,19))}
      else if(c.sum!==undefined){ctr(hsum(halves[c.sum],h=>p.sc[idx(h)]||0),X,yy,'#fff',F(800,19))}
      else if(c.tot){ctr(p.tot,X,yy,'#fff',F(900,20))}
      else if(c.tp){ctr(p.tp===0?'E':(p.tp>0?'+':'')+p.tp,X,yy,p.tp<0?'#ff6b6b':p.tp>0?'#9fd3ff':'#fff',F(900,20))}},win?'rgba(255,210,122,.22)':'rgba(255,255,255,.1)',1)}
  // stats
  g.font=F(600,18);g.fillStyle='rgba(255,255,255,.85)';
  if(!d.mp){const p=d.players[0];const st=[['TO PAR',p.tp===0?'E':(p.tp>0?'+':'')+p.tp],['FAIRWAYS',p.fw+'/'+p.fwN],['GREENS',p.gir+'/'+d.holes.length],['PUTTS',p.putts],['LONGEST DRIVE',p.ld?p.ld+' yds':'—']];
    const bw=(cx-40)/st.length;st.forEach((s,k)=>{const X=40+k*bw;g.fillStyle='rgba(255,255,255,.06)';g.fillRect(X+4,y-20,bw-8,82);g.fillStyle='#34e0a1';g.font=F(800,14);g.fillText(s[0],X+20,y+6);g.fillStyle='#fff';g.font=F(900,30);g.fillText(String(s[1]),X+20,y+46)});y+=96;const cnt=k=>p.sc.filter((s,i)=>s&&s-d.holes[i].par===k).length,bird=p.sc.filter((s,i)=>s&&s-d.holes[i].par<=-1).length;let bh=-1;p.sc.forEach((s,i)=>{if(s&&(bh<0||s-d.holes[i].par<p.sc[bh]-d.holes[bh].par))bh=i});
    const hl=[bird?bird+(bird>1?' birdies or better':' birdie or better'):'',cnt(0)+' pars',(p.sc.filter((s,i)=>s&&s-d.holes[i].par>=1).length)+' over par',bh>=0?'Best hole: #'+d.holes[bh].n+' ('+(SNAME[p.sc[bh]-d.holes[bh].par]||fmtPar(p.sc[bh]-d.holes[bh].par))+')':''].filter(Boolean).join('   ·   ');g.fillStyle='rgba(255,255,255,.85)';g.font=F(700,18);g.fillText(hl,44,y+8);y+=44}
  else{const w=d.players.filter(p=>p.tp===d.best).map(p=>p.name);g.fillStyle='#ffd27a';g.font=F(900,24);g.fillText((w.length>1?'TIE: ':'WINNER: ')+w.join(' & ').toUpperCase(),40,y+4);y+=30}
  g.fillStyle='rgba(255,255,255,.45)';g.font=F(500,14);g.fillText('Fan-made; layouts approximate; not affiliated with any club.',40,H-18);
  return cv}
function cardFileName(d){return'TourSim-'+d.course.split(/[\s(]/)[0].replace(/[^A-Za-z0-9]/g,'')+'-'+d.date+'.png'}
function saveCardImage(d,btn){const cv=drawCard(d),fn=cardFileName(d);
  // blob download (works from file:// in Edge/Chrome/Firefox); data-URL fallback if toBlob is missing or returns nothing
  const go=href=>{const a=document.createElement('a');a.download=fn;a.href=href;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(()=>{if(href.startsWith('blob:'))URL.revokeObjectURL(href);a.remove()},4000);if(btn){const t=btn.textContent;btn.textContent='Saved ✓';setTimeout(()=>btn.textContent=t,1600)}};
  const viaURL=()=>{try{go(cv.toDataURL('image/png'))}catch(e){console.warn('save image',e)}};
  try{if(!cv.toBlob)return viaURL();cv.toBlob(b=>{if(b)go(URL.createObjectURL(b));else viaURL()},'image/png')}catch(e){viaURL()}}
function shareCardImage(d){const cv=drawCard(d);cv.toBlob(b=>{const f=new File([b],cardFileName(d),{type:'image/png'});navigator.share({files:[f],title:'Tour Sim · '+d.course}).catch(()=>{})},'image/png')}
function addCardButtons(d){G.lastCard=d;const sh=$('sh');if(!sh||$('sImg'))return;const can=!!(navigator.canShare&&window.File&&(()=>{try{return navigator.canShare({files:[new File([new Uint8Array(1)],'x.png',{type:'image/png'})]})}catch(e){return false}})());
  sh.insertAdjacentHTML('beforebegin',`<button class="btn c" id="sImg">Save scorecard image</button>${can?'<button class="btn alt c" id="sShare">Share</button>':''}`);$('sImg').onclick=()=>saveCardImage(d,$('sImg'));if(can)$('sShare').onclick=()=>shareCardImage(d)}
const _finishRoundC=finishRound;finishRound=function(){const r=G.round?JSON.parse(JSON.stringify(G.round)):null;_finishRoundC();if(r)try{addCardButtons(cardData(r))}catch(e){console.warn('scorecard image',e)}};
