import json,numpy as np,zlib,base64,os
YD=1.0936133;Q=0.25
O=json.load(open('far/far.json'));out={}
def fill(a):
  bad=~np.isfinite(a)|(a<-3)|(a>5000)|(np.abs(a)>1e4);a=a.copy();a[bad]=np.nan
  # isolated garbage next to nodata (Seminole/Fishers offshore): anything far above its 5x5 neighbourhood median is dropped
  p=np.pad(a,2,mode='edge');st=np.stack([p[j:j+a.shape[0],i:i+a.shape[1]] for j in range(5) for i in range(5)]);md=np.nanmedian(st,axis=0)
  a[np.abs(a-md)>20]=np.nan
  for _ in range(200):
    m=np.isnan(a)
    if not m.any():break
    p=np.pad(a,1,mode='edge');st=np.stack([p[:-2,1:-1],p[2:,1:-1],p[1:-1,:-2],p[1:-1,2:]]);v=np.nanmean(np.where(np.isnan(st),np.nan,st),axis=0) if False else None
    s=np.nansum(np.nan_to_num(st,nan=0)*~np.isnan(st),axis=0);c=(~np.isnan(st)).sum(axis=0)
    upd=m&(c>0);a[upd]=s[upd]/c[upd]
  a[np.isnan(a)]=0;return a
for cid,b in O.items():
  a=np.load(f'far/{cid}.npy').astype(np.float64);a[np.abs(a)>1e4]=np.nan;a=fill(a)[::-1]*YD
  mn=float(a.min());q=np.round((a-mn)/Q).astype(np.int64);ny,nx=q.shape;o=bytearray()
  for j in range(ny):
    v=int(q[j,0]);o+=v.to_bytes(2,'little');cur=v
    for i in range(1,nx):
      d=int(q[j,i])-cur
      if abs(d)>127:o+=(128).to_bytes(1,'little')+int(q[j,i]).to_bytes(2,'little');cur=int(q[j,i])
      else:o+=(d&255).to_bytes(1,'little');cur+=d
  z=zlib.compress(bytes(o),9)
  out[cid]=dict(x0=round(b['px0'],2),y0=round(b['py0'],2),sx=round(b['sx'],4),sy=round(b['sy'],4),nx=nx,ny=ny,mn=round(mn,2),q=Q,b=base64.b64encode(z).decode())
  print(cid,nx,ny,len(z))
open('../js/demfar.js','w').write('/* coarse USGS 3DEP terrain ~3,000 yd around each course (horizon + coastlines beyond the detailed DEM) */\nconst DEM_FAR='+json.dumps(out,separators=(',',':'))+';\n')
