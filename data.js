// preset stuff - exercises, routines, starter foods, badges

const EXERCISES = [
  // chest
  ['incline-db-press','Incline Dumbbell Press','Chest'],['flat-db-press','Flat Dumbbell Press','Chest'],
  ['bench-press','Bench Press','Chest'],['incline-bench','Incline Barbell Press','Chest'],
  ['machine-chest-press','Machine Chest Press','Chest'],['cable-fly','Cable Fly','Chest'],
  ['pec-deck','Pec Deck','Chest'],['dips','Dips','Chest',1],['push-ups','Push-Ups','Chest',1],
  // back
  ['pull-ups','Pull-Ups','Back',1],['chin-ups','Chin-Ups','Back',1],['lat-pulldown','Lat Pulldown','Back'],
  ['barbell-row','Barbell Row','Back'],['db-row','Dumbbell Row','Back'],['seated-cable-row','Seated Cable Row','Back'],
  ['chest-supported-row','Chest-Supported Row','Back'],['straight-arm-pulldown','Straight-Arm Pulldown','Back'],
  ['deadlift','Deadlift','Back'],['shrugs','Shrugs','Back'],
  // shoulders
  ['ohp','Overhead Press','Shoulders'],['db-shoulder-press','Dumbbell Shoulder Press','Shoulders'],
  ['machine-shoulder-press','Machine Shoulder Press','Shoulders'],['lateral-raise','Lateral Raise','Shoulders'],
  ['cable-lateral','Cable Lateral Raise','Shoulders'],['rear-delt-fly','Rear Delt Fly','Shoulders'],
  ['face-pull','Face Pull','Shoulders'],
  // arms - split so the weekly chart shows them apart
  ['barbell-curl','Barbell Curl','Biceps'],['db-curl','Dumbbell Curl','Biceps'],['hammer-curl','Hammer Curl','Biceps'],
  ['incline-curl','Incline Dumbbell Curl','Biceps'],['preacher-curl','Preacher Curl','Biceps'],['cable-curl','Cable Curl','Biceps'],
  ['tricep-pushdown','Tricep Pushdown','Triceps'],['overhead-tricep','Overhead Tricep Extension','Triceps'],
  ['skull-crushers','Skull Crushers','Triceps'],['close-grip-bench','Close-Grip Bench','Triceps'],
  // legs
  ['squat','Back Squat','Legs'],['hack-squat','Hack Squat','Legs'],['leg-press','Leg Press','Legs'],
  ['rdl','Romanian Deadlift','Legs'],['bulgarian-split','Bulgarian Split Squat','Legs'],['lunges','Walking Lunges','Legs'],
  ['leg-extension','Leg Extension','Legs'],['leg-curl','Leg Curl','Legs'],['hip-thrust','Hip Thrust','Legs'],
  ['calf-raise','Calf Raise','Legs'],
  // core
  ['cable-crunch','Cable Crunch','Core'],['hanging-leg-raise','Hanging Leg Raise','Core',1],['ab-wheel','Ab Wheel','Core',1],
  ['plank','Plank (seconds as reps)','Core',1]
].map(([id,name,group,bw])=>({id,name,group,bw:!!bw}))

const ROUTINES = [
  {id:'push',name:'Push',ex:['incline-db-press','machine-chest-press','db-shoulder-press','lateral-raise','cable-fly','tricep-pushdown','overhead-tricep']},
  {id:'pull',name:'Pull',ex:['pull-ups','barbell-row','lat-pulldown','seated-cable-row','face-pull','barbell-curl','hammer-curl']},
  {id:'legs',name:'Legs',ex:['squat','rdl','leg-press','leg-curl','leg-extension','calf-raise']},
  {id:'upper',name:'Upper',ex:['incline-db-press','chest-supported-row','db-shoulder-press','lat-pulldown','lateral-raise','db-curl','tricep-pushdown']},
  {id:'arms',name:'Arms + Delts',ex:['close-grip-bench','barbell-curl','skull-crushers','incline-curl','cable-lateral','rear-delt-fly']}
]

// per 100g: k p c f fibre, sv = serving grams. rough uk-ish label values
const STARTER_FOODS = [
  ['Chicken Breast (raw)',120,22.5,0,2.6,0,150],
  ['Lean Beef Mince 5% (raw)',137,21.4,0,5,0,125],
  ['Turkey Breast (raw)',107,24,0,1,0,150],
  ['White Rice (cooked)',130,2.7,28,0.3,0.4,180],
  ['Basmati Rice (dry)',350,8,77,1,1,75],
  ['Pasta (dry)',355,12.5,71,1.5,3,85],
  ['Porridge Oats',375,11,60,8,9,50],
  ['Potatoes (raw)',77,2,17,0.1,1.8,200],
  ['Wholemeal Bread',230,10,40,2.5,7,40],
  ['Bagel (plain)',250,10,48,1.5,2.5,85],
  ['Semi-Skimmed Milk',47,3.5,4.8,1.7,0,250],
  ['Whole Milk',64,3.4,4.7,3.6,0,250],
  ['Greek Yoghurt 0%',57,10,3.6,0.2,0,170],
  ['Whey Protein',380,75,8,6,0,30],
  ['Banana',89,1.1,20,0.3,2.6,120],
  ['Apple',52,0.3,12,0.2,2.4,150],
  ['Mixed Berries (frozen)',50,1,9,0.3,3,80],
  ['Broccoli',34,2.8,4,0.4,2.6,80],
  ['Avocado',160,2,2,15,6.7,75],
  ['Peanut Butter',600,25,13,50,6,15],
  ['Olive Oil',884,0,0,100,0,14],
  ['Almonds',580,21,9,50,12,30]
]

const TITLES = ['Fresh Meat','Gym Rookie','Iron Regular','Plate Stacker','Bar Bender','Chalk Veteran','Iron Monk','Titan','Myth']

// badges - test(d) gets the derived stats
const BADGES = [
  {id:'log1',name:'First Bite',desc:'Log your first food',test:d=>d.foodEntries>=1},
  {id:'scan1',name:'Beep',desc:'Scan a barcode',test:d=>d.scanned>=1},
  {id:'lib50',name:'Pantry',desc:'50 foods in your library',test:d=>d.libSize>=50},
  {id:'w1',name:'Day One',desc:'Finish a workout',test:d=>d.workouts>=1},
  {id:'w10',name:'Regular',desc:'10 workouts',test:d=>d.workouts>=10},
  {id:'w50',name:'Committed',desc:'50 workouts',test:d=>d.workouts>=50},
  {id:'w100',name:'Centurion',desc:'100 workouts',test:d=>d.workouts>=100},
  {id:'pb1',name:'New Best',desc:'Set a PB',test:d=>d.pbs>=1},
  {id:'pb25',name:'Record Breaker',desc:'25 PBs',test:d=>d.pbs>=25},
  {id:'s7',name:'On a Roll',desc:'7-day logging streak',test:d=>d.bestStreak>=7},
  {id:'s30',name:'Locked In',desc:'30-day streak',test:d=>d.bestStreak>=30},
  {id:'s100',name:'Unbreakable',desc:'100-day streak',test:d=>d.bestStreak>=100},
  {id:'p7',name:'Protein Machine',desc:'Close protein 7 days running',test:d=>d.bestProteinRun>=7},
  {id:'perf1',name:'Full House',desc:'Close every ring in a day',test:d=>d.perfectDays>=1},
  {id:'perf10',name:'Ten Out of Ten',desc:'10 perfect days',test:d=>d.perfectDays>=10},
  {id:'wi14',name:'Scale Friends',desc:'14 weigh-ins',test:d=>d.weighIns>=14},
  {id:'v10k',name:'10 Tonnes',desc:'Lift 10,000kg total',test:d=>d.volume>=10000},
  {id:'v100k',name:'100 Tonnes',desc:'Lift 100,000kg total',test:d=>d.volume>=100000},
  {id:'v1m',name:'Mountain Mover',desc:'Lift 1,000,000kg total',test:d=>d.volume>=1000000},
  {id:'steps10k',name:'Wanderer',desc:'A 10,000-step day',test:d=>d.maxSteps>=10000},
  {id:'legs',name:'Leg Day Exists',desc:'Train legs',test:d=>d.legDays>=1},
  {id:'legs10',name:'Never Skip',desc:'10 leg sessions',test:d=>d.legDays>=10},
  {id:'check1',name:'Reflection',desc:'Do a weekly check-in',test:d=>d.checkins>=1},
  {id:'photo1',name:'Mirror Mirror',desc:'Take a progress photo',test:d=>d.photos>=1}
]
