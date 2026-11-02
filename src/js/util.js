'use strict';
const VERSION='v1.30';
const TAU=Math.PI*2,DEG=Math.PI/180;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
const pad=n=>String(n).padStart(2,'0');
function xmur(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0}
function RNG(seed){let a=typeof seed==='string'?xmur(seed):seed>>>0;const f=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  f.int=n=>Math.floor(f()*n);f.range=(x,y)=>x+f()*(y-x);f.pick=a=>a[Math.floor(f()*a.length)];f.chance=p=>f()<p;return f}
function keyOfDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
let todayKey=()=>keyOfDate(new Date());
function dec(a){const o=[];let x=0,y=0;for(let i=0;i<a.length;i+=2){x+=a[i];y+=a[i+1];o.push([x/2,y/2])}return o}
function plen(P){let s=0;for(let i=1;i<P.length;i++)s+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);return s}
function pip(x,y,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],yi=P[i][1],xj=P[j][0],yj=P[j][1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function segD(px,py,P){let b=1e18,bs=0,acc=0;for(let i=0;i<P.length-1;i++){const ax=P[i][0],ay=P[i][1],dx=P[i+1][0]-ax,dy=P[i+1][1]-ay,L2=dx*dx+dy*dy||1e-9,L=Math.sqrt(L2);let t=((px-ax)*dx+(py-ay)*dy)/L2;t=t<0?0:t>1?1:t;const d=Math.hypot(px-ax-t*dx,py-ay-t*dy);if(d<b){b=d;bs=acc+t*L}acc+=L}segD.s=bs;return b}
function pointAt(P,s){let acc=0;for(let i=0;i<P.length-1;i++){const L=Math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]);if(s<=acc+L||i===P.length-2){const t=(s-acc)/(L||1);return[P[i][0]+(P[i+1][0]-P[i][0])*t,P[i][1]+(P[i+1][1]-P[i][1])*t,Math.atan2(P[i+1][1]-P[i][1],P[i+1][0]-P[i][0])]}acc+=L}return P[P.length-1]}
const fmtPar=n=>n===0?'E':n>0?'+'+n:''+n;
const $=id=>document.getElementById(id);
function store(k,v){try{if(v===undefined){const s=localStorage.getItem(k);return s?JSON.parse(s):null}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function enc(P){const o=[];let lx=0,ly=0;for(const p of P){const qx=Math.round(p[0]*2),qy=Math.round(p[1]*2);o.push(qx-lx,qy-ly);lx=qx;ly=qy}return o}
function ellP(cx,cy,rx,ry,n,wob,seed){const o=[];for(let i=0;i<n;i++){const a=i/n*TAU,w=1+(wob||0)*Math.sin(a*2+(seed||0))+(wob||0)*.6*Math.cos(a*3+(seed||0)*2);o.push([cx+Math.cos(a)*rx*w,cy+Math.sin(a)*ry*w])}return o}
function gauss(R){return Math.sqrt(-2*Math.log(R()+1e-9))*Math.cos(TAU*R())}
// Tour Sim: migrate saved data from the old ds.* keys once
(function(){try{for(const k of['rec','round','bag']){const o=localStorage.getItem('ds.'+k);if(o!==null&&localStorage.getItem('ts.'+k)===null)localStorage.setItem('ts.'+k,o)}}catch(e){}})();
function cpar(c,t){return(c.tees[t]&&c.tees[t].par)||c.par}
