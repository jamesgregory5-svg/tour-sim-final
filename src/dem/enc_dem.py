import json,numpy as np,zlib,base64,math
def gaussian_filter(a,sg,mode=None):
  r=2;k=np.exp(-np.arange(-r,r+1)**2/(2*sg*sg));k/=k.sum()
  p=np.pad(a,r,mode='edge');o=sum(k[i]*p[:,i:i+a.shape[1]+0] for i in range(2*r+1))[r:-r] if False else None
  t=sum(k[i]*p[i:i+a.shape[0],:] for i in range(2*r+1))
  return sum(k[i]*t[:,i:i+a.shape[1]] for i in range(2*r+1))
B=json.load(open('dem/bbox.json'));YD=1.0936133;Q=0.1
def enc(cid):
  b=B[cid];a=np.load(f'dem/{cid}.npy').astype(np.float64)
  a[~np.isfinite(a)]=np.nan;a[a<-50]=np.nan
  if np.isnan(a).any():a[np.isnan(a)]=np.nanmin(a)
  a=gaussian_filter(a,0.8,mode='nearest')[::-1]*YD  # south row first, yards
  mn=float(a.min());q=np.round((a-mn)/Q).astype(np.int64)
  ny,nx=q.shape;out=bytearray();rec=np.zeros_like(q)
  for j in range(ny):
    v=int(q[j,0]);out+=int(v).to_bytes(2,'little');rec[j,0]=v;cur=v
    for i in range(1,nx):
      d=max(-127,min(127,int(q[j,i])-cur));cur+=d;rec[j,i]=cur;out+=(d&255).to_bytes(1,'little')
  err=np.abs(rec-q).max()*Q
  z=zlib.compress(bytes(out),9)
  return dict(x0=round(b['px0'],2),y0=round(b['py0'],2),sx=round(b['sx'],4),sy=round(b['sy'],4),nx=nx,ny=ny,mn=round(mn,2),q=Q,b=base64.b64encode(z).decode()),err,len(z)
if __name__=='__main__':
  tot=0
  for cid in B:
    d,err,n=enc(cid);tot+=n;print(cid,d['nx'],d['ny'],'range yd',round(np.ptp(np.load(f'dem/{cid}.npy'))*YD,1),'maxerr',round(err,2),'zbytes',n)
  print('total',tot)
