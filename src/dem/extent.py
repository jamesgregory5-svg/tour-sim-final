import json,urllib.request,math
B=json.load(open('bbox.json'));YD=1.0936133
for cid,b in B.items():
  url=('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?'
   f"bbox={b['w']},{b['s']},{b['e']},{b['n']}&bboxSR=4326&imageSR=4326&size={b['nx']},{b['ny']}&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=json")
  e=json.loads(urllib.request.urlopen(url,timeout=60).read())['extent']
  kx=111320*math.cos(math.radians(b['lat0']))*YD;ky=110574*YD
  b['ext']=e;b['sx']=(e['xmax']-e['xmin'])/b['nx']*kx;b['sy']=(e['ymax']-e['ymin'])/b['ny']*ky
  b['px0']=(e['xmin']-b['lon0'])*kx+b['sx']/2;b['py0']=(e['ymin']-b['lat0'])*ky+b['sy']/2
  print(cid,round(b['sx'],2),round(b['sy'],2),round(b['px0']-b['x0'],1),round(b['py0']-b['y0'],1))
json.dump(B,open('bbox.json','w'),indent=0)
