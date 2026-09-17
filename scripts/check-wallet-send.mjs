// Verifies the browser-wallet path: an injected provider is mocked so we can
// confirm the SDK resolves an account and reaches the signing step.
import { chromium } from 'playwright'

const MARKER = 'MOCK_REACHED_SEND_TRANSACTION'
const ADDRESS = '0xCd7c77bF9748C1468dC8c1453dF9E70088aE2f71'

const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })

await page.addInitScript(({ marker, address }) => {
  window.ethereum = {
    isMetaMask: true,
    on() {}, removeListener() {}, once() {},
    async request({ method, params }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address]
      if (method === 'eth_chainId') return '0xf2f'
      if (method === 'net_version') return '61999'
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null
      if (method === 'eth_sendTransaction') throw new Error(marker)
      const res = await fetch('/gl-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params || [] }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || 'rpc error')
      return json.result
    },
  }
}, { marker: MARKER, address: ADDRESS })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:5174/app/bounties', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)

const rows = await page.locator('main button').filter({ hasText: /GEN/ }).count()
console.log('rows via mock provider reads:', rows)

await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await page.waitForTimeout(800)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await page.waitForTimeout(2500)
const nav = (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ')
console.log('nav after connect:', nav.slice(0, 100))

await page.keyboard.press('Escape')
await page.waitForTimeout(500)

await page.locator('main button').filter({ hasText: /GEN/ }).first().click()
await page.waitForTimeout(1500)
await page.locator('textarea').fill('Three friction points with reproduction steps and a priority order, written for the onboarding review.')
await page.getByRole('button', { name: /Submit for review/i }).click()
await page.waitForTimeout(9000)

const body = await page.locator('main').innerText()
const noAccount = /No account set/i.test(body)
const reached = body.includes(MARKER)

console.log('')
console.log('surfaced "No account set":', noAccount)
console.log('reached eth_sendTransaction :', reached)
console.log('error text shown:', (body.split('\n').find((l) => /MOCK_REACHED|No account/i.test(l)) || 'none').slice(0, 120))
await page.screenshot({ path: 'shot-wallet-send.png', fullPage: true })
await browser.close()
console.log('')
console.log(reached && !noAccount ? 'RESULT: account wiring fixed' : 'RESULT: still blocked')