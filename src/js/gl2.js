'use strict';
function glSetHole(R,H,PX){
  const gl=R.gl;
  // free previous
  if(R.hole){const o=R.hole;for(const t of[o.tCol,o.tMask])gl.deleteTexture(t);for(const v of[o.ter,o.outer]){for(const a of v.attrs)gl.deleteBuffer(a.buf);gl.deleteBuffer(v.ib);gl.deleteVertexArray(v.v)}}
  infillTrees(H);
  {let n=0;for(const t of H.trees)if(treeSpotOK(H,t.x,t.y,Math.min(4,t.w*.25)))H.trees[n++]=t;else t.gone=1;H.trees.length=n}// drop unplaceable trees BEFORE painting, so no orphan shadows are left on the turf
  const P=paintHole(H,PX);
  const tCol=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tCol);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,P.cv);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const tMask=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tMask);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,P.mw,P.mh,0,gl.RGBA,gl.UNSIGNED_BYTE,P.mask);gl.generateMipmap(gl.TEXTURE_2D);{const ex2=gl.getExtension('EXT_texture_filter_anisotropic');if(ex2)gl.texParameterf(gl.TEXTURE_2D,ex2.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,gl.getParameter(ex2.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))}
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  // terrain mesh: 1yd near green, 2yd elsewhere -> use 2yd grid with green patch refined via heights sampled (simple uniform 1.5 yd)
  const st=H.W*H.H>260000?2:1.5;const nx=Math.ceil(H.W/st)+1,ny=Math.ceil(H.H/st)+1;const pos=new Float32Array(nx*ny*3),nor=new Float32Array(nx*ny*3);
  const edge=(x,y)=>{const d=Math.min(x-H.X0,H.X1-x,y-H.Y0,H.Y1-y);return smooth(clamp(d/18,0,1))};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=Math.min(H.X0+i*st,H.X1),y=Math.min(H.Y0+j*st,H.Y1),k=(j*nx+i)*3;const e=edge(x,y);const h=H.hAt(x,y);pos[k]=x;pos[k+1]=y;pos[k+2]=h*e+(1-e)*(H.demAt(x,y)+(H.surfAt(x,y)===7?-1.1:-.15))}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=(j*nx+i)*3;const i0=Math.max(0,i-1),i1=Math.min(nx-1,i+1),j0=Math.max(0,j-1),j1=Math.min(ny-1,j+1);
    const dzx=(pos[(j*nx+i1)*3+2]-pos[(j*nx+i0)*3+2])/((i1-i0)*st),dzy=(pos[(j1*nx+i)*3+2]-pos[(j0*nx+i)*3+2])/((j1-j0)*st);const l=Math.hypot(dzx,dzy,1);nor[k]=-dzx/l;nor[k+1]=-dzy/l;nor[k+2]=1/l}
  const idx=new Uint32Array((nx-1)*(ny-1)*6);let q=0;for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i;idx[q++]=a;idx[q++]=a+1;idx[q++]=a+nx;idx[q++]=a+1;idx[q++]=a+nx+1;idx[q++]=a+nx}
  const ter=R.vao([{loc:0,n:3,d:pos},{loc:1,n:3,d:nor}],idx);
  // outer plane: ring of quads around the region out to 4000 yd (hole made by region)
  // outer terrain: graded grid following the real DEM, fine near the hole and coarse far away (hole cut out for the region)
  const BIG=5000;const axis=(a0,a1)=>{const o=[];for(let v=a0;v<a1;v+=12)o.push(v);o.push(a1);let st2=12,v=a0;while(v>a0-BIG){st2*=1.13;v-=st2;o.unshift(v)}st2=12;v=a1;while(v<a1+BIG){st2*=1.13;v+=st2;o.push(v)}return o};
  const XS=axis(H.X0+.5,H.X1-.5),YS=axis(H.Y0+.5,H.Y1-.5);const nX=XS.length,nY=YS.length;
  const op=new Float32Array(nX*nY*3),on=new Float32Array(nX*nY*3),oi=[];
  const oh=(x,y)=>H.demAt(x,y)-.15;/* v1.20 all courses: far vertices sit on a coarse, widening grid; low-pass the DEM over the vertex spacing so single far-DEM cells don't pop up as blocks/steps */const ohS=(x,y,e)=>{if(e<20)return oh(x,y);const h=e*.5;return(oh(x,y)*2+oh(x+h,y)+oh(x-h,y)+oh(x,y+h)+oh(x,y-h)+oh(x+h,y+h)+oh(x-h,y-h))/8};
  for(let j=0;j<nY;j++)for(let i=0;i<nX;i++){const x=XS[i],y=YS[j],k=(j*nX+i)*3;op[k]=x;op[k+1]=y;
    const inside=x>H.X0&&x<H.X1&&y>H.Y0&&y<H.Y1;const es=Math.max(XS[Math.min(i+1,nX-1)]-XS[Math.max(i-1,0)],YS[Math.min(j+1,nY-1)]-YS[Math.max(j-1,0)])*.5;op[k+2]=inside?H.hAt(x,y)*edge(x,y)+(1-edge(x,y))*oh(x,y):ohS(x,y,es);
    const e=Math.max(4,(XS[Math.min(i+1,nX-1)]-XS[Math.max(i-1,0)])*.5),gx=(oh(x+e,y)-oh(x-e,y))/(2*e),gy=(oh(x,y+e)-oh(x,y-e))/(2*e),l=Math.hypot(gx,gy,1);on[k]=-gx/l;on[k+1]=-gy/l;on[k+2]=1/l}
  for(let j=0;j<nY-1;j++)for(let i=0;i<nX-1;i++){if(XS[i]>=H.X0&&XS[i+1]<=H.X1&&YS[j]>=H.Y0&&YS[j+1]<=H.Y1)continue;const k=j*nX+i;oi.push(k,k+1,k+nX,k+1,k+nX+1,k+nX)}
  const outer=R.vao([{loc:0,n:3,d:op},{loc:1,n:3,d:on}],new Uint32Array(oi));
  // trees + border treeline
  const all=H.trees.slice();const TR=RNG('b'+H.course.id+H.hi);const mix=treeMix(H.course.id).filter(m=>m[0]!==6&&m[0]!==5);const dens=H.st.trees;const canyon=H.course.id==='shadowcreek';// Shadow Creek: a dense pine canyon
  const INF={lookaway:.5,shadowcreek:1,seminole:.75,muirfieldv:.7,oaklandhills:.7,wingedfoot:.38,augusta:.55,pebble:.4,oakmont:0,oakhill:.6,merion:.45,chicago:.4,peachtree:.6,pinevalley:.7,riviera:.5,lacc:.45,tcc:.5,crystal:.4,cypress:.45}[H.course.id]||0;const boost=INF>=.55&&!canyon;
  const ring=(x,y)=>{const s=H.surfAt(clamp(x,H.X0+1,H.X1-1),clamp(y,H.Y0+1,H.Y1-1));if(s===S_WATER)return;if(H.sea.length&&H.surfAt(clamp(x,H.X0+1,H.X1-1),clamp(y,H.Y0+1,H.Y1-1))===S_WATER)return;
    // fewer trees behind the green (no uniform wall framing the flag), with gaps and stronger height variety
    const beyond=y>H.Y1-5;if(beyond&&TR()<.55)return;if(TR()<.12)return;
    // natural stands: clumps and clearings from low-frequency noise instead of even rectangular rings
    {const cl=vnoise(x*.022+H.hi*3.1,y*.022-H.hi*1.7)*.7+vnoise(x*.061+5,y*.061+2)*.3;{const q=clamp((cl-(canyon?.12:.28))/.34,0,1);if(TR()>q*q*(3-2*q)*(canyon?1.8:boost?1.45:1.15))return}}
    const sp=pickSpecies(mix,TR());const S=SPECIES[sp];const h=lerp(S.h[0],S.h[1],TR())*TR.range(sp===8||sp===4?.5:.68,sp===8?1.45:1.32);const w=h*S.w*TR.range(.85,1.2);if(!treeSpotOK(H,x,y,Math.min(4,w*.25)))return;all.push({x,y,sp,v:TR.int(8),h,w,out:1})};
  if(dens>.1||boost){const s0=canyon?5.5:boost?6.5:dens>.3?8:16;for(let d=6;d<150;d+=s0+d*.12){const step=(s0+d*.1)*.78;for(let x=H.X0-d;x<H.X1+d;x+=step){if(TR()<.8){ring(x+TR.range(-.6,.6)*step*1.6,H.Y1+d+TR.range(-.5,1)*step*1.8);ring(x+TR.range(-.6,.6)*step*1.6,H.Y0-d-TR.range(-.5,1)*step*1.8)}}
    for(let y=H.Y0-d;y<H.Y1+d;y+=step){if(TR()<.8){ring(H.X0-d-TR.range(-.5,1)*step*1.8,y+TR.range(-.6,.6)*step*1.6);ring(H.X1+d+TR.range(-.5,1)*step*1.8,y+TR.range(-.6,.6)*step*1.6)}}}}
  H.allTrees=all;
  if(all.length>6500)all.length=6500;
  {const n=all.length,ip=new Float32Array(n*4),iw=new Float32Array(n*4);{const cid=H.course.id;if(cid==='augusta')all.forEach(t=>{if(t.sp===0&&!t._ah){t._ah=1;t.h*=1.22}});// v1.16: Augusta loblolly 30-35 m (real)
const PM=['lacc','riviera'].includes(cid)?[.8,0,0,1]:['seminole','tpc','sawgrass','jupiter','bayhill'].includes(cid)?[0,.6,.88,1]:[0,.45,.55,1];const HM=[1.4,1,1.12,.72];all.forEach((t,i)=>{if(t.sp!==4||t._pv)return;const r=hash2(i,57);const ty=r<PM[0]?0:r<PM[1]?1:r<PM[2]?2:3;t.v=ty+4*(t.v>>2&1);t.h*=HM[ty]*(.85+.3*hash2(i,59));t._pv=1})}// palm types per course (Washingtonia at LA, cabbage / royal in Florida, date elsewhere), each with its own height
    all.forEach((t,i)=>{const S=SPECIES[t.sp];const inR=t.x>H.X0&&t.x<H.X1&&t.y>H.Y0&&t.y<H.Y1;
      const qh=t.h*S.qk;ip[i*4]=t.x;ip[i*4+1]=t.y;ip[i*4+2]=(inR?H.hAt(t.x,t.y):H.demAt(t.x,t.y)-.15)-.15;const hv=.86+.28*hash2(i,19),wv=.8+.42*hash2(i,13);ip[i*4+3]=qh*hv;iw[i*4]=qh*hv*wv*ATL.cw/ATL.ch;iw[i*4+1]=t.sp*8+(t.v%8);iw[i*4+2]=hash2(i,7);iw[i*4+3]=hash2(7,i)<.5?1:-1});
    if(typeof t3List==='function')t3List(R,all,H);
    const v=R.treeV;gl.bindBuffer(gl.ARRAY_BUFFER,v.attrs[1].buf);gl.bufferData(gl.ARRAY_BUFFER,ip,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,v.attrs[2].buf);gl.bufferData(gl.ARRAY_BUFFER,iw,gl.STATIC_DRAW);v.inst=n}
  const hx=c=>[parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255];const f1=hx(H.st.rough),f2=hx(H.st.deep);
  /* v1.25 all courses: far land takes the colour of the hole's own outer border (mean of a ring just inside the box, water excluded), so the box never reads as a rectangle on the overhead/far views (sand dunes stay sandy, parkland stays green) */
  let farC=[0,1,2].map(i=>f1[i]*.55+f2[i]*.45);try{const cv=P.cv,cx=cv.getContext('2d'),w=cv.width,h=cv.height,bw=Math.max(4,Math.round(w/H.W*14)),sm=[0,0,0];let n=0;
    for(const [x0,y0,ww,hh] of [[0,0,w,bw],[0,h-bw,w,bw],[0,0,bw,h],[w-bw,0,bw,h]]){const d=cx.getImageData(x0,y0,ww,hh).data;for(let k=0;k<d.length;k+=4*7){const r=d[k],g=d[k+1],b=d[k+2];if(b>g+6||(r<40&&g<40)||r>g-4)continue;/* v1.30: sand/dune border pixels excluded: far land is vegetation colour */sm[0]+=r;sm[1]+=g;sm[2]+=b;n++}}
    if(n>50)farC=farC.map((v,i)=>v*.3+sm[i]/n/255*.7)}catch(e){}
  R.hole={H,tCol,tMask,ter,outer,mini:P.cv,far:farC};
  return P.cv}
function infillTrees(H){if(H._infill)return;H._infill=1;const canyon=H.course.id==='shadowcreek';const TR=RNG('inf'+H.course.id+H.hi);const mix=treeMix(H.course.id).filter(m=>m[0]!==6&&m[0]!==5);
  const INF={lookaway:.5,shadowcreek:1,seminole:.75,muirfieldv:.7,oaklandhills:.7,wingedfoot:.38,augusta:.55,pebble:.4,oakmont:0,oakhill:.6,merion:.45,chicago:.4,peachtree:.6,pinevalley:.7,riviera:.5,lacc:.45,tcc:.5,crystal:.4,cypress:.45}[H.course.id]||0;
  if(INF>0){// infill the rough inside the hole box: tight pine stands that hug the corridor (kept clear of fairway, green, tees and the line of play)
    const lineD=(x,y)=>{const L=H.line||[];let m=1e9;for(let i=0;i+1<L.length;i++){const ax=L[i][0],ay=L[i][1],bx=L[i+1][0]-ax,by=L[i+1][1]-ay,l2=bx*bx+by*by||1;const t=clamp(((x-ax)*bx+(y-ay)*by)/l2,0,1);m=Math.min(m,Math.hypot(x-ax-bx*t,y-ay-by*t))}return m};// keep the line of play open
    const near=(x,y,rr)=>{for(let a=0;a<8;a++){const s=H.surfAt(x+Math.cos(a*.785)*rr,y+Math.sin(a*.785)*rr);if(s===S_FW||s===S_GREEN||s===S_FRINGE||s===S_TEE||s===S_SAND||s===S_WATER)return true}const s=H.surfAt(x,y);return s!==S_ROUGH&&s!==S_DEEP&&s!==S_OB};
    for(let y=H.Y0+4;y<H.Y1-2;y+=6)for(let x=H.X0+3;x<H.X1-3;x+=6){const px=x+TR.range(-2.5,2.5),py=y+TR.range(-2.5,2.5);if(Math.hypot(px,py)<30)continue;if(lineD(px,py)<(canyon?22:32))continue;if(near(px,py,canyon?9:12)||near(px,py,canyon?16:22)&&TR()<.7)continue;
      const cl=vnoise(px*.03+7,py*.03-3);if(TR()>clamp((cl-.2)/.4,0,1)*1.1*INF)continue;const sp=pickSpecies(mix,TR());const S=SPECIES[sp];const h=lerp(S.h[0],S.h[1],TR())*TR.range(.7,1.3);const w=h*S.w*TR.range(.85,1.2);
      if(!treeSpotOK(H,px,py,Math.min(4,w*.25)))continue;const t={x:px,y:py,sp,v:TR.int(8),h,w,cb:S.cb,r:w*.5,out:0};H.trees.push(t);if(H.addTree)H.addTree(t)}}
}
const LIGHT={sun:SUN_FRAME,sunCol:[1.0,.88,.70],skyTop:[.26,.47,.80],skyHor:[.68,.77,.88],fog:[.70,.78,.86],far:[.17,.27,.14]};
function glDraw(R,cam,S){
  const gl=R.gl,cv=R.canvas,H=R.hole.H;gl.viewport(0,0,cv.width,cv.height);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  gl.clearColor(LIGHT.skyHor[0],LIGHT.skyHor[1],LIGHT.skyHor[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const asp=cv.width/cv.height,fov=cam.fov||.85;const Pm=M4.persp(fov,asp,.08,7000),V=M4.look(cam.eye,cam.at,[0,0,1]),VP=M4.mul(Pm,V);
  const t=S.time;
  const common=(p)=>{const u=p.u;gl.useProgram(p.p);if(u.uVP)gl.uniformMatrix4fv(u.uVP,false,VP);gl.uniform3fv(u.uSun,LIGHT.sun);if(u.uMist){gl.uniform1f(u.uMist,LIGHT.mist||0);const H=R.hole&&R.hole.H;if(H&&u.uMistZ){if(H.mistZ===undefined)H.mistZ=Math.min(H.hAt(0,0),H.hAt(H.cup.x,H.cup.y));gl.uniform1f(u.uMistZ,H.mistZ)}}gl.uniform3fv(u.uSunCol,LIGHT.sunCol);gl.uniform3fv(u.uSkyTop,LIGHT.skyTop);gl.uniform3fv(u.uSkyHor,LIGHT.skyHor);gl.uniform3fv(u.uFogCol,LIGHT.fog);
    gl.uniform1f(u.uFogK,(cam.fogK||1.1e-6)*.45*(LIGHT.fogMul||1));gl.uniform3fv(u.uEye,cam.eye);if(u.uTime)gl.uniform1f(u.uTime,t)};
  // sky
  {const p=R.pSky;common(p);const f=[cam.at[0]-cam.eye[0],cam.at[1]-cam.eye[1],cam.at[2]-cam.eye[2]];let l=Math.hypot(...f);f[0]/=l;f[1]/=l;f[2]/=l;
    let r=[f[1],-f[0],0];l=Math.hypot(...r)||1;r=[r[0]/l,r[1]/l,0];const u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
    gl.uniform3fv(p.u.uF,f);gl.uniform3fv(p.u.uR,r);gl.uniform3fv(p.u.uU,u);const th=Math.tan(fov/2);gl.uniform2f(p.u.uT,th*asp,th);
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,R.noise);gl.uniform1i(p.u.uNoise,2);gl.depthMask(false);gl.bindVertexArray(R.sky.v);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true)}
  // terrain
  {const p=R.pTer,u=p.u;common(p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,R.hole.tCol);gl.uniform1i(u.uCol,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,R.hole.tMask);gl.uniform1i(u.uMask,1);
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,R.noise);gl.uniform1i(u.uNoise,2);
    gl.uniform4f(u.uReg,H.X0,H.Y0,H.W,H.H);gl.uniform3fv(u.uFar,R.hole.far||LIGHT.far);gl.uniform2f(u.uCup,S.cup?S.cup.x:-1e4,S.cup?S.cup.y:-1e4);
    gl.uniform4f(u.uBall,S.ball.x,S.ball.y,S.ballShadow,S.ballShadowR||.09);const rg=S.ring||[0,0,0,0];gl.uniform4f(u.uRing,rg[0],rg[1],rg[2],rg[3]);
    const am=S.aim||[0,0,0,0];gl.uniform4f(u.uAim,am[0],am[1],am[2],am[3]);gl.uniform1f(u.uAimOn,S.aim?1:0);gl.uniform1f(u.uPutt,S.putt||0);
    const gm=H.gm;gl.uniform4f(u.uG0,gm.cx,gm.cy,gm.tx,gm.ty);const gb=new Float32Array(16);gm.b.slice(0,4).forEach((b,i)=>gb.set(b,i*4));gl.uniform4fv(u.uGb,gb);
    gl.uniform1f(u.uFoam,R.hole.H.sea.length?1:0);if(u.uEdgeSea)gl.uniform1f(u.uEdgeSea,0);if(u.uCliff)gl.uniform1f(u.uCliff,CLIFF_C[R.hole.H.course.id]?1:0);if(u.uDune)gl.uniform1f(u.uDune,['dunes','prairie'].includes(R.hole.H.course.style)||['pacificdunes','sandhills','friars','pinevalley'].includes(R.hole.H.course.id)?1:0);if(u.uSeaZ){const H=R.hole.H;if(H.seaZ===undefined)seaLevel(H);if(H.seaZ===undefined){const z=[];if(H.sea.length)for(let y=H.Y0+1;y<H.Y1-1;y+=3)for(let x=H.X0+1;x<H.X1-1;x+=3){const sf=H.surfAt(x,y);if(sf===S_WATER)z.push(H.hAt(x,y))}z.sort((a,b)=>a-b);H.seaZ=z.length?z[z.length>>1]:-1e9}gl.uniform1f(u.uSeaZ,H.seaZ)}{const H=R.hole.H;outSea(H);if(u.uOutSea)gl.uniform1f(u.uOutSea,H.outZ>-900?1:0);if(u.uWv)gl.uniform1f(u.uWv,({lookaway:1,augusta:1,pebble:2})[H.course.id]||0);if(u.uOutZ)gl.uniform1f(u.uOutZ,H.outZ)}gl.uniform1f(u.uOuter,0);gl.bindVertexArray(R.hole.ter.v);gl.drawElements(gl.TRIANGLES,R.hole.ter.n,gl.UNSIGNED_INT,0);
    gl.uniform1f(u.uOuter,1);gl.uniform1f(u.uAimOn,0);gl.bindVertexArray(R.hole.outer.v);gl.drawElements(gl.TRIANGLES,R.hole.outer.n,gl.UNSIGNED_INT,0)}
  // trees (impostor billboards, alpha-tested, alpha-to-coverage)
  {const p=R.pTree;common(p);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,R.atl);gl.uniform1i(p.u.uAtl,3);if(p.u.uR3)gl.uniform1f(p.u.uR3,R.t3?T3R:0);if(p.u.uBbK)gl.uniform1f(p.u.uBbK,R.t3?.45:1);gl.disable(gl.CULL_FACE);gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    const v=R.treeV;if(v.inst){gl.bindVertexArray(v.v);gl.drawArraysInstanced(gl.TRIANGLES,0,6,v.inst)}gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.enable(gl.CULL_FACE)}
  if(R.t3&&typeof t3Draw==='function')t3Draw(R,common,cam);
  // meshes: flags, pole, ball, tee
  {const p=R.pMesh,u=p.u;common(p);gl.uniform1f(u.uBallD,0);gl.disable(gl.CULL_FACE);
    const draw=(m,M,c,flag,em)=>{gl.uniformMatrix4fv(u.uM,false,M);gl.uniform3fv(u.uC,c);gl.uniform1f(u.uFlag,flag||0);gl.uniform1f(u.uEmis,em||0);gl.bindVertexArray(m.v);gl.drawElements(gl.TRIANGLES,m.n,m.it,0)};
    const TRS=(x,y,z,sx,sy,sz)=>new Float32Array([sx,0,0,0,0,sy,0,0,0,0,sz,0,x,y,z,1]);
    for(const f of S.flags||[]){const z=H.hAt(f.x,f.y);const dE=Math.hypot(cam.eye[0]-f.x,cam.eye[1]-f.y);const k=Math.max(1,dE/90),pr=Math.max(.014,dE*.0011);
      draw(R.cyl,TRS(f.x,f.y,z-.1,pr,pr,2.6+(k-1)*.6),[.97,.97,.94],0,.4);draw(R.flagM,TRS(f.x+pr,f.y,z+2.6+(k-1)*.6-.45*k,.7*k,1,.45*k),f.col||[.95,.85,.1],1,.45)}
    if(R.bldFor!==H)bldBuild(R,H);{const I4=TRS(0,0,0,1,1,1);for(const g of R.bld)draw(g.m,I4,g.c.map(v=>v*.8),0,.45)}if(SPL.on)splashDraw(R,draw);// neutral fill light: shaded walls read grey/beige, not navy
    if(S.tee)draw(R.cyl,TRS(S.tee.x,S.tee.y,S.tee.z-.05,.006,.006,.06),[1,1,1]);
    for(const t of S.teeMarks||[]){draw(R.sphere,TRS(t.x,t.y,t.z+.08,.13,.13,.11),t.col,0,.15)}
    gl.uniform1f(u.uBallD,1);for(const b of S.extraBalls||[])draw(R.ballM,TRS(b.x,b.y,b.z+.0233,.0233,.0233,.0233),[.95,.95,.95],0,.1);
    if(S.ballOn){const b=S.ballPos;const dE=Math.hypot(cam.eye[0]-b[0],cam.eye[1]-b[1],cam.eye[2]-b[2]);const r=Math.max(.0233,dE*.0012*Math.min(S.ballBoost||1,1.3));/* real size; only a slim minimum so a distant ball stays a visible dot */draw(R.ballM,TRS(b[0],b[1],b[2]+r,r,r,r),[1,1,1],0,.35)}gl.uniform1f(u.uBallD,0);
    gl.enable(gl.CULL_FACE)}
  // tracer (additive)
  if(R.tracerN>2){const p=R.pTr;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u.uVP,false,VP);gl.uniform3fv(p.u.uTc,S.tracerCol||[1,.55,.15]);gl.uniform1f(p.u.uHead,S.tracerHead||1);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.bindVertexArray(R.tracer.v);gl.drawArrays(gl.TRIANGLE_STRIP,0,R.tracerN);gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE)}
  gl.bindVertexArray(null);
  R.lastVP=VP;return VP}
function glTracer(R,pts,n,eye,frac,fN,H){if(fN===undefined)fN=n;
  // pts Float32Array xyz (yards) n points; build camera-facing ribbon up to frac
  const gl=R.gl;const P=new Float32Array(n*6),A=new Float32Array(n*4);let m=0;
  for(let i=0;i<n;i++){const x=pts[i*3],y=pts[i*3+1],z=pts[i*3+2];const j=Math.min(n-1,i+1),k=Math.max(0,i-1);let tx=pts[j*3]-pts[k*3],ty=pts[j*3+1]-pts[k*3+1],tz=pts[j*3+2]-pts[k*3+2];
    const vx=x-eye[0],vy=y-eye[1],vz=z-eye[2];let sx=ty*vz-tz*vy,sy=tz*vx-tx*vz,sz=tx*vy-ty*vx;const l=Math.hypot(sx,sy,sz)||1;const d=Math.hypot(vx,vy,vz);const gnd=i>=fN-1&&H;const w=gnd?Math.max(.018,d*.0016):Math.max(.05,d*.0026);if(gnd){// ground trail: lay it flat on the turf just above the surface so it bends with the roll / putt break
      const gz=H.hAt(x,y)+.012;const ux=tx,uy=ty,ul=Math.hypot(ux,uy)||1;P[m*3]=x-uy/ul*w;P[m*3+1]=y+ux/ul*w;P[m*3+2]=Math.max(z,gz);A[m*2]=i/(n-1)*frac;A[m*2+1]=1;m++;P[m*3]=x+uy/ul*w;P[m*3+1]=y-ux/ul*w;P[m*3+2]=Math.max(z,gz);A[m*2]=i/(n-1)*frac;A[m*2+1]=-1;m++;continue}sx*=w/l;sy*=w/l;sz*=w/l;
    P[m*3]=x+sx;P[m*3+1]=y+sy;P[m*3+2]=z+sz;A[m*2]=i/(n-1)*frac;A[m*2+1]=1;m++;P[m*3]=x-sx;P[m*3+1]=y-sy;P[m*3+2]=z-sz;A[m*2]=i/(n-1)*frac;A[m*2+1]=-1;m++}
  gl.bindBuffer(gl.ARRAY_BUFFER,R.tracer.attrs[0].buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,P.subarray(0,m*3));gl.bindBuffer(gl.ARRAY_BUFFER,R.tracer.attrs[1].buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,A.subarray(0,m*2));R.tracerN=m}

/* global tree placement guard: never in water, the ocean (inside or beyond the hole box, matching what the renderer draws as water), below sea level, or on sand / greens / fringe / tees / fairways */
function seaLevel(H){if(H.seaZ!==undefined)return H.seaZ;const z=[];if(H.sea.length)for(let y=H.Y0+1;y<H.Y1-1;y+=3)for(let x=H.X0+1;x<H.X1-1;x+=3){const sf=H.surfAt(x,y);if(sf===S_WATER)z.push(H.hAt(x,y))}z.sort((a,b)=>a-b);H.seaZ=z.length?z[z.length>>1]:-1e9;return H.seaZ}
/* open water beyond the hole box: on when the hole has sea polygons or much of the box border is water; level = median height of water cells near the border */
const OUT_SEA_COURSES={ngla:1,shinnecock:1,fishers:1,friars:1,pebble:1,cypress:1,pacificdunes:1,seminole:1};
function outSea(H){if(H.outZ!==undefined)return H.outZ;let n=0,wn=0;const z=[];const isW=(x,y)=>{const s=H.surfAt(x,y);return s===S_WATER};
  for(let x=H.X0+1;x<H.X1-1;x+=2)for(const y of [H.Y0+1,H.Y1-1]){n++;if(isW(x,y))wn++}for(let y=H.Y0+1;y<H.Y1-1;y+=2)for(const x of [H.X0+1,H.X1-1]){n++;if(isW(x,y))wn++}
  if(H.sea.length&&seaLevel(H)>-900){H.outZ=H.seaZ;if(H.course.id==='pebble'){const z2=[];for(let y=H.Y0+1;y<H.Y1-1;y+=3)for(let x=H.X0+1;x<H.X1-1;x+=3)if(H.surfAt(x,y)===S_WATER)z2.push(H.hAt(x,y));z2.sort((a,b)=>a-b);H.outZ=Math.min(H.seaZ,z2.length?z2[z2.length*.15|0]:H.seaZ)-.5}return H.outZ}// v1.17: Pebble low-percentile sea level (no flooded coastal rectangles)
  // only on the sea/bay courses: on inland courses a creek or pond at the box edge must never flood the low ground beyond
  if(wn/n<.12||!OUT_SEA_COURSES[H.course.id]){H.outZ=-1e9;return H.outZ}
  for(let y=H.Y0+1;y<H.Y1-1;y+=2)for(let x=H.X0+1;x<H.X1-1;x+=2){if(Math.min(x-H.X0,H.X1-x,y-H.Y0,H.Y1-y)>20)continue;if(isW(x,y))z.push(H.hAt(x,y))}z.sort((a,b)=>a-b);H.outZ=z.length?z[z.length>>1]:-1e9;return H.outZ}
function treeSpotOK(H,x,y,r){if(H.course.id==='augusta'&&H.hi===16&&y>140&&y<260&&Math.abs(x)<34)return false;if(H.inBld&&H.inBld(x,y,r*.5+1))return false;const inB=(px,py)=>px>H.X0+.5&&px<H.X1-.5&&py>H.Y0+.5&&py<H.Y1-.5;const h2=1.6,pts=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7],[h2,0],[-h2,0],[0,h2],[0,-h2],[2.2,0],[-2.2,0],[0,2.2],[0,-2.2]];
  const sz=H.sea.length?seaLevel(H):-1e9;
  {const L=H.line;if(L&&L.length>1){const bx=L[1][0]-L[0][0],by=L[1][1]-L[0][1],l=Math.hypot(bx,by)||1;const t=(x*bx+y*by)/l;{const aug=H.course.id==='augusta',tm=aug?130:100;if(t>-10&&t<Math.min(tm,l)){const d=Math.abs(x*by-y*bx)/l;if(d<(aug?13+t*.18:9+t*.12))return false}}/* v1.30: wider open tee sightline (no thin trees right in front of the tee; Augusta widest) */}}// keep the tee shot's sightline open (no trees crowding the tee line)
  for(const q of pts){const px=x+q[0],py=y+q[1];if(inB(px,py)){const s=H.surfAt(px,py);if(s===S_WATER||s===S_FW||s===S_TEE||s===S_FRINGE||s===S_GREEN||s===S_SAND)return false;if(sz>-900&&H.hAt(px,py)<sz+1.4)return false}
    else{// beyond the box the renderer extends the edge mask outward and floods anything below the sea level
      const od=Math.max(H.X0-px,px-H.X1,H.Y0-py,py-H.Y1,0);if(od<75&&H.surfAt(clamp(px,H.X0+1,H.X1-1),clamp(py,H.Y0+1,H.Y1-1))===S_WATER)return false;{const oz=outSea(H);if(oz>-900&&H.demAt(px,py)<oz+1.4+Math.min(od*.004,5))return false}}}
  const polys=H.sea.concat((H.F&&H.F.wa)||[]);for(let i=0;i<5;i++){const px=x+pts[i][0],py=y+pts[i][1];for(const P of polys)if(pip(px,py,P))return false}
  if(!inB(x,y)&&H.F){const pl=[].concat(H.F.fw||[],H.F.gr||[],H.F.te||[],H.F.bk||[]);for(let i=0;i<5;i++){const px=x+pts[i][0],py=y+pts[i][1];for(const P of pl)if(pip(px,py,P))return false}}// beyond the box: never on a neighbouring hole's fairway, green, tee or bunker
  return true}

// v1.15: OSM buildings (walls + hipped roofs) and bridges as simple lit meshes, grouped by colour
function bldBuild(R,H){const G2={};const grp=(k,c)=>G2[k]||(G2[k]={c,P:[],N:[],I:[]});
  const quad=(g,a,b,c,d,n)=>{const o=g.P.length/3;for(const p of[a,b,c,d]){g.P.push(p[0],p[1],p[2]);g.N.push(n[0],n[1],n[2])}g.I.push(o,o+1,o+2,o,o+2,o+3)};
  const tri=(g,a,b,c)=>{const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(x=>x/l);if(n[2]<0)n=n.map(x=>-x);const o=g.P.length/3;for(const p of[a,b,c]){g.P.push(p[0],p[1],p[2]);g.N.push(n[0],n[1],n[2])}g.I.push(o,o+1,o+2)};
  const cid=H.course.id;const WALL=cid==='pebble'?[[.78,.76,.7],[.7,.66,.58],[.8,.79,.76],[.58,.52,.45]]:cid==='augusta'?[[.8,.79,.75],[.74,.71,.65],[.62,.57,.5]]:[[.76,.74,.68],[.66,.6,.52],[.56,.54,.51],[.8,.78,.74]];
  const ROOF=cid==='pebble'?[[.36,.37,.38],[.55,.33,.25],[.45,.42,.38]]:[[.3,.31,.33],[.4,.36,.32],[.26,.27,.3]];
  let i=0;for(const b of H.blds||[]){i++;const P=b.P;const cx=P.reduce((a,p)=>a+p[0],0)/P.length,cy=P.reduce((a,p)=>a+p[1],0)/P.length;
    const inB=(x,y)=>x>H.X0+1&&x<H.X1-1&&y>H.Y0+1&&y<H.Y1-1;const zAt=(x,y)=>inB(x,y)?H.hAt(x,y):(H.demAt?H.demAt(x,y):H.hAt(x,y));
    let bad=Math.hypot(cx,cy)<30||segD(cx,cy,H.line)<18;for(const p of P){const k=inB(p[0],p[1])?H.surfAt(p[0],p[1]):1;if((k>=2&&k<=6)||Math.hypot(p[0],p[1])<85)bad=true}if(bad)continue;// never on play surfaces, the tee or the line of play (stale / misprojected data)
    let z0=1e9;for(const p of P)z0=Math.min(z0,zAt(p[0],p[1]));z0=Math.min(z0,zAt(cx,cy))-1.5;const zt=z0+1.5+b.h;const r=hash2(i,911);
    const w=grp('w'+(r*WALL.length|0),WALL[r*WALL.length|0]);const rf=grp('r'+(hash2(i,313)*ROOF.length|0),ROOF[hash2(i,313)*ROOF.length|0]);
    let A=0;for(let j=0;j<P.length;j++){const p=P[j],q=P[(j+1)%P.length];A+=p[0]*q[1]-q[0]*p[1]}const ccw=A>0;
    for(let j=0;j<P.length;j++){const p=P[j],q=P[(j+1)%P.length];const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1;const n=ccw?[dy/l,-dx/l,0]:[-dy/l,dx/l,0];quad(w,[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],zt],[p[0],p[1],zt],n)}
    const rad=Math.sqrt(Math.abs(A)/2);const rh=Math.min(4.5,Math.max(1.2,rad*.32))*(b.h>9?.35:1);const ap=[cx,cy,zt+rh];
    const ov=.35;const E=P.map(p=>{const dx=p[0]-cx,dy=p[1]-cy,l=Math.hypot(dx,dy)||1;return[p[0]+dx/l*ov,p[1]+dy/l*ov,zt-.15]});
    for(let j=0;j<E.length;j++)tri(rf,E[j],E[(j+1)%E.length],ap)}
  const deckC=cid==='augusta'?[.66,.63,.58]:[.5,.43,.35];const dk=grp('d',deckC);
  const rl=grp('rl',[.36,.3,.24]);const inBx=(x,y)=>x>H.X0+1&&x<H.X1-1&&y>H.Y0+1&&y<H.Y1-1;
  for(const L0 of(H.F&&H.F.br)||[]){if(L0.length<2)continue;if(!L0.some(p=>inBx(p[0],p[1])))continue;// v1.15: cart-path bridges (OSM bridge=yes): deck ramps between the two banks, clears the water/ground under it, open rails on posts
    const L=L0.map(p=>[p[0],p[1]]);{const a=L[0],b=L[1],l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;L[0]=[a[0]-(b[0]-a[0])/l*1.2,a[1]-(b[1]-a[1])/l*1.2];const c=L[L.length-1],d=L[L.length-2],m=Math.hypot(c[0]-d[0],c[1]-d[1])||1;L[L.length-1]=[c[0]+(c[0]-d[0])/m*1.2,c[1]+(c[1]-d[1])/m*1.2]}
    const zg=(x,y)=>{const x2=Math.min(H.X1-1.5,Math.max(H.X0+1.5,x)),y2=Math.min(H.Y1-1.5,Math.max(H.Y0+1.5,y));let z=H.hAt(x2,y2);if(H.surfAt(x2,y2)===7&&H.seaZ>-900)z=Math.max(z,H.seaZ);return z};
    const cum=[0];for(let j=1;j<L.length;j++)cum.push(cum[j-1]+Math.hypot(L[j][0]-L[j-1][0],L[j][1]-L[j-1][1]));const T=cum[cum.length-1]||1;
    const zA=zg(L[0][0],L[0][1]),zB=zg(L[L.length-1][0],L[L.length-1][1]);
    let lift=0;for(let j=0;j<L.length-1;j++){const p=L[j],q=L[j+1],sl=Math.hypot(q[0]-p[0],q[1]-p[1]);for(let s=0;s<=sl;s+=.5){const f=sl?s/sl:0,x=p[0]+(q[0]-p[0])*f,y=p[1]+(q[1]-p[1])*f,t=(cum[j]+s)/T,arch=Math.sin(Math.PI*t);const zl=zA+(zB-zA)*t;if(t>.15&&t<.85)lift=Math.max(lift,(zg(x,y)+.4-zl)/arch)}}lift=Math.min(1.4,Math.max(.18,lift));
    const zAtT=t=>zA+(zB-zA)*t+.1+lift*Math.sin(Math.PI*t);
    const hw=1.15;
    for(let j=0;j<L.length-1;j++){const p=L[j],q=L[j+1];const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy);if(l<.2)continue;const ux=dx/l,uy=dy/l,nx=-uy*hw,ny=ux*hw;
      const nSeg=Math.max(1,Math.ceil(l/1.5));for(let k=0;k<nSeg;k++){const f0=k/nSeg,f1=(k+1)/nSeg;const a=[p[0]+dx*f0,p[1]+dy*f0],b=[p[0]+dx*f1,p[1]+dy*f1];const za=zAtT((cum[j]+l*f0)/T),zb=zAtT((cum[j]+l*f1)/T);
        quad(dk,[a[0]+nx,a[1]+ny,za],[a[0]-nx,a[1]-ny,za],[b[0]-nx,b[1]-ny,zb],[b[0]+nx,b[1]+ny,zb],[0,0,1]);
        for(const s of[1,-1]){const ax=a[0]+nx*s,ay=a[1]+ny*s,bx=b[0]+nx*s,by=b[1]+ny*s,n=[-uy*s,ux*s,0];
          quad(dk,[ax,ay,za-.32],[bx,by,zb-.32],[bx,by,za===zb?zb:zb],[ax,ay,za],n);// fascia beam
          quad(rl,[ax,ay,za+.62],[bx,by,zb+.62],[bx,by,zb+.72],[ax,ay,za+.72],n);// top rail
          const pw=.07,px=ax-ux*pw,py=ay-uy*pw,qx=ax+ux*pw,qy=ay+uy*pw;quad(rl,[px,py,za],[qx,qy,za],[qx,qy,za+.72],[px,py,za+.72],n);quad(rl,[px,py,za],[px,py,za+.72],[px-nx*.06*s,py-ny*.06*s,za+.72],[px-nx*.06*s,py-ny*.06*s,za],[-ux,-uy,0])}}}}
  R.bld=[];for(const k in G2){const g=G2[k];if(!g.I.length)continue;R.bld.push({c:g.c,m:R.vao([{loc:0,n:3,d:new Float32Array(g.P)},{loc:1,n:3,d:new Float32Array(g.N)}],new Uint32Array(g.I))})}R.bldFor=H}
