// Independent Windows-native build of the shared browser_MCP source tree.
// Keeping one source of truth avoids the perception logic drifting between the
// normal extension and the Windows-actuated variant.
import * as esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const shared = path.resolve(here, '../browser_MCP')
const watch = process.argv.includes('--watch')
const productionFallback = 'http://49.234.181.190:58150'
const localTest = /^(1|true|yes)$/i.test(process.env.HEYSURE_LOCAL_TEST || '')
const distName = localTest ? 'dist-local' : 'dist'
const dist = path.resolve(here, distName)
const explicitServerUrl = String(process.env.VITE_HEYSURE_SERVER || process.env.HEYSURE_SERVER || '').trim().replace(/\/+$/, '')
let deviceConfig = {}
try { deviceConfig = JSON.parse(fs.readFileSync(path.resolve(here, '../../device.config.json'), 'utf8')) } catch {}
const profileServerUrl = localTest
  ? (deviceConfig.local_test_server_url || 'http://127.0.0.1:3000')
  : (deviceConfig.default_server_url || productionFallback)
const defaultServerUrl = explicitServerUrl || profileServerUrl
const forceServerUrl = localTest || Boolean(explicitServerUrl)

const entries = [
  ['src/background.ts', 'background.js'],
  ['src/content/index.ts', 'content.js'],
  ['src/shadow-patch.ts', 'shadow-patch.js'],
  ['src/popup/index.ts', 'popup.js'],
  ['src/offline-chat.ts', 'offline-chat.js'],
  ['src/offscreen.ts', 'offscreen.js'],
]

const options = {
  bundle: true,
  minify: false,
  platform: 'browser',
  target: 'chrome119',
  format: 'iife',
  nodePaths: [path.resolve(here, 'node_modules'), path.resolve(shared, 'node_modules')],
  define: {
    'process.env.NODE_ENV': '"production"',
    '__HEYSURE_WINDOWS_NATIVE_INPUT__': 'true',
    '__HEYSURE_DEFAULT_SERVER_URL__': JSON.stringify(defaultServerUrl),
    '__HEYSURE_FORCE_SERVER_URL__': JSON.stringify(forceServerUrl),
  },
  logOverride: { 'unsupported-require-call': 'silent' },
}

function copyStatic() {
  fs.mkdirSync(dist, { recursive: true })
  fs.copyFileSync(path.resolve(here, 'manifest.json'), path.resolve(dist, 'manifest.json'))
  for (const name of ['icons', 'cursors', 'src']) {
    const from = path.resolve(shared, name)
    const to = path.resolve(dist, name)
    fs.rmSync(to, { recursive: true, force: true })
    fs.cpSync(from, to, { recursive: true })
  }
  const html = (name, script) => fs.readFileSync(path.resolve(shared, name), 'utf8')
    .replace(new RegExp(`dist/${script}`, 'g'), script)
  fs.writeFileSync(path.resolve(dist, 'popup.html'), html('popup.html', 'popup.js'))
  fs.writeFileSync(path.resolve(dist, 'offline-chat.html'), html('offline-chat.html', 'offline-chat.js'))
  fs.writeFileSync(path.resolve(dist, 'offscreen.html'), html('offscreen.html', 'offscreen.js'))
}

fs.mkdirSync(dist, { recursive: true })
if (watch) {
  const ctx = await esbuild.context({
    ...options,
    entryPoints: Object.fromEntries(entries.map(([input, output]) => [
      output.replace(/\.js$/, ''),
      path.resolve(shared, input),
    ])),
    outdir: dist,
    entryNames: '[name]',
  })
  copyStatic()
  await ctx.watch()
  console.log('[browser_MCP_win] watching shared browser_MCP sources…')
} else {
  for (const [input, output] of entries) {
    await esbuild.build({
      ...options,
      entryPoints: [path.resolve(shared, input)],
      outfile: path.resolve(dist, output),
    })
    console.log(`  built ${input} -> ${distName}/${output}`)
  }
  copyStatic()
  console.log('[browser_MCP_win] build complete')
}
