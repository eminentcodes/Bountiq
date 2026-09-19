// Read the live state of both Bountiq deployments and print it.
//
//   node scripts/verify-state.mjs
//
// Read-only: no wallet, no key, no transactions. This is the quickest way to
// confirm that the addresses in the README are still serving real state.
//
// Studionet is read through genlayer-js (the version the frontend uses).
// Studio Devnet runs a newer runtime that the 1.x client cannot talk to, so it
// is read through genlayer-js 2.x, installed under the alias "genlayer-js-2".

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { createClient as createClient2 } from 'genlayer-js-2'
import { studioDevnet } from 'genlayer-js-2/chains'

const DEPLOYMENTS = [
  {
    label: 'Studionet      (chain 61999)',
    explorer: 'https://explorer-studio.genlayer.com',
    address: '0xB86727DcEBb4cB1E11421fB3dF28e9cc326d79e7',
    client: createClient({ chain: studionet }),
  },
  {
    label: 'Studio Devnet  (chain 61997)',
    explorer: 'https://explorer-studio-dev.genlayer.com',
    address: '0xa476Bd972187BFCc8bbA05D107221bC31Be15B5',
    client: createClient2({ chain: studioDevnet }),
  },
]

let ok = 0

for (const { label, explorer, address, client } of DEPLOYMENTS) {
  console.log(label)
  console.log('  address :', address)
  console.log('  explorer:', explorer + '/address/' + address)

  try {
    const raw = await client.readContract({ address, functionName: 'get_state', args: [] })
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw
    const bounties = state.bounties || []
    const submissions = state.submissions || []

    ok += 1
    console.log('  bounties:', bounties.length, '| submissions:', submissions.length)

    for (const bounty of bounties) {
      const reward = bounty.reward ? String(bounty.reward) : '?'
      const escrow = bounty.escrow ? String(bounty.escrow) : '0'
      console.log('    - ' + bounty.id + '  ' + String(bounty.title).slice(0, 58))
      console.log('      reward ' + reward + ' wei | escrow ' + escrow + ' wei | slots ' + bounty.slots)
    }

    const verdicts = submissions.filter((s) => s.verdict)
    if (verdicts.length > 0) {
      console.log('  verdicts written:', verdicts.length)
      for (const s of verdicts.slice(0, 5)) {
        console.log('    - ' + s.id + '  ' + s.verdict + '  score ' + s.score + '  payment ' + s.payment)
      }
    }
  } catch (error) {
    console.log('  UNREACHABLE:', String(error && error.message ? error.message : error).split('\n')[0])
    console.log('  (the RPC may be temporarily down - the explorer link above is authoritative)')
  }

  console.log('')
}

if (ok === 0) {
  console.log('Neither deployment answered. Check your network connection.')
  process.exit(1)
}

console.log(ok + '/' + DEPLOYMENTS.length + ' deployments answered.')