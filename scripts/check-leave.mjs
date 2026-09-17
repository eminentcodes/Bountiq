import { chromium } from 'playwright'
const ADDRESS = '0xCd7c77bF9748C1468dC8c1453dF9E70088aE2f71'
const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
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
await page.waitForTimeout(6000)
const nav = (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ')
console.log('1. in-app nav:', nav)
console.log('   "New bounty" removed:', !/New bounty/i.test(nav))

await page.goto('http://localhost:5174/about', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const verify = page.locator('section#verify')
console.log('')
console.log('2. landing #verify buttons:', await verify.locator('button').allInnerTexts())
console.log('   Browse work disabled:', await verify.getByRole('button', { name: /Browse work/ }).isDisabled())
console.log('   Post a bounty disabled:', await verify.getByRole('button', { name: /Post a bounty/ }).isDisabled())
await verify.getByRole('button', { name: /Browse work/ }).click({ force: true }).catch(() => {})
await page.waitForTimeout(800)
console.log('   still on landing after click:', page.url().includes('/about'))
await page.screenshot({ path: 'shot-landing-disabled.png', fullPage: false })

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)
console.log('')
console.log('3. leave confirmation')
await page.locator('nav').first().getByRole('button', { name: /Bountiq home|Back to Bountiq/i }).click()
await page.waitForTimeout(700)
const dialog = page.getByRole('dialog')
console.log('   dialog shown:', await dialog.count(), '|', (await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 70))
await page.screenshot({ path: 'shot-leave-confirm.png', fullPage: false })
await page.getByRole('button', { name: /Stay in the app/ }).click()
await page.waitForTimeout(500)
console.log('   stayed (dialog gone):', (await page.getByRole('dialog').count()) === 0, '| url still app:', page.url() === 'http://localhost:5174/')
await page.locator('nav').first().getByRole('button', { name: /Bountiq home|Back to Bountiq/i }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /Leave to landing page/ }).click()
await page.waitForTimeout(1500)
console.log('   after confirm url:', page.url(), '| landing h1:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))

console.log('')
console.log('console errors:', errors.filter((e) => !/favicon/i.test(e)).length)
for (const e of errors.slice(0, 5)) console.log('  !', e.slice(0, 160))
await browser.close()