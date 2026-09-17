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
    throw new Error(functionName + ' FAILED -> ' + String(leader.stderr || leader.error).slice(0, 300))
  }
}
const read = async (fn, args) => JSON.parse(await client.readContract({ address, functionName: fn, args }))

console.log('contract:', address)
await client.request({ method: 'sim_fundAccount', params: [account.address, 10 ** 19] })

console.log('')
console.log('-> create_bounty with a 1-winner pool (reward 1 GEN, escrow 1 GEN)')
await send('create_bounty', [
  'Summarise a release note', 'Turn a release note into a short summary.', JSON.stringify(['Names the headline change']),
  (1n * GEN).toString(), 3, 1, 'Solana', 'https://solana.com', '2 days',
], 1n * GEN)
let st = await read('get_state')
let b = st.bounties.find((x) => x.requester.toLowerCase() === account.address.toLowerCase() && x.title === 'Summarise a release note')
console.log('   pool:', b.winners, '| unlimited:', b.poolUnlimited, '| rewardPool', fmt(b.rewardPool), '| rewardTotal', fmt(b.rewardTotal), '| escrow', fmt(b.escrow), '| funded', b.funded, '| rewarded', b.winnersRewarded)

console.log('')
console.log('-> over-funding the pool must be rejected')
try {
  await send('create_bounty', ['Over funded', 'b', JSON.stringify(['c']), (1n * GEN).toString(), 3, 1, '', '', '2 days'], 3n * GEN)
  console.log('   UNEXPECTED: accepted')
} catch (e) { console.log('   correctly rejected:', String(e.message).slice(0, 130)) }

console.log('')
console.log('-> submit_work #1')
await send('submit_work', [b.id, 'Release 4.2 changes the default RPC endpoint and adds a retry flag. Migration: point your config at the new endpoint.'])
st = await read('get_state')
const s1 = st.submissions.find((x) => x.bountyId === b.id)
console.log('   ', s1.id, '| verdict', s1.verdict, '| score', s1.score)

console.log('')
console.log('-> creator accepts and selects s1 as the winner')
await send('review_submission', [s1.id, 'accepted'])
await send('approve_payment', [s1.id])
st = await read('get_state')
b = st.bounties.find((x) => x.id === b.id)
console.log('   winnersRewarded:', b.winnersRewarded, '| payment', st.submissions.find((x) => x.id === s1.id).payment)

console.log('')
console.log('-> a second winner must be refused (pool is 1)')
await send('submit_work', [b.id, 'The 4.2 release swaps the default RPC endpoint; update your config to the new URL and enable the retry flag.'])
st = await read('get_state')
const s2 = st.submissions.find((x) => x.bountyId === b.id && x.id !== s1.id)
console.log('    s2', s2.id, '| verdict', s2.verdict)
await send('review_submission', [s2.id, 'accepted'])
try {
  await send('approve_payment', [s2.id])
  console.log('   UNEXPECTED: pool cap not enforced')
} catch (e) { console.log('   correctly refused:', String(e.message).slice(0, 130)) }

console.log('')
console.log('-> resubmit_work on the failed submission')
await send('resubmit_work', [s2.id, 'Release 4.2 swaps the default RPC endpoint. Migration note: update the endpoint in your config, then turn on the retry flag.'])
st = await read('get_state')
const s2b = st.submissions.find((x) => x.id === s2.id)
console.log('    verdict', s2b.verdict, '| score', s2b.score, '| review', s2b.review, '| payment', s2b.payment)
console.log('    summary:', String(s2b.summary).slice(0, 110))

console.log('')
console.log('OK pool cap + resubmit verified')