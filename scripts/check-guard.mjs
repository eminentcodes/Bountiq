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

const fav = await page.request.get('http://localhost:5174/bountiq-mark.svg')
console.log('favicon:', fav.status(), '| bytes:', (await fav.body()).length)

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.screenshot({ path: 'shot-logo.png', clip: { x: 0, y: 0, width: 460, height: 110 } })
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await page.waitForTimeout(2000)

const openCreate = async () => {
  await page.goto('http://localhost:5174/app/create', { waitUntil: 'networkidle' })
  await page.waitForTimeout(8000)
  await page.getByRole('button', { name: /Create a bounty/ }).first().click()
  await page.waitForTimeout(700)
}
const fill = async (val) => { await page.getByRole('dialog').locator('input').first().fill(val); await page.waitForTimeout(350) }

console.log('')
console.log('1) unsaved-draft guard')
await openCreate()
await fill('Half written bounty')
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
console.log('   Escape asks:', (await page.getByText('Leave without publishing?').count()) > 0)
await page.getByRole('button', { name: /Keep editing/ }).click()
await page.waitForTimeout(500)
console.log('   keep editing -> draft kept:', await page.getByRole('dialog').locator('input').first().inputValue())
await page.screenshot({ path: 'shot-unsaved.png', fullPage: false })

await page.getByRole('button', { name: /Cancel/ }).click()
await page.waitForTimeout(600)
console.log('   Cancel asks:', (await page.getByText('Leave without publishing?').count()) > 0)
await page.getByRole('button', { name: /Discard and leave/ }).click()
await page.waitForTimeout(700)
console.log('   discarded -> dialog closed:', (await page.getByRole('dialog').count()) === 0)

console.log('')
console.log('2) browser back is guarded')
await openCreate()
await fill('Back button bounty')
await page.goBack()
await page.waitForTimeout(800)
console.log('   back asks:', (await page.getByText('Leave without publishing?').count()) > 0, '| still on create:', page.url().includes('/app/create'))
await page.getByRole('button', { name: /Keep editing/ }).click()
await page.waitForTimeout(500)

await page.getByRole('button', { name: /Cancel/ }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Discard and leave/ }).click()
await page.waitForTimeout(700)

console.log('')
console.log('3) empty form closes silently')
await openCreate()
await page.getByRole('button', { name: /Cancel/ }).click()
await page.waitForTimeout(600)
console.log('   no prompt:', (await page.getByRole('dialog').count()) === 0)

console.log('')
console.log('4) nested manage page per bounty')
const cards = page.getByRole('button', { name: /Manage submissions/ })
console.log('   bounties with a manage button:', await cards.count())
await cards.first().click()
await page.waitForTimeout(1200)
const main = await page.locator('main').innerText()
console.log('   nested page (no dialog):', (await page.getByRole('dialog').count()) === 0)
console.log('   back link:', /Back to your bounties/.test(main))
console.log('   header:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('   counters:', ['SUBMISSIONS', 'REWARD PER WINNER', 'ESCROW', 'WINNERS SELECTED'].filter((k) => main.includes(k)).join(', '))
console.log('   actions:', ['Accept', 'Decline', 'Select as winner', 'Release payment'].filter((a) => main.includes(a)).join(', '))
await page.screenshot({ path: 'shot-manage-page.png', fullPage: true })
await page.getByRole('button', { name: /Back to your bounties/ }).click()
await page.waitForTimeout(900)
console.log('   back returns to list:', /Your bounties/.test(await page.locator('h1').first().innerText()))

console.log('')
console.log('console errors:', errors.filter((e) => !/favicon/i.test(e)).length)
for (const e of errors.slice(0, 6)) console.log('  !', e.slice(0, 170))
await browser.close()