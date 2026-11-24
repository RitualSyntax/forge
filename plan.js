// plan - calculator, ring goals, backup

VIEWS.plan = {
  html(){
    const p = S.profile, st = S.settings, g = GOALS[p.goal]
    const chip = (key, val, label, extra='') => `<button class="chip ${String(p[key])===String(val)?'on':''}" data-a="pset" data-k="${key}" data-v="${val}" ${extra}>${label}</button>`
    const rate = goalRate(p)
    return `
    <div class="card" id="planOut"></div>
    <div id="adapt"></div>
    <div class="card"><h2>About you</h2>
      <div class="chips">${chip('sex','m','Male')}${chip('sex','f','Female')}</div>
      <div class="grid3"><div><label for="p_age">Age</label><input id="p_age" data-p="age" inputmode="numeric" value="${p.age}"></div>
      <div><label for="p_height">Height cm</label><input id="p_height" data-p="height" inputmode="decimal" value="${p.height}"></div>
      <div><label for="p_weight">Weight kg</label><input id="p_weight" data-p="weight" inputmode="decimal" value="${p.weight}"></div></div>
      <label for="p_bf">Body fat % (optional, makes it more accurate)</label><input id="p_bf" data-p="bf" inputmode="decimal" value="${p.bf}" placeholder="Leave blank if unsure">
    </div>
    <div class="card"><h2>Your week</h2>
      <label>Day-to-day, outside the gym</label>
      <div style="display:grid;gap:6px">${Object.entries(NEAT).map(([k,n]) => `<button class="chip ${p.neat===k?'on':''}" data-a="pset" data-k="neat" data-v="${k}" style="text-align:left;min-height:52px;border-radius:14px;padding:8px 14px"><span style="display:block">${n.name}</span><span class="small" style="font-weight:400;opacity:.75">${n.hint}</span></button>`).join('')}</div>
      <div class="grid3"><div><label for="p_days">Lifts / week</label><input id="p_days" data-p="days" inputmode="numeric" value="${p.days}"></div>
      <div><label for="p_mins">Mins / session</label><input id="p_mins" data-p="mins" inputmode="numeric" value="${p.mins}"></div>
      <div><label for="p_cardio">Cardio min/wk</label><input id="p_cardio" data-p="cardio" inputmode="numeric" value="${p.cardio}"></div></div>
    </div>
    <div class="card"><h2>Goal</h2>
      <div style="display:grid;gap:6px">${Object.entries(GOALS).map(([k,o]) => `<button class="chip ${p.goal===k?'on':''}" data-a="pset" data-k="goal" data-v="${k}" style="text-align:left;min-height:52px;border-radius:14px;padding:8px 14px"><span style="display:block">${o.name}</span><span class="small" style="font-weight:400;opacity:.75">${o.sub}</span></button>`).join('')}</div>
      <label>Training experience</label><div class="chips">${Object.entries(EXP).map(([k,n]) => chip('exp',k,n)).join('')}</div>
      ${g.per ? `<label for="p_rate">Pace: <b id="rateLbl">${r1(rate)}% of bodyweight per ${g.per==='wk'?'week':'month'}</b></label>
        <input id="p_rate" type="range" min="${g.min}" max="${g.max}" step="0.05" value="${rate}" style="padding:0">
        <div class="row between small dim"><span>Slower, leaner</span><button class="btn sm ghost" data-a="rateReset">Reset to suggested</button><span>Faster</span></div>` : ''}
    </div>
    <div class="card"><h2>Daily rings</h2>
      <div class="grid3"><div><label for="s_stepGoal">Step goal</label><input id="s_stepGoal" data-s="stepGoal" inputmode="numeric" value="${st.stepGoal}"></div>
      <div><label for="s_cardioGoal">Cardio min</label><input id="s_cardioGoal" data-s="cardioGoal" inputmode="numeric" value="${st.cardioGoal}"></div>
      <div><label for="s_setGoal">Sets / session</label><input id="s_setGoal" data-s="setGoal" inputmode="numeric" value="${st.setGoal}"></div></div>
      <label for="s_restSecs">Rest timer (seconds)</label><input id="s_restSecs" data-s="restSecs" inputmode="numeric" value="${st.restSecs}">
      <label>Rest days (Strength ring closes itself)</label>
      <div class="chips">${[1,2,3,4,5,6,0].map(d => `<button class="chip ${st.rest.includes(d)?'on':''}" data-a="restDay" data-d="${d}">${DAYS[d]}</button>`).join('')}</div>
    </div>
    <div class="card"><h2>Your data</h2>
      <p class="small dim">Everything lives on this phone. Export a backup now and then so you don't lose it if you clear Chrome's data.</p>
      <div class="grid2"><button class="btn" data-a="exportData">Export backup</button><button class="btn" data-a="importData">Import backup</button></div>
      <input type="file" id="impFile" accept="application/json,.json" hidden>
      <button class="btn full ghost danger" data-a="resetAll" style="margin-top:10px">Reset everything</button>
    </div>`
  },
  after(){ planOut(); adaptOut()
    document.querySelectorAll('[data-p]').forEach(i => i.oninput = () => { const k = i.dataset.p; S.profile[k] = i.value === '' ? '' : num(i.value); liveSave() })
    document.querySelectorAll('[data-s]').forEach(i => i.oninput = () => { const v = Math.round(num(i.value)); if (v > 0){ S.settings[i.dataset.s] = v; liveSave() } })
    const rr = $('#p_rate'); if (rr) rr.oninput = () => { S.profile.rate = +rr.value; $('#rateLbl').textContent = `${r1(+rr.value)}% of bodyweight per ${GOALS[S.profile.goal].per==='wk'?'week':'month'}`; liveSave() }
    $('#impFile').onchange = importFile
  }
}

// typing in the form - save + update numbers without nuking focus
let liveT = 0
function liveSave(){
  syncTargets(); planOut()
  clearTimeout(liveT); liveT = setTimeout(() => commit({noRender:true, quiet:true}), 600)
}

function planOut(){
  const box = $('#planOut'); if (!box) return
  const p = S.profile, pl = makePlan(p, S.maintOverride)
  if (!pl){ box.innerHTML = `<h2>Your numbers</h2><p class="dim">Fill in age, height and weight below and your calories and macros appear here.</p>`; return }
  const g = GOALS[p.goal]
  box.innerHTML = `<div class="row between" style="align-items:flex-start"><div><span class="small dim">${g.name} · daily target</span><div class="big">${fmt(pl.kcal)}<span style="font-size:20px"> kcal</span></div>
      <span class="small dim">${pl.delta>=0?'+':''}${fmt(pl.delta)} vs maintenance ${fmt(pl.maint)}${S.maintOverride?' (measured)':''}</span></div></div>
    <div class="grid3" style="margin-top:14px">
      <div class="stat" style="box-shadow:inset 0 -3px var(--pro)"><div class="num">${pl.prot}g</div><small>protein</small></div>
      <div class="stat" style="box-shadow:inset 0 -3px var(--car)"><div class="num">${pl.carb}g</div><small>carbs</small></div>
      <div class="stat" style="box-shadow:inset 0 -3px var(--cal)"><div class="num">${pl.fat}g</div><small>fat</small></div></div>
    ${g.per ? `<p style="margin:12px 0 0"><b>${pl.gWk>=0?'+':''}${r0(pl.gWk)} g a week</b> <span class="dim">→ about ${r1(+p.weight + pl.gWk/1000*12)} kg in 12 weeks</span></p>` : ''}
    <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600;min-height:32px">How this is worked out</summary><div class="why"><ul>${planWhy(p,pl).map(l => `<li>${l}</li>`).join('')}</ul></div></details>
    <p class="small faint" style="margin:8px 0 0">Formulas are a starting point. After a few weeks of logging, Forge measures your real maintenance below.</p>`
}

function adaptOut(){
  const box = $('#adapt'); if (!box) return
  const m = measuredMaint(S, D)
  const pl = makePlan({...S.profile}, null)
  if (!m){
    const days = Object.keys(S.weights).length, fdays = Object.values(D.day).filter(d => d.n).length
    box.innerHTML = `<div class="card"><h3>Measured maintenance</h3><p class="small dim" style="margin:6px 0 10px">Log food and weigh in on most days for about 2 weeks. Forge then compares what you ate with how your trend weight moved to work out what you actually burn.</p>
      <div class="xpbar"><i style="width:${Math.min(100, Math.min(days,14)/14*50 + Math.min(fdays,14)/14*50)}%"></i></div>
      <p class="small dim" style="margin:6px 0 0">${Math.min(days,14)}/14 weigh-ins · ${Math.min(fdays,14)}/14 days of food</p>
      ${S.maintOverride ? `<button class="btn sm ghost" data-a="useFormula" style="margin-top:8px">Back to formula</button>` : ''}</div>`
    return
  }
  box.innerHTML = `<div class="card" style="border-color:var(--pro)"><h3>Measured maintenance: ${fmt(m.maint)} kcal</h3>
    <p class="small dim" style="margin:6px 0 10px">Over the last ${m.days} days you averaged ${fmt(m.avg)} kcal and your trend weight moved ${m.dw>=0?'+':''}${m.dw} kg. The formula guessed ${pl ? fmt(pl.formula) : '—'}.</p>
    ${S.maintOverride === m.maint ? '<p class="small" style="color:var(--good);margin:0 0 8px">Your plan is using this.</p>' : ''}
    <div class="grid2"><button class="btn ${S.maintOverride===m.maint?'':'pri'}" data-a="useMeasured" data-v="${m.maint}">Use measured</button><button class="btn" data-a="useFormula">Use formula</button></div></div>`
}
A.useMeasured = el => { S.maintOverride = +el.dataset.v; commit({quiet:true}); toast('Plan updated with your real maintenance') }
A.useFormula = () => { S.maintOverride = null; commit({quiet:true}) }

A.pset = el => {
  const k = el.dataset.k, v = el.dataset.v
  S.profile[k] = v
  if (k === 'goal' || k === 'exp') S.profile.rate = null
  commit({quiet:true})
}
A.rateReset = () => { S.profile.rate = null; commit({quiet:true}) }
A.restDay = el => {
  const d = +el.dataset.d, r = S.settings.rest
  S.settings.rest = r.includes(d) ? r.filter(x => x !== d) : [...r, d]
  commit({quiet:true})
}

// backup
A.exportData = () => {
  const blob = new Blob([JSON.stringify(S)], {type:'application/json'})
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `forge-backup-${today()}.json`
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
A.importData = () => $('#impFile').click()
function importFile(e){
  const f = e.target.files[0]; if (!f) return
  f.text().then(t => {
    let s; try { s = JSON.parse(t) } catch(err){ return toast('That file isn\'t a Forge backup') }
    if (!s || !s.diary || !s.foods) return toast('That file isn\'t a Forge backup')
    confirmSheet('Replace everything on this phone with the backup?', 'Replace', () => {
      S = Object.assign(fresh(), s); window.S = S; D = derive(S); commit({quiet:true}); toast('Backup restored')
    })
  })
  e.target.value = ''
}
A.resetAll = () => confirmSheet('This wipes every workout, food, weigh-in and level. Export a backup first if you might want it.', 'Wipe it all', () => {
  S = fresh(); window.S = S; D = derive(S); commit({quiet:true})
})
