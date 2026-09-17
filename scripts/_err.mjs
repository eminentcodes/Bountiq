import { readFileSync, writeFileSync } from 'node:fs'
const g = 'src/lib/genlayer.js'
let s = readFileSync(g, 'utf8')

const from = "function readError(error) {\n  const raw = error?.message ?? String(error)"
if (!s.includes(from)) throw new Error('readError anchor missing')
s = s.replace(
  from,
  "function readError(error) {\n  // viem wraps wallet failures, so prefer the wallet's own wording.\n  const raw =\n    (error?.details && String(error.details)) ||\n    (error?.shortMessage && String(error.shortMessage)) ||\n    (error?.message && String(error.message)) ||\n    String(error)"
)
writeFileSync(g, s)
console.log('readError improved')