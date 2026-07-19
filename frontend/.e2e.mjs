/** End-to-end: load the editor against the real backend, click Export, wait for the MP4. */
import { openBrowser } from '@remotion/renderer'

const BASE = process.argv[2] ?? 'http://localhost:5199'
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } })
const page = await browser.newPage({ context: null, logLevel: 'error', indent: false, pageIndex: 0 })

const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console.error: ' + m.text())
})

await page.goto({ url: `${BASE}/editor?url=linear.app`, timeout: 30000, studio: false })

const readState = () =>
  page.evaluate(() => {
    const btn = document.querySelector('.editor__export')
    return {
      label: btn ? btn.textContent.trim() : null,
      tag: btn ? btn.tagName : null,
      disabled: btn ? btn.disabled === true : null,
      href: btn && btn.tagName === 'A' ? btn.getAttribute('href') : null,
      mock: Boolean(document.querySelector('.editor__pill')),
      canvases: document.querySelectorAll('canvas').length,
    }
  })

// Wait for the pipeline to finish so Export becomes enabled.
let s
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 1000))
  s = await readState()
  if (s.disabled === false) break
}
console.log('after pipeline:', JSON.stringify(s))

if (s.mock) {
  console.log('FAIL: still on mock data — backend not reachable through the proxy')
  process.exit(1)
}
if (s.disabled !== false) {
  console.log('FAIL: Export never became enabled')
  process.exit(1)
}

await page.evaluate(() => document.querySelector('.editor__export').click())

for (let i = 0; i < 90; i++) {
  await new Promise((r) => setTimeout(r, 2000))
  s = await readState()
  if (s.tag === 'A' && s.href) break
  if (i % 5 === 0) console.log('  ...', s.label)
}

console.log('final:', JSON.stringify(s))
console.log(errors.length ? 'JS ERRORS:\n  ' + errors.join('\n  ') : 'no JS errors')

await browser.close({ silent: true })
process.exit(s.tag === 'A' && s.href ? 0 : 1)
