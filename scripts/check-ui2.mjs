import { chromium } from 'playwright'
const ADDRESS = '0xCd7c77bF9748C1468dC8c1453dF9E70088aE2f71'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.addInitScript(({ address }) => {
  window.ethereum = {
    isMetaMask: true, on() {}, removeListener() {}, once() {},
    async request({ method, params }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address]
      if (method === 'eth_chainId') return '0xf2f'
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null
      const res = await fetch('/gl-api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params || [] }) })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || 'rpc error')
      return json.result
    },
  }
}, { address: ADDRESS })

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(7000)
console.log('BOUNTIES heading:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
const rowText = await page.locator('main button').filter({ hasText: /submitted/ }).first().innerText()
console.log('slot progress on row:', rowText.replace(/\s+/g, ' ').slice(0, 80))
await page.screenshot({ path: 'shot-bounties2.png', fullPage: true })

await page.locator('nav').first().getByRole('button', { name: /Submit work/i }).click()
await page.waitForTimeout(6000)
console.log('')
console.log('SUBMIT page:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('has "Your submissions":', (await page.getByText('Your submissions').count()) > 0)
console.log('has "Open for submissions":', (await page.getByText('Open for submissions').count()) > 0)
const cards = await page.locator('main button').filter({ hasText: /creator:/ }).count()
console.log('my submission cards:', cards)
if (cards > 0) console.log('first card:', (await page.locator('main button').filter({ hasText: /creator:/ }).first().innerText()).replace(/\s+/g, ' ').slice(0, 150))
await page.screenshot({ path: 'shot-submit2.png', fullPage: true })

await page.locator('nav').first().getByRole('button', { name: /Post bounty/i }).click()
await page.waitForTimeout(5000)
console.log('')
console.log('CREATE page:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('tabs:', (await page.locator('main button').filter({ hasText: /^(Create|Manage)/ }).allInnerTexts()).join(' | '))
await page.getByRole('button', { name: /^Manage/ }).click()
await page.waitForTimeout(1500)
const manageText = (await page.locator('main').innerText())
console.log('manage shows creator bounties:', /Manage submissions/.test(manageText))
console.log('submission count label present:', /\d+ of \d+ submissions/.test(manageText))
await page.getByRole('button', { name: /Manage submissions/i }).first().click()
await page.waitForTimeout(1500)
const after = await page.locator('main').innerText()
console.log('actions visible:', ['Accept', 'Decline', 'Approve payment', 'Mark paid'].filter((a) => after.includes(a)).join(', '))
await page.screenshot({ path: 'shot-manage.png', fullPage: true })

console.log('')
console.log('console errors:', errors.length)
for (const e of errors.slice(0, 6)) console.log('  !', e.slice(0, 170))
await browser.close()