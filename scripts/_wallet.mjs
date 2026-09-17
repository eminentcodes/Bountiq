import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/main.jsx'
let text = readFileSync(path, 'utf8')
const before = text

const sub = (from, to, label) => {
  if (!text.includes(from)) throw new Error('anchor not found: ' + label)
  text = text.replace(from, to)
}

// 1. icons
sub('ShieldCheck, Sparkles }', 'ShieldCheck, Sparkles, Wallet, LogOut, Copy }', 'lucide imports')

// 2. genlayer imports
sub(
  "import { fetchBounties, fetchBounty, createBounty, submitWork as submitWorkToChain, getAccount, shortAddress, explorerLink, isConfigured } from './lib/genlayer'",
  "import { fetchBounties, fetchBounty, createBounty, submitWork as submitWorkToChain, shortAddress, explorerLink, isConfigured, getState, subscribe, restoreWallet, connectDemoWallet, connectBrowserWallet, disconnectWallet, hasBrowserWallet } from './lib/genlayer'",
  'genlayer imports'
)

// 3. wallet hook + connect/disconnect control, inserted before AppShell
const WALLET = `
function useWallet() {
  const [wallet, setWallet] = useState(getState())
  useEffect(() => subscribe(setWallet), [])
  return wallet
}

function WalletButton({ full = false }) {
  const wallet = useWallet()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const run = async (action) => {
    setBusy(true); setError('')
    try { await action(); setOpen(false) } catch (e) { setError(e && e.message ? e.message : 'The wallet action failed.') } finally { setBusy(false) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(wallet.address); setCopied(true); window.setTimeout(() => setCopied(false), 1600) } catch {}
  }

  return <div className={full ? 'relative w-full' : 'relative'}>
    {wallet.address
      ? <button onClick={() => setOpen(o => !o)} className={(full ? 'w-full justify-between ' : '') + 'glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#405467] transition hover:text-[#0d1a2b]'}><span className="size-2 shrink-0 rounded-full bg-[#69a882]"/><span className="truncate">{shortAddress(wallet.address)}</span><ChevronDown size={14} className={'shrink-0 transition ' + (open ? 'rotate-180' : '')}/></button>
      : <button onClick={() => setOpen(o => !o)} className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#405467] transition hover:text-[#0d1a2b]"><Wallet size={14}/>Connect wallet</button>}
    {open && <div className="glass absolute right-0 top-[52px] z-50 w-72 rounded-2xl p-4 text-left shadow-xl">
      {wallet.address ? <>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Connected</p>
        <p className="mt-2 break-all font-display text-xs font-semibold text-[#0d1a2b]">{wallet.address}</p>
        <p className="mt-1 text-xs text-[#718396]">{wallet.mode === 'browser' ? 'Browser wallet' : 'Demo wallet held in this browser'} · Studionet</p>
        <div className="mt-4 grid gap-2">
          <button onClick={copy} className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-xs font-semibold text-[#405467]"><Copy size={13}/>{copied ? 'Copied' : 'Copy address'}</button>
          <a href={explorerLink(wallet.address)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-xs font-semibold text-[#405467]"><ExternalLink size={13}/>View on explorer</a>
          <button onClick={() => run(disconnectWallet)} className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-xs font-semibold text-[#8a3f2c]"><LogOut size={13}/>Disconnect</button>
        </div>
      </> : <>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Connect a wallet</p>
        <p className="mt-2 text-xs leading-relaxed text-[#526274]">Submitting work and posting bounties are signed by your wallet on GenLayer Studionet.</p>
        <div className="mt-4 grid gap-2">
          <button disabled={busy} onClick={() => run(connectBrowserWallet)} className="rounded-xl bg-[#0c1a2b] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Browser wallet</button>
          <button disabled={busy} onClick={() => run(connectDemoWallet)} className="rounded-xl bg-white/50 px-3 py-2.5 text-xs font-semibold text-[#405467] disabled:opacity-40">Demo wallet (no extension)</button>
        </div>
        {!hasBrowserWallet() && <p className="mt-3 text-[11px] leading-relaxed text-[#718396]">No browser wallet detected. A demo wallet is created locally and works immediately.</p>}
        {error && <p className="mt-3 text-[11px] leading-relaxed text-[#8a3f2c]">{error}</p>}
      </>}
    </div>}
  </div>
}
`
sub('function AppShell({ children, page, setPage }) {', WALLET + '\nfunction AppShell({ children, page, setPage }) {', 'insert wallet components')

// 4. swap the passive address chip for the real control
const chip = text.match(/<div className="flex items-center gap-2"><a href=\{explorerLink\(getAccount\(\)\.address\)\}[\s\S]*?<\/div>/)
if (!chip) throw new Error('anchor not found: address chip')
text = text.replace(chip[0], '<div className="flex items-center gap-2"><WalletButton/><button onClick={() => setPage(\'create\')} className="rounded-xl bg-[#0c1a2b] px-4 py-3 text-xs font-semibold text-white">New bounty <Plus className="ml-2 inline size-3.5"/></button></div>')

// 5. gate submissions behind a connection
sub(
  '<span className="text-xs text-[#718295]"><ShieldCheck className="mr-1 inline size-4"/>Evaluated by GenLayer validators</span>',
  '<span className="text-xs text-[#718295]"><ShieldCheck className="mr-1 inline size-4"/>Evaluated by GenLayer validators</span>',
  'validators label'
)

// 6. restore the previous wallet on boot
sub(
  '  useEffect(() => {\n    load()\n    const handlePop',
  '  useEffect(() => {\n    load()\n    restoreWallet()\n    const handlePop',
  'restore wallet on mount'
)

if (text === before) throw new Error('no changes applied')
writeFileSync(path, text)
console.log('wallet UI wired in')