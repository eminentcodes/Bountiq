// Deploy Bountiq to GenLayer Studio Next (chain 61997).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const RPC = 'https://studio-next.genlayer.com/api'
const chain = { ...studionet, id: 61997, name: 'GenLayer Studio Next', rpcUrls: { default: { http: [RPC] } } }

const key = readFileSync('.deployer-key', 'utf8').trim()
const account = createAccount(key)
const client = createClient({ chain, account })
console.log('network : Studio Next (61997)')
console.log('deployer:', account.address)

const consensus = chain.consensusMainContract?.address
console.log('consensus:', consensus)
try {
  const code = await client.request({ method: 'eth_getCode', params: [consensus, 'latest'] })
  console.log('consensus code bytes:', code ? (code.length - 2) / 2 : 0)
} catch (e) { console.log('consensus probe failed:', e.message) }

try {
  await client.request({ method: 'sim_fundAccount', params: [account.address, 1000] })
  console.log('funded via faucet')
} catch (e) { console.log('faucet skipped:', e.message) }

try { console.log('balance :', await client.getBalance({ address: account.address })) } catch (e) { console.log('balance unavailable') }

const code = new Uint8Array(readFileSync('contracts/bountiq.py'))
console.log('deploying contracts/bountiq.py (' + code.length + ' bytes)')
const hash = await client.deployContract({ code, args: [] })
console.log('deploy tx:', hash)

const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 300, interval: 3000 })
const leader = receipt?.consensus_data?.leader_receipt?.[0]
if (leader && leader.execution_result !== 'SUCCESS') {
  console.error('FAILED', leader.execution_result, String(leader.stderr || leader.error || '').slice(0, 2000))
  process.exit(1)
}
const address = receipt?.data?.contract_address
if (!address) { console.error('no address:', JSON.stringify(receipt).slice(0, 2000)); process.exit(1) }

const current = existsSync('.env') ? readFileSync('.env', 'utf8') : ''
const kept = current.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('VITE_BOUNTIQ_CONTRACT='))
kept.push('VITE_BOUNTIQ_CONTRACT=' + address)
writeFileSync('.env', kept.join('\n') + '\n')
console.log('')
console.log('OK deployed to Studio Next')
console.log('contract:', address)
console.log('explorer: https://explorer-studio-dev.genlayer.com/address/' + address)