import json
def L(s): return [int(x) for x in s.split()]
C=[]
def add(id,rank,name,loc,par,tees,src,names=None,style='parkland',sig=None,home=False):
  p=L(par); 
  for t in tees: assert len(t[1])==18,(id,t[0])
  assert len(p)==18,id
  C.append(dict(id=id,rank=rank,name=name,loc=loc,par=p,tees=[{'n':n,'y':y} for n,y in tees],src=src,names=names,style=style,sig=sig or {},home=home))
add('lookaway',0,'Lookaway Golf Club','Buckingham, PA','4 3 5 4 4 3 4 5 4 4 3 4 5 4 3 4 5 4',
 [('Black',L('377 198 528 390 418 201 387 542 353 338 207 392 586 474 167 402 519 428')),
  ('Blue',L('361 173 515 343 398 166 368 528 326 323 155 376 511 443 150 381 502 393')),
  ('Silver',L('345 162 491 331 378 154 356 513 300 310 128 325 501 418 135 323 488 334')),
  ('Gold',L('300 133 442 278 302 115 316 423 266 280 109 329 483 353 91 268 424 262'))],
 'GolfPass scorecard (Black/Blue/Silver/Gold); hole notes golfcoursebrowser/OSM',style='parkland',home=True)
add('pinevalley',1,'Pine Valley Golf Club','Pine Valley, NJ','4 4 3 4 3 4 5 4 4 3 4 4 4 3 5 4 4 4',
 [('Back',L('421 368 198 499 238 444 636 326 458 161 397 358 486 220 615 475 414 483'))],'BlueGolf / GolfCore scorecard',style='heath',
 sig={7:"Hell's Half Acre",5:'Long par 3 over water',10:'Devil’s Asshole bunker'})
AUG='Tea Olive|Pink Dogwood|Flowering Peach|Flowering Crab Apple|Magnolia|Juniper|Pampas|Yellow Jasmine|Carolina Cherry|Camellia|White Dogwood|Golden Bell|Azalea|Chinese Fir|Firethorn|Redbud|Nandina|Holly'.split('|')
add('augusta',2,'Augusta National Golf Club','Augusta, GA','4 5 4 3 4 3 4 5 4 4 4 3 5 4 5 3 4 4',
 [('Tournament',L('445 585 350 240 495 180 450 570 460 495 520 155 545 440 550 170 440 465')),
  ('Member',L('365 515 340 170 400 165 330 480 395 450 400 145 455 380 475 145 370 385'))],'Wikipedia (Augusta National GC scorecard)',names=AUG,
 sig={12:'Golden Bell over Rae’s Creek',13:'Dogleg left along the creek',15:'Pond in front of the green',16:'Over the pond'})
add('cypress',3,'Cypress Point Club','Pebble Beach, CA','4 5 3 4 5 5 3 4 4 5 4 4 4 4 3 3 4 4',
 [('Championship',L('420 549 156 383 491 521 170 369 289 476 440 404 394 393 135 233 386 343')),
  ('Regular',L('407 535 151 370 472 509 159 342 283 476 427 397 344 384 120 218 374 326'))],'Wikipedia (Cypress Point Club scorecard)',style='coastal',
 sig={15:'Over the cove',16:'230-yard carry over the Pacific',17:'Along the cliffs'})
add('shinnecock',4,'Shinnecock Hills Golf Club','Southampton, NY','4 3 4 4 5 4 3 4 4 4 3 4 4 4 4 5 3 4',
 [('Red',L('399 220 469 409 537 453 189 394 435 415 159 469 374 463 409 540 180 426')),
  ('Green',L('388 197 440 378 500 418 178 354 410 406 150 427 360 445 400 512 167 400'))],'Wikipedia (Shinnecock Hills scorecard)',style='links',sig={7:'Redan'})
add('oakmont',5,'Oakmont Country Club','Oakmont, PA','4 4 4 5 4 3 4 3 5 4 4 5 3 4 4 3 4 4',
 [('Championship',L('482 346 467 612 410 203 487 293 475 460 398 663 186 381 509 237 317 505')),
  ('Blue',L('445 335 415 535 370 180 390 225 460 445 355 590 155 360 460 210 295 450'))],'Wikipedia (Oakmont CC scorecard)',style='parkland',sig={3:'Church Pews bunker',8:'288-yard par 3'})
add('merion',6,'Merion Golf Club (East)','Ardmore, PA','4 5 3 5 4 4 4 4 3 4 4 4 3 4 4 4 3 4',
 [('Championship',L('358 589 250 622 501 484 368 358 231 306 358 395 128 411 415 429 241 502')),
  ('Back',L('358 554 219 595 412 430 368 358 231 306 358 362 128 411 377 429 241 462'))],'Wikipedia (Merion GC scorecard)',sig={11:'Creek fronts the green',16:'Quarry hole',18:'Over the quarry'})
add('ngla',7,'National Golf Links of America','Southampton, NY','4 4 4 3 4 3 5 4 5 4 4 4 3 4 4 4 4 5',
 [('Red',L('330 330 426 195 478 141 478 400 540 450 432 459 174 393 417 415 375 502')),
  ('Green',L('315 290 407 181 451 123 467 385 534 420 418 427 159 341 368 394 342 483'))],'BlueGolf scorecard',style='links',sig={3:'Alps',4:'Redan',13:'Eden',17:'Peconic'})
add('sandhills',8,'Sand Hills Golf Club','Mullen, NE','5 4 3 4 4 3 4 4 4 4 4 4 3 5 4 5 3 4',
 [('Black',L('549 458 216 485 412 198 283 367 402 472 408 417 216 508 469 612 150 467'))],'Wikipedia (Sand Hills GC scorecard)',style='dunes')
add('pebble',9,'Pebble Beach Golf Links','Pebble Beach, CA','4 4 4 4 3 5 3 4 4 4 4 3 4 5 4 4 3 5',
 [('U.S. Open',L('380 516 404 331 195 523 109 428 526 495 390 202 445 580 397 403 208 543')),
  ('Blue',L('378 509 397 333 189 498 107 416 483 444 370 202 401 559 393 400 182 541'))],'Wikipedia (Pebble Beach GL scorecard, 2019 U.S. Open par 71)',style='coastal',
 sig={7:'Tiny par 3 over the ocean',8:'Approach over the chasm',17:'Hourglass green by the sea',18:'Along Carmel Bay'})
add('fishers',10,'Fishers Island Club','Fishers Island, NY','4 3 4 4 3 5 4 4 4 4 3 4 4 4 5 3 4 4',
 [('Black',L('398 183 325 417 225 551 374 463 361 396 163 383 397 418 538 145 417 443'))],'BlueGolf / Stymie scorecard',style='coastal',sig={5:'Biarritz over the water',16:'Short over the sound'})
add('chicago',11,'Chicago Golf Club','Wheaton, IL','4 4 3 5 4 4 3 4 4 3 4 4 3 4 4 5 4 4',
 [('Championship',L('450 481 219 549 365 399 211 445 448 149 410 465 181 356 400 530 467 425'))],'Wikipedia (Chicago GC course table)',style='prairie',
 names='Valley|Road|Biarritz|Long|Leven|Principal’s Nose|Redan|Narrows|Pond|Short|Dogleg|Punchbowl|Eden|Cape|Ginger Ale|Raynor’s Prize|Double Plateau|Home'.split('|'))
add('seminole',12,'Seminole Golf Club','Juno Beach, FL','4 4 5 4 3 4 4 3 5 4 4 4 3 5 5 4 3 4',
 [('Gold',L('405 456 558 500 204 400 440 256 549 417 463 368 172 513 535 403 181 439')),
  ('Blue',L('369 370 501 434 177 376 400 235 503 388 382 357 162 493 497 381 166 403'))],'BlueGolf / Stymie scorecard',style='coastal')
add('wingedfoot',13,'Winged Foot Golf Club (West)','Mamaroneck, NY','4 4 3 4 4 4 3 4 5 3 4 5 3 4 4 4 4 4',
 [('U.S. Open',L('451 484 243 467 502 321 162 490 565 214 384 633 212 452 426 498 504 469'))],'Wikipedia (Winged Foot 2020 U.S. Open card)')
add('friars',14,"Friar's Head",'Baiting Hollow, NY','4 5 4 3 4 4 5 3 4 3 5 3 4 5 4 4 3 4',
 [('Back',L('374 578 498 243 323 429 553 181 398 205 587 199 490 534 478 399 155 447'))],'golfcoursebrowser / 18Birdies scorecard',style='dunes')
add('crystal',15,'Crystal Downs Country Club','Frankfort, MI','4 4 3 4 4 4 4 5 3 4 3 4 4 3 4 5 4 4',
 [('Blue',L('461 422 194 409 342 381 335 541 174 391 194 422 479 146 327 583 309 399'))],'GolfPass / Zomma scorecard (Blue)',style='links')
add('lacc',16,'Los Angeles Country Club (North)','Los Angeles, CA','5 4 4 3 4 4 3 5 3 4 3 4 4 5 3 4 4 4',
 [('U.S. Open',L('590 497 419 228 480 330 284 537 171 409 290 380 507 623 124 542 520 492'))],'Wikipedia (2023 U.S. Open course layout)',style='desert')
add('tcc',17,'The Country Club (Main)','Brookline, MA','4 3 4 4 4 3 4 5 4 4 3 4 4 5 4 3 4 4',
 [('U.S. Open',L('488 215 499 493 310 192 375 557 427 499 131 473 450 619 510 202 373 451'))],'Wikipedia (2022 U.S. Open course layout)')
add('riviera',18,'Riviera Country Club','Pacific Palisades, CA','5 4 4 3 4 3 4 4 4 4 5 4 4 3 4 3 5 4',
 [('Genesis',L('503 471 434 236 434 199 408 433 458 315 583 479 459 192 487 166 590 475')),
  ('Blue',L('503 463 434 236 419 175 408 416 420 315 564 410 438 176 443 166 576 451'))],'Wikipedia (Riviera CC scorecard)',style='desert',sig={6:'Bunker in the middle of the green',10:'Drivable par 4'})
add('muirfieldv',19,'Muirfield Village Golf Club','Dublin, OH','4 4 4 3 5 4 5 3 4 4 5 3 4 4 5 3 4 4',
 [('Blue',L('419 411 374 189 505 383 548 160 387 423 522 160 405 336 491 175 428 423')),
  ('White',L('388 399 366 162 473 372 518 136 366 413 484 143 359 325 466 152 388 393'))],'Wikipedia (Muirfield Village scorecard)',sig={12:'Over the pond',16:'Par 3 over water'})
add('oaklandhills',20,'Oakland Hills Country Club (South)','Bloomfield Hills, MI','4 5 3 4 4 4 4 5 3 4 4 5 3 4 4 4 3 5',
 [('Black',L('443 592 216 482 491 361 421 476 253 496 451 580 181 504 396 425 237 504')),
  ('Blue',L('428 511 190 424 430 344 369 460 219 446 415 520 158 472 362 406 192 487'))],'Wikipedia (Oakland Hills South scorecard, member par)',sig={16:'Dogleg right around the pond'})
add('oakhill',21,'Oak Hill Country Club (East)','Rochester, NY','4 4 3 5 3 4 4 4 4 4 3 4 5 4 3 4 4 4',
 [('PGA',L('460 405 230 615 180 503 461 429 482 430 245 399 623 320 155 458 502 497'))],'Wikipedia (2023 PGA Championship course layout)')
add('peachtree',22,'Peachtree Golf Club','Atlanta, GA','4 5 4 3 5 3 4 4 4 5 3 4 4 3 4 5 4 4',
 [('Championship',L('405 574 430 170 535 231 451 406 421 519 212 485 474 205 448 584 449 409'))],'BlueGolf / GolfCore scorecard')
add('pacificdunes',23,'Pacific Dunes','Bandon, OR','4 4 5 4 3 4 4 4 4 3 3 5 4 3 5 4 3 5',
 [('Black',L('370 368 499 463 199 316 464 400 406 206 148 529 444 145 539 338 208 591')),
  ('Green',L('304 335 476 449 181 288 436 369 379 163 131 507 390 128 504 338 189 575'))],'Wikipedia (Bandon Dunes Resort scorecards)',style='coastal',sig={4:'Along the bluff',11:'Par 3 above the ocean',13:'Along the beach'})
add('shadowcreek',24,'Shadow Creek','North Las Vegas, NV','4 4 4 5 3 4 5 3 4 4 4 4 3 4 4 5 3 5',
 [('Championship',L('415 435 486 581 202 507 571 200 460 437 324 405 257 493 482 622 154 529'))],'BlueGolf / GolfLink scorecard',sig={17:'Par 3 over the creek'})
add('prairie',25,'Prairie Dunes Country Club','Hutchinson, KS','4 3 4 3 4 4 5 4 4 3 4 4 4 4 3 4 5 4',
 [('Gold',L('467 170 365 174 482 403 521 471 474 185 538 395 452 409 204 431 531 396'))],'GolfPass scorecard (Gold)',style='prairie')
for c in C:
  print(c['rank'],c['name'],'par',sum(c['par']),[ (t['n'],sum(t['y'])) for t in c['tees']])
json.dump(C,open('courses.json','w'))
