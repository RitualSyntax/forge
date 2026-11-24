// after `cap add android` - health connect bits, icons, min sdk, version
import {readFileSync, writeFileSync, cpSync, existsSync, readdirSync, statSync} from 'node:fs'
import {join} from 'node:path'

const main = 'android/app/src/main'
const mf = join(main, 'AndroidManifest.xml')
let m = readFileSync(mf, 'utf8')

const perms = `
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <queries>
        <package android:name="com.google.android.apps.healthdata" />
    </queries>
`
const acts = `
        <activity
            android:name="com.fit_up.health.capacitor.PermissionsRationaleActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity="com.fit_up.health.capacitor.PermissionsRationaleActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
`
if (!m.includes('READ_STEPS')) m = m.replace('</manifest>', perms + '</manifest>')
if (!m.includes('PermissionsRationaleActivity')) m = m.replace('</application>', acts + '    </application>')
writeFileSync(mf, m)

// health connect needs 26+
const vg = 'android/variables.gradle'
writeFileSync(vg, readFileSync(vg, 'utf8').replace(/minSdkVersion = \d+/, 'minSdkVersion = 26'))

// version from the CI run so updates install over the top
const run = process.env.GITHUB_RUN_NUMBER || '1'
const bg = 'android/app/build.gradle'
writeFileSync(bg, readFileSync(bg, 'utf8').replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "1.${run}"`))

// our icons over the capacitor ones
cpSync('android-res/res', join(main, 'res'), {recursive:true})

// black splash everywhere
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
for (const p of walk(join(main, 'res'))) if (p.endsWith('splash.png')) cpSync('android-res/splash.png', p)

console.log('android patched')
