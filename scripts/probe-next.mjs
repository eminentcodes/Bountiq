const RPC = 'https://studio-next.genlayer.com/api'
const s = (await import('node:fs')).readFileSync('node_modules/genlayer-js/dist/chunk-XCQTIUTU.js', 'utf8')
const addrs = [...new Set([...s.matchAll(/0x[0-9a-fA-F]{40}/g)].map((m) => m[0]))]
const call = async (method, params) => {
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
  const j = await r.json()
  if (j.error) throw new Error(j.error.message)
  return j.result
}
for (const a of addrs) {
  try {
    const code = await call('eth_getCode', [a, 'latest'])
    const bytes = code && code !== '0x' ? (code.length - 2) / 2 : 0
    console.log(a, bytes > 0 ? 'HAS CODE ' + bytes + ' bytes' : '-')
  } catch (e) { console.log(a, 'err', e.message) }
}