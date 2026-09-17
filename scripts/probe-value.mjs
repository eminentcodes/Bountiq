import { readFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })
console.log('deployer:', account.address)

// try to obtain a realistic balance for value-transfer testing
try {
  await client.request({ method: 'sim_fundAccount', params: [account.address, 10 ** 19] })
  console.log('requested 1e19 wei from the faucet')
} catch (e) { console.log('faucet error:', e.message) }
try {
  const bal = await client.getBalance({ address: account.address })
  console.log('balance now:', bal.toString(), 'wei')
} catch (e) { console.log('balance read failed:', e.message) }

const code = new Uint8Array(readFileSync('contracts/_probe.py'))
const dh = await client.deployContract({ code, args: [] })
console.log('deploy tx:', dh)
const dr = await client.waitForTransactionReceipt({ hash: dh, status: TransactionStatus.ACCEPTED, retries: 200, interval: 3000 })
const addr = dr?.data?.contract_address
console.log('probe address:', addr)

const VALUE = 5n * 10n ** 18n
console.log('')
console.log('calling fund() with value:', VALUE.toString(), 'wei (5 GEN)')
try {
  const h = await client.writeContract({ address: addr, functionName: 'fund', args: [], value: VALUE })
  const r = await client.waitForTransactionReceipt({ hash: h, status: TransactionStatus.ACCEPTED, retries: 200, interval: 3000 })
  const leader = r?.consensus_data?.leader_receipt?.[0]
  console.log('execution_result:', leader?.execution_result)
  if (leader?.stderr) console.log('stderr:', String(leader.stderr).slice(0, 600))
} catch (e) {
  console.log('PAYABLE CALL FAILED:', e.message?.slice(0, 400))
}

const total = await client.readContract({ address: addr, functionName: 'get_total' })
const held = await client.readContract({ address: addr, functionName: 'get_balance' })
console.log('contract total :', String(total))
console.log('contract balance:', String(held))
console.log('')
console.log(String(total) === String(VALUE) ? 'RESULT: payable value transfers WORK on Studionet' : 'RESULT: value did NOT reach the contract')