import json,math,sys
sys.path.insert(0,'.')
import build_geo as b
O={};S=8.0;M=220
for cid in b.C:
  r=b.build(cid);pts=[p for h in r['holes'] if h for p in h['pts']]
  x0=min(p[0] for p in pts)-M;x1=max(p[0] for p in pts)+M;y0=min(p[1] for p in pts)-M;y1=max(p[1] for p in pts)+M
  nx=math.ceil((x1-x0)/S);ny=math.ceil((y1-y0)/S);x1=x0+nx*S;y1=y0+ny*S
  kx=111320*math.cos(math.radians(r['lat0']))*b.YD;ky=110574*b.YD
  O[cid]=dict(lat0=r['lat0'],lon0=r['lon0'],x0=x0,y0=y0,x1=x1,y1=y1,nx=nx,ny=ny,S=S,w=r['lon0']+x0/kx,e=r['lon0']+x1/kx,s=r['lat0']+y0/ky,n=r['lat0']+y1/ky)
json.dump(O,open('dem/bbox.json','w'),indent=0)
print(sum(o['nx']*o['ny'] for o in O.values()))
