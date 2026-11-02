import json,urllib.request,os,sys,time,io
from PIL import Image
import numpy as np
B=json.load(open('bbox.json'));S=8.0
for cid,b in B.items():
  fn=cid+'.npy'
  if os.path.exists(fn):continue
  nx=b['nx'];ny=b['ny']
  url=("https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?"
    f"bbox={b['w']},{b['s']},{b['e']},{b['n']}&bboxSR=4326&imageSR=4326&size={nx},{ny}&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image")
  for k in range(4):
    try:
      d=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'DailySim/1.0'}),timeout=120).read()
      a=np.array(Image.open(io.BytesIO(d)),dtype=np.float32)
      if a.shape!=(ny,nx):print(cid,'shape',a.shape,(ny,nx))
      np.save(fn,a);print(cid,a.shape,float(np.nanmin(a)),float(np.nanmax(a)),flush=True);break
    except Exception as e:print(cid,'fail',e,flush=True);time.sleep(3)
