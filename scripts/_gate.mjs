import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/main.jsx'
let text = readFileSync(path, 'utf8')
const sub = (from, to, label) => {
  if (!text.includes(from)) throw new Error('anchor not found: ' + label)
  text = text.replace(from, to)
}

sub('  const bounty = selected\n', '  const bounty = selected\n  const wallet = useWallet()\n', 'submit wallet hook')

sub(
  '<button disabled={!value.trim()} onClick={submit} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Submit for review <ArrowUpRight className="ml-3 inline size-4"/></button>',
  '{wallet.address ? <button disabled={!value.trim()} onClick={submit} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Submit for review <ArrowUpRight className="ml-3 inline size-4"/></button> : <WalletButton full/>}',
  'submit button gate'
)

sub('  const filled = criteria.filter', '  const wallet = useWallet()\n  const filled = criteria.filter', 'create wallet hook')

sub(
  '<button disabled={!ready || phase === \'publishing\'} onClick={publish} className="sm:col-span-2 rounded-xl bg-[#0c1a2b] px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{phase === \'publishing\' ? \'Publishing to GenLayer...\' : \'Create and fund bounty\'} <Plus className="ml-3 inline size-4"/></button>',
  '{wallet.address ? <button disabled={!ready || phase === \'publishing\'} onClick={publish} className="sm:col-span-2 rounded-xl bg-[#0c1a2b] px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{phase === \'publishing\' ? \'Publishing to GenLayer...\' : \'Create and fund bounty\'} <Plus className="ml-3 inline size-4"/></button> : <div className="sm:col-span-2"><WalletButton full/></div>}',
  'create button gate'
)

writeFileSync(path, text)
console.log('gating wired in')