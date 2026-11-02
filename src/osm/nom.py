import json,time,urllib.request,urllib.parse
Q={'pinevalley':'Pine Valley Golf Club, New Jersey','augusta':'Augusta National Golf Club','cypress':'Cypress Point Club','shinnecock':'Shinnecock Hills Golf Club','oakmont':'Oakmont Country Club','merion':'Merion Golf Club','ngla':'National Golf Links of America','sandhills':'Sand Hills Golf Club, Nebraska','pebble':'Pebble Beach Golf Links','fishers':'Fishers Island Club','chicago':'Chicago Golf Club, Wheaton','seminole':'Seminole Golf Club, Juno Beach','wingedfoot':'Winged Foot Golf Club','friars':"Friar's Head",'crystal':'Crystal Downs Country Club','lacc':'Los Angeles Country Club','tcc':'The Country Club, Brookline','riviera':'Riviera Country Club','muirfieldv':'Muirfield Village Golf Club','oaklandhills':'Oakland Hills Country Club','oakhill':'Oak Hill Country Club, Rochester','peachtree':'Peachtree Golf Club, Atlanta','pacificdunes':'Pacific Dunes, Bandon','shadowcreek':'Shadow Creek Golf Course','prairie':'Prairie Dunes Country Club','lookaway':'Lookaway Golf Club'}
out={}
for k,q in Q.items():
  u='https://nominatim.openstreetmap.org/search?'+urllib.parse.urlencode({'q':q,'format':'json','limit':3})
  r=urllib.request.Request(u,headers={'User-Agent':'DailySim-fan-game/1.0 (research)'})
  try:
    d=json.load(urllib.request.urlopen(r,timeout=30))
  except Exception as e: d=[];print(k,'ERR',e)
  out[k]=[{'name':x['display_name'][:80],'bb':x['boundingbox'],'cls':x['class']+'/'+x['type']} for x in d]
  print(k,out[k][:2],flush=True)
  time.sleep(1.2)
json.dump(out,open('nom.json','w'),indent=1)
