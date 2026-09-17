// Read-only smoke test against the deployed Bountiq contract.

import { readFileSync, existsSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const env = existsSync('.env') ? readFileSync('.env', 'utf8') : ''
const match = env.match(/VITE_BOUNTIQ_CONTRACT=(0x[0-9a-fA-F]{40})/)
if (!match) {
  console.error('No VITE_BOUNTIQ_CONTRACT in .env')
  process.exit(1)
}
const address = match[1]

const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })

console.log('contract:', address)
console.log('caller  :', account.address)

const count = await client.readContract({ address, functionName: 'get_bounty_count' })
console.log('get_bounty_count ->', count)

const raw = await client.readContract({ address, functionName: 'get_bounties' })
console.log('raw type:', typeof raw)

const bounties = JSON.parse(raw)
console.log('parsed bounties:', bounties.length)
for (const bounty of bounties) {
  console.log(' -', bounty.id, '|', bounty.status, '|', bounty.title)
  console.log('   criteria:', JSON.stringify(bounty.criteria))
  console.log('   requester:', bounty.requester)
}

const single = JSON.parse(await client.readContract({ address, functionName: 'get_bounty', args: ['b1'] }))
console.log('get_bounty(b1) ->', single.title, '|', single.status, '|', single.score)
console.log('')
console.log('OK reads work')