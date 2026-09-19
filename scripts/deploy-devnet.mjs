// Deploy Bountiq to GenLayer Studio Devnet (chain 61997).
//
// Studio Devnet runs a newer contract runtime than Studionet, so this script
// depends on genlayer-js 2.x, installed under the alias "genlayer-js-2" to keep
// the frontend on 1.1.8 (which can only reach chain 61999).
//
//   node scripts/deploy-devnet.mjs
//
// On success the contract address is written to .env as VITE_BOUNTIQ_CONTRACT.

import { readFileSync, writeFileSync } from 'node:fs'
import { createClient, createAccount } from 'genlayer-js-2'
import { studioDevnet } from 'genlayer-js-2/chains'
import { TransactionStatus } from 'genlayer-js-2/types'

const KEY_FILE = '.deployer-key'
const CONTRACT_PATH = 'contracts/bountiq-devnet.py'

const account = createAccount(readFileSync(KEY_FILE, 'utf8').trim())
const client = createClient({ chain: studioDevnet, account })

console.log('network :', studioDevnet.name, '| chain', studioDevnet.id)
console.log('rpc     :', studioDevnet.rpcUrls.default.http[0])
console.log('deployer:', account.address)

try {
  await client.request({ method: 'sim_fundAccount', params: [account.address, 1000] })
  console.log('faucet  : funded')
} catch (error) {
  console.log('faucet  : skipped -', error && error.message ? error.message : error)
}

const code = new Uint8Array(readFileSync(CONTRACT_PATH))
console.log('contract:', CONTRACT_PATH, '(' + code.length + ' bytes)')

// This chain rejects zero-fee transactions, so use the SDK's own estimator.
const fees = await client.estimateTransactionFees({
  consensusMaxRotations: client.chain.defaultConsensusMaxRotations,
})

const hash = await client.deployContract({ code, args: [], fees })
console.log('tx      :', hash)

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 300,
  interval: 3000,
})

const leaderReceipt = receipt?.consensus_data?.leader_receipt
const leader = Array.isArray(leaderReceipt) ? leaderReceipt[0] : leaderReceipt

if (leader && leader.execution_result !== 'SUCCESS') {
  console.error('')
  console.error('Deployment failed:', leader.execution_result)
  console.error('result  :', JSON.stringify(leader.result || {}))
  const stderr = String(leader?.genvm_result?.stderr || '')
  if (stderr) console.error('stderr  :\n' + stderr.slice(-3000))
  process.exit(1)
}

const address = receipt?.data?.contract_address || receipt?.result?.contract_address
if (!address) {
  console.error('No contract address in receipt:', JSON.stringify(receipt).slice(0, 2000))
  process.exit(1)
}

// Deliberately does NOT overwrite .env. The frontend pins Studionet (chain
// 61999) and genlayer-js 1.1.8 cannot produce the non-zero-fee transaction
// this chain requires, so pointing .env here would break the working app.
// The deployment is recorded in .env.devnet instead.
writeFileSync('.env.devnet', 'VITE_BOUNTIQ_CONTRACT=' + address + '\nVITE_BOUNTIQ_CHAIN=devnet\n')
console.log('')
console.log('OK deployed to Studio Devnet')
console.log('  contract:', address)
console.log('  explorer: https://explorer-studio-dev.genlayer.com/address/' + address)
console.log('  recorded in .env.devnet (the frontend still targets Studionet)')