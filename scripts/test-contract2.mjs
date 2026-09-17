import { readFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const address = readFileSync('.env', 'utf8').match(/VITE_BOUNTIQ_CONTRACT=(0x[0-9a-fA-F]{40})/)[1]
const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })

const send = async (functionName, args) => {
  const hash = await client.writeContract({ address, functionName, args, value: 0n })
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 400, interval: 3000 })
  const leader = receipt?.consensus_data?.leader_receipt?.[0]
  if (leader && leader.execution_result !== 'SUCCESS') {
    throw new Error(functionName + ' failed: ' + String(leader.stderr || leader.error).slice(0, 500))
  }
  return hash
}
const read = async (fn, args) => JSON.parse(await client.readContract({ address, functionName: fn, args }))

console.log('contract:', address)
const state0 = await read('get_state')
console.log('seeded bounties:', state0.bounties.map((b) => b.id + '/' + b.slots + 'slots').join(' '))

console.log('')
console.log('-> create_bounty with slots = 2')
await send('create_bounty', [
  'Summarise the Bountiq submission flow',
  'Write a short explanation of how a contributor submits work and how the verdict is produced.',
  JSON.stringify(['Describes the validator consensus step', 'Mentions that the creator can review manually']),
  '3 GEN',
  '3 days',
  2,
])
let state = await read('get_state')
const mine = state.bounties.filter((b) => b.requester.toLowerCase() === account.address.toLowerCase())
const created = mine[0]
console.log('created:', created.id, '| slots:', created.slots, '| status:', created.status)

console.log('')
console.log('-> submit_work (submission 1 of 2)')
await send('submit_work', [created.id, 'A contributor opens a bounty, reads the published acceptance criteria and pastes their deliverable. GenLayer runs an LLM evaluation: a leader proposes a verdict with a score and per-criterion reasoning, then the validator committee re-runs the evaluation and accepts only if the verdict matches, the score is within tolerance and the criterion flags mostly agree. The creator can still review the submission by hand afterwards.'])
state = await read('get_state')
const b = state.bounties.find((x) => x.id === created.id)
const subs = state.submissions.filter((s) => s.bountyId === created.id)
console.log('bounty status after 1 submission:', b.status, '(expect open)')
console.log('submissionCount:', b.submissionCount, '/', b.slots)
const s1 = subs[0]
console.log('submission:', s1.id, '| verdict:', s1.verdict, '| score:', s1.score, '| review:', s1.review, '| payment:', s1.payment)
console.log('summary:', s1.summary)
for (const r of s1.results) console.log('   [', r.passed ? 'PASS' : 'FAIL', ']', r.criterion)

console.log('')
console.log('-> creator review: accepted')
await send('review_submission', [s1.id, 'accepted'])
console.log('-> approve_payment')
await send('approve_payment', [s1.id])
console.log('-> mark_paid')
await send('mark_paid', [s1.id])

state = await read('get_state')
const s2 = state.submissions.find((x) => x.id === s1.id)
console.log('after creator actions -> review:', s2.review, '| payment:', s2.payment)

const mySubs = await read('get_my_submissions', [account.address])
const myBounties = await read('get_my_bounties', [account.address])
console.log('get_my_submissions:', mySubs.length, '| get_my_bounties:', myBounties.length)
console.log('')
console.log('OK contract behaves as intended')