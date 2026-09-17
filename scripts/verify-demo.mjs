// Drives the complete Bountiq loop in a real browser against Studionet.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5174'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
const step = (n, msg) => console.log(`[${n}] ${msg}`)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
step(1, 'landing rendered: ' + ((await page.getByText('Good work deserves').count()) > 0))

await page.getByRole('button', { name: /Enter marketplace/i }).click()
await page.waitForTimeout(4500)

// ---- connect a wallet through the UI ----
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(700)
await page.screenshot({ path: 'shot-2-wallet-open.png' })
await page.getByRole('button', { name: /Demo wallet/i }).click()
await page.waitForTimeout(2500)
const nav = (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ')
step(2, 'nav after connect: ' + nav.slice(0, 120))
await page.screenshot({ path: 'shot-3-connected.png' })
await page.keyboard.press('Escape')

const rows = page.locator('main button').filter({ hasText: /GEN/ })
const rowCount = await rows.count()
step(3, `marketplace rows: ${rowCount}`)

await rows.first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'shot-4-submit.png', fullPage: true })

const submitVisible = await page.getByRole('button', { name: /Submit for review/i }).count()
step(4, 'submit button available: ' + (submitVisible > 0))

await page.locator('textarea').fill(
  'Three friction points from first-run onboarding. First, the landing page headline describes the product rather than the outcome, so a new user cannot tell what changes for them; to reproduce, open the site in a private window and read only the hero. Second, the nine-tile feature grid has no ordering, so a newcomer does not know where to start; to reproduce, count how many tiles you would click before finding setup instructions. Third, the page never states time-to-first-call, so the cost of trying is unknown; to reproduce, look for any setup time near the primary button. Priority order: headline first because it blocks comprehension for every visitor, then the grid because it blocks activation, then the missing time estimate because it only affects the final decision.'
)
await page.getByRole('button', { name: /Submit for review/i }).click()
step(5, 'submitted, waiting for validator consensus...')
await page.waitForTimeout(2000)
await page.screenshot({ path: 'shot-5-evaluating.png', fullPage: true })

let verdict = null
for (let i = 0; i < 100; i++) {
  await page.waitForTimeout(3000)
  const heading = (await page.locator('h2').allInnerTexts()).join(' | ')
  if (/Submission approved|Revision required|Submission rejected/.test(heading)) { verdict = heading; break }
  if (i % 5 === 0 && i > 0) step(5, `  ...still evaluating (${i * 3}s)`)
}

step(6, 'verdict: ' + verdict)
await page.waitForTimeout(800)
await page.screenshot({ path: 'shot-6-verdict.png', fullPage: true })

const body = (await page.locator('main').innerText()).split('\n').filter(Boolean)
console.log('')
console.log(body.slice(0, 26).join('\n'))

// ---- disconnect ----
await page.locator('nav').first().getByRole('button', { name: /0x/i }).first().click().catch(() => {})
await page.waitForTimeout(700)
const disconnect = page.getByRole('button', { name: /Disconnect/i })
if (await disconnect.count()) {
  await disconnect.first().click()
  await page.waitForTimeout(1200)
  const after = (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ')
  step(7, 'nav after disconnect: ' + after.slice(0, 120))
} else {
  step(7, 'disconnect control not found')
}

console.log('')
console.log('console errors:', errors.length)
for (const e of errors.slice(0, 10)) console.log('  !', e.slice(0, 200))
await browser.close()
console.log('')
console.log(verdict ? 'RESULT: loop + wallet work end to end' : 'RESULT: no verdict reached')