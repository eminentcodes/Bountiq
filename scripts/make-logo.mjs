import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chromium' })
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.setContent((await import('node:fs')).readFileSync('demo/logo.html', 'utf8'))
await p.waitForTimeout(1200)
await p.screenshot({ path: 'demo/bountiq-logo-512.png', omitBackground: true })
await b.close()
console.log('logo written')