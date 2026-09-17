import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

const calls = []
page.on('request', (r) => { if (r.url().includes('/gl-api')) calls.push(r.url()) })

await page.goto('http://localhost:5174/about', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
const body = await page.locator('main').innerText()
console.log('landing shows showcase bounties:', /Audit a landing page/.test(body) && /Write a beginner GenLayer guide/.test(body))
console.log('landing contract calls:', calls.length, calls.length === 0 ? '(no live fetch)' : '(LIVE FETCH PRESENT)')
await page.screenshot({ path: 'shot-landing.png', fullPage: true })

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const nav = (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ')
console.log('')
console.log('nav:', nav.slice(0, 90))
console.log('renamed to Submissions:', /Submissions/.test(nav) && !/Submit work/.test(nav))
console.log('')
console.log('console errors:', errors.length)
for (const e of errors.slice(0, 5)) console.log('  !', e.slice(0, 150))
await browser.close()