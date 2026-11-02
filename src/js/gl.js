'use strict';
/* Hand-written WebGL2 renderer: terrain, sky, water, trees, flag, ball, tracer */
const M4={
  persp(f,a,n,fa){const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o},
  look(e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
    let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*e[0]+xy*e[1]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1])},
  mul(a,b){const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o}
};
const GLSL_COMMON=`
uniform vec3 uSun;uniform vec3 uSunCol;uniform vec3 uSkyTop;uniform vec3 uSkyHor;uniform vec3 uFogCol;uniform float uFogK;uniform vec3 uEye;uniform float uTime;uniform float uMist;uniform float uMistZ;uniform float uSeaZ;
vec3 skyCol(vec3 d){float h=max(d.z,0.);vec3 c=mix(uSkyHor,uSkyTop,pow(h,.32));float s=max(dot(d,uSun),0.);vec3 sc=uSunCol/max(1.,max(uSunCol.r,max(uSunCol.g,uSunCol.b))*.8);c+=sc*(pow(s,8.)*.14+pow(s,64.)*.22+pow(s,700.)*1.5+pow(s,3.)*.1*(1.-uSun.z));return c;}// softer glow so the sun disc stands out instead of a white-out
vec3 tm(vec3 c){c*=1.05;vec3 a=c*(2.51*c+.03),b=c*(2.43*c+.59)+.14;c=clamp(a/b,0.,1.);float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,.9);}
vec3 fogit(vec3 c,vec3 p){float d=length(p-uEye);float f=1.-exp(-d*d*uFogK);vec3 v=normalize(p-uEye);float s=pow(max(dot(v,uSun),0.),6.);vec3 fc=mix(uFogCol,uSunCol*.9+uFogCol*.4,s*.6);c=mix(c,fc,clamp(f,0.,.8-.24*smoothstep(.4,.5,uSun.z)));if(uMist>0.){float hm=1.-smoothstep(-1.5,1.8,p.z-uMistZ);float dm=smoothstep(35.,240.,d);float nm=.75+.5*sin(p.x*.05+uTime*.05)*sin(p.y*.043-uTime*.03);c=mix(c,uFogCol*1.06,clamp(uMist*hm*dm*nm*.11,0.,.09));}return c;}
`;
function mkGL(canvas){
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!gl)return null;
  const R={gl,canvas};
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o)+'\n'+s.split('\n').map((l,i)=>(i+1)+': '+l).join('\n'));return o};
  const prog=(vs,fs)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;\n'+vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;\n'+fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);u[a.name.replace('[0]','')]=gl.getUniformLocation(p,a.name)}return{p,u}};
  // ---------- programs ----------
  R.pTer=prog(`
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;uniform mat4 uVP;uniform vec4 uReg;uniform float uOuter;uniform sampler2D uMask;
out vec3 vP;out vec3 vN;
void main(){vec3 p=aP;if(uOuter>0.){vec2 uv=(p.xy-uReg.xy)/uReg.zw;float w=texture(uMask,clamp(uv,0.,1.)).r;p.z=aP.z-.95*step(.5,w);}
vP=p;vN=aN;gl_Position=uVP*vec4(p,1.);}`,`
${GLSL_COMMON}
in vec3 vP;in vec3 vN;out vec4 o;
uniform sampler2D uCol;uniform sampler2D uMask;uniform sampler2D uNoise;uniform vec4 uReg;uniform vec3 uFar;
uniform vec2 uCup;uniform vec4 uBall;uniform vec4 uRing;uniform vec4 uAim;uniform float uAimOn;uniform float uPutt;
uniform vec4 uG0;uniform vec4 uGb[4];uniform float uOuter;uniform float uFoam;uniform float uDune;uniform float uCliff;uniform float uEdgeSea;uniform float uOutSea;uniform float uOutZ;uniform float uWv;
vec2 gGrad(vec2 p){vec2 g=uG0.zw;for(int i=0;i<4;i++){vec2 d=p-uGb[i].xy;float e=uGb[i].w*exp(-dot(d,d)/(2.*uGb[i].z*uGb[i].z))/(uGb[i].z*uGb[i].z);g-=d*e;}return g;}
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 uv=(vP.xy-uReg.xy)/uReg.zw;vec2 cuv=clamp(uv,0.,1.);
  vec3 c=texture(uCol,cuv,-.75).rgb;vec4 m=texture(uMask,cuv);
  {float od0=length(max(abs(uv-.5)-.5,0.)*uReg.zw);float k0=smoothstep(0.,6.,od0);m.gba*=1.-k0;c=mix(c,vec3(dot(c,vec3(.333)))*vec3(.85,1.,.7)+(c-vec3(dot(c,vec3(.333))))*.4,k0*.6);}// beyond the hole box: no edge-clamped fairway/green/tee strips running to the horizon
  // crisp edges: re-split the blurred colour texture across sand and green edges using the mask gradient
  vec2 ey=.5/uReg.zw;float sgB=0.,sgG=0.;
  if(m.b>.02&&m.b<.98){vec2 gd=vec2(texture(uMask,cuv+vec2(ey.x,0.)).b-texture(uMask,cuv-vec2(ey.x,0.)).b,texture(uMask,cuv+vec2(0.,ey.y)).b-texture(uMask,cuv-vec2(0.,ey.y)).b);
    if(dot(gd,gd)>1e-6){vec2 n=normalize(gd)*1.4/uReg.zw;float aa=fwidth(m.b)*.9+.015;sgB=smoothstep(.5-aa,.5+aa,m.b);
      c=mix(texture(uCol,cuv-n,-.75).rgb,texture(uCol,cuv+n,-.75).rgb,sgB);sgB=1.-smoothstep(0.,aa*3.+.05,abs(m.b-.5));}}
  if(m.g>.5&&m.g<.98&&m.b<.02){vec2 gd=vec2(texture(uMask,cuv+vec2(ey.x,0.)).g-texture(uMask,cuv-vec2(ey.x,0.)).g,texture(uMask,cuv+vec2(0.,ey.y)).g-texture(uMask,cuv-vec2(0.,ey.y)).g);
    if(dot(gd,gd)>1e-6){vec2 n=normalize(gd)*1.1/uReg.zw;float aa=fwidth(m.g)*.9+.015;float sh=smoothstep(.72-aa,.72+aa,m.g);c=mix(texture(uCol,cuv-n,-.75).rgb,texture(uCol,cuv+n,-.75).rgb,sh);}}
  {// mowing: fairways in even lengthwise bands along the hole (3 yd mower passes), tees in a fine diamond; soft light/dark, anti-aliased, fades before it can alias
    float fwm=smoothstep(.07,.13,m.g)*(1.-smoothstep(.3,.42,m.g))*(1.-m.b);float sx=vP.x/3.;float fx=fwidth(sx);float bnd=abs(fract(sx)-.5)*2.;float sq=smoothstep(.5-fx-.12,.5+fx+.12,bnd);float vis=1.-smoothstep(.18,.5,fx);
    float cut=abs(fract(vP.y/22.)-.5)*2.;float cc=smoothstep(.1,.35,cut)*.3;// faint cross-cut every 22 yd (turning rows)
    c*=mix(1.,mix(1.065,.935,mix(sq,1.-sq,cc*0.)),fwm*vis);
    // rough vs fairway: rough reads darker and coarser; a soft darker band just outside the fairway edge shows the height step-down
    float rgh=(1.-smoothstep(.04,.1,m.g))*(1.-m.b)*(1.-smoothstep(.3,.6,m.r));c*=mix(1.,.9,rgh);float edge=smoothstep(.0,.05,m.g)*(1.-smoothstep(.05,.1,m.g))*(1.-m.b);c*=1.-.1*edge;}
  float onG=smoothstep(.7,.8,m.g);c=mix(c,c*vec3(.97,1.02,.93),onG*.4);
  float outd=length(max(abs(uv-.5)-.5,0.)*uReg.zw);
  vec4 nz=texture(uNoise,vP.xy*.045);vec4 nz2=texture(uNoise,vP.xy*.31);vec4 nz3=texture(uNoise,vP.xy*1.7);
  /* v1.25 all courses: the painted hole texture fades to the far-land colour over its last ~24 yd, so neighbouring-hole bunkers/paths/fairways are never cut off by the straight box edge, and nothing is clamp-smeared beyond it (no pale slabs/strips in the distance) */
  float bxE;{float ind=min(min(uv.x,1.-uv.x)*uReg.z,min(uv.y,1.-uv.y)*uReg.w);bxE=outd>0.?1.:(1.-smoothstep(3.,34.,ind));c=mix(c,uFar*(.85+.3*nz.r),bxE);}
  float grass=1.-m.b;
  float dE=length(vP-uEye);float near=1.-smoothstep(10.,85.,dE);vec4 nz4=texture(uNoise,vP.xy*5.3);vec4 nz5=texture(uNoise,vP.xy*13.1+.37);
  vec2 dx=dFdx(vP.xy),dy=dFdy(vP.xy);float lx=length(dx),ly=length(dy);float fp=sqrt(lx*ly)*1.6,fpM=max(lx,ly)*1.25;// fine layers fade by the long (along-view) footprint so grazing angles don't streak
  float w3=1.-smoothstep(.2,.55,fp*1.7),w4=1.-smoothstep(.2,.55,fpM*5.3),w5=1.-smoothstep(.2,.55,fpM*13.1);
  float mown=max(smoothstep(.07,.13,m.g),0.)*(1.-m.b);// fairway, tee and green: shading comes only from the mowing pattern + fine blade grain, no broad brightness patches
  float rgN=1.-mown;c*=mix(1.,.96+.08*nz.g,.7*rgN)*mix(1.,.96+.08*nz2.r,grass*rgN)*mix(1.,.9+.2*nz3.g,.7*w3)*mix(1.,.8+.4*nz4.b,grass*w4*.85)*mix(1.,.76+.48*nz5.a,grass*w5*.75);
  {float w6=(1.-smoothstep(.2,.55,fpM*31.))*(1.-smoothstep(10.,70.,dE));float bl6=texture(uNoise,vP.xy*vec2(31.,23.)+.71).r*.6+texture(uNoise,vP.xy*vec2(61.,47.)+.13).g*.4;c*=mix(1.,.8+.4*bl6,grass*w6*.8);
   float w8=(1.-smoothstep(.2,.55,fpM*9.))*(1.-smoothstep(25.,110.,dE));float b8=texture(uNoise,vP.xy*vec2(8.7,7.9)+.29).a;c*=mix(1.,.8+.4*b8,grass*w8*.6*rgN);}
  {float w7=(1.-smoothstep(.3,.8,fp*3.))*smoothstep(18.,40.,dE)*(1.-smoothstep(160.,340.,dE));float b7=texture(uNoise,vP.xy*vec2(1.3,1.1)+.2).g*.5+texture(uNoise,vP.xy*vec2(2.9,2.3)+.6).b*.5;c*=mix(1.,.9+.2*b7,grass*w7*.55*rgN);}
  c=pow(c,vec3(2.2));
  float rkG=0.;{vec3 N0=normalize(vN);float sl0=length(N0.xy);float rk=uFoam*smoothstep(.45-.15*uCliff,.72-.17*uCliff,sl0)*(1.-smoothstep(uSeaZ+30.,uSeaZ+45.,vP.z))*(1.-smoothstep(.3,.5,m.r));
    if(rk>0.){float st=texture(uNoise,vec2((vP.x+vP.y)*.045,vP.z*.22)).r*.45+texture(uNoise,vP.xy*.13+vec2(0.,vP.z*.08)).g*.35+nz4.b*.2;vec3 rc=mix(vec3(.30,.27,.23),vec3(.52,.47,.40),smoothstep(.25,.8,st));rc*=.9+.2*nz3.r;c=mix(c,pow(rc,vec3(2.2)),rk);}rkG=rk;}
  vec3 N=normalize(vN);vec3 Ne=normalize(vec3(N.xy*4.2,N.z));float df=max(dot(Ne,uSun),0.);
  vec3 amb=mix(uSkyHor*.35,uSkyTop*.5,N.z*.5+.5);float gold=1.-smoothstep(.2,.38,uSun.z);
  if(gold>0.){vec3 Ns=normalize(vec3(N.xy*1.8,N.z));float dw=clamp(dot(Ns,normalize(vec3(uSun.xy,.5)))*.6+.32,0.,1.);df=mix(df,dw*.95,gold);amb=mix(amb,uSkyTop*vec3(.8,1.,1.45)*.85,gold*.75);}
  float fes=smoothstep(.2,.45,m.a)*(1.-rkG);float fesO=uDune*bxE*(.5+.4*smoothstep(.35,.65,nz.g))*(1.-rkG);/* v1.30: dune courses: native fescue/sand continues past the hole box (Pacific Dunes sand rectangle) */fes=fes*(1.-bxE)+fesO;
  if(fes>0.001){// native grass: wind-combed strands in clumped tufts; on dune courses rippled sand shows between the tufts
    vec4 mac=texture(uNoise,vP.xy*.0123+.31);vec2 wp=vP.xy+(nz.rg-.5)*9.+(nz2.ba-.5)*1.6;float ang=.64+(mac.r-.5)*1.9;vec2 cs=vec2(cos(ang),sin(ang));vec2 rq=vec2(dot(wp,cs),dot(wp,vec2(-cs.y,cs.x)));float sway=sin(uTime*.8+vP.x*.25+vP.y*.18)*.12;
    float tuft=smoothstep(.40,.64,texture(uNoise,wp*.42).r*.65+nz2.g*.35);vec2 rq2=vec2(dot(wp,vec2(cs.y,cs.x)),dot(wp,vec2(-cs.x,cs.y)));float strand=texture(uNoise,(rq+vec2(sway,0.))*vec2(.7,5.5)).b*.45+texture(uNoise,rq*vec2(1.9,13.)+.4).g*.25+texture(uNoise,rq2*vec2(1.1,7.3)+.77).r*.3;
    float wb=1.-smoothstep(.2,.55,fp*6.);strand=mix(.55,strand,.35+.65*wb);
    vec3 gc=mix(vec3(.42,.41,.25),vec3(.80,.72,.49),smoothstep(.3,.8,strand))*mix(.82,1.08,nz.b);gc=mix(gc,gc*vec3(.86,1.02,.82),smoothstep(.35,.7,mac.g))*mix(.86,1.1,mac.b);
    float rip=.5+.5*sin(rq.y*2.4+nz2.r*5.);vec3 sc=vec3(.80,.74,.58)*(.93+.12*rip*(1.-smoothstep(.3,.6,fp*2.4)))*mix(.92,1.05,nz3.r);
    float sandf=uDune*(1.-tuft)*.85;vec3 fc=mix(gc*mix(.78,1.,tuft),sc,sandf);c=mix(c,pow(fc,vec3(2.2)),fes*.88);}/* v1.30: fescue/dune shading also fades at the box edge (Pacific Dunes sand rectangle) */
  float slope=length(N.xy);float sdm=smoothstep(.3,.6,m.b);amb=mix(amb,vec3(dot(amb,vec3(.333)))*vec3(1.1,1.,.85),sdm);float fill=.58+.3*(1.-smoothstep(0.,.3,df))+gold*.25;vec3 col=c*(amb*fill+uSunCol*df*1.42)*(1.-clamp(slope*1.5,0.,.16)*grass);
  {float gm=smoothstep(.8,.95,m.g);col=mix(col,col*vec3(.97,.99,.95),gm);
    // green material: cross-cut mowing (soft light/dark bands), fine grain, collar ring and exaggerated slope shading
    float gu=(vP.x+vP.y)*.7071/3.6,gv=(vP.x-vP.y)*.7071/3.6;float fu=fwidth(gu),fv=fwidth(gv);float vis=1.-smoothstep(.12,.45,max(fu,fv));
    float su=smoothstep(.3,.7,abs(fract(gu)-.5)*2.),sv=smoothstep(.3,.7,abs(fract(gv)-.5)*2.);col*=mix(1.,mix(.945,1.055,su)*mix(.96,1.04,sv),gm*vis);
    vec3 Lg=normalize(vec3(N.xy*10.,N.z));col*=mix(1.,.86+.3*clamp(dot(Lg,uSun)*.8+.3,0.,1.),gm);col*=mix(1.,.9+.2*nz5.g,gm*w5)*mix(1.,.93+.14*nz4.r,gm*w4);
    float col2=smoothstep(.6,.7,m.g)*(1.-smoothstep(.76,.86,m.g));col*=1.-.08*col2;}
  {float nc=1.-smoothstep(6.,55.,dE);col+=c*amb*.3*nc*(1.-df*.6);}
  col*=1.-.32*sgB*(1.-m.b*.6);{float face=smoothstep(.5,.6,m.b)*(1.-smoothstep(.62,.95,m.b));vec3 Lg=normalize(vec3(N.xy*6.,N.z));col*=1.-.24*face*clamp(.6-dot(Lg,uSun),0.,1.)*1.6;}col*=mix(1.,.9+.2*nz5.r,m.b*near);
  // water
  float w=smoothstep(.38,.62,m.r+(nz2.r-.5)*.1);
  if(uOuter>0.&&outd>0.){// beyond the hole box: edge-extended water only near the edge (no straight rays/spits to the horizon); open water by height against the sea/bay level
    w=step(.5,m.r)*(1.-smoothstep(25.,70.,outd))*(1.-step(1.5,uWv)*step(.5,uOutSea));/* v1.17: Pebble: no edge-extended sea rectangles */if(uOutSea>.5){float lv=uOutZ+min(outd*.004,5.);w=max(w,1.-smoothstep(lv+.4,lv+1.2,vP.z));}}
  if(uEdgeSea>.5&&outd<=0.){float lv=uOutZ+bxE*bxE*14.;w=max(w,1.-smoothstep(lv+.4,lv+1.6,vP.z+(nz2.g-.5)*1.5));}/* v1.30 Cypress: land near the box edge recedes into the sea by height (no straight cut-off coast) */
  if(w>0.){vec3 V=normalize(vP-uEye);vec2 r=(texture(uNoise,vP.xy*.08+vec2(uTime*.02,uTime*.013)).rg+texture(uNoise,vP.xy*.21-vec2(uTime*.03,0.)).ba-1.)*.18;
    vec3 n=normalize(vec3(r,1.));vec3 rf=reflect(V,n);float fr=.04+.96*pow(1.-max(dot(-V,n),0.),5.);
    float wd=mix(smoothstep(.5,1.,m.r),1.,max(step(.001,outd)*uOuter*smoothstep(0.,60.,outd),bxE*uOuter*.85));/* v1.30: in-box shallow-water tint fades at the box edge (Cypress 16 pale sea rectangle) */vec3 deep=mix(vec3(.025,.095,.105),vec3(.008,.04,.06),wd);vec3 rc=min(mix(skyCol(rf),uSkyTop,.45),vec3(1.));rc=uWv>.5?mix(rc,vec3(dot(rc,vec3(.333))),.35)*vec3(.34,.47,.5):rc*vec3(.34,.52,.58);/* v1.15: less saturated reflections (inland ponds read grey-green, not royal blue) */vec3 wc=mix(deep,rc,clamp(.1+fr*.42,0.,.45))+uSunCol*pow(max(dot(rf,uSun),0.),180.)*2.*clamp(1.-length(fwidth(vP.xy))*.35,0.,1.);/* glints fade when a pixel spans many noise texels (no dotted grid from above) */wc*=(.9+.2*nz3.g)*.68;
    float shore=smoothstep(.35,.5,m.r)*(1.-smoothstep(.5,.75,m.r))*(1.-step(.001,outd)*uOuter);wc=mix(wc,vec3(.16,.2,.12)*.5,shore*(uWv>.5?.5:.35));
    float mb=textureLod(uMask,cuv,3.).r;float fo=(1.-smoothstep(.45,.95,mb))*w*uFoam*(1.-step(.001,outd)*uOuter);float wave=.5+.5*sin(mb*22.-uTime*1.3+nz.r*5.);fo*=smoothstep(.25,1.05,wave*(.5+.7*nz2.g))*(.45+.55*nz3.r)*smoothstep(.2,.55,textureLod(uMask,cuv,5.).r);
    wc=mix(wc,vec3(.82,.87,.88),clamp(fo*.6,0.,.6));float sfl=uFoam*(1.-step(.001,outd))*smoothstep(.40,.5,m.r)*(1.-smoothstep(.56,.75,m.r))*(.55+.45*sin(uTime*1.2+(vP.x+vP.y)*.25+nz2.r*4.))*(.6+.6*nz3.g);wc=mix(wc,vec3(.9,.93,.94),clamp(sfl,0.,.75));col=mix(col,wc,w);}
  // cup & ball shadow
  float dc=length(vP.xy-uCup);col=mix(col,vec3(.01),1.-smoothstep(.112,.122,dc));col=mix(col,col*1.25+.04,smoothstep(.115,.122,dc)*(1.-smoothstep(.13,.14,dc)));
  float db=length(vP.xy-uBall.xy);col*=1.-.55*(1.-smoothstep(uBall.w*.4,uBall.w,db))*uBall.z;
  // landing ring
  if(uRing.w>0.){float dr=length(vP.xy-uRing.xy);float ring=1.-smoothstep(.0,.28*max(1.,uRing.z/7.),abs(dr-uRing.z));float fill=0.;
    col=mix(col,vec3(.9,.85,.62),clamp((ring*.5+fill)*uRing.w,0.,1.));float dot2=1.-smoothstep(.15,.3,dr);col=mix(col,vec3(1.),dot2*uRing.w);}
  if(uAimOn>0.){vec2 a=uAim.xy,b=uAim.zw;vec2 ab=b-a;float L=length(ab);float t=clamp(dot(vP.xy-a,ab)/(L*L),0.,1.);float d=length(vP.xy-a-ab*t);float s=t*L;
    float dash=step(.5,fract(s/1.4-uTime*.6));col=mix(col,vec3(1.),(1.-smoothstep(.05,.12,d))*dash*.7*uAimOn*step(1.2,s));}
  if(uPutt>0.&&m.g>.3){vec2 q=vP.xy;vec2 f=abs(fract(q)-.5);float gl2=1.-smoothstep(.0,.03,min(.5-f.x,.5-f.y));col=mix(col,vec3(.9,1.,.95),gl2*.22*uPutt);
    vec2 cell=floor(q/1.)+.5;vec2 gr=gGrad(cell);float gm=length(gr);vec2 dir=gm>1e-5?-gr/gm:vec2(0.);float ph=fract(uTime*(.35+gm*18.)+h21(cell));
    vec2 dp=cell+dir*(ph-.5)*.9;float dd=length(q-dp);float a=(1.-smoothstep(.05,.09,dd))*smoothstep(0.,.25,ph)*(1.-smoothstep(.75,1.,ph));
    vec3 sc=mix(vec3(.3,.7,1.),mix(vec3(1.,.95,.3),vec3(1.,.3,.2),smoothstep(.02,.04,gm)),smoothstep(.006,.02,gm));col=mix(col,sc,a*uPutt);}
  {vec3 cf=fogit(col,vP);col=mix(cf,mix(col,cf,.5),w);}
  if(uOuter>0.&&outd>0.)col=mix(col,uFogCol,smoothstep(650.,2800.,outd)*.88);/* v1.20 all courses: far terrain fades into the horizon haze (no hard far blocks/edges) */
  o=vec4(pow(tm(col),vec3(1./2.2)),1.);}`);
  R.pSky=prog(`
layout(location=0) in vec2 aP;out vec2 vU;void main(){vU=aP;gl_Position=vec4(aP,.9999,1.);}`,`
${GLSL_COMMON}
in vec2 vU;out vec4 o;uniform vec3 uF;uniform vec3 uR;uniform vec3 uU;uniform vec2 uT;uniform sampler2D uNoise;
void main(){vec3 d=normalize(uF+uR*vU.x*uT.x+uU*vU.y*uT.y);vec3 c=skyCol(d);float cl=0.;
  {float s=max(dot(d,uSun),0.);vec3 wc=uSunCol/max(max(uSunCol.r,uSunCol.g),uSunCol.b);c+=wc*vec3(1.,.82,.62)*pow(s,5.)*.1*(1.-uSun.z);}// warm sky tint around the sun
  if(d.z>0.){vec2 cp=d.xy/(d.z+.08)*.12+vec2(uTime*.0015,0.);cl=texture(uNoise,cp).r*.6+texture(uNoise,cp*2.3).g*.3+texture(uNoise,cp*5.).b*.1;cl=smoothstep(.48,.74,cl)*smoothstep(-.01,.07,d.z);
    // cumulus: puffy detail at the edges, lit from the sun side (bright tops, soft grey-blue bases)
    float det=texture(uNoise,cp*9.+.37).r;cl=clamp(cl*(.8+.4*det),0.,1.);
    vec2 so=normalize(uSun.xy+1e-4)*.012;float cl2=texture(uNoise,cp+so).r*.6+texture(uNoise,(cp+so)*2.3).g*.3+texture(uNoise,(cp+so)*5.).b*.1;float lit=clamp(.6+(cl2-.62)*-3.,0.,1.);
    vec3 base=mix(uSkyHor,vec3(.62,.66,.74),.55),top=mix(vec3(1.),uSunCol/max(max(uSunCol.r,uSunCol.g),uSunCol.b),.3);
    vec3 cc=mix(base,top,lit)*mix(.9,1.15,pow(max(dot(d,uSun),0.),3.));c=mix(c,cc,cl*.85);}
  {// the sun: a bright disc (~1.1 deg) with a soft limb and bloom, dimmed by cloud, morning haze and the horizon murk
    float s=dot(d,uSun);vec3 wc=uSunCol/max(max(uSunCol.r,uSunCol.g),uSunCol.b);float hz=smoothstep(-.01,.08,d.z);float k=(1.-cl*.85)*(1.-.35*uMist)*mix(.35,1.,hz);
    float disc=smoothstep(.99975,.99983,s);float bloom=pow(max(s,0.),900.)*1.2+pow(max(s,0.),120.)*.35;c+=(mix(vec3(1.,.98,.93),wc,.45+.5*(1.-smoothstep(.05,.3,uSun.z)))*disc*7.+wc*bloom)*k;}
  c=mix(c,uFogCol,smoothstep(.06,-.02,d.z)*.8);
  o=vec4(pow(tm(c),vec3(1./2.2)),1.);}`);
  R.pTree=prog(`
layout(location=0) in vec2 aQ;layout(location=3) in vec4 iP;layout(location=4) in vec4 iW;
uniform mat4 uVP;uniform float uTime;uniform vec3 uEye;uniform vec3 uSun;uniform float uR3;out vec3 vP;out vec2 vUV;out float vTint;out float vY;out float vFace;out float vFl;out float vNear;out float vF3;out float vIs3;
void main(){float spc=floor(iW.y/8.);float is3=(uR3>0.&&spc!=4.&&spc!=5.&&spc!=6.)?1.:0.;vIs3=is3;vF3=mix(1.,smoothstep(uR3-25.,uR3+15.,length(iP.xy-uEye.xy)),is3);/* v1.25: dithered crossfade with the 3D trees over 125-165 yd (no band of trees popping at once) */if(vF3<=0.){gl_Position=vec4(2.,2.,2.,1.);return;}vec2 v=uEye.xy-iP.xy;float l=length(v);vNear=smoothstep(5.,13.,l);v=l>.001?v/l:vec2(0.,1.);vec2 r=vec2(-v.y,v.x);
 float qh=iP.w,qw=iW.x;float sw=sin(uTime*1.1+iP.x*.21+iP.y*.17)*.010*qh*aQ.y*aQ.y;
 vec3 p=vec3(iP.xy+r*aQ.x*qw+vec2(.7,.4)*sw+r*(iW.z-.5)*.11*qh*aQ.y*aQ.y,iP.z+aQ.y*qh);
 float cell=iW.y;float col=mod(cell,16.),row=floor(cell/16.);float ux=iW.w>0.?aQ.x+.5:.5-aQ.x;
 vUV=vec2((col+clamp(ux,.012,.988))/16.,(row+clamp(1.-aQ.y,.016,.996))/5.);vP=p;vTint=iW.z;vY=aQ.y;vFl=(spc==5.||spc==6.)?1.:0.;vFace=vFl>.5?dot(v,normalize(vec2(.38,-.52))):dot(v,normalize(uSun.xy+vec2(1e-4)));/* locked Augusta flowers (dogwood/azalea) keep the exact v1.14 lighting; v1.15: lit side follows the real sun, not a fixed axis (no view-dependent colour swings) */
 gl_Position=uVP*vec4(p,1.);}`,`
${GLSL_COMMON}
in vec3 vP;in vec2 vUV;in float vTint;in float vY;in float vFace;in float vFl;in float vNear;in float vF3;in float vIs3;out vec4 o;uniform sampler2D uAtl;uniform float uBbK;
void main(){vec4 t=texture(uAtl,vUV);float dh=fract(sin(dot(gl_FragCoord.xy,vec2(12.98,78.23)))*43758.5);if(t.a<.5||vNear<dh||vF3<=fract(dh*7.31))discard;vec3 c=pow(t.rgb/max(t.a,.001),vec3(2.2));
 c*=mix(vec3(.86,.92,.82),vec3(1.12,1.06,.92),vTint);
 float lit=vFl>.5?.62+.38*clamp(vFace*.5+.5,0.,1.):.72+.2*clamp(vFace*.5+.5,0.,1.);vec3 amb=mix(uSkyHor*.35,uSkyTop*.45,.6);
 vec3 col=c*(amb*1.1+uSunCol*lit*.95)*(.78+.32*vY);
 vec3 V=normalize(vP-uEye);float back=pow(max(dot(V,uSun),0.),3.);col+=c*uSunCol*back*.35;
 col*=mix(1.,uBbK,vIs3);/* v1.18: billboards of species that swap to 3D trees match the 3D trees' brightness at the swap distance (no colour pop when the camera closes in) */
 col=fogit(col,vP);o=vec4(pow(tm(col),vec3(1./2.2)),t.a);}`);
  R.pMesh=prog(`
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;uniform mat4 uVP;uniform mat4 uM;uniform float uFlag;uniform float uTime;out vec3 vP;out vec3 vN;out vec3 vO;
void main(){vec3 p=aP;vec3 n=aN;if(uFlag>0.){float k=p.x;p.y+=sin(uTime*5.+k*3.2)*.12*k;p.z-=k*k*.06;n=normalize(vec3(-.38*k*cos(uTime*5.+k*3.2),-1.,0.));}
 vec4 w=uM*vec4(p,1.);vP=w.xyz;vO=aP;vN=normalize(mat3(uM)*n);gl_Position=uVP*w;}`,`
${GLSL_COMMON}
in vec3 vP;in vec3 vN;in vec3 vO;out vec4 o;uniform vec3 uC;uniform float uEmis;uniform float uBallD;
void main(){vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vP);
 if(uBallD>0.){// golf ball: ~400 shallow dimples (cube-projected lattice) bend the normal, glossy clear-coat highlight and sky reflection
   vec3 O=normalize(vO);vec3 a=abs(O);vec2 q;vec3 T,B;if(a.x>a.y&&a.x>a.z){q=O.yz/a.x;T=vec3(0.,1.,0.);B=vec3(0.,0.,1.);}else if(a.y>a.z){q=O.xz/a.y;T=vec3(1.,0.,0.);B=vec3(0.,0.,1.);}else{q=O.xy/a.z;T=vec3(1.,0.,0.);B=vec3(0.,1.,0.);}
   vec2 g=q*4.2;vec2 cg=floor(g);vec2 f=fract(g)-.5;f+=(vec2(fract(sin(dot(cg,vec2(12.9,78.2)))*437.5),fract(sin(dot(cg,vec2(39.3,11.1)))*913.7))-.5)*.12;float r=length(f);float dim=1.-smoothstep(.36,.46,r);
   float vis=1.-smoothstep(.08,.35,fwidth(g.x)+fwidth(g.y));vec3 off=(T*f.x+B*f.y)*dim*1.25*vis;N=normalize(N-off*.55);
   float df=max(dot(N,uSun),0.);vec3 c=vec3(.86,.865,.85);float ao=1.-.16*dim*smoothstep(.15,.42,r)*vis;
   vec3 amb=mix(uSkyHor*.55,uSkyTop*.75,N.z*.5+.5);vec3 col=c*(amb+uSunCol*df*1.05)*ao;
   vec3 H=normalize(uSun+V);float fr=.04+.96*pow(1.-max(dot(N,V),0.),5.);col+=uSunCol*pow(max(dot(N,H),0.),90.)*.9*(1.-.5*dim*vis)+skyCol(reflect(-V,N))*fr*.2;
   col=fogit(col,vP);o=vec4(pow(tm(col),vec3(1./2.2)),1.);return;}
 float df=max(dot(N,uSun),0.);vec3 c=pow(uC,vec3(2.2));vec3 col=c*(mix(uSkyHor*.4,uSkyTop*.5,N.z*.5+.5)+uSunCol*df)+c*uEmis;
 col+=uSunCol*pow(max(dot(reflect(-uSun,N),V),0.),40.)*.3;col=fogit(col,vP);o=vec4(pow(tm(col),vec3(1./2.2)),1.);}`);
  R.pTr=prog(`
layout(location=0) in vec4 aP;uniform mat4 uVP;out vec2 vA;void main(){vA=aP.zw;gl_Position=uVP*vec4(aP.xy,0.,1.);}`.replace('vec4(aP.xy,0.,1.)','vec4(aP.xyz,1.)').replace('layout(location=0) in vec4 aP;','layout(location=0) in vec3 aP;layout(location=1) in vec2 aA;').replace('vA=aP.zw;','vA=aA;'),`
in vec2 vA;out vec4 o;uniform vec3 uTc;uniform float uHead;
void main(){float a=abs(vA.y);float glow=exp(-a*a*6.)*.55;float core=1.-smoothstep(.12,.32,a);float fade=smoothstep(0.,.04,vA.x)*mix(.12,1.,pow(clamp(vA.x/max(uHead,.001),0.,1.),.7));vec3 c=uTc*glow+vec3(1.,.97,.9)*core*.95;o=vec4(c*fade,1.);}`);
  // ---------- buffers ----------
  const vao=(attrs,idx)=>{const v=gl.createVertexArray();gl.bindVertexArray(v);for(const a of attrs){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a.d,a.dyn?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);gl.enableVertexAttribArray(a.loc);gl.vertexAttribPointer(a.loc,a.n,gl.FLOAT,false,0,0);if(a.inst)gl.vertexAttribDivisor(a.loc,1);a.buf=b}
    let ib=null;if(idx){ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW)}gl.bindVertexArray(null);return{v,attrs,ib,n:idx?idx.length:0,it:idx instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT}};
  R.vao=vao;
  R.sky=vao([{loc:0,n:2,d:new Float32Array([-1,-1,3,-1,-1,3])}]);
  // noise texture
  {const N=256,d=new Uint8Array(N*N*4);const RN=RNG(77);const base=[];for(let c=0;c<4;c++){const f=[4,8,16,32][c];for(let j=0;j<N;j++)for(let i=0;i<N;i++){let v=0,a=.5,fr=f;for(let o=0;o<3;o++){const gx=i/N*fr,gy=j/N*fr;const x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,u=fx*fx*(3-2*fx),w=fy*fy*(3-2*fy);
      const hh=(a1,b1)=>hash2(((a1%fr)+fr)%fr+c*1000+o*77,((b1%fr)+fr)%fr);v+=a*((hh(x0,y0)*(1-u)+hh(x0+1,y0)*u)*(1-w)+(hh(x0,y0+1)*(1-u)+hh(x0+1,y0+1)*u)*w);a*=.5;fr*=2}d[(j*N+i)*4+c]=Math.min(255,v/.875*255)}}
    R.noise=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,R.noise);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,d);gl.generateMipmap(gl.TEXTURE_2D);{const ax=gl.getExtension('EXT_texture_filter_anisotropic');if(ax)gl.texParameterf(gl.TEXTURE_2D,ax.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,gl.getParameter(ax.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))}
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT)}
  // primitive meshes
  const meshFrom=(P,N,I)=>vao([{loc:0,n:3,d:new Float32Array(P)},{loc:1,n:3,d:new Float32Array(N)}],new Uint16Array(I));
  R.sphere=(()=>{const P=[],N=[],I=[],a=10,b=14;for(let i=0;i<=a;i++)for(let j=0;j<=b;j++){const t=i/a*Math.PI,p=j/b*TAU;const x=Math.sin(t)*Math.cos(p),y=Math.sin(t)*Math.sin(p),z=Math.cos(t);P.push(x,y,z);N.push(x,y,z)}
    for(let i=0;i<a;i++)for(let j=0;j<b;j++){const k=i*(b+1)+j;I.push(k,k+b+1,k+1,k+1,k+b+1,k+b+2)}return meshFrom(P,N,I)})();
  R.ballM=(()=>{const P=[],N=[],I=[],a=28,b=40;for(let i=0;i<=a;i++)for(let j=0;j<=b;j++){const t=i/a*Math.PI,p=j/b*TAU;const x=Math.sin(t)*Math.cos(p),y=Math.sin(t)*Math.sin(p),z=Math.cos(t);P.push(x,y,z);N.push(x,y,z)}
    for(let i=0;i<a;i++)for(let j=0;j<b;j++){const k=i*(b+1)+j;I.push(k,k+b+1,k+1,k+1,k+b+1,k+b+2)}return meshFrom(P,N,I)})();
  R.dropM=(()=>{const P=[],N=[],I=[],a=5,b=8;for(let i=0;i<=a;i++)for(let j=0;j<=b;j++){const t=i/a*Math.PI,p=j/b*TAU;const x=Math.sin(t)*Math.cos(p),y=Math.sin(t)*Math.sin(p),z=Math.cos(t);P.push(x,y,z);N.push(x,y,z)}for(let i=0;i<a;i++)for(let j=0;j<b;j++){const k=i*(b+1)+j;I.push(k,k+b+1,k+1,k+1,k+b+1,k+b+2)}return meshFrom(P,N,I)})();
  R.ringM=(()=>{const P=[],N=[],I=[],s=40;for(let j=0;j<=s;j++){const p=j/s*TAU,x=Math.cos(p),y=Math.sin(p);P.push(x*.9,y*.9,0,x,y,0);N.push(0,0,1,0,0,1)}for(let j=0;j<s;j++){const k=j*2;I.push(k,k+1,k+2,k+1,k+3,k+2)}return meshFrom(P,N,I)})();// v1.18: splash droplets + ripple rings
  R.cyl=(()=>{const P=[],N=[],I=[],s=10;for(let j=0;j<=s;j++){const p=j/s*TAU,x=Math.cos(p),y=Math.sin(p);P.push(x,y,0,x,y,1);N.push(x,y,0,x,y,0)}for(let j=0;j<s;j++){const k=j*2;I.push(k,k+2,k+1,k+1,k+2,k+3)}return meshFrom(P,N,I)})();
  R.flagM=(()=>{const P=[],N=[],I=[],nx=10,ny=6;for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){P.push(i/nx,0,j/ny);N.push(0,-1,0)}for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;I.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1)}return meshFrom(P,N,I)})();
  R.disc=(()=>{const P=[0,0,0],N=[0,0,1],I=[],s=16;for(let j=0;j<=s;j++){const p=j/s*TAU;P.push(Math.cos(p),Math.sin(p),0);N.push(0,0,1)}for(let j=1;j<=s;j++)I.push(0,j,j+1);return meshFrom(P,N,I)})();
  // tree impostor atlas
  {const atl=paintTreeAtlas();R.atl=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,R.atl);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atl);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.generateMipmap(gl.TEXTURE_2D);// premultiplied: mipmaps filter leaf edges without bright/dark fringes
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);R.atlCanvas=atl}
  R.treeV=vao([{loc:0,n:2,d:new Float32Array([-.5,0,.5,0,-.5,1,.5,0,.5,1,-.5,1])},{loc:3,n:4,d:new Float32Array(4),inst:1,dyn:1},{loc:4,n:4,d:new Float32Array(4),inst:1,dyn:1}]);R.treeV.inst=0;
  R.tracer=vao([{loc:0,n:3,d:new Float32Array(6000*3),dyn:1},{loc:1,n:2,d:new Float32Array(6000*2),dyn:1}]);R.tracerN=0;
  R.trailers=[];
  try{if(typeof t3Init==='function')t3Init(R,prog,vao)}catch(e){console.warn('3D trees off:',e&&e.message);R.t3=null}
  return R}
