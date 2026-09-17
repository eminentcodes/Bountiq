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
await page.waitForTimeout(4000)
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await page.waitForTimeout(2000)
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(10000)

const listText = await page.locator('main').innerText()
console.log('1) participant tags removed:', !/UNFUNDED/i.test(listText), '| no "Unlimited winners":', !/Unlimited winners/i.test(listText))
const rows = page.locator('main button').filter({ hasText: /submissions/ })
console.log('   rows:', await rows.count(), '| oldest row:', (await rows.last().innerText()).replace(/\s+/g, ' ').slice(0, 120))
await page.screenshot({ path: 'shot-bounties-clean.png', fullPage: true })

const before = page.url()
await rows.last().click()
await page.waitForTimeout(1200)
console.log('')
console.log('2) nested page (not modal): dialogs =', await page.getByRole('dialog').count(), '| url unchanged:', page.url() === before)
const body = await page.locator('main').innerText()
console.log('   back link:', /Back to bounties/.test(body))
console.log('   gate line:', (body.match(/\d+ of \d+ submissions received[^\n]*/) || ['MISSING'])[0])
console.log('   has deliverable textarea:', await page.locator('main textarea').count())
console.log('   shows Reward card:', /REWARD/.test(body), '| Escrow card shown only if funded:', /ESCROW/.test(body))
console.log('   submit disabled while empty:', await page.getByRole('button', { name: /Submit for review/ }).isDisabled())
await page.screenshot({ path: 'shot-submit-page.png', fullPage: true })

await page.getByRole('button', { name: /Back to bounties/ }).click()
await page.waitForTimeout(1500)
console.log('   back button returns to list:', /Bounties\./.test(await page.locator('h1').first().innerText()))

console.log('')
console.log('3) submissions hub')
await page.goto('http://localhost:5174/app/submit', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
const hub = await page.locator('main').innerText()
console.log('   h1:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
console.log('   tabs:', (hub.match(/(All \(\d+\)|Approved \(\d+\)|Failed \(\d+\)|Needs revision \(\d+\))/g) || []).join(' | '))
console.log('   entries:', await page.locator('main article').count())
const card = page.locator('main article').first()
if (await card.count()) {
  await card.getByRole('button').first().click()
  await page.waitForTimeout(700)
  const detail = await card.innerText()
  console.log('   detail has reward state:', /REWARD STATE/i.test(detail), '| payout line:', /Payment releases to/.test(detail))
  console.log('   retry button:', /Retry submission/.test(detail))
}
await page.screenshot({ path: 'shot-hub.png', fullPage: true })

// bell badge
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
const bell = page.getByRole('button', { name: /Your submission activity/i })
const badgeBefore = await bell.locator('span').count()
await bell.click()
await page.waitForTimeout(700)
await page.keyboard.press('Escape')
await page.locator('h1').first().click()
await page.waitForTimeout(400)
const badgeAfter = await bell.locator('span').count()
console.log('')
console.log('4) bell badge before:', badgeBefore, '| after viewing:', badgeAfter)

console.log('')
console.log('console errors:', errors.filter((e) => !/favicon/i.test(e)).length)
for (const e of errors.slice(0, 6)) console.log('  !', e.slice(0, 170))
await browser.close()