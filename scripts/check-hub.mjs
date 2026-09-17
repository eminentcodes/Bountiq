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

// connect
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await page.waitForTimeout(2000)

// reload with fresh contract state
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
console.log('Bounties rows:', await page.locator('main button').filter({ hasText: /submitted/ }).count())
const rowText = (await page.locator('main button').filter({ hasText: /submitted/ }).first().innerText()).replace(/\s+/g, ' ')
console.log('first row:', rowText.slice(0, 130))
console.log('pool label present:', /winners/i.test(rowText))

// 1. clicking a bounty opens a modal instead of navigating
const urlBefore = page.url()
await page.locator('main button').filter({ hasText: /submitted/ }).first().click()
await page.waitForTimeout(900)
const dlg = page.getByRole('dialog')
console.log('')
console.log('1) modal opened:', await dlg.count(), '| url unchanged:', page.url() === urlBefore)
const dt = (await dlg.innerText()).replace(/\s+/g, ' ')
console.log('   modal has Reward/Pool/Escrow:', ['Reward', 'Pool', 'Escrow'].every((k) => dt.includes(k)))
console.log('   modal has textarea:', await dlg.locator('textarea').count())
console.log('   pool text:', (dt.match(/(Unlimited winners|\d+ winners)/) || ['none'])[0])
await page.screenshot({ path: 'shot-submit-modal.png', fullPage: false })

// empty submit -> validation
await page.getByRole('button', { name: /Submit for review/ }).isDisabled().then((d) => console.log('   submit disabled when empty:', d))
await dlg.getByRole('button', { name: /Close|X/i }).first().click().catch(() => page.keyboard.press('Escape'))
await page.waitForTimeout(500)

// 2. submissions hub
await page.goto('http://localhost:5174/app/submit', { waitUntil: 'networkidle' })
await page.waitForTimeout(8000)
console.log('')
console.log('2) submissions page h1:', (await page.locator('h1').first().innerText()).replace(/\s+/g, ' '))
const sub = await page.locator('main').innerText()
console.log('   tabs present:', /All \(\d+\)/.test(sub), '| has Approved/Failed tabs:', /Approved \(/.test(sub) && /Failed \(/.test(sub))
console.log('   shows entries:', await page.locator('main article').count())
await page.screenshot({ path: 'shot-submissions-hub.png', fullPage: true })

// 3. notification bell clears its badge once opened
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(8000)
const bell = page.getByRole('button', { name: /Your submission activity/i })
console.log('')
console.log('3) bell badge before:', await bell.locator('span').count())
await bell.click()
await page.waitForTimeout(600)
console.log('   panel open:', (await page.getByText(/Your submissions/i).count()) > 0)
await page.keyboard.press('Escape')
await bell.click().catch(() => {})
await page.waitForTimeout(400)
await bell.click()
await page.waitForTimeout(600)
console.log('   bell badge after viewing:', await bell.locator('span').count())

// 4. create page still has winners field
await page.goto('http://localhost:5174/app/create', { waitUntil: 'networkidle' })
await page.waitForTimeout(8000)
await page.getByRole('button', { name: /Create a bounty/ }).first().click()
await page.waitForTimeout(700)
const cd = await page.getByRole('dialog').innerText()
console.log('')
console.log('4) create modal has winners field:', /Winners to reward/.test(cd), '| hint 0 = open pool:', /0 = open pool/.test(cd))
await page.screenshot({ path: 'shot-create-pool.png', fullPage: false })

console.log('')
console.log('console errors:', errors.filter((e) => !/favicon/i.test(e)).length)
for (const e of errors.slice(0, 6)) console.log('  !', e.slice(0, 170))
await browser.close()