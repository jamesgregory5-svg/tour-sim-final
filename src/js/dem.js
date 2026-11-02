'use strict';
/* real terrain: USGS 3DEP 1/3" DEM sampled on an 8 x ~10 yd grid, zlib+base64 per course; decoded once at start */
const DEMS={};let DEM_OK=false;
async function demInit(){
  if(typeof DecompressionStream==='undefined'){console.warn('no DecompressionStream: flat terrain');return}
  for(const id in GEO){const d=GEO[id].dem;if(!d)continue;
    try{const bin=Uint8Array.from(atob(d.b),c=>c.charCodeAt(0));
      const buf=new Uint8Array(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
      const A=new Float32Array(d.nx*d.ny);let p=0;
      for(let j=0;j<d.ny;j++){let v=buf[p]|(buf[p+1]<<8);p+=2;A[j*d.nx]=v;for(let i=1;i<d.nx;i++){let q=buf[p++];if(q>127)q-=256;v+=q;A[j*d.nx+i]=v}}
      for(let i=0;i<A.length;i++)A[i]=d.mn+A[i]*d.q;
      DEMS[id]={A,x0:d.x0,y0:d.y0,sx:d.sx,sy:d.sy,nx:d.nx,ny:d.ny}}catch(e){console.warn('dem',id,e)}}
  if(typeof DEM_FAR!=='undefined')for(const id in DEM_FAR){const d=DEM_FAR[id];try{const bin=Uint8Array.from(atob(d.b),c=>c.charCodeAt(0));
      const buf=new Uint8Array(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
      const A=new Float32Array(d.nx*d.ny);let p=0;
      for(let j=0;j<d.ny;j++){let v=buf[p]|(buf[p+1]<<8);p+=2;A[j*d.nx]=v;for(let i=1;i<d.nx;i++){let q=buf[p++];if(q===128){v=buf[p]|(buf[p+1]<<8);p+=2}else{if(q>127)q-=256;v+=q}A[j*d.nx+i]=v}}
      for(let i=0;i<A.length;i++)A[i]=d.mn+A[i]*d.q;
      DEMF[id]={A,x0:d.x0,y0:d.y0,sx:d.sx,sy:d.sy,nx:d.nx,ny:d.ny}}catch(e){console.warn('demfar',id,e)}}
  DEM_OK=Object.keys(DEMS).length>0}
const DEMF={};
function demGrid(D,x,y){const fx=clamp((x-D.x0)/D.sx,0,D.nx-1.001),fy=clamp((y-D.y0)/D.sy,0,D.ny-1.001),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j;
  const at=(a,b)=>D.A[clamp(b,0,D.ny-1)*D.nx+clamp(a,0,D.nx-1)];
  const cr=(p0,p1,p2,p3,t)=>p1+.5*t*(p2-p0+t*(2*p0-5*p1+4*p2-p3+t*(3*(p1-p2)+p3-p0)));
  const r=k=>cr(at(i-1,j+k),at(i,j+k),at(i+1,j+k),at(i+2,j+k),u);
  return cr(r(-1),r(0),r(1),r(2),v)}
/* bicubic-smooth (Catmull-Rom) sample in course yards; clamps at the edge */
function demSample(id,x,y){const D=DEMS[id];if(!D)return 0;const h=demGrid(D,x,y);const F=DEMF[id];if(!F)return h;
  // distance (in fine cells) inside the detailed grid; blend to the coarse far grid over the last 6 cells and use it beyond
  const gx=(x-D.x0)/D.sx,gy=(y-D.y0)/D.sy;const inside=Math.min(gx,gy,D.nx-1-gx,D.ny-1-gy);if(inside>=6)return h;const hf=demGrid(F,x,y);if(inside<=0)return hf;const w=inside/6;return hf+(h-hf)*w*w*(3-2*w)}
