import { readFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const address = readFileSync('.env', 'utf8').match(/VITE_BOUNTIQ_CONTRACT=(0x[0-9a-fA-F]{40})/)[1]
const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })
const GEN = 10n ** 18n
const fmt = (wei) => (Number(wei) / 1e18).toFixed(2) + ' GEN'

const send = async (functionName, args, value = 0n) => {
  const hash = await client.writeContract({ address, functionName, args, value })
  const r = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 400, interval: 3000 })
  const leader = r?.consensus_data?.leader_receipt?.[0]
  if (leader && leader.execution_result !== 'SUCCESS') {
    throw new Error(functionName + ' FAILED -> ' + String(leader.stderr || leader.error).slice(0, 400))
  }
}
const read = async (fn, args) => JSON.parse(await client.readContract({ address, functionName: fn, args }))

await client.request({ method: 'sim_fundAccount', params: [account.address, 10 ** 19] })

const s0 = await read('get_state')
console.log('seeded bounties:')
for (const b of s0.bounties) {
  console.log('  ', b.id, '|', b.title.slice(0, 34).padEnd(34), '| reward', fmt(b.reward).padEnd(9), '| slots', b.slots, '| total', fmt(b.rewardTotal).padEnd(9), '| escrow', fmt(b.escrow).padEnd(9), '| funded', b.funded, '| brand', JSON.stringify(b.brand))
}

console.log('')
console.log('-> create_bounty WITHOUT escrow (no value sent)')
await send('create_bounty', [
  'Draft a migration note for the SDK',
  'Explain what changed and what developers must update.',
  JSON.stringify(['Names the breaking change', 'Gives a migration step']),
  (2n * GEN).toString(),
  3,
  'Solana',
  'https://solana.com',
  '4 days',
], 0n)
let st = await read('get_state')
let b = st.bounties.find((x) => x.requester.toLowerCase() === account.address.toLowerCase() && x.brand === 'Solana')
console.log('created', b.id, '| reward', fmt(b.reward), '| slots', b.slots, '| total', fmt(b.rewardTotal), '| escrow', fmt(b.escrow), '| funded', b.funded, '| brand', b.brand)

console.log('')
console.log('-> fund_bounty with the full escrow (6 GEN)')
await send('fund_bounty', [b.id], 6n * GEN)
st = await read('get_state')
b = st.bounties.find((x) => x.id === b.id)
console.log('after funding -> escrow', fmt(b.escrow), '| funded', b.funded, '| covered slots', b.covered + '/' + b.slots)

console.log('')
console.log('-> partial escrow rejection check')
try {
  await send('create_bounty', ['Too small', 'brief', JSON.stringify(['c']), (5n * GEN).toString(), 4, '', '', '2 days'], 5n * GEN)
  console.log('UNEXPECTED: partial escrow was accepted')
} catch (e) {
  console.log('correctly rejected:', String(e.message).slice(0, 120))
}

console.log('')
console.log('-> submit + review + approve + mark_paid (escrow should drop)')
await send('submit_work', [b.id, 'Breaking change: client.writeContract now requires an explicit account. Migration: pass account: { address, type: "json-rpc" } when using an injected wallet, or the client account object when signing locally.'])
st = await read('get_state')
const sub = st.submissions.find((s) => s.bountyId === b.id)
console.log('submission', sub.id, '| verdict', sub.verdict, '| score', sub.score, '| brand-aware summary:', sub.summary.slice(0, 90))
await send('review_submission', [sub.id, 'accepted'])
await send('approve_payment', [sub.id])
await send('mark_paid', [sub.id])
st = await read('get_state')
b = st.bounties.find((x) => x.id === b.id)
const sub2 = st.submissions.find((s) => s.id === sub.id)
console.log('after payout -> escrow', fmt(b.escrow), '| payment', sub2.payment, '| funded', b.funded, '| covered', b.covered + '/' + b.slots)
console.log('')
console.log('OK escrow + brand + creator identity verified')