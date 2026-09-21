const RPC = 'https://studio-dev.genlayer.com/api'
const short = '0xa476Bd972187BFCc8bbA05D107221bC31Be15B5'
const good  = '0xa476Bd972187BFCc8bbA05D107C221bC31Be15B5'
for (const [label, addr] of [['SHORT (what was in the files)', short], ['CORRECT (on-chain)', good]]) {
  console.log('=== ' + label + ' ===')
  console.log('  ' + addr + '  hexChars=' + (addr.length - 2))
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'gen_call', params: [{ type: 'read', to: addr, from: '0x0000000000000000000000000000000000000000', data: '0xce8c0e004c6765745f737461746500', transaction_hash_variant: 'latest-nonfinal' }] }) })
  const j = await r.json()
  const raw = JSON.stringify(j)
  console.log('  http ' + r.status + ' -> ' + (j.result ? 'returned data (' + String(j.result).length + ' chars)' : 'no result'))
  if (j.error) console.log('  error: ' + JSON.stringify(j.error).slice(0, 160))
}