// copy the web app into www/ for capacitor
import {cpSync, rmSync, mkdirSync} from 'node:fs'
const files = ['index.html','styles.css','manifest.webmanifest','sw.js','data.js','calc.js','app.js','food.js','train.js','body.js','plan.js','checkin.js','photos.js','health.js']
rmSync('www', {recursive:true, force:true}); mkdirSync('www')
for (const f of files) cpSync(f, 'www/' + f)
for (const d of ['fonts','icons']) cpSync(d, 'www/' + d, {recursive:true})
console.log('www ready')
