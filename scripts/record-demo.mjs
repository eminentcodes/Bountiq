// Records the Bountiq demo. Drives the real app against the real Studionet
// contract and signs a genuine submission with the demo account, so the
// footage shows a live transaction and a live validator verdict.
//
// The injected provider is a recording device: it implements the EIP-1193
// methods the app calls and forwards eth_sendTransaction to a Node-side signer.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { privateKeyToAccount } from 'viem/accounts'

const ADDRESS = '0xCd7c77bF9748C1468dC8c1453dF9E70088aE2f71'
const API = 'https://studio.genlayer.com/api'
const GAP = 0.5
const SLACK = 0.7

const account = privateKeyToAccount(readFileSync('.deployer-key', 'utf8').trim())

const timeline = JSON.parse(readFileSync('demo/voice-timeline.json', 'utf8'))
const scenes = timeline.scenes
const sceneById = (id) => scenes.find((s) => s.id === id)
const hold = (id) => { const sc = sceneById(id); return Math.max(sc.seconds, sc.minHold || 0) + GAP + SLACK }

const DELIVERABLE = `Landing page copy audit for the developer tool.

1. Lead with the outcome, not the mechanism.
The headline describes what the product is, so a first time visitor cannot tell what changes for them. Rewrite it around the result the developer gets.

2. Replace the feature grid with one worked example.
Nine capability tiles with no ordering signal nothing about what to try first. A short before and after sample shows the value in less space.

3. State the time to first call.
The page never says how long setup takes. Developers abandon onboarding when the cost is unknown, so add a concrete figure near the primary call to action.`

const CARD_CSS = `
  *{box-sizing:border-box;margin:0}
  html,body{height:100%}
  body{background:linear-gradient(180deg,#dce9f3 0%,#e6eef4 48%,#dce7f0 100%);
       font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0d1a2b;
       display:grid;place-items:center;height:100vh;overflow:hidden}
  .wrap{width:1180px;padding:56px}
  .eyebrow{font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5d738a}
  h1{font-size:96px;font-weight:800;letter-spacing:-.05em;line-height:1.02}
  .accent{color:#55718c}
  p.lede{margin-top:26px;font-size:26px;line-height:1.5;color:#405467;max-width:900px}
  .glass{background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.75);
         border-radius:26px;box-shadow:0 18px 50px rgba(89,115,142,.14)}
  .card{padding:44px 48px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:34px}
  .cell{padding:26px 28px;border-radius:20px;background:rgba(255,255,255,.5)}
  .label{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5d738a}
  .value{margin-top:10px;font-size:30px;font-weight:700;letter-spacing:-.02em}
  .mono{font-family:'Cascadia Mono',Consolas,monospace;font-size:20px;word-break:break-all;color:#123}
  .row{display:flex;align-items:center;gap:16px}
  .dot{width:14px;height:14px;border-radius:50%;background:#3f9d6d;box-shadow:0 0 0 6px rgba(63,157,109,.18)}
  .mark{width:76px;height:76px;border-radius:22px;background:linear-gradient(150deg,#12263c,#0c1a2b);
        display:grid;place-items:center;box-shadow:0 12px 30px rgba(12,26,43,.3)}
  .foot{margin-top:40px;font-size:19px;color:#4c6173}
`

const card = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CARD_CSS}</style></head><body>${inner}</body></html>`

const MARK = `<span class="mark"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#eaf4fb" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>`

const CARD_INTRO = card(`<div class="wrap"><div class="row">${MARK}<div><div class="eyebrow">GenTank hackathon</div><h1 style="font-size:74px">Bountiq</h1></div></div>
  <p class="lede" style="margin-top:34px">A verified work marketplace on GenLayer.<br/>Post a bounty, submit the outcome, and let a validator committee decide whether the work actually meets the brief.</p></div>`)

const CARD_CONTRACT = card(`<div class="wrap"><div class="glass card"><div class="eyebrow">Live on GenLayer Studionet</div>
  <h1 style="font-size:58px;margin-top:14px">Real contract. No mock data.</h1>
  <div class="grid2">
    <div class="cell"><div class="label">Contract address</div><div class="value mono" style="margin-top:14px">0xB86727DcEBb4cB1E11421fB3dF28e9cc326d79e7</div></div>
    <div class="cell"><div class="label">Network</div><div class="value">Studionet &middot; chain 61999</div></div>
    <div class="cell"><div class="label">Contract</div><div class="value">Python intelligent contract</div></div>
    <div class="cell"><div class="label">State written on chain</div><div class="value">Bounties, submissions, verdicts, escrow</div></div>
  </div>
  <div class="foot row"><span class="dot"></span>Every row, verdict and payment state in this demo is read back from that address.</div></div></div>`)

const CARD_CLOSE = card(`<div class="wrap"><div class="row">${MARK}<h1 style="font-size:70px">Bountiq</h1></div>
  <p class="lede" style="margin-top:26px">Verified work, fairly rewarded on GenLayer.</p>
  <div class="glass card" style="margin-top:40px">
    <div class="eyebrow">Reproduce it</div>
    <div class="grid2" style="grid-template-columns:1fr 1fr">
      <div class="cell"><div class="label">1 &middot; Install</div><div class="value mono" style="margin-top:12px">npm install</div></div>
      <div class="cell"><div class="label">2 &middot; Point at the contract</div><div class="value mono" style="margin-top:12px">VITE_BOUNTIQ_CONTRACT in .env</div></div>
      <div class="cell"><div class="label">3 &middot; Run</div><div class="value mono" style="margin-top:12px">npm run dev</div></div>
      <div class="cell"><div class="label">4 &middot; Redeploy the contract</div><div class="value mono" style="margin-top:12px">npm run deploy</div></div>
    </div>
    <div class="foot">Contract, deployment script and smoke tests are all in the repository.</div>
  </div></div>`)

const browser = await chromium.launch({ channel: 'chromium' })
const context = await browser.newContext({
  viewport: { width: 1600, height: 950 },
  deviceScaleFactor: 1,
  recordVideo: { dir: 'demo/raw', size: { width: 1600, height: 950 } },
})
const page = await context.newPage()

await page.exposeFunction('__glSend', async (tx) => {
  const request = {
    to: tx.to,
    data: tx.data,
    value: BigInt(tx.value || '0x0'),
    gas: BigInt(tx.gas || '0x5208'),
    nonce: Number(BigInt(tx.nonce || '0x0')),
    chainId: Number(BigInt(tx.chainId || '0xf22f')),
    type: 'legacy',
  }
  if (tx.gasPrice !== undefined) request.gasPrice = BigInt(tx.gasPrice)
  const serialized = await account.signTransaction(request)
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_sendRawTransaction', params: [serialized] }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'broadcast failed')
  console.log('   broadcast hash:', json.result)
  return json.result
})

await page.addInitScript(({ address }) => {
  window.ethereum = {
    isMetaMask: true,
    on() {}, removeListener() {}, once() {},
    async request({ method, params }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address]
      if (method === 'eth_chainId') return '0xf22f'
      if (method === 'net_version') return '61999'
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null
      if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
        return await window.__glSend((params || [])[0])
      }
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
}, { address: ADDRESS })

const t0 = Date.now()
const marks = []
const mark = (id) => { marks.push({ id, t: (Date.now() - t0) / 1000 }); console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${id}`) }
const wait = (ms) => page.waitForTimeout(ms)

const glide = async (fromY, toY, ms) => {
  const steps = 34
  for (let i = 1; i <= steps; i += 1) {
    const y = fromY + (toY - fromY) * (i / steps)
    await page.evaluate((v) => window.scrollTo(0, v), Math.round(y))
    await wait(ms / steps)
  }
}

// ---------------------------------------------------------------- scene 01
mark('01-intro')
await page.setContent(CARD_INTRO)
await wait(hold('01-intro') * 1000)

// ---------------------------------------------------------------- scene 02
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await wait(700)
mark('02-problem')
await glide(0, 430, hold('02-problem') * 1000 - 1200)

// ---------------------------------------------------------------- scene 03
mark('03-landing')
await page.evaluate(() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
await wait(900)
await glide(430, 760, hold('03-landing') * 1000 - 1400)

// ---------------------------------------------------------------- scene 04
mark('04-contract')
await page.setContent(CARD_CONTRACT)
await wait(hold('04-contract') * 1000)

// ---------------------------------------------------------------- scene 05
await page.goto('http://localhost:5174/app/bounties', { waitUntil: 'networkidle' })
await wait(1500)
await page.getByRole('button', { name: /Connect wallet/i }).first().click()
await wait(600)
await page.getByRole('button', { name: /Connect browser wallet/i }).click()
await wait(2500)
await page.waitForSelector('main button:has-text("submissions")', { timeout: 60000 })
await wait(2500)
mark('05-bounties')
await glide(0, 260, hold('05-bounties') * 1000 - 2200)

// ---------------------------------------------------------------- scene 06
const row = page.locator('main button').filter({ hasText: 'Audit a landing page' }).first()
await row.click()
await wait(1200)
mark('06-submit')
const box = page.locator('main textarea').first()
await box.click()
await box.pressSequentially(DELIVERABLE, { delay: 8, timeout: 300000 })
await wait(600)
mark('06-end')

// ---------------------------------------------------------------- scene 07
const submitButton = page.getByRole('button', { name: /Submit for review/i })
await submitButton.click()
mark('07-evaluating')
await wait(2500)
await page.waitForSelector('text=Verification complete', { timeout: 600000 })
await wait(1800)
mark('08-verdict')

// ---------------------------------------------------------------- scene 08
await glide(0, 340, Math.min(6000, hold('08-verdict') * 1000 - 1800))
await wait(Math.max(0, hold('08-verdict') * 1000 - 6000))
mark('08-end')

// ---------------------------------------------------------------- scene 09
await page.getByRole('button', { name: /Manage my submissions/i }).click()
await wait(2200)
mark('09-hub')
await glide(0, 300, hold('09-hub') * 1000 - 1800)

// ---------------------------------------------------------------- scene 10
await page.goto('http://localhost:5174/app/create', { waitUntil: 'networkidle' })
await wait(6000)
mark('10-creator')
await page.getByRole('button', { name: /Manage submissions/i }).first().click()
await wait(2000)
await glide(0, 420, hold('10-creator') * 1000 - 2600)

// ---------------------------------------------------------------- scene 11
mark('11-close')
await page.setContent(CARD_CLOSE)
await wait(hold('11-close') * 1000)

mark('end')
writeFileSync('demo/record-timeline.json', JSON.stringify({ marks }, null, 2))
await context.close()
await browser.close()
console.log('\ntimeline written to demo/record-timeline.json')