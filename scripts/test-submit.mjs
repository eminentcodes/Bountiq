// End-to-end test of submit_work: sends a real deliverable and waits for the
// validator committee to reach a verdict.

import { readFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const address = readFileSync('.env', 'utf8').match(/VITE_BOUNTIQ_CONTRACT=(0x[0-9a-fA-F]{40})/)[1]
const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })

const deliverable = `Landing page copy audit for the developer tool.

Improvement 1: Lead with the outcome, not the mechanism.
The headline currently describes what the product is ("An SDK for verifiable compute").
A first-time visitor cannot tell what changes for them. Rewrite it around the result the
developer gets, and move the mechanism into the sub-headline. This matters because the
current phrasing forces the reader to translate technical description into personal value,
and most visitors leave during that translation.

Improvement 2: Replace the feature grid with a single worked example.
The page lists nine capability tiles with no ordering, so nothing signals what to do first.
A short before/after code sample with real input and output would demonstrate the value in
less space than the grid occupies, and it matches how developers evaluate tools.

Improvement 3: State the time-to-first-call.
The page never says how long setup takes. Developers abandon onboarding when the cost is
unknown. Adding a concrete figure near the primary call to action removes that uncertainty
and sets an accurate expectation.`

console.log('submitting to b1...')
const hash = await client.writeContract({
  address,
  functionName: 'submit_work',
  args: ['b1', deliverable],
  value: 0n,
})
console.log('tx:', hash)

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 400,
  interval: 3000,
})

const leader = receipt?.consensus_data?.leader_receipt?.[0]
console.log('status          :', receipt?.status)
console.log('execution_result:', leader?.execution_result)
if (leader?.stderr) console.log('stderr:', String(leader.stderr).slice(0, 3000))
if (leader?.error) console.log('error :', String(leader.error).slice(0, 3000))

const bounty = JSON.parse(await client.readContract({ address, functionName: 'get_bounty', args: ['b1'] }))
console.log('')
console.log('verdict :', bounty.verdict)
console.log('status  :', bounty.status)
console.log('score   :', bounty.score)
console.log('summary :', bounty.summary)
console.log('results :')
for (const r of bounty.results) {
  console.log('  [', r.passed ? 'PASS' : 'FAIL', ']', r.criterion)
  console.log('        ', r.reason)
}