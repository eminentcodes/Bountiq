const H = '0x32a4578f751801ffd802863c80663e353ac66d810b00b63b186cab54256dcf30'
const r = await fetch('https://studio-dev.genlayer.com/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [H] }) })
const j = await r.json()
const rec = j.result
if (!rec) { console.log('no receipt', JSON.stringify(j).slice(0, 500)); process.exit(0) }
const leader = rec.consensus_data?.leader_receipt?.[0] || rec.consensus_data?.leader_receipt
console.log('status           :', rec.status)
console.log('execution_result :', leader?.execution_result)
console.log('error            :', String(leader?.error || '').slice(0, 800))
console.log('stderr           :', String(leader?.stderr || '').slice(0, 2500))
console.log('genvm_result     :', JSON.stringify(leader?.genvm_result || {}).slice(0, 1500))
console.log('raw_error        :', JSON.stringify(leader?.raw_error || null).slice(0, 500))