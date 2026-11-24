// weekly check-in - sunday onwards, looks back at mon-sun

function reportWeek(){ const t = today(); return dow(t) === 0 ? mondayOf(t) : addDays(mondayOf(t), -7) }
function checkinDue(){
  const wk = reportWeek()
  if ((S.checkins||{})[wk]) return false
  for (let i = 0; i < 7; i++){ const k = addDays(wk,i); if ((D.day[k]||{}).n || S.weights[k]) return true }
  return false
}

function weekReport(wk){
  const t = today(), end = addDays(wk,6) > t ? t : addDays(wk,6)
  const days = []; for (let k = wk; k <= end; k = addDays(k,1)) days.push(k)
  const logged = days.filter(k => (D.day[k]||{}).n)
  const avgK = logged.length ? logged.reduce((a,k) => a + D.day[k].kcal, 0)/logged.length : 0
  const avgT = logged.length ? logged.reduce((a,k) => a + dayTargets(S,k).kcal, 0)/logged.length : S.targets.kcal
  const protHit = days.filter(k => ringsFor(S,D,k).pro.closed).length
  const ws = S.workouts.filter(w => w.date >= wk && w.date <= end)
  const sets = ws.reduce((a,w) => a + w.ex.reduce((b,x) => b + x.sets.length, 0), 0)
  const pbs = days.reduce((a,k) => a + (D.pbDays[k]||0), 0)
  // trend change over the week
  const tr = D.trend, tks = Object.keys(tr).sort().filter(k => k <= end)
  const startK = tks.filter(k => k < wk).pop() || tks.find(k => k >= wk)
  const endK = tks[tks.length-1]
  const dw = startK && endK && endK > startK ? tr[endK] - tr[startK] : null
  // waist vs previous measure
  const mk = Object.keys(S.measures).sort().filter(k => S.measures[k].waist && k <= end)
  const waist = mk.length > 1 && mk[mk.length-1] >= wk ? S.measures[mk[mk.length-1]].waist - S.measures[mk[mk.length-2]].waist : null
  // rate over last 2 weeks vs plan
  const back = addDays(endK || end, -14)
  const rate = endK && tr[back] != null ? (tr[endK] - tr[back])/2 : null
  const pl = makePlan(S.profile, S.maintOverride)
  let adj = 0, verdict = 'Not enough weigh-ins yet to judge your rate. Keep logging.'
  if (rate != null && pl){
    const want = pl.gWk/1000, diff = rate - want, tol = Math.max(.05, Math.abs(want)*.4)
    if (Math.abs(diff) <= tol) verdict = `Weight is moving ${rate>=0?'+':''}${r0(rate*1000)} g a week against a plan of ${want>=0?'+':''}${r0(want*1000)} g. On track. Change nothing.`
    else {
      adj = -Math.sign(diff) * Math.min(250, Math.max(50, Math.round(Math.abs(diff)*KCAL_KG/7/50)*50))
      verdict = `Weight is moving ${rate>=0?'+':''}${r0(rate*1000)} g a week against a plan of ${want>=0?'+':''}${r0(want*1000)} g. Suggest ${adj>0?'+':''}${adj} kcal a day.`
    }
  }
  const notes = []
  if (logged.length < 5) notes.push(`Food logged on ${logged.length} of ${days.length} days. More days make every number here sharper.`)
  if (logged.length && protHit < logged.length*.7) notes.push(`Protein hit on ${protHit} days. Aim for 5+. A shake or yoghurt is the easy fix.`)
  if (S.profile.days && ws.length < Math.min(S.profile.days, days.length)) notes.push(`${ws.length} of ${S.profile.days} planned sessions.`)
  if (waist != null && waist > .5 && (S.profile.goal === 'leanbulk')) notes.push(`Waist up ${r1(waist)} cm since the last measure. Watch it. If it keeps climbing, slow the gain.`)
  return {wk, end, days, logged, avgK, avgT, protHit, ws, sets, pbs, dw, waist, rate, adj, verdict, notes}
}

function checkinHtml(){
  if (!checkinDue()) return ''
  const r = weekReport(reportWeek())
  const lab = k => toDate(k).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
  return `<div class="card" style="border-color:var(--red);box-shadow:var(--glow)">
    <div class="mono dim">${lab(r.wk)} – ${lab(r.end)}</div>
    <h2 style="margin:4px 0 12px">Weekly check-in</h2>
    <div class="grid3">
      <div class="stat"><div class="num">${r.logged.length ? fmt(r.avgK) : '—'}</div><small>avg kcal${r.avgT ? ` / ${fmt(r.avgT)}` : ''}</small></div>
      <div class="stat"><div class="num">${r.protHit}/${r.days.length}</div><small>protein days</small></div>
      <div class="stat"><div class="num">${r.ws.length}</div><small>workouts</small></div>
      <div class="stat"><div class="num">${r.sets}</div><small>sets</small></div>
      <div class="stat"><div class="num">${r.pbs}</div><small>new PBs</small></div>
      <div class="stat"><div class="num">${r.dw != null ? (r.dw>=0?'+':'') + r1(r.dw) : '—'}</div><small>trend kg</small></div>
    </div>
    ${r.waist != null ? `<p class="small dim" style="margin:10px 0 0">Waist ${r.waist>=0?'+':''}${r1(r.waist)} cm since last measure.</p>` : ''}
    <p style="margin:12px 0 0"><b>${r.verdict}</b></p>
    ${r.notes.length ? `<ul class="why small" style="padding-left:18px;margin:8px 0 0">${r.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
    <div class="grid2" style="margin-top:14px">${r.adj ? `<button class="btn pri" data-a="checkin" data-adj="${r.adj}">Apply ${r.adj>0?'+':''}${r.adj} kcal</button><button class="btn" data-a="checkin" data-adj="0">Keep as is</button>`
      : `<button class="btn pri" data-a="checkin" data-adj="0" style="grid-column:1/-1">Done · +25 XP</button>`}</div>
  </div>`
}

A.checkin = el => {
  const adj = +el.dataset.adj, wk = reportWeek()
  S.checkins = S.checkins || {}
  S.checkins[wk] = {adj, at:Date.now()}
  if (adj) S.profile.adj = (+S.profile.adj||0) + adj
  commit()
  if (adj) toast(`Target ${adj>0?'up':'down'} <b>${Math.abs(adj)} kcal</b>`)
}
