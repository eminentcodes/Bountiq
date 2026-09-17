import { chromium } from 'playwright'
const ADDRESS = '0xCd7c77bF9748C1468dC8c1453dF9E70088aE2f71'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.addInitScript(({ address }) => {
  window.ethereum = {
    isMetaMask: true, on() {}, removeListener() {}, once() {},
    async request({ method, params }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address]
      if (method === 'eth_chainId') return '0xf22f'
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null
      const res = await fetch('/gl-api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params || [] }) })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || 'rpc error')
      return json.result
    },
  }
}, { address: ADDRESS })

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await page.waitForTimeout(1800)
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)

const rows = page.locator('main button').filter({ hasText: /submissions/ })
console.log('DEMO 1 - bounties list')
console.log('  heading:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('  rows:', await rows.count())
for (const t of (await rows.allInnerTexts()).slice(0, 5)) console.log('   -', t.replace(/\s+/g, ' ').slice(0, 95))
await page.screenshot({ path: 'demo-1-bounties.png', fullPage: true })

console.log('')
console.log('DEMO 2 - open a bounty (nested page)')
await rows.last().click()
await page.waitForTimeout(1200)
const body = await page.locator('main').innerText()
console.log('  title:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('  gate:', (body.match(/\d+ of \d+ submissions received[^\n]*/) || ['MISSING'])[0])
console.log('  criteria shown:', (body.match(/Met|MISSED/g) || []).length === 0 ? 'yes (list)' : 'n/a')
console.log('  deliverable box:', (await page.locator('main textarea').count()) > 0)
console.log('  submit button:', await page.getByRole('button', { name: /Submit for review/ }).count())
await page.screenshot({ path: 'demo-2-submit.png', fullPage: true })

console.log('')
console.log('DEMO 3 - submissions hub')
await page.goto('http://localhost:5174/app/submit', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
const hub = await page.locator('main').innerText()
console.log('  heading:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('  tabs:', (hub.match(/(All \(\d+\)|Approved \(\d+\)|Failed \(\d+\)|Needs revision \(\d+\))/g) || []).join(' | '))
console.log('  entries:', await page.locator('main article').count())
await page.screenshot({ path: 'demo-3-submissions.png', fullPage: true })

console.log('')
console.log('DEMO 4 - your bounties + manage page')
await page.goto('http://localhost:5174/app/create', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
const mine = page.getByRole('button', { name: /Manage submissions/ })
console.log('  manage buttons:', await mine.count())
await mine.first().click()
await page.waitForTimeout(1200)
console.log('  manage page heading:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('  no modal used:', (await page.getByRole('dialog').count()) === 0)
await page.screenshot({ path: 'demo-4-manage.png', fullPage: true })

console.log('')
console.log('console errors:', errors.filter((e) => !/favicon/i.test(e)).length)
for (const e of errors.slice(0, 5)) console.log('  !', e.slice(0, 150))
await browser.close()