// training - workouts, sets, rest timer, cardio, progress

const allEx = () => [...EXERCISES, ...S.customEx]
const dur = ms => { const m = Math.floor(ms/60000); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m` }

// last finished session with this exercise (not the live one)
function lastTime(id){
  for (let i = S.workouts.length-1; i >= 0; i--){
    const x = S.workouts[i].ex.find(x => x.id === id && x.sets.length)
    if (x) return {date:S.workouts[i].date, sets:x.sets}
  }
  return null
}

VIEWS.train = {
  html(){
    return S.active ? activeHtml() : idleHtml()
  }
}

function idleHtml(){
  const wkStart = addDays(today(), -((dow(today())+6)%7)) // monday
  const thisWeek = S.workouts.filter(w => w.date >= wkStart).length
  const cardioToday = S.cardio[today()] || []
  const hist = [...S.workouts].reverse().slice(0,15)
  const done = Object.keys(D.best).map(id => ({ex:exById(id), best:D.best[id]})).sort((a,b) => a.ex.name.localeCompare(b.ex.name))
  return `
  <div class="card"><div class="row between"><h2 style="margin:0">Start a workout</h2><span class="small dim nowrap">${thisWeek} / ${S.profile.days||'—'} this week</span></div>
    <div class="chips" style="margin:12px 0">${S.routines.map(r => `<button class="chip" data-a="startW" data-r="${r.id}">${esc(r.name)}</button>`).join('')}</div>
    <button class="btn pri full" data-a="startW">${IC.lift.replace('<svg','<svg class="icon"')}Empty workout</button>
  </div>
  ${muscleCard()}
  ${stallCard()}
  <div class="card"><div class="row between"><h3>Cardio today</h3><button class="btn sm" data-a="logCardio">+ Log</button></div>
    ${cardioToday.map((c,i) => `<div class="item" data-a="delCardio" data-i="${i}"><div class="grow"><div class="t">${esc(c.type)}</div><div class="s">${c.mins} min${c.kcal?` · ${c.kcal} kcal`:''}</div></div><span class="faint">×</span></div>`).join('') || '<div class="empty">Steps count towards the cardio ring too. Tap the rings on Home to add them.</div>'}
  </div>
  <div class="card"><h2>History</h2>
    ${hist.map(w => { const n = w.ex.reduce((s,x) => s+x.sets.length,0); return `<div class="item" data-a="viewW" data-id="${w.id}"><div class="grow"><div class="t">${esc(w.name)}</div><div class="s">${niceDate(w.date)} · ${n} sets · ${dur(w.end-w.start)}</div></div><div class="v">${fmt(volOf(w))} kg</div></div>` }).join('') || '<div class="empty">Your finished workouts show up here.</div>'}
  </div>
  ${done.length ? `<div class="card"><h2>Progress</h2><p class="small dim">Best estimated one-rep max. Tap one for the chart.</p>
    ${done.map(o => `<div class="item" data-a="viewEx" data-id="${o.ex.id}"><div class="grow"><div class="t">${esc(o.ex.name)}</div><div class="s">${esc(o.ex.group)}</div></div><div class="v">${kg(r1(o.best))} kg</div></div>`).join('')}</div>` : ''}
  <div class="card"><div class="row between"><h3>Routines</h3><button class="btn sm ghost" data-a="manageR">Edit</button></div><p class="small dim" style="margin:6px 0 0">${S.routines.map(r => esc(r.name)).join(' · ')}</p></div>`
}

function volOf(w){ return w.ex.reduce((s,x) => s + x.sets.reduce((a,t) => a + t.kg*t.r, 0), 0) }

function activeHtml(){
  const w = S.active
  return `<div class="card"><div class="row between"><div><h2 style="margin:0">${esc(w.name)}</h2><span class="small dim" id="wclock">${dur(Date.now()-w.start)}</span></div>
    <button class="btn pri" data-a="finishW">Finish</button></div></div>
    ${w.ex.map((x,xi) => exCard(x,xi)).join('')}
    <button class="btn full" data-a="addEx" style="margin-bottom:10px">+ Add exercise</button>
    <div class="grid2"><button class="btn ghost" data-a="saveRoutine">Save as routine</button><button class="btn ghost danger" data-a="discardW">Discard</button></div>`
}

function exCard(x, xi){
  const ex = exById(x.id), lt = lastTime(x.id), w = S.active
  const nextI = x.sets.length
  const sug = suggest(S, x.id), c = exCfg(S, x.id), stuck = stalled(S, x.id)
  const pre = x.sets[nextI-1] || (sug ? {kg:sug.kg, r:sug.r} : lt && (lt.sets[nextI] || lt.sets[lt.sets.length-1])) || {kg:'',r:''}
  const topLast = lt ? Math.max(...lt.sets.map(s => s.kg)) : 0
  return `<div class="ex"><div class="row between"><div><h3>${esc(ex.name)}</h3><span class="small dim">${lt ? `Last time: ${lt.sets.map(s => `${kg(s.kg)}×${s.r}`).join(' · ')}` : 'First time logging this'}</span></div><button class="x" data-a="rmEx" data-xi="${xi}" aria-label="Remove exercise">⋯</button></div>
    <button class="btn ghost sm full" data-a="exRange" data-id="${x.id}" style="margin-top:8px;justify-content:space-between;color:var(--red)"><span>${sug ? `Target ${sug.kg ? kg(sug.kg)+' kg × ' : ''}${sug.r}+ reps` : `Aim for ${c.lo}–${c.hi} reps`}</span><span class="dim">${c.lo}–${c.hi}</span></button>
    ${sug ? `<p class="small dim" style="margin:6px 0 0">${sug.why}</p>` : ''}
    ${stuck ? `<p class="small" style="margin:6px 0 0;color:var(--str)">Stalled for 3 sessions. Try a deload: ${kg(Math.round(topLast*.9/2.5)*2.5)} kg for a week, or swap the variation.</p>` : ''}
    ${x.sets.length ? `<table class="sets">${x.sets.map((s,si) => `<tr><td>${si+1}</td><td><b>${ex.bw && !s.kg ? 'BW' : (ex.bw ? '+' : '') + kg(s.kg) + ' kg'}</b> × ${s.r}${D.pbSets[`${w.id}:${xi}:${si}`] ? ' <span class="pb">PB</span>' : ''}</td><td style="text-align:right"><button class="x" data-a="rmSet" data-xi="${xi}" data-si="${si}" aria-label="Delete set">×</button></td></tr>`).join('')}</table>` : ''}
    <div class="setin"><div><label for="kg${xi}">${ex.bw ? 'Added kg' : 'kg'}</label><input id="kg${xi}" inputmode="decimal" value="${pre.kg ?? ''}"></div><div><label for="r${xi}">Reps</label><input id="r${xi}" inputmode="numeric" value="${pre.r ?? ''}"></div><button class="btn pri" data-a="addSet" data-xi="${xi}">Log set ${nextI+1}</button></div>
  </div>`
}

A.train = () => go('train')
A.startW = el => {
  const r = el.dataset.r && S.routines.find(r => r.id === el.dataset.r)
  S.active = {id:uid(), date:today(), start:Date.now(), end:null, name:r ? r.name : 'Workout', ex:(r ? r.ex : []).map(id => ({id, sets:[]}))}
  commit({quiet:true})
  if (!r) A.addEx()
}
A.addSet = el => {
  const xi = +el.dataset.xi, x = S.active.ex[xi]
  const k = num($('#kg'+xi).value), r = Math.round(num($('#r'+xi).value))
  if (r <= 0) return toast('Enter reps')
  x.sets.push({kg:k, r, t:Date.now()})
  UI.timerEnd = Date.now() + S.settings.restSecs*1000
  buzz(30)
  const pbBefore = D.pbs
  commit()
  if (D.pbs > pbBefore){ toast(`New PB on <b>${esc(exById(x.id).name)}</b>`, 'lvlup'); buzz([80,50,80,50,150]) }
}
A.rmSet = el => { S.active.ex[+el.dataset.xi].sets.splice(+el.dataset.si,1); commit({quiet:true}) }
A.rmEx = el => {
  const xi = +el.dataset.xi, ex = exById(S.active.ex[xi].id)
  confirmSheet(`Remove <b>${esc(ex.name)}</b> from this workout?`, 'Remove', () => { S.active.ex.splice(xi,1); commit({quiet:true}) })
}
A.finishW = () => {
  const w = S.active, n = w.ex.reduce((s,x) => s+x.sets.length, 0)
  if (!n) return confirmSheet('No sets logged. Throw this workout away?', 'Discard', () => { S.active = null; UI.timerEnd = 0; commit({quiet:true}) })
  w.end = Date.now(); w.ex = w.ex.filter(x => x.sets.length)
  S.workouts.push(w); S.active = null; UI.timerEnd = 0
  commit()
  toast(`Workout done: <b>${n} sets · ${fmt(volOf(w))} kg</b>`)
}
A.discardW = () => confirmSheet('Throw away this workout and its sets?', 'Discard', () => { S.active = null; UI.timerEnd = 0; commit({quiet:true}) })
A.saveRoutine = () => {
  openSheet(`${sheetHead('Save as routine')}<label for="rn">Name</label><input id="rn" value="${esc(S.active.name)}"><button class="btn pri full" id="rs" style="margin-top:14px">Save</button>`)
  $('#rs').onclick = () => {
    const name = $('#rn').value.trim() || 'Routine'
    const ex = S.active.ex.map(x => x.id)
    const old = S.routines.find(r => r.name.toLowerCase() === name.toLowerCase())
    if (old) old.ex = ex; else S.routines.push({id:uid(), name, ex})
    S.active.name = name; closeSheet(); commit({quiet:true}); toast('Routine saved')
  }
}

// exercise picker
A.addEx = () => {
  openSheet(`${sheetHead('Add exercise', '<button class="btn sm" data-a="newEx">+ Custom</button>')}<input id="eq" type="search" placeholder="Search exercises"><div id="elist" style="margin-top:8px"></div>`, () => { editR = null })
  const draw = () => {
    const q = $('#eq').value.toLowerCase(), groups = {}
    allEx().filter(e => e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q)).forEach(e => (groups[e.group] = groups[e.group] || []).push(e))
    $('#elist').innerHTML = Object.entries(groups).map(([g,es]) => `<h3 style="margin:12px 0 2px" class="dim small">${esc(g)}</h3>${es.map(e => `<div class="item" data-a="pickEx" data-id="${e.id}"><div class="grow t">${esc(e.name)}</div>${D.best[e.id]?`<span class="small dim">${kg(r1(D.best[e.id]))} kg</span>`:''}</div>`).join('')}`).join('')
  }
  $('#eq').oninput = draw; draw()
}
A.pickEx = el => {
  if (editR){ editR.ex.push(el.dataset.id); manageRoutine(editR) }
  else if (S.active){ S.active.ex.push({id:el.dataset.id, sets:[]}); closeSheet(); commit({quiet:true}); setTimeout(() => scrollTo({top:document.body.scrollHeight, behavior:'smooth'}), 60) }
}
A.newEx = () => {
  const groups = ['Chest','Back','Shoulders','Arms','Legs','Core','Other'], keepR = editR
  openSheet(`${sheetHead('Custom exercise')}<label for="xn">Name</label><input id="xn"><label>Muscle group</label><div class="chips" id="xg">${groups.map((g,i) => `<button class="chip ${i?'':'on'}" data-g="${g}">${g}</button>`).join('')}</div>
    <label><input type="checkbox" id="xbw" style="width:auto;min-height:0"> Bodyweight exercise</label><button class="btn pri full" id="xs" style="margin-top:14px">Add</button>`)
  let g = groups[0]
  document.querySelectorAll('#xg .chip').forEach(b => b.onclick = () => { g = b.dataset.g; document.querySelectorAll('#xg .chip').forEach(x => x.classList.toggle('on', x === b)) })
  $('#xs').onclick = () => {
    const name = $('#xn').value.trim(); if (!name) return toast('Name it')
    const e = {id:'c-'+uid(), name, group:g, bw:$('#xbw').checked}
    S.customEx.push(e)
    editR = keepR
    A.pickEx({dataset:{id:e.id}})
  }
}

// routines editor
let editR = null
A.manageR = () => {
  editR = null
  openSheet(`${sheetHead('Routines', '<button class="btn sm" data-a="newR">+ New</button>')}${S.routines.map(r => `<div class="item" data-a="editR" data-id="${r.id}"><div class="grow"><div class="t">${esc(r.name)}</div><div class="s">${r.ex.length} exercises</div></div></div>`).join('')}`, () => { editR = null })
}
A.newR = () => { const r = {id:uid(), name:'New routine', ex:[]}; S.routines.push(r); save(); manageRoutine(r) }
A.editR = el => manageRoutine(S.routines.find(r => r.id === el.dataset.id))
function manageRoutine(r){
  openSheet(`${sheetHead('Edit routine')}<label for="rnm">Name</label><input id="rnm" value="${esc(r.name)}">
    <div style="margin-top:10px">${r.ex.map((id,i) => `<div class="item"><div class="grow t">${esc(exById(id).name)}</div><button class="x" data-a="rUp" data-i="${i}" aria-label="Move up">↑</button><button class="x" data-a="rDel" data-i="${i}" aria-label="Remove">×</button></div>`).join('') || '<div class="empty">No exercises yet</div>'}</div>
    <button class="btn full" id="rAdd" style="margin-top:8px">+ Add exercise</button>
    <div class="grid2" style="margin-top:10px"><button class="btn danger" id="rRm">Delete routine</button><button class="btn pri" id="rOk">Done</button></div>`, () => { editR = null })
  editR = r
  const keepName = () => { r.name = $('#rnm').value.trim() || r.name }
  $('#rAdd').onclick = () => { keepName(); const keep = r; A.addEx(); editR = keep }
  $('#rOk').onclick = () => { keepName(); closeSheet(); commit({quiet:true}) }
  $('#rRm').onclick = () => { S.routines = S.routines.filter(x => x !== r); closeSheet(); commit({quiet:true}) }
}
A.rUp = el => { const i = +el.dataset.i; if (i > 0){ const r = editR; r.name = $('#rnm').value.trim() || r.name; [r.ex[i-1], r.ex[i]] = [r.ex[i], r.ex[i-1]]; manageRoutine(r) } }
A.rDel = el => { const r = editR; r.name = $('#rnm').value.trim() || r.name; r.ex.splice(+el.dataset.i,1); manageRoutine(r) }

// past workout
A.viewW = el => {
  const w = S.workouts.find(w => w.id === el.dataset.id); if (!w) return
  openSheet(`${sheetHead(esc(w.name))}<p class="small dim">${niceDate(w.date)} · ${dur(w.end-w.start)} · ${fmt(volOf(w))} kg moved</p>
    ${w.ex.map((x,xi) => `<div class="ex"><h3>${esc(exById(x.id).name)}</h3><table class="sets">${x.sets.map((s,si) => `<tr><td>${si+1}</td><td>${kg(s.kg)} kg × ${s.r}${D.pbSets[`${w.id}:${xi}:${si}`]?' <span class="pb">PB</span>':''}</td></tr>`).join('')}</table></div>`).join('')}
    <button class="btn full danger" id="wdel">Delete workout</button>`)
  $('#wdel').onclick = () => confirmSheet('Delete this workout for good?', 'Delete', () => { S.workouts = S.workouts.filter(x => x !== w); commit({quiet:true}) })
}

// exercise progress chart
A.viewEx = el => {
  const ex = exById(el.dataset.id), pts = []
  const lastW = Object.keys(S.weights).sort().pop(), bw = lastW ? S.weights[lastW] : 75
  for (const w of S.workouts){
    const x = w.ex.find(x => x.id === ex.id); if (!x) continue
    const best = Math.max(...x.sets.map(s => e1rm(ex.bw ? bw + s.kg : s.kg, s.r)))
    const top = x.sets.reduce((a,s) => s.kg > a.kg ? s : a, x.sets[0])
    pts.push({k:w.date, y:best, top})
  }
  openSheet(`${sheetHead(esc(ex.name))}<p class="small dim">Estimated one-rep max per session (Epley). Goes up when you add weight or reps.</p>
    <svg class="chart" id="exChart"></svg>
    <div style="margin-top:10px">${[...pts].reverse().slice(0,12).map(p => `<div class="item"><div class="grow"><div class="t">${niceDate(p.k)}</div><div class="s">Top set ${kg(p.top.kg)} kg × ${p.top.r}</div></div><div class="v">${kg(r1(p.y))}</div></div>`).join('')}</div>`)
  lineChart($('#exChart'), pts.map(p => ({k:p.k, y:p.y})), null, 'var(--str)')
}

// cardio
A.logCardio = () => {
  const types = ['Walk','Run','Cycle','Row','Stairs','Cross-trainer','Sport','Other']
  let type = 'Walk'
  openSheet(`${sheetHead('Log cardio')}<div class="chips" id="ct">${types.map((t,i) => `<button class="chip ${i?'':'on'}" data-t="${t}">${t}</button>`).join('')}</div>
    <div class="grid2"><div><label for="cm">Minutes</label><input id="cm" inputmode="numeric"></div><div><label for="ck">Calories (optional)</label><input id="ck" inputmode="numeric"></div></div>
    <button class="btn pri full" id="cs" style="margin-top:14px">Save</button>`)
  document.querySelectorAll('#ct .chip').forEach(b => b.onclick = () => { type = b.dataset.t; document.querySelectorAll('#ct .chip').forEach(x => x.classList.toggle('on', x === b)) })
  $('#cs').onclick = () => {
    const mins = Math.round(num($('#cm').value)); if (mins <= 0) return toast('How many minutes?')
    const t = today(); (S.cardio[t] = S.cardio[t] || []).push({type, mins, kcal:Math.round(num($('#ck').value))})
    closeSheet(); commit()
  }
}
A.delCardio = el => confirmSheet('Remove this cardio entry?', 'Remove', () => { S.cardio[today()].splice(+el.dataset.i,1); commit({quiet:true}) })

// ---------- rest timer + clocks ----------
function renderTimer(){
  let el = $('#timer')
  const left = UI.timerEnd - Date.now()
  if (left <= 0 || !S.active || UI.tab !== 'train'){ el && el.remove(); return }
  if (!el){
    el = document.createElement('div'); el.id = 'timer'; el.className = 'timer'
    el.innerHTML = `<span class="small">Rest</span><span class="num grow" id="tleft"></span><button class="btn sm" data-a="tAdd">+30s</button><button class="btn sm" data-a="tSkip">Skip</button>`
    document.body.appendChild(el)
  }
  const s = Math.ceil(left/1000)
  $('#tleft').textContent = `${Math.floor(s/60)}:${pad(s%60)}`
}
A.tAdd = () => { UI.timerEnd += 30000; renderTimer() }
A.tSkip = () => { UI.timerEnd = 0; renderTimer() }
let timerWas = 0
function tick(){
  if (UI.timerEnd && Date.now() >= UI.timerEnd && timerWas){ UI.timerEnd = 0; buzz([200,100,200]); toast('<b>Rest over</b>, next set'); }
  timerWas = UI.timerEnd
  renderTimer()
  const c = $('#wclock'); if (c && S.active) c.textContent = dur(Date.now()-S.active.start)
  // roll over at midnight
  if (UI.day !== today()){ if (UI.day){ UI.fdate = today(); render() } UI.day = today() }
}

// ---------- line chart (weight + lifts) ----------
// pts [{k,y}] dots, line [{k,y}] smooth line (or null = join dots)
function lineChart(svg, pts, line, col){
  if (!svg) return
  const draw = () => {
    const W = svg.clientWidth || 320, H = svg.clientHeight || 200, P = {l:36,r:10,t:10,b:22}
    if (pts.length < 2){ svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle">Log a couple more to see a chart</text>`; return }
    const all = [...pts, ...(line||[])], ks = all.map(p => p.k).sort()
    const k0 = ks[0], span = Math.max(1, daysBetween(k0, ks[ks.length-1]))
    let lo = Math.min(...all.map(p => p.y)), hi = Math.max(...all.map(p => p.y))
    const pad_ = Math.max(.5, (hi-lo)*.15); lo -= pad_; hi += pad_
    const X = k => P.l + daysBetween(k0,k)/span*(W-P.l-P.r)
    const Y = v => P.t + (1-(v-lo)/(hi-lo))*(H-P.t-P.b)
    let s = ''
    for (let i = 0; i <= 3; i++){ const v = lo + (hi-lo)*i/3, y = Y(v); s += `<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${P.l-6}" y="${y+4}" text-anchor="end">${r1(v)}</text>` }
    const lab = k => toDate(k).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
    s += `<text x="${P.l}" y="${H-4}">${lab(k0)}</text><text x="${W-P.r}" y="${H-4}" text-anchor="end">${lab(ks[ks.length-1])}</text>`
    const L = line || pts
    s += `<polyline fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" points="${L.map(p => `${X(p.k)},${Y(p.y)}`).join(' ')}"/>`
    s += pts.map(p => `<circle cx="${X(p.k)}" cy="${Y(p.y)}" r="${line?2.5:3.5}" fill="${line?'var(--faint)':col}"/>`).join('')
    svg.innerHTML = s
  }
  draw()
  if (!svg._ro){ svg._ro = new ResizeObserver(draw); svg._ro.observe(svg) }
}

// ---------- coaching bits ----------
function muscleCard(){
  const t = today(), mon = mondayOf(t)
  const now = setsByMuscle(S, mon, t), prev = setsByMuscle(S, addDays(mon,-7), addDays(mon,-1))
  const gs = MUSCLES.filter(g => g !== 'Arms' || now.Arms || prev.Arms)
  const max = 24
  return `<div class="card"><div class="row between"><h2 style="margin:0">Sets this week</h2><span class="mono dim">Target 10–20</span></div>
    <p class="small dim" style="margin:6px 0 10px">Direct hard sets per muscle since Monday. 10–20 a week is the usual range for growth.</p>
    ${muscleMap(now)}
    ${gs.map(g => { const v = now[g]||0, p = prev[g]||0, col = v >= 10 ? 'var(--red)' : 'var(--blood)'
      return `<div class="mbar"><div class="row between"><span>${g}</span><span class="mono dim">${v}${p ? ` · last wk ${p}` : ''}</span></div>
        <div class="track" style="position:relative;height:8px"><span style="position:absolute;left:${10/max*100}%;width:${10/max*100}%;top:0;bottom:0;background:#1d0606"></span><i style="position:relative;width:${Math.min(100,v/max*100)}%;background:${col};color:${col}"></i></div></div>` }).join('')}
  </div>`
}
function stallCard(){
  const ids = [...new Set(S.workouts.slice(-30).flatMap(w => w.ex.map(x => x.id)))].filter(id => stalled(S,id))
  if (!ids.length) return ''
  return `<div class="card" style="border-color:var(--str)"><h2 style="margin:0 0 6px">Stalled lifts</h2>
    <p class="small dim">No new best in the last 3 sessions. Take a lighter week (about 10% off), check sleep and food, or swap to a similar exercise.</p>
    ${ids.map(id => `<div class="item" data-a="viewEx" data-id="${id}"><div class="grow t">${esc(exById(id).name)}</div><span class="mono dim">${kg(r1(D.best[id]||0))} kg</span></div>`).join('')}</div>`
}
A.exRange = el => {
  const id = el.dataset.id, c = exCfg(S,id)
  openSheet(`${sheetHead(esc(exById(id).name))}<p class="small dim">Rep range for progression. Once every set hits the top number, the target moves up by the step and drops back to the bottom of the range.</p>
    <div class="grid3"><div><label for="rlo">Low reps</label><input id="rlo" inputmode="numeric" value="${c.lo}"></div><div><label for="rhi">High reps</label><input id="rhi" inputmode="numeric" value="${c.hi}"></div><div><label for="rinc">Step kg</label><input id="rinc" inputmode="decimal" value="${c.inc}"></div></div>
    <button class="btn pri full" id="rsv" style="margin-top:14px">Save</button>`)
  $('#rsv').onclick = () => {
    const lo = Math.round(num($('#rlo').value)), hi = Math.round(num($('#rhi').value)), inc = num($('#rinc').value)
    if (!(lo > 0 && hi >= lo && inc > 0)) return toast('Check those numbers')
    S.exCfg = S.exCfg || {}; S.exCfg[id] = {lo, hi, inc}; closeSheet(); commit({quiet:true})
  }
}

// ---------- muscle map - pixel body, front + back ----------
const BODY_FRONT = [
  '......hhh......','.....hhhhh.....','.....hhhhh.....','......hhh......','.......n.......',
  '..sscccccccss..','.ssscccccccsss.','.bb.ccccccc.bb.','.bb.ccccccc.bb.','.bb.oaaaaao.bb.',
  '.ff.oaaaaao.ff.','.ff..aaaaa..ff.','.ff..aaaaa..ff.','ff..qqqqqqq..ff','....qqq.qqq....',
  '....qqq.qqq....','....qqq.qqq....','....qqq.qqq....','....qq...qq....','....kk...kk....',
  '....ll...ll....','....ll...ll....','....ll...ll....','...fff...fff...'
]
const BODY_BACK = [
  '......hhh......','.....hhhhh.....','.....hhhhh.....','......hhh......','......BBB......',
  '..ssBBBBBBBss..','.sssBBBBBBBsss.','.rr.BBBBBBB.rr.','.rr.BBBBBBB.rr.','.rr..BBBBB..rr.',
  '.ff..wwwww..ff.','.ff..wwwww..ff.','.ff..wwwww..ff.','ff.ggggggggg.ff','....ggg.ggg....',
  '....mmm.mmm....','....mmm.mmm....','....mmm.mmm....','....mm...mm....','....kk...kk....',
  '....cc...cc....','....cc...cc....','....cc...cc....','...fff...fff...'
]
const PIX_F = {s:'Shoulders',c:'Chest',b:'Biceps',a:'Core',o:'Core',q:'Legs',l:'Legs'}
const PIX_B = {B:'Back',w:'Back',s:'Shoulders',r:'Triceps',g:'Legs',m:'Legs',c:'Legs'}
function heat(v){
  if (!v) return '#161616'
  const t = Math.min(1, v/10) // ramps to full red at 10 sets
  const lerp = (a,b) => Math.round(a + (b-a)*t)
  return `rgb(${lerp(70,255)},${lerp(6,26)},${lerp(6,26)})`
}
function muscleMap(sets){
  const val = g => (sets[g]||0) + ((g === 'Biceps' || g === 'Triceps') ? (sets.Arms||0) : 0)
  const fig = (rows, map, ox) => rows.map((row,y) => [...row].map((ch,x) => {
    if (ch === '.') return ''
    const g = map[ch], v = g ? val(g) : 0
    const fill = g ? heat(v) : '#0e0e0e'
    return `<rect x="${ox+x}" y="${y}" width=".9" height=".9" fill="${fill}"${g && v >= 10 ? ' filter="url(#mg)"' : ''}><title>${g ? `${g}: ${v} sets` : ''}</title></rect>`
  }).join('')).join('')
  return `<svg viewBox="-1 -1 34 27" style="width:100%;max-width:420px;display:block;margin:0 auto 6px" role="img" aria-label="Muscle map">
    <defs><filter id="mg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".35" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${fig(BODY_FRONT, PIX_F, 0)}${fig(BODY_BACK, PIX_B, 17)}
    <text x="7.5" y="25.6" text-anchor="middle" font-size="1" fill="#555" font-family="Plex,monospace" letter-spacing=".15">FRONT</text>
    <text x="24.5" y="25.6" text-anchor="middle" font-size="1" fill="#555" font-family="Plex,monospace" letter-spacing=".15">BACK</text></svg>
    <div class="row mono dim" style="justify-content:center;gap:14px;margin-bottom:6px;font-size:10px"><span><i style="display:inline-block;width:9px;height:9px;background:#161616;margin-right:5px"></i>0</span><span><i style="display:inline-block;width:9px;height:9px;background:${heat(5)};margin-right:5px"></i>Some</span><span><i style="display:inline-block;width:9px;height:9px;background:#ff1a1a;margin-right:5px;box-shadow:0 0 6px #ff1a1a"></i>10+</span></div>`
}
