// phone health data - only works inside the android app build (capacitor)

const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform())
const capPlugin = n => NATIVE ? (Capacitor.Plugins[n] || Capacitor.registerPlugin(n)) : null
const HC = capPlugin('HealthPlugin')

let hcBusy = false
async function hcSync(ask){
  if (!HC || hcBusy) return
  hcBusy = true
  try {
    const {available} = await HC.isHealthAvailable()
    if (!available){ if (ask){ toast('Health Connect isn\'t on this phone'); HC.showHealthConnectInPlayStore() } return }
    if (ask) await HC.requestHealthPermissions({permissions:['READ_STEPS','READ_ACTIVE_CALORIES']})
    const start = toDate(addDays(today(), -6)), end = new Date()
    const q = t => HC.queryAggregated({startDate:start.toISOString(), endDate:end.toISOString(), dataType:t, bucket:'day'}).then(r => r.aggregatedData || []).catch(() => [])
    const [st, ac] = await Promise.all([q('steps'), q('active-calories')])
    let changed = false
    const put = (arr, key) => arr.forEach(x => {
      const k = dkey(new Date(x.startDate)), v = Math.round(x.value || 0)
      const a = S.activity[k] = S.activity[k] || {}
      if (v && a[key] !== v){ a[key] = v; a.src = 'hc'; changed = true }
    })
    put(st, 'steps'); put(ac, 'active')
    S.settings.hc = 1; S.settings.hcAt = Date.now()
    if (changed || ask) commit({quiet:!ask})
    else save()
    if (ask) toast(st.length ? 'Phone data synced' : 'Connected. No steps recorded yet.')
  } catch(e){
    if (ask) toast('Couldn\'t read Health Connect. Check its permissions.')
  } finally { hcBusy = false }
}

function healthCard(){
  if (!NATIVE) return `<div class="card"><h2>Phone health data</h2><p class="small dim" style="margin:0">Steps and active calories sync on their own in the Android app. In the browser, tap the rings on Home to add them.</p></div>`
  const on = S.settings.hc, ago = S.settings.hcAt ? Math.round((Date.now() - S.settings.hcAt)/60000) : null
  return `<div class="card"><h2>Phone health data</h2>
    <p class="small dim">${on ? `Connected to Health Connect. Last sync ${ago == null ? 'never' : ago < 1 ? 'just now' : ago + ' min ago'}.` : 'Pull steps and active calories from Health Connect, which collects them from your phone and watch.'}</p>
    <div class="grid2">${on ? `<button class="btn pri" data-a="hcSync">Sync now</button><button class="btn" data-a="hcOpen">Permissions</button>` : `<button class="btn pri" data-a="hcSync" style="grid-column:1/-1">Connect Health Connect</button>`}</div></div>`
}
A.hcSync = () => hcSync(true)
A.hcOpen = () => HC && HC.openHealthConnectSettings()

if (NATIVE){
  addEventListener('DOMContentLoaded', () => { if (S.settings.hc) hcSync(false) })
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.settings.hc) hcSync(false) })
}

// file export in the app - webview can't download, so share it instead
async function nativeExport(json, name){
  const FS = capPlugin('Filesystem'), SH = capPlugin('Share')
  const r = await FS.writeFile({path:name, data:json, directory:'CACHE', encoding:'utf8'})
  await SH.share({title:'Forge backup', url:r.uri, dialogTitle:'Save backup'})
}
