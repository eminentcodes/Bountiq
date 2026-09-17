import { readFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const address = readFileSync('.env', 'utf8').match(/VITE_BOUNTIQ_CONTRACT=(0x[0-9a-fA-F]{40})/)[1]
const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })

const send = async (functionName, args, value = 0n) => {
  const hash = await client.writeContract({ address, functionName, args, value })
  const r = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 400, interval: 3000 })
  const leader = r?.consensus_data?.leader_receipt?.[0]
  if (leader && leader.execution_result !== 'SUCCESS') {
    const detail = String(leader.stderr || leader.error || JSON.stringify(leader).slice(0, 500))
    throw new Error(functionName + ' FAILED -> ' + detail.slice(0, 400))
  }
  return r
}
const read = async (fn, args) => JSON.parse(await client.readContract({ address, functionName: fn, args }))

console.log('contract:', address)
let st = await read('get_state')
let b = st.bounties.find((x) => x.requester.toLowerCase() === account.address.toLowerCase())
if (!b) throw new Error('no bounty from this account on the new contract')
console.log('using bounty', b.id, '| slots', b.slots, '| received', b.submissionCount, '| pool', b.winners)

console.log('')
console.log('-> submit an obviously failing deliverable')
await send('submit_work', [b.id, 'idk lol'])
st = await read('get_state')
const bad = st.submissions.filter((x) => x.bountyId === b.id).sort((x, y) => (x.id < y.id ? 1 : -1))[0]
console.log('    ', bad.id, '| verdict', bad.verdict, '| score', bad.score)

if (bad.verdict === 'approved') {
  console.log('    (validator approved junk; retry path not exercisable this run)')
} else {
  console.log('')
  console.log('-> resubmit_work with a real deliverable')
  await send('resubmit_work', [bad.id, 'Release 4.2 swaps the default RPC endpoint. Migration: point your config at the new URL, then enable the retry flag.'])
  st = await read('get_state')
  const fixed = st.submissions.find((x) => x.id === bad.id)
  console.log('    verdict', fixed.verdict, '| score', fixed.score, '| review', fixed.review, '| payment', fixed.payment)
  console.log('    summary:', String(fixed.summary).slice(0, 120))
}

console.log('')
console.log('OK resubmit path exercised')