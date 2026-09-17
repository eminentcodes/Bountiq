import fs from 'node:fs'
const p = 'src/lib/genlayer.js'
let s = fs.readFileSync(p, 'utf8')
function rep(from, to, label) {
  if (!s.includes(from)) throw new Error('missing anchor: ' + label)
  s = s.split(from).join(to)
  console.log('ok', label)
}

rep("  if (/must be connected|No account/i.test(raw)) return 'Connect a wallet before continuing.'\n  return raw",
    "  if (/must be connected|No account/i.test(raw)) return 'Connect a wallet before continuing.'\n  if (isTransientRpc(raw)) return 'The RPC dropped the connection before it answered. Nothing is guaranteed to have changed, so check the latest state and try again.'\n  return raw",
    'readError transient')

rep("async function send(functionName, args, value = 0n) {",
    "const TRANSIENT_RPC = /Unexpected end of JSON input|Failed to execute 'json'|unknown RPC error|fetch failed|ECONNRESET|socket hang up|network error|timed out|timeout|502|503|504/i\n\nfunction isTransientRpc(value) {\n  const raw =\n    (value && value.details && String(value.details)) ||\n    (value && value.shortMessage && String(value.shortMessage)) ||\n    (value && value.message && String(value.message)) ||\n    String(value)\n  return TRANSIENT_RPC.test(raw)\n}\n\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))\n\nasync function send(functionName, args, value = 0n) {",
    'transient helpers')

rep("  const client = getClient()\n  const hash = await client.writeContract({\n    account: activeAccount(),\n    address: CONTRACT_ADDRESS,\n    functionName,\n    args,\n    value,\n  })\n  const receipt = await client.waitForTransactionReceipt({\n    hash,\n    status: TransactionStatus.ACCEPTED,\n    retries: 400,\n    interval: 3000,\n  })\n",
    "  const client = getClient()\n\n  // Studionet occasionally answers with an empty body. Retry the transport a few\n  // times instead of failing the whole write on one dropped response.\n  let hash = null\n  for (let attempt = 0; ; attempt += 1) {\n    try {\n      hash = await client.writeContract({\n        account: activeAccount(),\n        address: CONTRACT_ADDRESS,\n        functionName,\n        args,\n        value,\n      })\n      break\n    } catch (error) {\n      if (attempt >= 1 || !isTransientRpc(error)) throw new Error(readError(error))\n      await sleep(1800)\n    }\n  }\n\n  let receipt = null\n  for (let attempt = 0; ; attempt += 1) {\n    try {\n      receipt = await client.waitForTransactionReceipt({\n        hash,\n        status: TransactionStatus.ACCEPTED,\n        retries: 400,\n        interval: 3000,\n      })\n      break\n    } catch (error) {\n      if (attempt >= 3 || !isTransientRpc(error)) throw new Error(readError(error))\n      await sleep(2500)\n    }\n  }\n",
    'resilient send')

fs.writeFileSync(p, s, 'utf8')
console.log('genlayer.js updated')