// Deploy the Bountiq intelligent contract to GenLayer Studionet.
//
// Studionet is the hosted GenLayer Studio network. It exposes `sim_fundAccount`,
// so the deployer account can be topped up from the script itself and no external
// faucet or bridged funds are required.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient, createAccount, generatePrivateKey } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const KEY_FILE = '.deployer-key'
const ENV_FILE = '.env'
const CONTRACT_PATH = 'contracts/bountiq.py'

function loadOrCreateKey() {
  if (existsSync(KEY_FILE)) {
    const existing = readFileSync(KEY_FILE, 'utf8').trim()
    if (/^0x[0-9a-fA-F]{64}$/.test(existing)) return existing
  }
  const fresh = generatePrivateKey()
  writeFileSync(KEY_FILE, fresh)
  console.log('• generated new deployer key ->', KEY_FILE)
  return fresh
}

function writeEnv(address) {
  const current = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : ''
  const kept = current
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('VITE_BOUNTIQ_CONTRACT='))
  kept.push('VITE_BOUNTIQ_CONTRACT=' + address)
  writeFileSync(ENV_FILE, kept.join('\n') + '\n')
  console.log('• wrote', ENV_FILE)
}

const privateKey = loadOrCreateKey()
const account = createAccount(privateKey)
const client = createClient({ chain: studionet, account })

console.log('• network : Studionet')
console.log('• deployer:', account.address)

try {
  await client.request({ method: 'sim_fundAccount', params: [account.address, 1000] })
  console.log('• funded deployer from the Studionet faucet')
} catch (error) {
  console.log('• faucet call failed (continuing):', error && error.message ? error.message : error)
}

try {
  const balance = await client.getBalance({ address: account.address })
  console.log('• balance :', balance, 'wei')
} catch (error) {
  console.log('• balance : unavailable')
}

const code = new Uint8Array(readFileSync(CONTRACT_PATH))
console.log('• deploying', CONTRACT_PATH, '(' + code.length + ' bytes)')

const hash = await client.deployContract({ code, args: [] })
console.log('• deploy tx:', hash)

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 300,
  interval: 3000,
})

const leader = receipt && receipt.consensus_data && receipt.consensus_data.leader_receipt
  ? receipt.consensus_data.leader_receipt[0]
  : null

if (leader && leader.execution_result !== 'SUCCESS') {
  console.error('Deployment failed.')
  console.error('execution_result:', leader.execution_result)
  if (leader.stderr) console.error('stderr:', leader.stderr)
  if (leader.error) console.error('error:', leader.error)
  process.exit(1)
}

const address = receipt && receipt.data ? receipt.data.contract_address : null
if (!address) {
  console.error('No contract address in receipt:')
  console.error(JSON.stringify(receipt, null, 2).slice(0, 4000))
  process.exit(1)
}

writeEnv(address)
console.log('')
console.log('OK Bountiq deployed to Studionet')
console.log('  contract:', address)
console.log('  explorer: https://explorer-studio.genlayer.com/address/' + address)