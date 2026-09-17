import { chromium } from 'playwright'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:5174/app/bounties', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)
const rows = await page.locator('main button').filter({ hasText: /GEN/ }).count()
console.log('marketplace rows (live contract):', rows)

await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(900)
const box = await page.locator('[role=dialog] > div').boundingBox()
const vw = 1440, vh = 950
const centredX = Math.abs((box.x + box.width / 2) - vw / 2) < 6
const centredY = Math.abs((box.y + box.height / 2) - vh / 2) < 6
console.log('modal size:', Math.round(box.width) + 'x' + Math.round(box.height))
console.log('centred horizontally:', centredX, '| centred vertically:', centredY)
console.log('has overlay backdrop:', await page.locator('[role=dialog]').count() > 0)
console.log('demo wallet option present:', (await page.getByText(/Demo wallet/i).count()) > 0)
await page.screenshot({ path: 'shot-modal.png' })

await page.keyboard.press('Escape')
await page.waitForTimeout(500)
console.log('closes on Escape:', await page.locator('[role=dialog]').count() === 0)

console.log('')
console.log('console errors:', errors.length)
for (const e of errors.slice(0, 6)) console.log('  !', e.slice(0, 180))
await browser.close()