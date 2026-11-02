# v1.25: cart-path cleanup on every course: drop short dead-end spurs/stubs and tiny isolated bits, keep connected paths
import json,re,math
src=open('js/data.js').read();m=re.match(r'const COURSES=(.*);\nconst GEO=(.*);\n$',src,re.S);C=m.group(1);G=json.loads(m.group(2))
def dec(a):
  o=[];x=y=0
  for i in range(0,len(a),2):x+=a[i];y+=a[i+1];o.append((x/2,y/2))
  return o
def L(P):return sum(math.dist(P[i],P[i-1]) for i in range(1,len(P)))
def dseg(p,a,b):
  dx,dy=b[0]-a[0],b[1]-a[1];l=dx*dx+dy*dy;t=0 if l==0 else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l));return math.dist(p,(a[0]+dx*t,a[1]+dy*t))
def near(p,Q):return min(dseg(p,Q[i-1],Q[i]) for i in range(1,len(Q))) if len(Q)>1 else 1e9
tot=0
for cid,g in G.items():
  cp=g['f'].get('cp') or []
  if not cp:continue
  P=[dec(e) for e in cp];keep=[]
  for i,A in enumerate(P):
    l=L(A);O=[Q for j,Q in enumerate(P) if j!=i]
    a=[min((near(A[0],Q) for Q in O),default=1e9)<4, min((near(A[-1],Q) for Q in O),default=1e9)<4]
    free=2-sum(a)
    if l<30 and free>=1:continue        # stubs and tiny bits
    if l<70 and free==1:continue        # short dead-end spur off a path
    keep.append(cp[i])
  tot+=len(cp)-len(keep);print(cid,len(cp),'->',len(keep));g['f']['cp']=keep
open('js/data.js','w').write('const COURSES='+C+';\nconst GEO='+json.dumps(G,separators=(',',':'))+';\n');print('removed',tot)
