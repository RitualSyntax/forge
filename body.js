// body - weigh-ins, trend, measurements

const MEAS = [['waist','Waist','cm'],['chest','Chest','cm'],['arm','Arm (flexed)','cm'],['thigh','Thigh','cm'],['bf','Body fat','%']]

function rateNow(){
  const tr = D.trend, ks = Object.keys(tr).sort()
  if (ks.length < 10) return null
  const end = ks[ks.length-1], back = Math.min(14, ks.length-1), start = addDays(end,-back)
  return (tr[end]-tr[start]) / back * 7 // kg per week
}

VIEWS.body = {
  html(){
    const ws = Object.keys(S.weights).sort(), last = ws[ws.length-1]
    const tk = Object.keys(D.trend).sort().pop()
    const rate = rateNow(), pl = makePlan(S.profile, S.maintOverride)
    let verdict = ''
    if (rate != null && pl){
      const want = pl.gWk/1000, diff = rate - want, tol = Math.max(.05, Math.abs(want)*.4)
      const fix = Math.round(Math.abs(diff)*KCAL_KG/7/50)*50
      verdict = Math.abs(diff) <= tol ? `<p style="color:var(--good);font-weight:700;margin:8px 0 0">On pace for your plan</p>`
        : diff > 0 ? `<p style="margin:8px 0 0"><b>${want >= 0 ? 'Gaining faster' : 'Losing slower'} than planned.</b> <span class="dim">Try about ${fix} kcal less a day, or check the measured maintenance on the Plan tab.</span></p>`
        : `<p style="margin:8px 0 0"><b>${want > 0 ? 'Gaining slower' : 'Losing faster'} than planned.</b> <span class="dim">Try about ${fix} kcal more a day, or check the measured maintenance on the Plan tab.</span></p>`
    }
    const ms = Object.keys(S.measures).sort(), m0 = ms[0] && S.measures[ms[0]], m1 = ms.length && S.measures[ms[ms.length-1]]
    return `
    <div class="card"><div class="row between" style="align-items:flex-start">
      <div><span class="small dim">Trend weight</span><div class="big">${tk ? r1(D.trend[tk]) : '—'}<span style="font-size:20px"> kg</span></div>
      <span class="small dim">${last ? `Last weigh-in ${kg(S.weights[last])} kg · ${niceDate(last)}` : 'No weigh-ins yet'}</span></div>
      <button class="btn pri" data-a="logWeight">${S.weights[today()] ? 'Edit today' : 'Weigh in'}</button></div>
      ${rate != null ? `<div class="grid2" style="margin-top:12px"><div class="stat"><div class="num">${rate>=0?'+':''}${r0(rate*1000)} g</div><small>per week, actual</small></div><div class="stat"><div class="num">${pl ? (pl.gWk>=0?'+':'')+r0(pl.gWk)+' g' : '—'}</div><small>per week, planned</small></div></div>${verdict}`
        : '<p class="small dim" style="margin:10px 0 0">Weigh in most mornings (after the loo, before food). After 10 days you\'ll see your real rate of gain against the plan.</p>'}
    </div>
    <div class="card"><div class="row between"><h3>Weight</h3><div class="chips">${[[30,'30d'],[90,'90d'],[0,'All']].map(([v,n]) => `<button class="chip ${UI.wrange===v?'on':''}" data-a="wrange" data-v="${v}">${n}</button>`).join('')}</div></div>
      <svg class="chart" id="wChart" style="margin-top:8px"></svg>
      <p class="small dim" style="margin:6px 0 0">Dots are daily weigh-ins, the line is the smoothed trend. Daily water swings are noise. Watch the line.</p></div>
    <div class="card"><div class="row between"><h3>Measurements</h3><button class="btn sm" data-a="logMeas">+ Log</button></div>
      ${m1 ? `<table class="sets" style="margin-top:10px">${MEAS.filter(([k]) => m1[k]).map(([k,n,u]) => { const d = m0 && m0[k] && ms.length > 1 ? m1[k]-m0[k] : null; return `<tr><td style="width:auto;color:var(--ink)">${n}</td><td style="text-align:right"><b>${r1(m1[k])} ${u}</b>${d != null ? ` <span class="small" style="color:${(k==='waist'||k==='bf') ? (d<=0?'var(--good)':'var(--bad)') : (d>=0?'var(--good)':'var(--bad)')}">${d>=0?'+':''}${r1(d)}</span>` : ''}</td></tr>` }).join('')}</table>
      <p class="small dim" style="margin:0">Change since ${niceDate(ms[0])}. On a muscle-building phase you want arms and chest going up while waist stays put.</p>`
      : '<p class="small dim" style="margin:8px 0 0">Measure every 2–4 weeks. Waist vs arms and chest is the best way to tell muscle from fat when the scale goes up.</p>'}
    </div>
    <div class="card"><h3>Weigh-ins</h3>${ws.slice(-10).reverse().map(k => `<div class="item" data-a="logWeight" data-k="${k}"><div class="grow t">${niceDate(k)}</div><div class="v">${kg(S.weights[k])} kg</div></div>`).join('') || '<div class="empty">None yet</div>'}</div>`
  },
  after(){
    const ks = Object.keys(S.weights).sort(), from = UI.wrange ? addDays(today(), -UI.wrange) : '0'
    const pts = ks.filter(k => k >= from).map(k => ({k, y:S.weights[k]}))
    const line = Object.keys(D.trend).sort().filter(k => k >= from).map(k => ({k, y:D.trend[k]}))
    lineChart($('#wChart'), pts, line, 'var(--car)')
  }
}
A.wrange = el => { UI.wrange = +el.dataset.v; render() }

A.logWeight = el => {
  const k0 = (el && el.dataset && el.dataset.k) || today()
  const last = Object.keys(S.weights).sort().pop()
  openSheet(`${sheetHead('Weigh in')}
    <div class="grid2"><div><label for="wv">Weight (kg)</label><input id="wv" inputmode="decimal" value="${S.weights[k0] ?? (last ? S.weights[last] : '')}"></div>
    <div><label for="wd">Date</label><input id="wd" type="date" value="${k0}" max="${today()}"></div></div>
    <div class="grid2" style="margin-top:14px">${S.weights[k0] != null ? '<button class="btn danger" id="wdel">Delete</button>' : '<span></span>'}<button class="btn pri" id="wok">Save</button></div>`)
  const inp = $('#wv'); inp.focus(); inp.select()
  $('#wok').onclick = () => {
    const v = num(inp.value), k = $('#wd').value || k0
    if (!(v > 20 && v < 400)) return toast('That weight looks off')
    if (k !== k0 && S.weights[k0] != null && el && el.dataset && el.dataset.k) delete S.weights[k0]
    S.weights[k] = r1(v)
    // keep plan weight current
    const newest = Object.keys(S.weights).sort().pop()
    if (k === newest) S.profile.weight = r1(v)
    closeSheet(); commit()
  }
  if (S.weights[k0] != null) $('#wdel').onclick = () => { delete S.weights[k0]; closeSheet(); commit({quiet:true}) }
}

A.logMeas = () => {
  const ms = Object.keys(S.measures).sort(), last = ms.length ? S.measures[ms[ms.length-1]] : {}
  openSheet(`${sheetHead('Measurements')}<p class="small dim">Same spot, same time of day, tape snug but not tight. Leave any blank.</p>
    <div class="grid2">${MEAS.map(([k,n,u]) => `<div><label for="m_${k}">${n} (${u})</label><input id="m_${k}" inputmode="decimal" placeholder="${last[k] ?? ''}"></div>`).join('')}</div>
    <button class="btn pri full" id="mok" style="margin-top:14px">Save</button>`)
  $('#mok').onclick = () => {
    const o = {}; MEAS.forEach(([k]) => { const v = num($('#m_'+k).value); if (v > 0) o[k] = v })
    if (!Object.keys(o).length) return toast('Nothing entered')
    S.measures[today()] = {...(S.measures[today()]||{}), ...o}
    if (o.bf) S.profile.bf = o.bf
    closeSheet(); commit()
  }
}
