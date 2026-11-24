// core - state, render loop, sheets, toasts

const KEY = 'forge.v1'
const MEALS = ['Breakfast','Lunch','Dinner','Snacks']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fresh(){
  const s = {v:1,
    profile:{sex:'m',age:'',height:'',weight:'',bf:'',neat:'feet',days:6,mins:60,cardio:0,goal:'leanbulk',exp:'inter',rate:null},
    targets:{kcal:0,prot:0,fat:0,carb:0,fib:0},
    settings:{stepGoal:8000,cardioGoal:20,setGoal:16,rest:[5],restSecs:120},
    foods:{}, diary:{}, workouts:[], active:null, cardio:{}, activity:{}, weights:{}, measures:{},
    customEx:[], routines:JSON.parse(JSON.stringify(ROUTINES)), maintOverride:null,
    seen:{badges:[],L:1}}
  STARTER_FOODS.forEach(([name,k,p,c,f,fib,sv]) => {
    const id = uid(); s.foods[id] = {id,name,brand:'',code:'',k,p,c,f,fib,sv,svName:'serving',src:'starter',used:0,last:0}
  })
  return s
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }
function load(){
  try { const raw = localStorage.getItem(KEY); if (raw){ const s = JSON.parse(raw); return Object.assign(fresh(), s, {foods:s.foods||{}}) } } catch(e){}
  return fresh()
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)) } catch(e){ toast('Couldn\'t save - storage full?') } }

let S = load()
window.S = S
let D = derive(S)
const UI = {tab:'home', fdate:today(), wrange:30, timerEnd:0}

// helpers
const $ = s => document.querySelector(s)
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const num = v => { const n = parseFloat(String(v).replace(',','.')); return isFinite(n) ? n : 0 }
const fmt = n => Math.round(n).toLocaleString('en-GB')
const kg = n => (Math.round(n*100)/100).toString()
const niceDate = k => {
  const t = today()
  if (k === t) return 'Today'
  if (k === addDays(t,-1)) return 'Yesterday'
  return toDate(k).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})
}

// recalc targets from plan
function syncTargets(){
  const pl = makePlan(S.profile, S.maintOverride)
  if (pl) S.targets = {kcal:pl.kcal,prot:pl.prot,fat:pl.fat,carb:pl.carb,fib:pl.fib}
}

// every change goes through here - saves, rerenders, pings rewards
function commit(opts = {}){
  const t = today()
  const before = ringsFor(S,D,t), xp0 = D.xp
  syncTargets()
  save()
  D = derive(S)
  const after = ringsFor(S,D,t)
  const names = {cal:'Fuel',pro:'Protein',str:'Strength',car:'Cardio'}
  for (const k in names) if (!before[k].closed && after[k].closed && !(k === 'str' && after.str.rest)) toast(`<b>${names[k]} ring closed</b>`)
  const gained = D.xp - xp0
  if (gained >= 5 && !opts.quiet) xpPing(gained)
  if (D.level.L > S.seen.L){ toast(`Level ${D.level.L}: <b>${esc(D.level.title)}</b>`, 'lvlup'); buzz([60,40,120]) }
  S.seen.L = Math.max(S.seen.L, D.level.L)
  for (const b of D.badges) if (!S.seen.badges.includes(b)){
    const bd = BADGES.find(x => x.id === b); toast(`Badge unlocked: <b>${esc(bd.name)}</b>`, 'lvlup'); S.seen.badges.push(b)
  }
  save()
  if (!opts.noRender) render()
}

function buzz(p){ try { navigator.vibrate && navigator.vibrate(p) } catch(e){} }
// max 3 on screen, xp pings merge into one
let xpToast = null, xpSum = 0
function toast(html, cls = ''){
  const box = $('#toasts')
  while (box.children.length >= 3) box.firstChild.remove()
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = html
  box.appendChild(el)
  setTimeout(() => el.remove(), 2600)
  return el
}
function xpPing(n){
  if (xpToast && xpToast.isConnected){ xpSum += n; xpToast.innerHTML = `<b>+${xpSum} XP</b>`; return }
  xpSum = n; xpToast = toast(`<b>+${n} XP</b>`)
}

// ---------- tabs ----------
const VIEWS = {}
const PAGES = ['level','home','food','train','body','plan']
const TITLES_TAB = {level:'Level',home:'Home',food:'Food',train:'Train',body:'Body',plan:'Plan'}
function render(){
  $('#title').textContent = TITLES_TAB[UI.tab]
  $('#top').classList.toggle('hide', UI.tab === 'home')
  $('#lvlNum').textContent = D.level.L
  $('#lvlName').textContent = D.level.title
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab))
  const v = VIEWS[UI.tab]
  $('#view').innerHTML = v.html()
  v.after && v.after()
  renderTimer()
}
function go(tab){
  const dir = PAGES.indexOf(tab) - PAGES.indexOf(UI.tab)
  UI.tab = tab; render(); scrollTo(0,0)
  const v = $('#view'); v.classList.remove('in-l','in-r'); void v.offsetWidth
  if (dir) v.classList.add(dir > 0 ? 'in-l' : 'in-r')
}

// swipe left/right between pages
let sw0 = null
addEventListener('touchstart', e => {
  if (sheetOpen || e.touches.length > 1 || e.target.closest('input[type=range],.scan,.chart,.noswipe')) { sw0 = null; return }
  sw0 = {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()}
}, {passive:true})
addEventListener('touchend', e => {
  if (!sw0) return
  const t = e.changedTouches[0], dx = t.clientX - sw0.x, dy = t.clientY - sw0.y
  const ok = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.6 && Date.now() - sw0.t < 700
  sw0 = null
  if (!ok) return
  const i = PAGES.indexOf(UI.tab) + (dx < 0 ? 1 : -1)
  if (i < 0 || i >= PAGES.length) return
  if (!S.seen.swiped){ S.seen.swiped = 1; save() }
  go(PAGES[i])
}, {passive:true})

// ---------- sheets ----------
let sheetClose = null, sheetOpen = false
function openSheet(html, onClose){
  if (sheetClose) { const f = sheetClose; sheetClose = null; f() }
  $('#sheetBody').innerHTML = html
  sheetClose = onClose || null
  if (!sheetOpen){ sheetOpen = true; history.pushState({sheet:1},'') }
  $('#sheet').classList.add('on'); $('#scrim').classList.add('on')
  $('#sheet').scrollTop = 0
}
function hideSheet(){
  sheetOpen = false
  $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on')
  if (sheetClose){ const f = sheetClose; sheetClose = null; f() }
}
function closeSheet(){ if (sheetOpen) history.back(); else hideSheet() }
addEventListener('popstate', () => { if (sheetOpen) hideSheet() })
const sheetHead = (title, extra = '') => `<div class="sheet-h"><h2 style="margin:0">${title}</h2><div class="row">${extra}<button class="x" data-a="close" aria-label="Close">×</button></div></div>`

// in-app confirm since alerts suck
function confirmSheet(msg, yesLabel, fn){
  openSheet(`${sheetHead('Are you sure?')}<p>${msg}</p><div class="grid2" style="margin-top:16px"><button class="btn" data-a="close">Cancel</button><button class="btn pri" id="yes">${yesLabel}</button></div>`)
  $('#yes').onclick = () => { closeSheet(); setTimeout(fn, 50) }
}

// ---------- actions ----------
// buttons use data-a="name" - handlers get (el, event)
const A = {
  close: () => closeSheet(),
  tab: el => go(el.dataset.v)
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]')
  if (t && A[t.dataset.a]) { e.preventDefault(); A[t.dataset.a](t, e) }
  const tab = e.target.closest('#tabs button')
  if (tab) go(tab.dataset.tab)
})
$('#scrim').onclick = () => closeSheet()
$('#lvlBtn').onclick = () => go('level')
A.rewards = () => go('level')

// ---------- icons ----------
const IC = {
  scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  lift:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
  scale:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M9 10a4 4 0 0 1 6 0M12 10l1-2"/></svg>',
  left:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  right:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  medal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8 3h8l-2 6h-4z" fill="currentColor" opacity=".35"/><circle cx="12" cy="15" r="6"/><path d="M12 12l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.3l2-.3z" fill="currentColor"/></svg>'
}
const datebar = (k, act) => `<div class="datebar"><button class="btn" data-a="${act}" data-d="-1" aria-label="Previous day">${IC.left}</button><div class="grow">${niceDate(k)}</div><button class="btn" data-a="${act}" data-d="1" aria-label="Next day" ${k >= today() ? 'disabled' : ''}>${IC.right}</button></div>`

// ---------- rings ----------
const RING_COL = {cal:'#ff1a1a',pro:'#f2f2f2',str:'#ff6b2b',car:'#8a8a8a'}
const RING_NAME = {cal:'Fuel',pro:'Protein',str:'Strength',car:'Cardio'}
function ringsSvg(R){
  const order = ['cal','pro','str','car'], sw = 16
  let out = '<svg class="rings" viewBox="0 0 200 200" role="img" aria-label="Daily rings"><defs><filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
  order.forEach((k,i) => {
    const r = 90 - i*(sw+4), C = 2*Math.PI*r, v = Math.max(0, Math.min(R[k].v, 1))
    out += `<circle cx="100" cy="100" r="${r}" stroke="${RING_COL[k]}" stroke-width="${sw}" opacity=".13"/>`
    out += `<circle class="arc" cx="100" cy="100" r="${r}" stroke="${RING_COL[k]}" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C*(1-v)}" transform="rotate(-90 100 100)" filter="url(#gl)" ${v <= 0 ? 'opacity="0"' : ''}/>`
  })
  // sigil in the middle
  out += `<g stroke="#ff1a1a" stroke-width="1.2" fill="none" opacity=".85" filter="url(#gl)"><circle cx="100" cy="100" r="11"/><path d="M90.5 95.5h19L100 112z"/><path d="M100 86v28"/></g><circle cx="100" cy="100" r="1.6" fill="#ff1a1a"/>`
  return out + '</svg>'
}
function animateRings(){
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.rings .arc').forEach(a => a.style.strokeDashoffset = a.dataset.off)))
}

// ---------- home - rings + kcal left, nothing else ----------
VIEWS.home = {
  html(){
    const t = today(), R = ringsFor(S,D,t), tg = S.targets, d = D.day[t] || {kcal:0}
    const left = tg.kcal - d.kcal
    const dateTxt = toDate(t).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})
    const allDone = R.cal.closed && R.pro.closed && R.str.closed && R.car.closed
    return `<div class="home">
      <div class="mono date">${dateTxt}</div>
      <button class="ringbtn" data-a="ringInfo" aria-label="Ring details">${ringsSvg(R)}</button>
      ${tg.kcal ? `<div><div class="left-n ${left < 0 ? 'over' : ''}">${fmt(Math.abs(left))}</div>
        <div class="mono dim" style="margin-top:8px">${left < 0 ? 'kcal over today' : 'kcal left today'}</div></div>`
      : `<div><p class="dim">No plan yet. The rings need numbers.</p><button class="btn pri" data-a="tab" data-v="plan">Set my plan</button></div>`}
      ${allDone ? '<div class="mono" style="color:var(--red);text-shadow:var(--glow)">All rings closed. It noticed.</div>'
        : !S.seen.swiped ? '<div class="mono hint">‹ swipe ›</div>' : ''}
    </div>`
  },
  after: animateRings
}

A.ringInfo = () => {
  const t = today(), R = ringsFor(S,D,t), tg = S.targets, st = S.settings
  const row = (k, txt) => `<div class="leg ${R[k].closed?'done':''}"><i style="background:${RING_COL[k]};color:${RING_COL[k]}"></i><div><b style="color:${RING_COL[k]}">${RING_NAME[k]}</b><span>${txt}</span></div></div>`
  openSheet(`${sheetHead('Today')}
    <div class="legend">
      ${row('cal', tg.kcal ? `${fmt(R.cal.now)} of ${fmt(tg.kcal)} kcal. Closes when you land within 10% of target.` : 'Set your plan first.')}
      ${row('pro', `${r0(R.pro.now)} of ${tg.prot || '—'} g protein.`)}
      ${row('str', R.str.rest ? 'Rest day. It closes itself.' : `${R.str.now} of ${R.str.goal} working sets.`)}
      ${row('car', `${fmt(R.car.steps)} of ${fmt(st.stepGoal)} steps${R.car.cmins ? `, ${R.car.cmins} min cardio` : ''}. Either one closes it.`)}
    </div>
    <div class="grid2" style="margin-top:18px"><button class="btn pri" data-a="scan">Scan food</button><button class="btn" data-a="activity">Add steps</button></div>`)
}

function macroBars(d){
  const tg = S.targets
  const m = [['Protein',d.p,tg.prot,'var(--pro)'],['Carbs',d.c,tg.carb,'var(--car)'],['Fat',d.f,tg.fat,'var(--cal)']]
  return m.map(([n,v,g,c]) => `<div class="mbar"><div class="row between"><span>${n}</span><span class="dim nowrap">${r0(v)} / ${g||'—'} g</span></div><div class="track"><i style="width:${g?Math.min(100,v/g*100):0}%;background:${c}"></i></div></div>`).join('')
}

A.activity = () => {
  const t = today(), a = S.activity[t] || {}
  openSheet(`${sheetHead('Steps and activity')}
    <p class="dim small">Copy today's numbers from your phone's fitness app. Automatic syncing comes with the Android version.</p>
    <label for="st">Steps today</label><input id="st" inputmode="numeric" value="${a.steps||''}" placeholder="e.g. 9500">
    <label for="ak">Active calories (optional, for reference)</label><input id="ak" inputmode="numeric" value="${a.active||''}">
    <div class="grid2" style="margin-top:16px"><button class="btn" data-a="logCardio">Log cardio session</button><button class="btn pri" id="svA">Save</button></div>`)
  $('#svA').onclick = () => { S.activity[t] = {steps:r0(num($('#st').value)), active:r0(num($('#ak').value))}; closeSheet(); commit() }
}

// ---------- level - xp, quests, badges ----------
VIEWS.level = {
  html(){
    const t = today(), R = ringsFor(S,D,t), tg = S.targets, L = D.level
    const quests = [
      {name:'Land in your calorie zone',xp:30,done:R.cal.closed,a:'addFood'},
      {name:`Hit ${tg.prot || '—'} g protein`,xp:30,done:R.pro.closed,a:'addFood'},
      R.str.rest ? {name:'Rest day. Recover and eat well',xp:0,done:true}
        : {name:`Log ${S.settings.setGoal} working sets`,xp:40,done:R.str.closed,a:'train'},
      {name:`${fmt(S.settings.stepGoal)} steps or ${S.settings.cardioGoal} min cardio`,xp:25,done:R.car.closed,a:'activity'},
      {name:'Weigh in',xp:15,done:!!S.weights[t],a:'logWeight'}
    ]
    return `<div class="card">
      <div class="mono dim">Level ${L.L}</div>
      <h1 style="font-size:40px;margin:4px 0 12px">${esc(L.title)}</h1>
      <div class="xpbar"><i style="width:${Math.min(100,L.into/L.need*100)}%"></i></div>
      <p class="mono dim" style="margin:8px 0 14px">${fmt(L.into)} / ${fmt(L.need)} XP · ${fmt(D.xp)} total</p>
      <div class="grid3">
        <div class="stat"><div class="num">${D.streak}</div><small>day streak</small></div>
        <div class="stat"><div class="num">${D.perfectDays}</div><small>perfect days</small></div>
        <div class="stat"><div class="num">${D.badges.length}/${BADGES.length}</div><small>badges</small></div>
      </div></div>
    <div class="card"><h2>Daily quests</h2>
      ${quests.map(q => `<div class="quest ${q.done?'done':''}" ${q.a&&!q.done?`data-a="${q.a}" style="cursor:pointer"`:''}><span class="tick"></span><span class="grow">${q.name}</span><span class="xp">${q.xp?`+${q.xp} XP`:''}</span></div>`).join('')}
      <div class="quest"><span class="tick" style="border-style:dashed"></span><span class="grow dim">Close every ring for a perfect day</span><span class="xp">+50 XP</span></div>
    </div>
    <div class="card"><h2>Badges</h2>
      <div class="ach">${BADGES.map(b => { const on = D.badges.includes(b.id); return `<div class="badge ${on?'on':''}" style="color:${on?'var(--red)':'var(--faint)'}">${IC.medal}<b style="color:${on?'var(--red)':'var(--ink)'}">${on ? esc(b.name) : '???'}</b><span class="dim">${esc(b.desc)}</span></div>` }).join('')}</div></div>
    <div class="card"><h2>How XP works</h2><div class="why small"><ul>
      <li>Food logged: 5 XP each, up to 40 a day</li><li>Fuel or protein ring: 30 each · Strength ring: 40 · Cardio ring: 25</li>
      <li>Weigh-in: 15 · Every set: 2 · Finished workout: 30 · New PB: 25</li><li>Perfect day, all four rings: 50 bonus</li></ul></div></div>`
  }
}

// ---------- boot ----------
addEventListener('DOMContentLoaded', () => {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{})
  syncTargets(); D = derive(S); S.seen.L = Math.max(S.seen.L, D.level.L); S.seen.badges = [...new Set([...S.seen.badges, ...D.badges])]
  render()
  setInterval(tick, 500)
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{})
})
