import json,math,os,sys,random
C={c['id']:c for c in json.load(open('courses.json'))}
YD=1.0936133
def proj(lat0,lon0):
  kx=111320*math.cos(math.radians(lat0))*YD;ky=110574*YD
  return lambda la,lo:((lo-lon0)*kx,(la-lat0)*ky)
def plen(P):return sum(math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]) for i in range(len(P)-1))
def assemble(ways):
  ways=[w[:] for w in ways if len(w)>1];rings=[]
  while ways:
    r=ways.pop(0)
    changed=True
    while changed and (abs(r[0][0]-r[-1][0])>1e-9 or abs(r[0][1]-r[-1][1])>1e-9):
      changed=False
      for i,w in enumerate(ways):
        if w[0]==r[-1]: r+=w[1:];ways.pop(i);changed=True;break
        if w[-1]==r[-1]: r+=w[::-1][1:];ways.pop(i);changed=True;break
        if w[-1]==r[0]: r=w[:-1]+r;ways.pop(i);changed=True;break
        if w[0]==r[0]: r=w[::-1][:-1]+r;ways.pop(i);changed=True;break
    if len(r)>=4: rings.append(r)
  return rings
def dp(P,eps):
  if len(P)<3:return P
  a,b=P[0],P[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy) or 1e-9;mi,md=0,-1
  for i in range(1,len(P)-1):
    d=abs((P[i][0]-a[0])*dy-(P[i][1]-a[1])*dx)/L
    if d>md:md,mi=d,i
  if md>eps:return dp(P[:mi+1],eps)[:-1]+dp(P[mi:],eps)
  return [a,b]
def area(P):return 0.5*sum(P[i][0]*P[(i+1)%len(P)][1]-P[(i+1)%len(P)][0]*P[i][1] for i in range(len(P)))
def pip(x,y,P):
  c=False;j=len(P)-1
  for i in range(len(P)):
    xi,yi=P[i];xj,yj=P[j]
    if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi+1e-12)+xi:c=not c
    j=i
  return c
KIND={'fairway':'fw','green':'gr','bunker':'bk','tee':'te','water_hazard':'wa','lateral_water_hazard':'wa','rough':'ro','heavy_rough':'na'}
def classify(t):
  g=t.get('golf');n=t.get('natural');l=t.get('landuse')
  if g in KIND:return KIND[g]
  if n=='water' or t.get('water'):return 'wa'
  if n in('wood',) or l=='forest':return 'wd'
  if n in('sand','beach'):return 'sd'
  if n in('scrub','heath','grassland','wetland') or l=='meadow':return 'na'
  if t.get('leisure')=='golf_course':return 'gc'
  return None
def build(cid):
  c=C[cid];d=json.load(open(f'osm/{cid}.json'))['elements']
  # center: golf_course polygon nearest bbox center
  lat=[];lon=[]
  for e in d:
    for p in e.get('geometry',[]) or []:lat.append(p['lat']);lon.append(p['lon'])
  lat0=sum(lat)/len(lat);lon0=sum(lon)/len(lon);P=proj(lat0,lon0)
  feats={};holes=[];trees=[]
  for e in d:
    t=e.get('tags',{})
    if e['type']=='node':
      if t.get('natural')=='tree':trees.append(P(e['lat'],e['lon']))
      continue
    if t.get('golf')=='cartpath' and e['type']=='way':feats.setdefault('cp',[]).append(dp([P(p['lat'],p['lon']) for p in e.get('geometry',[])],1.0));continue# v1.15: cart paths as polylines
    k='hole' if t.get('golf')=='hole' else classify(t)
    if not k:continue
    if e['type']=='way':
      g=[P(p['lat'],p['lon']) for p in e.get('geometry',[])]
      if k=='hole':holes.append(dict(ref=t.get('ref'),par=t.get('par'),name=t.get('name'),pts=g,osmname=t.get('name')));continue
      rings=[g] if len(g)>=4 and g[0]==g[-1] else []
    else:
      outer=[[P(p['lat'],p['lon']) for p in m.get('geometry',[])] for m in e.get('members',[]) if m.get('role','outer')=='outer' and m.get('type')=='way']
      rings=assemble(outer)
      if k=='fw':# v1.15: keep multipolygon inner rings (rough islands between holes) instead of filling them as fairway
        inner=[[P(p['lat'],p['lon']) for p in m.get('geometry',[])] for m in e.get('members',[]) if m.get('role')=='inner' and m.get('type')=='way']
        for r in assemble(inner):
          r=dp(r[:-1] if r[0]==r[-1] else r,1.0)
          if len(r)>=3:feats.setdefault('fwh',[]).append(r)
    for r in rings:
      r=dp(r[:-1] if r[0]==r[-1] else r,0.6 if k in('gr','bk','te') else 1.2)
      if len(r)<3:continue
      feats.setdefault(k,[]).append(r)
  # choose holes
  tee=c['tees'][0]['y'];par=c['par'];chosen=[];prev=None;used=set()
  OVR={'tcc':{10:'Main 11',11:'Main 12',12:'Main 13'}}.get(cid,{})
  for h in holes:
    for k,v in OVR.items():
      if h.get('osmname')==v:h['ref']=str(k);h['par']=str(par[k-1])
  for h in holes:
    if h.get('osmname') in ('Main 10',) and cid=='tcc':h['ref']='x'
  for i in range(18):
    best=None
    for j,h in enumerate(holes):
      if j in used or h['ref']!=str(i+1):continue
      L=plen(h['pts']);s=0
      try:
        if h['par'] and int(h['par'])!=par[i]:s+=120
      except:pass
      dl=abs(L-tee[i])
      import re as _re
      _q=_re.search(r'\((\w+)\)',c['name'])
      if _q and h.get('osmname') and _q.group(1).lower() in h['osmname'].lower():s-=150
      elif _q and h.get('osmname') and any(w in h['osmname'] for w in ('East','West','North','South','Main','Primrose')):s+=150
      pm=(not h['par']) or h['par']==str(par[i])
      if dl>max(70,0.2*tee[i]) and not (pm and dl<100):continue
      s+=dl
      if prev:s+=0.08*math.hypot(h['pts'][0][0]-prev[0],h['pts'][0][1]-prev[1])
      if best is None or s<best[0]:best=(s,j)
    if best is None or best[0]>=400:chosen.append(None);continue
    used.add(best[1]);h=holes[best[1]];chosen.append(h);prev=h['pts'][-1]
  for i in range(18):
    if chosen[i] is not None:continue
    pe=chosen[i-1]['pts'][-1] if i>0 and chosen[i-1] else None
    ns=chosen[i+1]['pts'][0] if i<17 and chosen[i+1] else None
    best=None
    for j,h in enumerate(holes):
      if j in used:continue
      L=plen(h['pts']);dl=abs(L-tee[i])
      if dl>max(60,0.15*tee[i]):continue
      try:
        if h['par'] and int(h['par'])!=par[i]:continue
      except:pass
      s=dl
      if pe:
        d=math.hypot(h['pts'][0][0]-pe[0],h['pts'][0][1]-pe[1])
        if d>220:continue
        s+=d*.3
      if ns:
        d=math.hypot(h['pts'][-1][0]-ns[0],h['pts'][-1][1]-ns[1])
        if d>250:continue
        s+=d*.3
      if not pe and not ns:continue
      if best is None or s<best[0]:best=(s,j)
    if best:used.add(best[1]);chosen[i]=holes[best[1]]
  def _near(h,i):
    best=1e9
    for k,o in enumerate(chosen):
      if k==i or o is None:continue
      for p in h['pts']:
        for q in o['pts']:
          dd=math.hypot(p[0]-q[0],p[1]-q[1])
          if dd<best:best=dd
    return best
  for _it in range(2):
    for i in range(18):
      h=chosen[i]
      if h is None or _near(h,i)<300:continue
      bb=None
      for j,o in enumerate(holes):
        if o is h or o['ref']!=str(i+1) or any(o is x for x in chosen):continue
        dl=abs(plen(o['pts'])-tee[i])
        if dl>0.25*tee[i]+30:continue
        try:
          if o['par'] and int(o['par'])!=par[i]:continue
        except:pass
        nd=_near(o,i)
        if nd>=300:continue
        sc=dl+nd*.5
        if bb is None or sc<bb[0]:bb=(sc,o)
      if bb:chosen[i]=bb[1]
  miss=[i+1 for i,h in enumerate(chosen) if h is None]
  return dict(lat0=lat0,lon0=lon0,feats=feats,holes=chosen,trees=trees,miss=miss,P=P)
if __name__=='__main__':
  for cid in sys.argv[1:]:
    if not os.path.exists(f'osm/{cid}.json'):print(cid,'no osm');continue
    r=build(cid)
    print(cid,'missing holes',r['miss'],{k:len(v) for k,v in r['feats'].items()},'trees',len(r['trees']))
    for i,h in enumerate(r['holes']):
      if h:print('  ',i+1,h['par'],round(plen(h['pts'])),C[cid]['tees'][0]['y'][i],h['name'] or '')

def seg_d(px,py,P):
  best=1e18
  for i in range(len(P)-1):
    ax,ay=P[i];bx,by=P[i+1];dx,dy=bx-ax,by-ay;L2=dx*dx+dy*dy or 1e-9
    t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L2));best=min(best,math.hypot(px-ax-t*dx,py-ay-t*dy))
  return best
def enc(P):
  o=[];lx=ly=0
  for x,y in P:
    qx=round(x*2);qy=round(y*2);o+= [qx-lx,qy-ly];lx,ly=qx,qy
  return o
def export(cid):
  r=build(cid);c=C[cid];H=[]
  lines=[h['pts'] for h in r['holes'] if h]
  for i,h in enumerate(r['holes']):
    if h is None:H.append(None);continue
    pts=dp(h['pts'],0.8);H.append(dict(l=enc(pts),nm=h['name'] or None))
  F={}
  for k,polys in r['feats'].items():
    keep=[]
    for p in polys:
      cx=sum(q[0] for q in p)/len(p);cy=sum(q[1] for q in p)/len(p)
      R=max(math.hypot(q[0]-cx,q[1]-cy) for q in p)
      if k=='gc' or any(seg_d(cx,cy,L)<170+R for L in lines):keep.append(enc(p))
    F[k]=keep
  T=[]
  for x,y in r['trees']:
    if any(seg_d(x,y,L)<140 for L in lines):T+= [round(x),round(y)]
  return dict(id=cid,h=H,f=F,t=T,miss=r['miss'])

def synth_line(prev_end,prev_dir,yd,par,i):
  # plausible procedural centerline when OSM lacks the hole: start 30yd off previous green, turn alternately
  a=prev_dir+(math.pi/2 if i%2 else -math.pi/2)*0.9
  sx=prev_end[0]+math.cos(a)*35;sy=prev_end[1]+math.sin(a)*35;d=prev_dir+math.pi*(0.85 if i%2 else 1.15)
  if par==3:return [[sx,sy],[sx+math.cos(d)*yd,sy+math.sin(d)*yd]]
  k=0.62;b=d+(0.25 if i%3 else -0.25)
  p1=[sx+math.cos(d)*yd*k,sy+math.sin(d)*yd*k];return [[sx,sy],p1,[p1[0]+math.cos(b)*yd*(1-k),p1[1]+math.sin(b)*yd*(1-k)]]
def sea_polys(cid,P,lines):
  from shapely.geometry import LineString,Polygon,box
  from shapely.ops import split,unary_union,linemerge
  d=json.load(open(f'osm/{cid}.json'))['elements'];segs=[]
  for e in d:
    if e.get('tags',{}).get('natural')=='coastline' and e['type']=='way':segs.append([P(p['lat'],p['lon']) for p in e['geometry']])
  if not segs:return []
  xs=[p[0] for L in lines for p in L];ys=[p[1] for L in lines for p in L]
  B=box(min(xs)-900,min(ys)-900,max(xs)+900,max(ys)+900)
  merged=linemerge([LineString(s) for s in segs if len(s)>1])
  parts=split(B,merged) if not merged.is_empty else [B]
  out=[]
  for poly in getattr(parts,'geoms',[parts]):
    # sea is to the right of coastline direction: test a point slightly right of a segment
    rp=poly.representative_point()
    best=None;bd=1e18
    for s in segs:
      for i in range(len(s)-1):
        ax,ay=s[i];bx,by=s[i+1];dx,dy=bx-ax,by-ay;L2=dx*dx+dy*dy or 1e-9
        t=max(0,min(1,((rp.x-ax)*dx+(rp.y-ay)*dy)/L2));dd=math.hypot(rp.x-ax-t*dx,rp.y-ay-t*dy)
        if dd<bd:bd=dd;best=(ax,ay,dx,dy)
    ax,ay,dx,dy=best
    if (rp.x-ax)*dy-(rp.y-ay)*dx>0:  # right side
      g=poly.simplify(1.5)
      out.append(enc(list(g.exterior.coords)[:-1]))
  return out
def export2(cid):
  o=export(cid);r=build(cid);c=C[cid]
  lines=[]
  prev=None;pd=0
  for i,h in enumerate(r['holes']):
    if h:pts=h['pts'];lines.append(pts);prev=pts[-1];pd=math.atan2(pts[-1][1]-pts[-2][1],pts[-1][0]-pts[-2][0]);continue
    if prev is None:prev=[0,0]
    L=synth_line(prev,pd,c['tees'][0]['y'][i],c['par'][i],i);o['h'][i]=dict(l=enc(L),nm=None,syn=1);prev=L[-1];pd=math.atan2(L[-1][1]-L[-2][1],L[-1][0]-L[-2][0]);lines.append(L)
  try:o['sea']=sea_polys(cid,r['P'],lines)
  except Exception as ex:print('sea fail',cid,ex);o['sea']=[]
  return o
def write_js(ids):
  out={}
  for cid in ids:
    if os.path.exists(f'osm/{cid}.json'):
      out[cid]=export2(cid)
      import importlib.util as _iu;_sp=_iu.spec_from_file_location('enc_dem','dem/enc_dem.py');_m=_iu.module_from_spec(_sp);_sp.loader.exec_module(_m);out[cid]['dem']=_m.enc(cid)[0];print(cid,'miss',out[cid]['miss'],'sea',len(out[cid]['sea']),len(json.dumps(out[cid])))
  open('js/data.js','w').write('const COURSES='+json.dumps(list(C.values()),separators=(',',':'))+';\nconst GEO='+json.dumps(out,separators=(',',':'))+';\n')
