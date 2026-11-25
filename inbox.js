// meals sent over from grimoire. apk gets forge://log?d=..., web version gets ?log=...
const INBOX_SEEN = 'forge.inboxSeen'

function inboxTake(d){
  let e
  try { e = JSON.parse(decodeURIComponent(escape(atob(d.replace(/-/g,'+').replace(/_/g,'/'))))) } catch(err){ return }
  if (!e || !e.id || !e.name) return
  // launch url + appUrlOpen can both fire, don't double log
  const seen = JSON.parse(localStorage.getItem(INBOX_SEEN) || '[]')
  if (seen.includes(e.id)) return
  const k = /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : today()
  const meal = MEALS.includes(e.meal) ? e.meal : 'Snacks'
  ;(S.diary[k] = S.diary[k] || []).push({id:uid(), fid:null, name:String(e.name).slice(0,80), g:0, meal,
    k:num(e.k), p:num(e.p), c:num(e.c), f:num(e.f), fib:num(e.fib)})
  localStorage.setItem(INBOX_SEEN, JSON.stringify([...seen, e.id].slice(-50)))
  UI.tab = 'food'; UI.fdate = k
  commit()
  toast(`<b>Logged</b> ${esc(e.name)} from Grimoire`)
}

function inboxUrl(u){
  const m = String(u || '').match(/[?&](?:d|log)=([^&#]+)/)
  if (m) inboxTake(decodeURIComponent(m[1]))
}

addEventListener('DOMContentLoaded', () => {
  const native = window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()
  const app = native && (Capacitor.Plugins.App || Capacitor.registerPlugin('App'))
  if (app){
    app.addListener('appUrlOpen', e => inboxUrl(e.url))
    app.getLaunchUrl().then(r => r && inboxUrl(r.url)).catch(() => {})
  } else if (/[?&]log=/.test(location.search)){
    inboxUrl(location.search)
    history.replaceState(null, '', location.pathname)
  }
})
