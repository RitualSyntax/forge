// progress photos - indexeddb, never leave the phone

const POSES = ['Front','Side','Back','Flexed']
let pdbP = null
const pdb = () => pdbP || (pdbP = new Promise((ok, bad) => {
  const r = indexedDB.open('forge-photos', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath:'id'})
  r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error)
}))
const ptx = async (mode, fn) => { const db = await pdb(); return new Promise((ok, bad) => { const tx = db.transaction('p', mode); const q = fn(tx.objectStore('p')); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => bad(tx.error) }) }
const pAll = async () => ((await ptx('readonly', s => s.getAll())) || []).sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.t - b.t)
const pPut = o => ptx('readwrite', s => s.put(o))
const pDel = id => ptx('readwrite', s => s.delete(id))

let photos = [], urls = {}
const purl = p => urls[p.id] || (urls[p.id] = URL.createObjectURL(p.blob))

function photoCard(){
  return `<div class="card"><div class="row between"><h3>Progress photos</h3><button class="btn sm" data-a="addPhoto">+ Add</button></div>
    <p class="small dim" style="margin:6px 0 10px">Same spot, same light, every 2–4 weeks. Stored on this phone only.</p>
    <div id="photos" class="phgrid"></div><div id="phCmp"></div>
    <input type="file" id="phFile" accept="image/*" hidden></div>`
}

async function loadPhotos(){
  const box = $('#photos'); if (!box) return
  try { photos = await pAll() } catch(e){ box.innerHTML = '<div class="empty">Photo storage isn\'t available in this browser.</div>'; return }
  if (S.photoCount !== photos.length){ S.photoCount = photos.length; commit({noRender:true, quiet:true}) }
  if (!$('#photos')) return
  $('#photos').innerHTML = photos.slice(-9).reverse().map(p => `<button class="ph" data-a="viewPhoto" data-id="${p.id}"><img src="${purl(p)}" alt="${esc(p.pose)} photo ${esc(p.date)}"><span class="mono">${esc(niceDate(p.date))} · ${esc(p.pose)}</span></button>`).join('') || '<div class="empty" style="grid-column:1/-1">No photos yet</div>'
  $('#phCmp').innerHTML = photos.length > 1 ? `<button class="btn full" data-a="comparePhotos" style="margin-top:10px">Compare</button>` : ''
  $('#phFile').onchange = gotPhoto
}

A.addPhoto = () => $('#phFile').click()

async function shrink(file){
  const bmp = await createImageBitmap(file, {imageOrientation:'from-image'})
  const sc = Math.min(1, 1400/Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width*sc); c.height = Math.round(bmp.height*sc)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', .85))
}

async function gotPhoto(e){
  const f = e.target.files[0]; e.target.value = ''
  if (!f) return
  let blob
  try { blob = await shrink(f) } catch(err){ return toast('Couldn\'t read that image') }
  const url = URL.createObjectURL(blob); let pose = 'Front'
  openSheet(`${sheetHead('New photo')}<img src="${url}" style="width:100%;max-height:50vh;object-fit:contain;border:1px solid var(--line)" alt="">
    <label>Pose</label><div class="chips" id="pp">${POSES.map((p,i) => `<button class="chip ${i?'':'on'}" data-p="${p}">${p}</button>`).join('')}</div>
    <label for="pd">Date</label><input id="pd" type="date" value="${today()}" max="${today()}">
    <button class="btn pri full" id="psv" style="margin-top:14px">Save photo</button>`, () => URL.revokeObjectURL(url))
  document.querySelectorAll('#pp .chip').forEach(b => b.onclick = () => { pose = b.dataset.p; document.querySelectorAll('#pp .chip').forEach(x => x.classList.toggle('on', x === b)) })
  $('#psv').onclick = async () => {
    try { await pPut({id:uid(), date:$('#pd').value || today(), pose, t:Date.now(), blob}) } catch(err){ return toast('Storage full?') }
    closeSheet(); toast('Photo saved'); render()
  }
}

// weight + waist near a date, for context
function bodyAt(k){
  const tr = D.trend, tk = Object.keys(tr).sort().filter(x => x <= k).pop()
  const mk = Object.keys(S.measures).sort().filter(x => x <= k && S.measures[x].waist).pop()
  return [tk ? `${r1(tr[tk])} kg` : '', mk ? `waist ${r1(S.measures[mk].waist)} cm` : ''].filter(Boolean).join(' · ')
}

A.viewPhoto = el => {
  const p = photos.find(x => x.id === el.dataset.id); if (!p) return
  openSheet(`${sheetHead(esc(p.pose))}<img src="${purl(p)}" style="width:100%;border:1px solid var(--line)" alt="">
    <p class="mono dim" style="margin:10px 0">${esc(niceDate(p.date))}${bodyAt(p.date) ? ' · ' + bodyAt(p.date) : ''}</p>
    <button class="btn full danger" id="pdel">Delete photo</button>`)
  $('#pdel').onclick = () => confirmSheet('Delete this photo for good?', 'Delete', async () => { await pDel(p.id); URL.revokeObjectURL(urls[p.id]); delete urls[p.id]; render() })
}

A.comparePhotos = () => {
  const poses = POSES.filter(po => photos.filter(p => p.pose === po).length > 1)
  let pose = poses[0] || null
  const list = () => pose ? photos.filter(p => p.pose === pose) : photos
  const opts = (sel) => list().map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(niceDate(p.date))} · ${esc(p.pose)}</option>`).join('')
  const draw = () => {
    const l = list(), a = l[0], b = l[l.length-1]
    $('#cmpBody').innerHTML = `<div class="grid2"><div><label for="ca">Before</label><select id="ca">${opts(a.id)}</select></div><div><label for="cb">After</label><select id="cb">${opts(b.id)}</select></div></div>
      <div class="cmp noswipe" id="cmpBox"><img id="ciA" alt="Before"><img id="ciB" alt="After"><div class="cmpline" id="cline"></div></div>
      <input type="range" id="cr" min="0" max="100" value="50" style="margin-top:8px">
      <div class="row between mono dim" style="margin-top:4px"><span id="cta"></span><span id="ctb"></span></div>`
    const upd = () => {
      const pa = photos.find(p => p.id === $('#ca').value), pb = photos.find(p => p.id === $('#cb').value)
      $('#ciA').src = purl(pa); $('#ciB').src = purl(pb)
      $('#cta').textContent = bodyAt(pa.date) || niceDate(pa.date); $('#ctb').textContent = bodyAt(pb.date) || niceDate(pb.date)
    }
    const slide = () => { const v = $('#cr').value; $('#ciB').style.clipPath = `inset(0 0 0 ${v}%)`; $('#cline').style.left = v + '%' }
    $('#ca').onchange = upd; $('#cb').onchange = upd; $('#cr').oninput = slide
    upd(); slide()
  }
  openSheet(`${sheetHead('Compare')}${poses.length > 1 ? `<div class="chips" id="cpose" style="margin-bottom:6px">${poses.map(p => `<button class="chip ${p===pose?'on':''}" data-p="${p}">${p}</button>`).join('')}</div>` : ''}<div id="cmpBody"></div>
    <p class="small dim" style="margin:8px 0 0">Drag the slider to wipe between them.</p>`)
  document.querySelectorAll('#cpose .chip').forEach(b => b.onclick = () => { pose = b.dataset.p; document.querySelectorAll('#cpose .chip').forEach(x => x.classList.toggle('on', x === b)); draw() })
  draw()
}
