// food - diary, library, amounts, barcode scan, open food facts

VIEWS.food = {
  html(){
    const k = UI.fdate, list = S.diary[k] || [], d = D.day[k] || {kcal:0,p:0,c:0,f:0,fib:0}, tg = dayTargets(S,k)
    const y = addDays(k,-1), ylist = S.diary[y] || []
    return `${datebar(k,'fday')}
    <div class="card">
      <div class="row between"><div><div class="num" style="font-size:34px;font-weight:800;line-height:1">${fmt(d.kcal)}</div><span class="small dim">kcal eaten${tg.kcal?` of ${fmt(tg.kcal)}`:''}</span></div>
      <button class="btn pri" data-a="scan">${IC.scan.replace('<svg','<svg class="icon"')}Scan</button></div>
      ${macroBars(d,k)}
      <p class="small dim" style="margin:6px 0 0">Fibre ${r0(d.fib)}${tg.fib?` / ${tg.fib}`:''} g${S.settings.split && tg.kcal ? ` · <span class="mono" style="color:var(--red)">${S.settings.rest.includes(dow(k)) ? 'Rest day' : 'Training day'}</span>` : ''}</p>
    </div>
    ${MEALS.map(m => {
      const es = list.filter(e => e.meal === m), tot = es.reduce((s,e) => s+e.k, 0)
      const canCopy = !es.length && ylist.some(e => e.meal === m)
      return `<div class="card"><div class="meal-h"><h3>${m}</h3><span class="small dim">${fmt(tot)} kcal</span></div>
        ${es.map(e => `<div class="item" data-a="editEntry" data-id="${e.id}"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${kg(e.g)} g · P ${r0(e.p)} · C ${r0(e.c)} · F ${r0(e.f)}</div></div><div class="v">${fmt(e.k)}</div></div>`).join('') || '<div class="empty">Nothing yet</div>'}
        <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-a="addFood" data-meal="${m}">+ Add</button>${canCopy?`<button class="btn sm ghost" data-a="copyMeal" data-meal="${m}">Copy yesterday's</button>`:''}${es.length > 1 ? `<button class="btn sm ghost" data-a="savePreset" data-meal="${m}">Save as meal</button>`:''}</div></div>`
    }).join('')}
    <div class="card"><h2>Last 7 days</h2>${week7(k)}</div>
    <button class="btn full ghost" data-a="library">Manage food library (${Object.keys(S.foods).length})</button>`
  }
}

function week7(end){
  const ks = Array.from({length:7}, (_,i) => addDays(end, i-6)), tg = S.targets.kcal
  const max = Math.max(tg*1.25 || 1, ...ks.map(k => (D.day[k]||{}).kcal||0))
  return `<div class="bars7">${tg?`<div class="goal" style="bottom:${tg/max*100}%"></div>`:''}${ks.map(k => { const v = (D.day[k]||{}).kcal||0; return `<div class="${tg && v > tg*1.1 ? 'over':''}" style="height:${v/max*100}%" title="${fmt(v)} kcal"></div>` }).join('')}</div>
  <div class="days7">${ks.map(k => DAYS[dow(k)][0]).join('')
    .split('').map(c => `<span>${c}</span>`).join('')}</div>
  <p class="small dim" style="margin:8px 0 0">Dashed line is your target. Average ${fmt(ks.reduce((s,k)=>s+((D.day[k]||{}).kcal||0),0)/Math.max(1,ks.filter(k=>(D.day[k]||{}).n).length))} kcal on logged days.</p>`
}

A.fday = el => { const n = addDays(UI.fdate, +el.dataset.d); if (n <= today()){ UI.fdate = n; render() } }
A.copyMeal = el => {
  const m = el.dataset.meal, k = UI.fdate, src = (S.diary[addDays(k,-1)]||[]).filter(e => e.meal === m)
  S.diary[k] = [...(S.diary[k]||[]), ...src.map(e => ({...e, id:uid()}))]
  commit()
}

// default meal by time of day
function guessMeal(){ const h = new Date().getHours(); return h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snacks' }
function foodDate(){ return UI.tab === 'food' ? UI.fdate : today() }

// ---------- add food sheet ----------
let addCtx = {meal:'Lunch', mode:'lib', q:''}
A.addFood = el => { addCtx = {meal:(el && el.dataset.meal) || guessMeal(), mode:S.presets.length ? 'meals' : 'lib', q:''}; addSheet() }
function addSheet(){
  const modes = [...(S.presets.length ? [['meals','Saved meals']] : []), ['lib','Library'],['online','Search online'],['quick','Quick add'],['new','New food']]
  openSheet(`${sheetHead(`Add to ${addCtx.meal}`)}
    <button class="btn pri full" data-a="scan" data-meal="${addCtx.meal}" style="margin-bottom:10px">${IC.scan.replace('<svg','<svg class="icon"')}Scan a barcode</button>
    <div class="chips" style="margin-bottom:10px">${modes.map(([m,n]) => `<button class="chip ${addCtx.mode===m?'on':''}" data-a="addMode" data-m="${m}">${n}</button>`).join('')}</div>
    <div id="addBody"></div>`)
  addBody()
}
A.addMode = el => { addCtx.mode = el.dataset.m; document.querySelectorAll('[data-a=addMode]').forEach(c => c.classList.toggle('on', c === el)); addBody() }

function addBody(){
  const box = $('#addBody')
  if (addCtx.mode === 'meals'){
    box.innerHTML = S.presets.map(pr => { const t = presetTotals(pr); return `<div class="item" data-a="usePreset" data-id="${pr.id}"><div class="grow"><div class="t">${esc(pr.name)}</div><div class="s">${pr.items.length} items · ${fmt(t.k)} kcal · P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}</div></div><button class="x" data-a="delPreset" data-id="${pr.id}" aria-label="Delete meal">×</button></div>` }).join('')
  } else if (addCtx.mode === 'lib'){
    box.innerHTML = `<input id="fq" type="search" placeholder="Search your foods" value="${esc(addCtx.q)}" autocomplete="off"><div id="flist" style="margin-top:8px"></div>`
    const draw = () => {
      addCtx.q = $('#fq').value
      const q = addCtx.q.toLowerCase().trim()
      const fs = Object.values(S.foods).filter(f => !q || (f.name+' '+f.brand).toLowerCase().includes(q))
        .sort((a,b) => (b.last||0)-(a.last||0) || a.name.localeCompare(b.name)).slice(0,60)
      $('#flist').innerHTML = fs.map(foodRow).join('') || `<div class="empty">No match. Try <b>Search online</b> or add it as a <b>New food</b>.</div>`
    }
    $('#fq').oninput = draw; draw()
  } else if (addCtx.mode === 'online'){
    box.innerHTML = `<div class="row"><input id="oq" type="search" placeholder="e.g. Tesco chicken tikka" value="${esc(addCtx.q)}"><button class="btn pri" id="ogo">Search</button></div><div id="olist" style="margin-top:8px"><p class="small dim">Searches Open Food Facts, a free UK and worldwide product database. Results get saved to your library when you pick one.</p></div>`
    const go = () => offSearch($('#oq').value)
    $('#ogo').onclick = go; $('#oq').onkeydown = e => { if (e.key === 'Enter') go() }
  } else if (addCtx.mode === 'quick'){
    box.innerHTML = `<label for="qn">Name (optional)</label><input id="qn" placeholder="e.g. Takeaway burrito">
      <div class="grid2"><div><label for="qk">Calories</label><input id="qk" inputmode="decimal"></div><div><label for="qp">Protein g</label><input id="qp" inputmode="decimal"></div>
      <div><label for="qc">Carbs g</label><input id="qc" inputmode="decimal"></div><div><label for="qf">Fat g</label><input id="qf" inputmode="decimal"></div></div>
      <button class="btn pri full" id="qgo" style="margin-top:14px">Add</button>`
    $('#qgo').onclick = () => {
      const k = num($('#qk').value), p = num($('#qp').value), c = num($('#qc').value), f = num($('#qf').value)
      if (!k && !p && !c && !f) return toast('Add at least calories')
      const dk = foodDate()
      ;(S.diary[dk] = S.diary[dk] || []).push({id:uid(),fid:null,name:$('#qn').value.trim()||'Quick add',g:0,meal:addCtx.meal,k:k||p*4+c*4+f*9,p,c,f,fib:0})
      closeSheet(); commit()
    }
  } else foodForm(null, box)
}

const foodRow = f => `<div class="item" data-a="pickFood" data-id="${f.id}"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${f.brand?esc(f.brand)+' · ':''}${fmt(f.k)} kcal · P ${r1(f.p)} per 100g${f.sv?` · serving ${kg(f.sv)}g`:''}</div></div><div class="v" style="color:var(--acc)">+</div></div>`
A.pickFood = el => amountSheet(S.foods[el.dataset.id])

// ---------- amount ----------
// f = library food, e = existing diary entry (editing)
function amountSheet(f, e){
  const useSv = e ? false : !!f.sv
  let unit = useSv ? 'sv' : 'g', meal = e ? e.meal : addCtx.meal
  openSheet(`${sheetHead(e ? 'Edit entry' : 'How much?')}
    <h3>${esc(f.name)}</h3><p class="small dim">${f.brand?esc(f.brand)+' · ':''}per 100g: ${fmt(f.k)} kcal · P ${r1(f.p)} · C ${r1(f.c)} · F ${r1(f.f)}</p>
    <div class="row" style="align-items:end"><div class="grow"><label for="qty">Amount</label><input id="qty" inputmode="decimal" value="${e ? kg(e.g) : useSv ? 1 : 100}"></div>
    <div class="chips" style="padding-bottom:3px">${f.sv?`<button class="chip ${unit==='sv'?'on':''}" data-u="sv">${esc(f.svName||'serving')} (${kg(f.sv)}g)</button>`:''}<button class="chip ${unit==='g'?'on':''}" data-u="g">grams</button></div></div>
    <label>Meal</label><div class="chips" id="mealc">${MEALS.map(m => `<button class="chip ${m===meal?'on':''}" data-m="${m}">${m}</button>`).join('')}</div>
    <div class="card" style="margin:14px 0 0;background:var(--card2)"><div class="grid2" id="prev"></div></div>
    <div class="grid2" style="margin-top:14px">${e ? '<button class="btn danger" id="del">Remove</button>' : '<button class="btn" id="edf">Edit food</button>'}<button class="btn pri" id="ok">${e ? 'Save' : 'Add'}</button></div>`)
  const grams = () => unit === 'sv' ? num($('#qty').value)*f.sv : num($('#qty').value)
  const calc = () => { const g = grams(), m = g/100; return {g, k:f.k*m, p:f.p*m, c:f.c*m, f:f.f*m, fib:(f.fib||0)*m} }
  const prev = () => { const v = calc(); $('#prev').innerHTML = `<div><div class="num" style="font-size:26px;font-weight:800">${fmt(v.k)}</div><span class="small dim">kcal · ${kg(r1(v.g))} g</span></div><div class="small">Protein <b>${r1(v.p)}</b> g<br>Carbs <b>${r1(v.c)}</b> g<br>Fat <b>${r1(v.f)}</b> g</div>` }
  $('#qty').oninput = prev; prev()
  document.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
    const g = grams(); unit = b.dataset.u
    $('#qty').value = unit === 'sv' ? r1(g/f.sv) : r0(g)
    document.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('on', x === b)); prev()
  })
  document.querySelectorAll('#mealc .chip').forEach(b => b.onclick = () => { meal = b.dataset.m; document.querySelectorAll('#mealc .chip').forEach(x => x.classList.toggle('on', x === b)) })
  $('#ok').onclick = () => {
    const v = calc(); if (!(v.g > 0)) return toast('Enter an amount')
    const dk = e ? e.date : foodDate()
    const entry = {id:e ? e.id : uid(), fid:f.id, name:f.name + (f.brand ? ` (${f.brand})` : ''), g:r1(v.g), meal, k:r1(v.k), p:r1(v.p), c:r1(v.c), f:r1(v.f), fib:r1(v.fib)}
    const list = S.diary[dk] = S.diary[dk] || []
    const i = list.findIndex(x => x.id === entry.id)
    if (i >= 0) list[i] = entry; else list.push(entry)
    if (S.foods[f.id]){ S.foods[f.id].used = (S.foods[f.id].used||0)+1; S.foods[f.id].last = Date.now() }
    closeSheet(); commit()
  }
  if (e) $('#del').onclick = () => { S.diary[e.date] = S.diary[e.date].filter(x => x.id !== e.id); closeSheet(); commit() }
  else $('#edf').onclick = () => foodSheet(f)
}

A.editEntry = el => {
  const dk = UI.fdate, e = (S.diary[dk]||[]).find(x => x.id === el.dataset.id); if (!e) return
  const f = e.fid && S.foods[e.fid]
  if (f) return amountSheet(f, {...e, date:dk})
  // quick add entries - just tweak numbers
  openSheet(`${sheetHead('Edit entry')}<label for="en">Name</label><input id="en" value="${esc(e.name)}">
    <div class="grid2"><div><label for="ek">Calories</label><input id="ek" inputmode="decimal" value="${e.k}"></div><div><label for="ep">Protein g</label><input id="ep" inputmode="decimal" value="${e.p}"></div>
    <div><label for="ec">Carbs g</label><input id="ec" inputmode="decimal" value="${e.c}"></div><div><label for="ef">Fat g</label><input id="ef" inputmode="decimal" value="${e.f}"></div></div>
    <div class="grid2" style="margin-top:14px"><button class="btn danger" id="del">Remove</button><button class="btn pri" id="ok">Save</button></div>`)
  $('#ok').onclick = () => { Object.assign(e,{name:$('#en').value||'Quick add',k:num($('#ek').value),p:num($('#ep').value),c:num($('#ec').value),f:num($('#ef').value)}); closeSheet(); commit() }
  $('#del').onclick = () => { S.diary[dk] = S.diary[dk].filter(x => x.id !== e.id); closeSheet(); commit() }
}

// ---------- food form (new / edit) ----------
function foodForm(f, box, code){
  f = f || {name:'',brand:'',code:code||'',k:'',p:'',c:'',f:'',fib:'',sv:'',svName:'serving'}
  let per = 'g'
  box.innerHTML = `
    <label for="fn">Name</label><input id="fn" value="${esc(f.name)}" placeholder="e.g. Protein yoghurt">
    <div class="grid2"><div><label for="fb">Brand</label><input id="fb" value="${esc(f.brand)}"></div><div><label for="fcode">Barcode</label><input id="fcode" inputmode="numeric" value="${esc(f.code)}"></div>
    <div><label for="fsv">Serving size (g)</label><input id="fsv" inputmode="decimal" value="${f.sv||''}" placeholder="optional"></div><div><label for="fsn">Serving name</label><input id="fsn" value="${esc(f.svName||'serving')}"></div></div>
    <label>Nutrition values are</label><div class="chips"><button class="chip on" data-per="g">Per 100g</button><button class="chip" data-per="sv">Per serving</button></div>
    <div class="grid2"><div><label for="fk">Calories</label><input id="fk" inputmode="decimal" value="${f.k}"></div><div><label for="fp">Protein g</label><input id="fp" inputmode="decimal" value="${f.p}"></div>
    <div><label for="fc">Carbs g</label><input id="fc" inputmode="decimal" value="${f.c}"></div><div><label for="ff">Fat g</label><input id="ff" inputmode="decimal" value="${f.f}"></div>
    <div><label for="ffib">Fibre g</label><input id="ffib" inputmode="decimal" value="${f.fib}"></div></div>
    <div class="grid2" style="margin-top:14px">${f.id ? '<button class="btn danger" id="fdel">Delete</button>' : '<span></span>'}<button class="btn pri" id="fsave">Save food</button></div>`
  box.querySelectorAll('[data-per]').forEach(b => b.onclick = () => { per = b.dataset.per; box.querySelectorAll('[data-per]').forEach(x => x.classList.toggle('on', x === b)) })
  $('#fsave').onclick = () => {
    const name = $('#fn').value.trim(); if (!name) return toast('Give it a name')
    const sv = num($('#fsv').value)
    if (per === 'sv' && !sv) return toast('Add the serving size in grams')
    const m = per === 'sv' ? 100/sv : 1
    const nf = {...f, id:f.id || uid(), name, brand:$('#fb').value.trim(), code:$('#fcode').value.trim(),
      k:r1(num($('#fk').value)*m), p:r1(num($('#fp').value)*m), c:r1(num($('#fc').value)*m), f:r1(num($('#ff').value)*m), fib:r1(num($('#ffib').value)*m),
      sv:sv||0, svName:$('#fsn').value.trim()||'serving', src:f.src||'custom', scanned:f.scanned||!!code, used:f.used||0, last:Date.now()}
    S.foods[nf.id] = nf; save(); D = derive(S)
    commit({noRender:true, quiet:true}); render()
    amountSheet(nf)
  }
  if (f.id) $('#fdel').onclick = () => confirmSheet(`Delete <b>${esc(f.name)}</b> from your library? Past diary entries stay.`, 'Delete', () => { delete S.foods[f.id]; commit() })
}
function foodSheet(f, code){ openSheet(`${sheetHead(f ? 'Edit food' : 'New food')}<div id="ffBox"></div>`); foodForm(f, $('#ffBox'), code) }

A.library = () => {
  openSheet(`${sheetHead('Food library', '<button class="btn sm" data-a="newFood">+ New</button>')}<input id="lq" type="search" placeholder="Search"><div id="llist" style="margin-top:8px"></div>`)
  const draw = () => {
    const q = $('#lq').value.toLowerCase()
    $('#llist').innerHTML = Object.values(S.foods).filter(f => (f.name+' '+f.brand).toLowerCase().includes(q)).sort((a,b) => a.name.localeCompare(b.name))
      .map(f => `<div class="item" data-a="editFood" data-id="${f.id}"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${f.brand?esc(f.brand)+' · ':''}${fmt(f.k)} kcal · P ${r1(f.p)} · C ${r1(f.c)} · F ${r1(f.f)}${f.src==='starter'?' · starter value, check label':''}</div></div></div>`).join('')
  }
  $('#lq').oninput = draw; draw()
}
A.editFood = el => foodSheet(S.foods[el.dataset.id])
A.newFood = () => foodSheet(null)

// ---------- open food facts ----------
function offToFood(p, code){
  const n = p.nutriments || {}
  let k = n['energy-kcal_100g']
  if (k == null && n['energy-kj_100g'] != null) k = n['energy-kj_100g']/4.184
  if (k == null && n['energy_100g'] != null) k = n['energy_100g']/4.184
  if (k == null) return null
  const name = (p.product_name_en || p.product_name || '').trim()
  if (!name) return null
  return {id:uid(), name, brand:(p.brands||'').split(',')[0].trim(), code:code||p.code||'',
    k:r1(k), p:r1(n.proteins_100g||0), c:r1(n.carbohydrates_100g||0), f:r1(n.fat_100g||0), fib:r1(n.fiber_100g||0),
    sv:r1(num(p.serving_quantity)) || 0, svName:'serving', src:'off', used:0, last:Date.now()}
}
async function offLookup(code){
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_en,brands,nutriments,serving_quantity`)
  if (!r.ok) return null
  const j = await r.json()
  return j.status === 1 && j.product ? offToFood(j.product, code) : null
}
let offHits = []
async function offSearch(q){
  q = q.trim(); if (!q) return
  addCtx.q = q
  const box = $('#olist'); box.innerHTML = '<p class="dim">Searching…</p>'
  try {
    const r = await fetch(`https://uk.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=code,product_name,product_name_en,brands,nutriments,serving_quantity`)
    const j = await r.json()
    offHits = (j.products||[]).map(p => offToFood(p)).filter(Boolean)
    box.innerHTML = offHits.map((f,i) => `<div class="item" data-a="pickOff" data-i="${i}"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${f.brand?esc(f.brand)+' · ':''}${fmt(f.k)} kcal · P ${r1(f.p)} · C ${r1(f.c)} · F ${r1(f.f)} /100g</div></div><div class="v" style="color:var(--acc)">+</div></div>`).join('') || '<div class="empty">Nothing found. Try fewer words, or add it as a New food.</div>'
  } catch(e){ box.innerHTML = '<div class="empty">Couldn\'t reach the database. Are you offline?</div>' }
}
A.pickOff = el => {
  const f = offHits[+el.dataset.i]
  const dup = f.code && Object.values(S.foods).find(x => x.code === f.code)
  const keep = dup || f
  if (!dup) S.foods[f.id] = f
  save(); amountSheet(keep)
}

// ---------- scanner ----------
let scanStop = null
A.scan = el => {
  if (el && el.dataset.meal) addCtx.meal = el.dataset.meal
  else if (!$('#addBody')) addCtx = {meal:guessMeal(), mode:'lib', q:''}
  openSheet(`${sheetHead('Scan barcode')}
    <div class="scan"><video id="vid" playsinline muted></video><div class="frame"></div><div class="laser"></div></div>
    <p class="small dim" id="scanMsg" style="margin:10px 0">Point the camera at the barcode.</p>
    <div class="row"><input id="mcode" inputmode="numeric" placeholder="Or type the barcode number"><button class="btn" id="mgo">Look up</button></div>`, () => scanStop && scanStop())
  $('#mgo').onclick = () => { const c = $('#mcode').value.replace(/\D/g,''); if (c) gotCode(c) }
  startCamera()
}

async function startCamera(){
  const vid = $('#vid'), msg = $('#scanMsg')
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ msg.textContent = 'Camera not available here. Type the number instead.'; return }
  let stream, alive = true, zx = null
  scanStop = () => { alive = false; stream && stream.getTracks().forEach(t => t.stop()); zx && zx.reset(); scanStop = null }
  try {
    if ('BarcodeDetector' in window){
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})
      if (!alive) return stream.getTracks().forEach(t => t.stop())
      vid.srcObject = stream; await vid.play()
      const det = new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']})
      const loop = async () => {
        if (!alive) return
        try { const r = await det.detect(vid); if (r.length && alive){ const c = r[0].rawValue; scanStop(); return gotCode(c) } } catch(e){}
        setTimeout(loop, 180)
      }
      loop()
    } else {
      // older browsers - pull zxing from cdn
      msg.textContent = 'Loading scanner…'
      if (!window.ZXing) await new Promise((ok,bad) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'; s.onload = ok; s.onerror = bad; document.head.appendChild(s) })
      if (!alive) return
      zx = new ZXing.BrowserMultiFormatReader()
      msg.textContent = 'Point the camera at the barcode.'
      zx.decodeFromConstraints({video:{facingMode:{ideal:'environment'}}}, vid, res => { if (res && alive){ const c = res.getText(); scanStop(); gotCode(c) } })
    }
  } catch(e){
    msg.textContent = e && e.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow it in Chrome site settings, or type the number.' : 'Couldn\'t start the camera. Type the number instead.'
  }
}

async function gotCode(code){
  buzz(40)
  const have = Object.values(S.foods).find(f => f.code === code)
  if (have) return amountSheet(have)
  const msg = $('#scanMsg'); if (msg) msg.textContent = `Found ${code}, looking it up…`
  let f = null
  try { f = await offLookup(code) } catch(e){
    if (msg) msg.textContent = 'Couldn\'t reach the database. Check your connection.'
    return
  }
  if (f){ f.scanned = true; S.foods[f.id] = f; save(); D = derive(S); amountSheet(f); commit({noRender:true, quiet:true}); render() }
  else { foodSheet(null, code); toast('Not in the database yet. Add it once and it\'s saved for next time.') }
}

// ---------- saved meals ----------
// items keep a snapshot, but use the library food if it still exists so edits carry over
function presetItems(pr){
  return pr.items.map(it => {
    const f = it.fid && S.foods[it.fid]
    if (!f || !it.g) return {...it}
    const m = it.g/100
    return {...it, k:r1(f.k*m), p:r1(f.p*m), c:r1(f.c*m), f:r1(f.f*m), fib:r1((f.fib||0)*m)}
  })
}
const presetTotals = pr => presetItems(pr).reduce((a,e) => ({k:a.k+e.k,p:a.p+e.p,c:a.c+e.c,f:a.f+e.f}), {k:0,p:0,c:0,f:0})

A.savePreset = el => {
  const m = el.dataset.meal, es = (S.diary[UI.fdate]||[]).filter(e => e.meal === m)
  openSheet(`${sheetHead('Save as meal')}<p class="small dim">${es.map(e => esc(e.name)).join(', ')}</p>
    <label for="pn">Name</label><input id="pn" placeholder="e.g. Usual breakfast"><button class="btn pri full" id="ps" style="margin-top:14px">Save</button>`)
  $('#pn').focus()
  $('#ps').onclick = () => {
    const name = $('#pn').value.trim(); if (!name) return toast('Name it')
    S.presets.push({id:uid(), name, items:es.map(e => ({fid:e.fid, name:e.name, g:e.g, k:e.k, p:e.p, c:e.c, f:e.f, fib:e.fib||0}))})
    closeSheet(); commit({quiet:true}); toast(`Saved <b>${esc(name)}</b>`)
  }
}
A.usePreset = (el, ev) => {
  if (ev.target.closest('[data-a=delPreset]')) return
  const pr = S.presets.find(p => p.id === el.dataset.id); if (!pr) return
  const dk = foodDate()
  S.diary[dk] = [...(S.diary[dk]||[]), ...presetItems(pr).map(it => ({...it, id:uid(), meal:addCtx.meal}))]
  closeSheet(); commit()
}
A.delPreset = (el, ev) => {
  ev.stopPropagation()
  const pr = S.presets.find(p => p.id === el.dataset.id)
  confirmSheet(`Delete the saved meal <b>${esc(pr.name)}</b>?`, 'Delete', () => { S.presets = S.presets.filter(p => p !== pr); commit({quiet:true}) })
}
