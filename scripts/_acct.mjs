import { readFileSync, writeFileSync } from 'node:fs'
const g = 'src/lib/genlayer.js'
let s = readFileSync(g, 'utf8')

const anchor = 'async function send(functionName, args) {'
if (!s.includes(anchor)) throw new Error('send() not found')

// Bountiq holds no keys, so a connected browser wallet is described to the SDK as
// a JSON-RPC account: the address is known and the injected provider does the signing.
if (!s.includes('function activeAccount()')) {
  s = s.replace(
    anchor,
    'function activeAccount() {\n' +
    "  if (state.mode === 'browser' && state.address) {\n" +
    "    return { address: state.address, type: 'json-rpc' }\n" +
    '  }\n' +
    '  return undefined\n' +
    '}\n\n' +
    anchor
  )
}

s = s.replace(
  '  const hash = await client.writeContract({\n    address: CONTRACT_ADDRESS,',
  '  const hash = await client.writeContract({\n    account: activeAccount(),\n    address: CONTRACT_ADDRESS,'
)

s = s.replace(
  '  const raw = await getClient().readContract({\n    address: CONTRACT_ADDRESS,\n    functionName: \'get_bounties\',\n  })',
  '  const raw = await getClient().readContract({\n    account: activeAccount(),\n    address: CONTRACT_ADDRESS,\n    functionName: \'get_bounties\',\n  })'
)

s = s.replace(
  '  const raw = await getClient().readContract({\n    address: CONTRACT_ADDRESS,\n    functionName: \'get_bounty\',',
  '  const raw = await getClient().readContract({\n    account: activeAccount(),\n    address: CONTRACT_ADDRESS,\n    functionName: \'get_bounty\','
)

writeFileSync(g, s)
console.log('activeAccount wired:', (s.match(/activeAccount\(\)/g) || []).length, 'call sites')