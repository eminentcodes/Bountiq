import { readFileSync, writeFileSync } from 'node:fs'
const m = 'src/main.jsx'
let ml = readFileSync(m, 'utf8')
const start = ml.indexOf('function WalletButton(')
const end = ml.indexOf('function AppShell({ children, page, setPage }) {')
if (start === -1 || end === -1) throw new Error('wallet component block not found')

const MODAL = [
'function WalletButton({ full = false }) {',
'  const wallet = useWallet()',
'  const [open, setOpen] = useState(false)',
'  const [busy, setBusy] = useState(false)',
'  const [error, setError] = useState("")',
'  const [copied, setCopied] = useState(false)',
'',
'  useEffect(() => {',
'    if (!open) return',
'    const onKey = (e) => { if (e.key === "Escape") setOpen(false) }',
'    window.addEventListener("keydown", onKey)',
'    document.body.style.overflow = "hidden"',
'    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = "" }',
'  }, [open])',
'',
'  const connect = async () => {',
'    setBusy(true); setError("")',
'    try { await connectBrowserWallet(); setOpen(false) }',
'    catch (e) { setError(e && e.message ? e.message : "Could not connect the wallet.") }',
'    finally { setBusy(false) }',
'  }',
'',
'  const copy = async () => {',
'    try { await navigator.clipboard.writeText(wallet.address); setCopied(true); window.setTimeout(() => setCopied(false), 1600) } catch {}',
'  }',
'',
'  return <>',
'    <button onClick={() => setOpen(true)} className={(full ? "w-full justify-center " : "") + "glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#405467] transition hover:text-[#0d1a2b]"}>',
'      {wallet.address ? <><span className="size-2 rounded-full bg-[#69a882]"/>{shortAddress(wallet.address)}</> : <><Wallet size={14}/>Connect wallet</>}',
'    </button>',
'',
'    {open && <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} className="fixed inset-0 z-[100] grid place-items-center bg-[#0d1a2b]/40 p-4 backdrop-blur-sm">',
'      <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-md rounded-[22px] p-7 text-left shadow-2xl">',
'        <div className="mb-5 flex items-start justify-between gap-4">',
'          <div>',
'            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">{wallet.address ? "Wallet connected" : "Connect a wallet"}</p>',
'            <h2 className="mt-2 font-display text-2xl font-bold tracking-[-.04em]">{wallet.address ? "Your GenLayer session" : "Sign in to Bountiq"}</h2>',
'          </div>',
'          <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-lg leading-none text-[#718396] transition hover:text-[#0d1a2b]">×</button>',
'        </div>',
'',
'        {wallet.address ? <>',
'          <p className="text-sm leading-relaxed text-[#526274]">Submissions and new bounties are signed by this account on GenLayer Studionet.</p>',
'          <div className="mt-5 rounded-xl bg-white/45 p-4">',
'            <p className="text-[10px] font-bold uppercase tracking-wider text-[#607486]">Address</p>',
'            <p className="mt-1.5 break-all font-display text-xs font-semibold text-[#0d1a2b]">{wallet.address}</p>',
'            <p className="mt-3 text-xs text-[#718396]">Network · Studionet</p>',
'          </div>',
'          <div className="mt-5 grid gap-2">',
'            <button onClick={copy} className="flex items-center justify-center gap-2 rounded-xl bg-white/55 px-4 py-3 text-xs font-semibold text-[#405467]"><Copy size={14}/>{copied ? "Copied" : "Copy address"}</button>',
'            <a href={explorerLink(wallet.address)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-white/55 px-4 py-3 text-xs font-semibold text-[#405467]"><ExternalLink size={14}/>View on explorer</a>',
'            <button onClick={disconnectWallet} className="flex items-center justify-center gap-2 rounded-xl bg-[#0c1a2b] px-4 py-3 text-xs font-semibold text-white"><LogOut size={14}/>Disconnect wallet</button>',
'          </div>',
'        </> : <>',
'          <p className="text-sm leading-relaxed text-[#526274]">Bountiq does not create or store keys. Connect an injected browser wallet such as MetaMask to sign your transactions.</p>',
'          <button disabled={busy} onClick={connect} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1a2b] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Waiting for your wallet..." : "Connect browser wallet"}</button>',
'          {!hasBrowserWallet() && <p className="mt-4 rounded-xl bg-[#f6e7cd]/60 p-3 text-[11px] leading-relaxed text-[#8a6320]">No injected wallet detected. Install MetaMask (or another EIP-1193 wallet, including the GenLayer snap) and reload this page.</p>}',
'          {error && <p className="mt-4 text-[11px] leading-relaxed text-[#8a3f2c]">{error}</p>}',
'        </>}',
'      </div>',
'    </div>}',
'  </>',
'}',
''
].join('\n')

ml = ml.slice(0, start) + MODAL + ml.slice(end)
ml = ml.replace('shortAddress, explorerLink, isConfigured, getState, subscribe, restoreWallet, connectDemoWallet, connectBrowserWallet, disconnectWallet, hasBrowserWallet',
                'shortAddress, explorerLink, isConfigured, getState, subscribe, restoreWallet, connectBrowserWallet, disconnectWallet, hasBrowserWallet')
writeFileSync(m, ml)
console.log('centered modal applied; demo wallet references remaining:', (ml.match(/connectDemoWallet/g) || []).length)