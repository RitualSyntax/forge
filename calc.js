// maths - dates, nutrition plan, rings, xp etc

const KCAL_KG = 7700 // rough kcal per kg of bodyweight change

const pad = n => String(n).padStart(2,'0')
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const today = () => dkey(new Date())
const toDate = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y,m-1,d) }
const addDays = (k,n) => { const d = toDate(k); d.setDate(d.getDate()+n); return dkey(d) }
const daysBetween = (a,b) => Math.round((toDate(b)-toDate(a))/864e5)
const dow = k => toDate(k).getDay()
const r1 = n => Math.round(n*10)/10
const r0 = n => Math.round(n)

// ---------- plan ----------
const NEAT = {
  desk:{mult:1.2,name:'Mostly sitting',hint:'Desk job, under ~5k steps'},
  light:{mult:1.3,name:'Bit of walking',hint:'5–8k steps a day'},
  feet:{mult:1.45,name:'On my feet a lot',hint:'Teaching, retail, 8–12k steps'},
  manual:{mult:1.6,name:'Physical job',hint:'Labour, crew work, 12k+ steps'}
}
const EXP = {beg:'Under 1 year',inter:'1–3 years',adv:'3+ years'}
const GOALS = {
  cut:{name:'Cut',sub:'Lose fat, keep muscle',per:'wk',def:{beg:.75,inter:.6,adv:.5},min:.25,max:1,sign:-1,prot:2.3,fat:.8},
  recomp:{name:'Recomp',sub:'Slowly lose fat and build muscle',fixed:-.05,prot:2.2,fat:.9},
  maintain:{name:'Maintain',sub:'Hold weight, keep training',fixed:0,prot:1.8,fat:.9},
  leanbulk:{name:'Build Muscle',sub:'Lean bulk, minimal fat gain',per:'mo',def:{beg:1.25,inter:.75,adv:.4},min:.25,max:2,sign:1,prot:2,fat:.9},
  bulk:{name:'Fast Bulk',sub:'Max size, accept some fat',per:'mo',def:{beg:2,inter:1.5,adv:1},min:1,max:3,sign:1,prot:1.8,fat:.9}
}

function bmrOf(p){
  if (p.bf > 0) return 370 + 21.6 * p.weight * (1 - p.bf/100) // katch-mcardle
  return 10*p.weight + 6.25*p.height - 5*p.age + (p.sex === 'f' ? -161 : 5) // mifflin
}

function goalRate(p){
  const g = GOALS[p.goal]
  if (!g.per) return 0
  return p.rate ?? g.def[p.exp || 'inter']
}

function makePlan(p, maintOverride){
  if (!(p.weight > 0 && p.height > 0 && p.age > 0)) return null
  const g = GOALS[p.goal], w = +p.weight
  const bmr = bmrOf(p)
  const neat = NEAT[p.neat || 'desk']
  const trainK = (p.days||0) * (p.mins||60)/60 * 4 * w / 7   // weights ~5 MET minus resting
  const cardioK = (p.cardio||0)/60 * 6 * w / 7              // cardio mins/week, ~7 MET minus resting
  const formula = bmr*neat.mult + trainK + cardioK
  const maint = maintOverride || formula
  const rate = goalRate(p)
  const kgWk = g.per === 'wk' ? w*rate/100 : g.per === 'mo' ? w*rate/100/4.345 : 0
  let delta = g.per ? g.sign * kgWk * KCAL_KG / 7 : maint * g.fixed
  let kcal = Math.round((maint + delta + (+p.adj||0))/10)*10
  if (kcal < bmr) kcal = Math.round(bmr/10)*10 // dont go under bmr
  delta = kcal - maint
  const prot = Math.round(w * g.prot)
  let fat = Math.round(Math.max(w*g.fat, kcal*.22/9))
  let carb = Math.round((kcal - prot*4 - fat*9)/4)
  if (carb < 60){ fat = Math.round(Math.max(w*.6,(kcal-prot*4-60*4)/9)); carb = Math.round((kcal-prot*4-fat*9)/4) }
  const fib = Math.round(kcal/1000*14)
  return {bmr:r0(bmr), neat:r0(bmr*neat.mult-bmr), trainK:r0(trainK), cardioK:r0(cardioK), formula:r0(formula),
    maint:r0(maint), delta:r0(delta), kcal, prot, fat, carb, fib, rate, kgWk, gWk:sign(g)*kgWk*1000, goal:p.goal}
}
const sign = g => g.sign || 0

// words for the plan screen
function planWhy(p, pl){
  const g = GOALS[p.goal], w = +p.weight, out = []
  out.push(`<b>Maintenance ≈ ${pl.maint} kcal.</b> Resting burn ${pl.bmr} kcal${p.bf>0?' (from your lean mass)':''}, plus ${pl.neat} kcal of daily movement, ${pl.trainK} kcal for ${p.days} lifting sessions a week${pl.cardioK?` and ${pl.cardioK} kcal of cardio`:''}, averaged per day.`)
  if (p.goal === 'leanbulk' || p.goal === 'bulk'){
    out.push(`<b>Why the surplus is small.</b> Muscle can only be built so fast. Rough guide for natural lifters: under a year training, about 1–1.5% of bodyweight a month; 1–3 years, 0.5–1%; 3+ years, 0.25–0.5%. Eating far above that doesn't build more muscle, it just adds fat you'd have to cut later.`)
    out.push(`<b>Your rate: ${pl.rate}% a month ≈ ${r1(w*pl.rate/100)} kg/month (${r0(pl.gWk)} g/week).</b> That's +${pl.delta} kcal a day over maintenance. Some of the gain will be water, glycogen and a bit of fat. That's normal. Keep your waist measurement steady while arms and chest go up.`)
  } else if (p.goal === 'cut'){
    out.push(`<b>Losing ${pl.rate}% a week ≈ ${r1(pl.kgWk)} kg/week.</b> ${-pl.delta} kcal a day under maintenance. Slower cuts hold onto more muscle, especially when you're already lean.`)
  } else if (p.goal === 'recomp'){
    out.push(`<b>Small deficit (${-pl.delta} kcal/day).</b> Recomp works best for newer lifters or after time off. Scale weight barely moves, so judge it by your lifts and measurements, not the scale.`)
  } else out.push(`<b>Eating at maintenance.</b> Good for a diet break or holding a result.`)
  out.push(`<b>Protein ${pl.prot} g</b> (${g.prot} g per kg). That's the top of the useful range for building and keeping muscle. Spread it over 3–5 meals of 30–50 g.`)
  out.push(`<b>Fat ${pl.fat} g</b>, enough to keep hormones happy (at least ~20% of calories). <b>Carbs ${pl.carb} g</b> make up the rest. They fuel training volume, so put more of them around your workouts.`)
  out.push(`<b>Fibre ~${pl.fib} g.</b> Helps digestion, especially when you're eating more.`)
  return out
}

// ---------- weight trend ----------
function weightTrend(weights){
  const ks = Object.keys(weights).sort()
  if (!ks.length) return {}
  const out = {}, a = .15
  let prevK = ks[0], prevW = weights[ks[0]], t = prevW
  out[ks[0]] = t
  for (let i = 1; i < ks.length; i++){
    const k = ks[i], wv = weights[k], gap = daysBetween(prevK,k)
    for (let j = 1; j <= gap; j++){ // fill gaps by straight line
      const v = prevW + (wv-prevW)*j/gap
      t = t + a*(v-t)
      out[addDays(prevK,j)] = t
    }
    prevK = k; prevW = wv
  }
  return out
}

// real maintenance from intake vs trend change
function measuredMaint(S, D){
  const tr = D.trend, ks = Object.keys(tr).sort()
  if (ks.length < 15) return null
  const end = ks[ks.length-1]
  let start = addDays(end,-27); if (start < ks[0]) start = ks[0]
  const span = daysBetween(start,end)
  if (span < 14) return null
  let n = 0, sum = 0
  for (let k = start; k <= end; k = addDays(k,1)){ const t = D.day[k]; if (t && t.kcal > 0){ n++; sum += t.kcal } }
  const wi = Object.keys(S.weights).filter(k => k >= start).length
  if (n < span*.7 || wi < 6) return null
  const avg = sum/n, dw = tr[end]-tr[start]
  return {maint:r0(avg - dw*KCAL_KG/span), avg:r0(avg), dw:r1(dw), days:span}
}

// ---------- workouts ----------
const e1rm = (kg,r) => r <= 0 || kg <= 0 ? 0 : r === 1 ? kg : kg*(1+Math.min(r,15)/30)
const exById = id => EXERCISES.find(e => e.id === id) || (window.S && S.customEx.find(e => e.id === id)) || {id,name:id,group:'Other'}

// training days get more carbs, rest days less - weekly total stays the same
function dayTargets(S, k){
  const t = S.targets, sp = +S.settings.split || 0, rest = S.settings.rest
  if (!t.kcal || !sp || !rest.length || rest.length === 7) return t
  const d = rest.includes(dow(k)) ? -sp*(7-rest.length)/rest.length : sp
  return {...t, kcal:Math.round((t.kcal+d)/10)*10, carb:Math.max(0, Math.round(t.carb + d/4))}
}

// ---------- rings for a day ----------
function ringsFor(S, D, k){
  const t = dayTargets(S,k), st = S.settings, day = D.day[k] || {}
  const kcal = day.kcal || 0, prot = day.p || 0
  const rest = st.rest.includes(dow(k)) && !(day.sets > 0)
  const steps = (S.activity[k] || {}).steps || 0
  const cmins = day.cardio || 0
  const calV = t.kcal ? kcal/t.kcal : 0
  return {
    cal:{v:calV, closed:calV >= .9 && calV <= 1.1, over:calV > 1.1, now:kcal, goal:t.kcal},
    pro:{v:t.prot ? prot/t.prot : 0, closed:t.prot > 0 && prot >= t.prot*.97, now:prot, goal:t.prot},
    str:{v:rest ? 1 : (day.sets||0)/st.setGoal, closed:rest || (day.sets||0) >= st.setGoal, rest, now:day.sets||0, goal:st.setGoal},
    car:{v:Math.max(steps/st.stepGoal, cmins/st.cardioGoal), closed:steps >= st.stepGoal || cmins >= st.cardioGoal, steps, cmins}
  }
}

// ---------- everything derived ----------
function derive(S){
  const D = {day:{}, pbSets:{}, pbDays:{}, best:{}, pbs:0, workouts:0, sets:0, volume:0, legDays:0}
  const dayOf = k => D.day[k] || (D.day[k] = {kcal:0,p:0,c:0,f:0,fib:0,n:0,sets:0,cardio:0})
  let foodEntries = 0
  for (const [k,list] of Object.entries(S.diary)){
    const d = dayOf(k)
    for (const e of list){ d.kcal += e.k; d.p += e.p; d.c += e.c; d.f += e.f; d.fib += e.fib||0; d.n++; foodEntries++ }
  }
  for (const [k,list] of Object.entries(S.cardio)){ const d = dayOf(k); for (const c of list) d.cardio += c.mins }
  const lastW = Object.keys(S.weights).sort().pop()
  const bw = lastW ? S.weights[lastW] : 75
  const ws = [...S.workouts, ...(S.active ? [S.active] : [])].sort((a,b) => a.start - b.start)
  for (const w of ws){
    let n = 0, legs = false
    const before = {...D.best} // pb = beats what you'd done before this session
    w.ex.forEach((x,xi) => {
      const ex = exById(x.id)
      x.sets.forEach((s,si) => {
        n++
        const load = ex.bw ? bw + (s.kg||0) : s.kg
        D.volume += load * s.r
        const e = e1rm(load, s.r), prev = D.best[x.id] || 0, old = before[x.id] || 0
        if (e > prev + .01){ if (old > 0){ D.pbSets[`${w.id}:${xi}:${si}`] = 1; D.pbs++; D.pbDays[w.date] = (D.pbDays[w.date]||0)+1 } D.best[x.id] = e }
      })
      if (ex.group === 'Legs' && x.sets.length) legs = true
    })
    dayOf(w.date).sets += n
    D.sets += n
    if (n && w.end){ D.workouts++; if (legs) D.legDays++ }
  }
  D.trend = weightTrend(S.weights)

  // xp + streaks
  const t0 = today()
  let xp = D.sets*2 + D.workouts*30 + D.pbs*25 + Object.keys(S.checkins||{}).length*25
  let perfect = 0, run = 0, bestRun = 0, pRun = 0, bestP = 0, maxSteps = 0
  const allDays = new Set([...Object.keys(D.day), ...Object.keys(S.weights), ...Object.keys(S.activity)])
  const ks = [...allDays].filter(k => k <= t0).sort()
  if (ks.length){
    for (let k = ks[0]; k <= t0; k = addDays(k,1)){
      const d = D.day[k], R = ringsFor(S,D,k)
      const logged = d && d.n > 0
      if (d) xp += Math.min(d.n,8)*5
      if (R.cal.closed) xp += 30
      if (R.pro.closed) xp += 30
      if (R.str.closed && !R.str.rest) xp += 40
      if (R.car.closed) xp += 25
      if (S.weights[k]) xp += 15
      if (logged && R.cal.closed && R.pro.closed && R.str.closed && R.car.closed){ xp += 50; perfect++ }
      run = logged ? run+1 : (k === t0 ? run : 0); bestRun = Math.max(bestRun,run)
      pRun = R.pro.closed ? pRun+1 : (k === t0 ? pRun : 0); bestP = Math.max(bestP,pRun)
      maxSteps = Math.max(maxSteps, (S.activity[k]||{}).steps||0)
    }
  }
  D.xp = xp; D.streak = run; D.bestStreak = bestRun; D.bestProteinRun = bestP; D.perfectDays = perfect
  D.maxSteps = maxSteps; D.foodEntries = foodEntries; D.weighIns = Object.keys(S.weights).length; D.checkins = Object.keys(S.checkins||{}).length; D.photos = S.photoCount||0
  D.libSize = Object.keys(S.foods).length; D.scanned = Object.values(S.foods).filter(f => f.scanned).length
  D.level = levelOf(xp)
  D.badges = BADGES.filter(b => b.test(D)).map(b => b.id)
  return D
}

function levelOf(xp){
  let L = 1, base = 0, step = 100
  while (xp >= base + step){ base += step; L++; step = 100 + 60*(L-1) }
  return {L, into:xp-base, need:step, title:TITLES[Math.min(Math.floor((L-1)/4), TITLES.length-1)]}
}

// ---------- coaching ----------
const COMPOUND = ['bench-press','incline-bench','incline-db-press','flat-db-press','machine-chest-press','squat','hack-squat','leg-press','deadlift','rdl','ohp','db-shoulder-press','machine-shoulder-press','barbell-row','db-row','chest-supported-row','seated-cable-row','lat-pulldown','pull-ups','chin-ups','dips','close-grip-bench','bulgarian-split','hip-thrust']
function exCfg(S, id){
  const c = (S.exCfg||{})[id]; if (c) return c
  const ex = exById(id), comp = COMPOUND.includes(id)
  const db = /db|dumbbell/i.test(id + ex.name)
  return {lo:comp ? 6 : 10, hi:comp ? 10 : 15, inc:db ? 2 : 2.5}
}
// double progression - hit top of range on every set, add weight
function suggest(S, id){
  const lt = lastTime(id); if (!lt) return null
  const c = exCfg(S,id), ex = exById(id)
  const top = Math.max(...lt.sets.map(s => s.kg))
  const at = lt.sets.filter(s => s.kg === top)
  const minR = Math.min(...at.map(s => s.r))
  if (minR >= c.hi){
    if (ex.bw && top === 0) return {kg:0, r:c.hi, up:true, why:`Top of the range on every set. Add ${c.inc} kg or a harder variation.`}
    return {kg:r1(top + c.inc), r:c.lo, up:true, why:`Top of the range on every set last time. Add weight.`}
  }
  return {kg:top, r:Math.min(c.hi, Math.max(c.lo, minR+1)), up:false, why:`Same weight, beat last time by a rep.`}
}
// stalled = last 3 sessions didn't beat the best before them
function stalled(S, id){
  const ex = exById(id), sess = []
  for (const w of S.workouts){ const x = w.ex.find(x => x.id === id && x.sets.length); if (x) sess.push(Math.max(...x.sets.map(s => e1rm(ex.bw ? 75 + s.kg : s.kg, s.r)))) }
  if (sess.length < 4) return false
  const last3 = sess.slice(-3), before = sess.slice(0,-3)
  return Math.max(...last3) <= Math.max(...before) + .01
}
const mondayOf = k => addDays(k, -((dow(k)+6)%7))
const MUSCLES = ['Chest','Back','Shoulders','Biceps','Triceps','Arms','Legs','Core']
function setsByMuscle(S, from, to){
  const out = {}
  for (const w of [...S.workouts, ...(S.active ? [S.active] : [])]){
    if (w.date < from || w.date > to) continue
    for (const x of w.ex){ const g = exById(x.id).group; out[g] = (out[g]||0) + x.sets.length }
  }
  return out
}
