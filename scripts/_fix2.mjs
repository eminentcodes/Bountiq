import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/main.jsx'
let s = readFileSync(path, 'utf8')
const from = '  useEffect(() => {\n    load()\n    restoreWallet()'
if (!s.includes(from)) throw new Error('mount effect anchor missing')
// The landing page renders static showcase content, so it must not touch the contract.
s = s.replace(from, "  useEffect(() => {\n    if (pageFromPath() !== 'home') load()\n    restoreWallet()")
writeFileSync(path, s)
console.log('landing no longer loads the contract')