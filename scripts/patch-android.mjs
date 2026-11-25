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
const widget = `
        <receiver android:name=".ForgeWidget" android:exported="false" android:label="Forge">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/forge_widget_info" />
        </receiver>
`
// forge://log?d=... so grimoire can send meals in
const deep = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="forge" />
            </intent-filter>`
if (!m.includes('android:scheme="forge"')) m = m.replace(/(<category android:name="android\.intent\.category\.LAUNCHER" \/>\s*<\/intent-filter>)/, '$1' + deep)
if (!m.includes('PermissionsRationaleActivity')) m = m.replace('</application>', acts + '    </application>')
if (!m.includes('ForgeWidget')) m = m.replace('</application>', widget + '    </application>')
writeFileSync(mf, m)

// health connect needs 26+
const vg = 'android/variables.gradle'
writeFileSync(vg, readFileSync(vg, 'utf8').replace(/minSdkVersion = \d+/, 'minSdkVersion = 26'))

// version from the CI run so updates install over the top
const run = process.env.GITHUB_RUN_NUMBER || '1'
const bg = 'android/app/build.gradle'
writeFileSync(bg, readFileSync(bg, 'utf8').replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "1.${run}"`))

// our icons, widget layouts + java (mainactivity, widget) over the capacitor ones
cpSync('android-res/res', join(main, 'res'), {recursive:true})
cpSync('android-res/java', join(main, 'java'), {recursive:true})

// black splash everywhere
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
for (const p of walk(join(main, 'res'))) if (p.endsWith('splash.png')) cpSync('android-res/splash.png', p)

console.log('android patched')
