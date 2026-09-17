import { chromium } from 'playwright'
const ADDRESS = '0xCd7c77bF9748C1468dC8c1453dF9E70088aE2f71'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
const rpc = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('request', (r) => { if (r.url().includes('/gl-api')) rpc.push(r.url()) })

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

// connect once so the session is restored on later routes
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await page.waitForTimeout(1500)
console.log('connected as:', (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ').slice(0, 60))

rpc.length = 0
await page.goto('http://localhost:5174/app/create', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
console.log('')
console.log('CREATE h1:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
const body = await page.locator('main').innerText()
console.log('empty state visible:', /No bounties yet/.test(body))
console.log('creator bounty cards:', await page.getByRole('button', { name: /Manage submissions/ }).count())
await page.screenshot({ path: 'shot-create-empty.png', fullPage: true })

await page.getByRole('button', { name: /Create a bounty/ }).first().click()
await page.waitForTimeout(800)
const dialog = page.getByRole('dialog')
console.log('')
console.log('modal open:', await dialog.count(), '| centered x offset:', await dialog.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return Math.round((r.left + r.width / 2) - window.innerWidth / 2)
}))
await page.screenshot({ path: 'shot-create-modal.png', fullPage: false })

await page.getByRole('button', { name: /Publish bounty/ }).click()
await page.waitForTimeout(700)
const text = await dialog.innerText()
const expected = ['Add a title', 'Describe the outcome', 'Add at least one acceptance criterion', 'Enter a GEN amount', 'Set a deadline']
console.log('validation shown:', expected.filter((e) => text.includes(e)).length + '/' + expected.length)
await page.screenshot({ path: 'shot-create-validation.png', fullPage: false })

await dialog.locator('input').first().fill('Design a launch poster')
await dialog.locator('textarea').first().fill('Create a poster for the GenTank demo day.')
await dialog.locator('input[placeholder="Criterion 1"]').fill('Poster reads clearly at a glance')
await dialog.locator('input[placeholder="5"]').fill('2.5')
await dialog.locator('input[type="number"]').fill('4')
await dialog.locator('input[placeholder="7 days"]').fill('3 days')
await page.waitForTimeout(400)
const t2 = await dialog.innerText()
console.log('escrow preview:', /Total escrow 10 GEN/.test(t2) ? 'Total escrow 10 GEN' : 'MISSING -> ' + t2.split('\n').filter((l) => /escrow/i.test(l)).join(' / '))
await page.screenshot({ path: 'shot-create-filled.png', fullPage: false })

console.log('')
console.log('console errors:', errors.filter((e) => !/favicon/i.test(e)).length)
for (const e of errors.slice(0, 5)) console.log('  !', e.slice(0, 160))
await browser.close()