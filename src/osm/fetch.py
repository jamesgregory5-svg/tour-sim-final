import json,time,urllib.request,urllib.parse,os,sys
nom=json.load(open('nom.json'))
C={'pinevalley':(39.788,-74.975),'cypress':(36.581,-121.967),'merion':(40.006,-75.313),'pebble':(36.566,-121.946),'chicago':(41.840,-88.125),'peachtree':(33.880,-84.300),'pacificdunes':(43.192,-124.392),'prairie':(38.110,-97.856),'riviera':(34.0478,-118.5015),'oakhill':(43.112,-77.531)}
def bbox(k):
  if k in C: la,lo=C[k];d=0.022;return (la-d,lo-d*1.3,la+d,lo+d*1.3)
  for x in nom[k]:
    if x['cls']=='leisure/golf_course':
      b=list(map(float,x['bb']));p=0.004;return (b[0]-p,b[2]-p,b[1]+p,b[3]+p)
  b=list(map(float,nom[k][0]['bb']));p=0.012;return (b[0]-p,b[2]-p,b[1]+p,b[3]+p)
EPS=['https://overpass-api.de/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter']
keys=sys.argv[1:] or list(nom.keys())
for k in keys:
  fn=k+'.json'
  if os.path.exists(fn) and os.path.getsize(fn)>1000: print(k,'cached');continue
  s,w,n,e=bbox(k);B=f'({s},{w},{n},{e})'
  q=f'[out:json][timeout:100];(nwr["golf"]{B};way["natural"~"water|wood|sand|scrub|heath|beach|wetland|grassland"]{B};way["landuse"~"forest|grass|meadow"]{B};node["natural"="tree"]{B};way["natural"="coastline"]{B};way["leisure"="golf_course"]{B};);out geom;'
  for ep in EPS:
    try:
      r=urllib.request.Request(ep,data=urllib.parse.urlencode({'data':q}).encode(),headers={'User-Agent':'DailySim-fan-game/1.0'})
      d=urllib.request.urlopen(r,timeout=150).read()
      json.loads(d);open(fn,'wb').write(d);print(k,len(d),ep,flush=True);break
    except Exception as ex: print(k,'fail',ep,ex,flush=True);time.sleep(3)
  time.sleep(2)
