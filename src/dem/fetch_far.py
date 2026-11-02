# coarse "far" DEM (~45 yd cells) covering ~3,000 yd beyond each course bbox, so the horizon and coastlines past the detailed DEM are real terrain, not edge-clamped
import json,urllib.request,math,io,os,sys,time
import numpy as np
from PIL import Image
B=json.load(open('bbox.json'));YD=1.0936133;M=3000;CELL=45
O=json.load(open('far/far.json')) if os.path.exists('far/far.json') else {}
for cid,b in B.items():
  if len(sys.argv)>1 and cid not in sys.argv[1:]:continue
  if cid in O and os.path.exists(f'far/{cid}.npy'):continue
  kx=111320*math.cos(math.radians(b['lat0']))*YD;ky=110574*YD
  x0,x1,y0,y1=b['x0']-M,b['x1']+M,b['y0']-M,b['y1']+M;nx=int((x1-x0)/CELL);ny=int((y1-y0)/CELL)
  w=b['lon0']+x0/kx;e=b['lon0']+x1/kx;s=b['lat0']+y0/ky;n=b['lat0']+y1/ky
  base='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?'+f"bbox={w},{s},{e},{n}&bboxSR=4326&imageSR=4326&size={nx},{ny}&pixelType=F32&interpolation=RSP_BilinearInterpolation"
  for k in range(4):
    try:
      ex=json.loads(urllib.request.urlopen(base+'&format=tiff&f=json',timeout=90).read())['extent']
      d=urllib.request.urlopen(urllib.request.Request(base+'&format=tiff&f=image',headers={'User-Agent':'TourSim/1.0'}),timeout=120).read()
      a=np.array(Image.open(io.BytesIO(d)),dtype=np.float32);break
    except Exception as ex2:print(cid,'fail',ex2,flush=True);time.sleep(4);a=None
  if a is None:continue
  ny,nx=a.shape;sx=(ex['xmax']-ex['xmin'])/nx*kx;sy=(ex['ymax']-ex['ymin'])/ny*ky
  O[cid]=dict(px0=(ex['xmin']-b['lon0'])*kx+sx/2,py0=(ex['ymin']-b['lat0'])*ky+sy/2,sx=sx,sy=sy,nx=nx,ny=ny)
  np.save(f'far/{cid}.npy',a);json.dump(O,open('far/far.json','w'));print(cid,a.shape,float(np.nanmin(a)),float(np.nanmax(a)),flush=True)
