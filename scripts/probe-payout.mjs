import { readFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const account = createAccount(readFileSync('.deployer-key', 'utf8').trim())
const client = createClient({ chain: studionet, account })
await client.request({ method: 'sim_fundAccount', params: [account.address, 10 ** 19] })

const code = new Uint8Array(readFileSync('contracts/_probe.py'))
const dh = await client.deployContract({ code, args: [] })
const dr = await client.waitForTransactionReceipt({ hash: dh, status: TransactionStatus.ACCEPTED, retries: 200, interval: 3000 })
const addr = dr?.data?.contract_address
console.log('probe:', addr)

const VALUE = 5n * 10n ** 18n
const h1 = await client.writeContract({ address: addr, functionName: 'fund', args: [], value: VALUE })
await client.waitForTransactionReceipt({ hash: h1, status: TransactionStatus.ACCEPTED, retries: 200, interval: 3000 })
console.log('funded contract with 5 GEN')

const recipient = '0x1111111111111111111111111111111111111111'
const AMOUNT = 10n ** 18n
console.log('paying 1 GEN to', recipient)
try {
  const h2 = await client.writeContract({ address: addr, functionName: 'payout', args: [recipient, AMOUNT.toString()], value: 0n })
  const r2 = await client.waitForTransactionReceipt({ hash: h2, status: TransactionStatus.ACCEPTED, retries: 200, interval: 3000 })
  const leader = r2?.consensus_data?.leader_receipt?.[0]
  console.log('execution_result:', leader?.execution_result)
  if (leader?.stderr) console.log('stderr:', String(leader.stderr).slice(0, 700))
  const paid = await client.readContract({ address: addr, functionName: 'get_paid' })
  console.log('recorded paid:', String(paid))
  console.log(String(paid) === String(AMOUNT) ? 'RESULT: contract CAN pay out on Studionet' : 'RESULT: payout did not record')
} catch (e) {
  console.log('PAYOUT FAILED:', String(e.message).slice(0, 500))
}