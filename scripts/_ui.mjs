import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/main.jsx'
const lines = readFileSync(path, 'utf8').split(/\r?\n/)
const B = (s) => s.split('\n')

const BOUNTY_ROW = B(`function BountyRow({ bounty, onClick, mine }) { const Icon = ICONS[bounty.icon] || Sparkles; const v = bounty.verdict; const chip = v === 'approved' ? 'bg-[#d6ecdf] text-[#4b8d69]' : v === 'revision' ? 'bg-[#f6e7cd] text-[#9a6b21]' : v === 'rejected' ? 'bg-[#f3ded9] text-[#8a3f2c]' : null; return <button onClick={onClick} className="grid w-full grid-cols-[44px_1fr_86px_20px] items-center gap-3 border-b border-[#6b8299]/20 py-5 text-left transition hover:bg-white/25 sm:grid-cols-[44px_1fr_110px_24px] sm:gap-4"><span className={\`grid size-11 place-items-center rounded-xl \${bounty.color}\`}><Icon size={19}/></span><span><span className="flex flex-wrap items-center gap-2"><strong className="font-display text-sm sm:text-base">{bounty.title}</strong>{chip && <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + chip}>{v}</span>}{mine && !chip && <span className="rounded-md bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">Yours</span>}</span><small className="mt-1 hidden text-xs text-[#647587] sm:block">{bounty.description}</small></span><span className="text-right"><strong className="block text-sm">{bounty.reward}</strong><small className="text-[10px] text-[#718295] sm:text-[11px]">{bounty.deadline}</small></span><ChevronRight size={18}/></button> }`)

const BOUNTIES = B(`function Bounties({ bounties, loading, error, onOpen, wallet }) {
  const [panel, setPanel] = useState(false)
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const mine = me ? bounties.filter((b) => (b.contributor || '').toLowerCase() === me && b.verdict) : []
  const chip = (v) => v === 'approved' ? 'bg-[#d6ecdf] text-[#4b8d69]' : v === 'revision' ? 'bg-[#f6e7cd] text-[#9a6b21]' : 'bg-[#f3ded9] text-[#8a3f2c]'

  return <main className="mx-auto max-w-[1180px] py-16">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Live on GenLayer</p>
        <h1 className="font-display text-5xl font-bold tracking-[-.06em]">Bounties<span className="text-[#6b8299]">.</span></h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button onClick={() => setPanel((o) => !o)} aria-label="Your submission activity" className="glass relative grid size-11 place-items-center rounded-xl text-[#405467] transition hover:text-[#0d1a2b]"><Bell size={17}/>{mine.length > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#0c1a2b] text-[10px] font-bold text-white">{mine.length}</span>}</button>
          {panel && <div className="glass absolute right-0 top-[52px] z-50 w-80 rounded-2xl p-4 shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Your submissions</p>
            {mine.length === 0
              ? <p className="mt-3 text-xs leading-relaxed text-[#526274]">{me ? 'You have not submitted work yet. Open a bounty to take part.' : 'Connect a wallet to track the bounties you have submitted to.'}</p>
              : <div className="mt-3 grid gap-2">{mine.map((b) => <button key={b.id} onClick={() => { setPanel(false); onOpen(b) }} className="rounded-xl bg-white/45 p-3 text-left transition hover:bg-white/70"><span className="flex items-center justify-between gap-2"><strong className="text-xs">{b.title}</strong><span className={'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + chip(b.verdict)}>{b.verdict}</span></span><span className="mt-1 block text-[11px] text-[#718396]">Score {b.score}/100 · {b.reward}</span></button>)}</div>}
          </div>}
        </div>
        <div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-[#526274]"><Search size={16}/>{loading ? 'Reading contract...' : bounties.length + ' total'}</div>
      </div>
    </div>
    {error && <div className="mb-6 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]">{error}</div>}
    <div className="border-t border-[#6b8299]/25">{bounties.map((b) => <BountyRow key={b.id} bounty={b} mine={Boolean(me) && (b.contributor || '').toLowerCase() === me} onClick={() => onOpen(b)}/>)}</div>
  </main>
}`)

const SUBMIT = B(`function Submit({ selected, setPage, onSubmitted, wallet }) {
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [bounty, setBounty] = useState(selected)
  const [checking, setChecking] = useState(false)
  const bountyId = selected ? selected.id : null

  // Reload the bounty from the contract on entry so a submission made earlier is
  // recovered from on-chain state rather than component memory.
  useEffect(() => {
    setValue(''); setError(''); setPhase('idle'); setBounty(selected)
    if (!bountyId) return undefined
    let alive = true
    setChecking(true)
    fetchBounty(bountyId)
      .then((fresh) => { if (alive && fresh) setBounty({ ...fresh, description: fresh.brief, color: selected && selected.color, icon: selected && selected.icon }) })
      .catch(() => {})
      .finally(() => { if (alive) setChecking(false) })
    return () => { alive = false }
  }, [bountyId])

  if (!bounty) return <main className="mx-auto max-w-[700px] py-24 text-center"><p className="text-sm text-[#526274]">Pick a bounty to see its agreement and your submission.</p><button onClick={() => setPage('bounties')} className="mt-6 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Browse bounties</button></main>

  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const mine = Boolean(me) && (bounty.contributor || '').toLowerCase() === me
  const verdict = bounty.verdict || ''
  const decided = mine && Boolean(verdict)
  const closed = !decided && bounty.status !== 'open'

  const submit = async () => {
    setPhase('submitting'); setError('')
    try {
      await submitWorkToChain(bounty.id, value)
      const fresh = await fetchBounty(bounty.id)
      if (fresh) setBounty({ ...fresh, description: fresh.brief, color: bounty.color, icon: bounty.icon })
      setPhase('idle')
      if (onSubmitted) onSubmitted()
    } catch (e) {
      setError(e && e.message ? e.message : 'The submission could not be completed.')
      setPhase('error')
    }
  }

  return <main className="mx-auto grid max-w-[1000px] gap-8 py-16 lg:grid-cols-[.8fr_1.2fr]">
    <section>
      <button onClick={() => setPage('bounties')} className="mb-8 text-sm text-[#526274]">← Back to bounties</button>
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">{decided ? 'Your submission' : 'Submit work'} · {bounty.id}</p>
      <h1 className="font-display text-4xl font-bold tracking-[-.06em]">{bounty.title}</h1>
      <p className="mt-4 leading-relaxed text-[#526274]">{bounty.description}</p>
      <div className="mt-8"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#607486]">Acceptance criteria</p>{(bounty.criteria || []).map((c) => <p key={c} className="mb-2 text-sm"><Check className="mr-2 inline size-4 text-[#4b8d69]"/>{c}</p>)}</div>
      <div className="mt-8 rounded-xl bg-white/40 p-4 text-xs text-[#526274]"><div className="flex justify-between py-1"><span>Reward</span><strong>{bounty.reward}</strong></div><div className="flex justify-between py-1"><span>Deadline</span><strong>{bounty.deadline}</strong></div><div className="flex justify-between py-1"><span>Status</span><strong>{decided ? verdict : bounty.status}</strong></div></div>
    </section>
    <section className="glass rounded-[22px] p-6 sm:p-8">
      {decided ? <div>
        <Result bounty={bounty} setPage={setPage}/>
        {bounty.submission && <div className="mt-6 rounded-xl bg-white/30 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#607486]">Your deliverable</p><p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#526274]">{bounty.submission}</p></div>}
      </div> : checking ? <div className="py-16 text-center text-sm text-[#718396]">Reading this bounty from the contract...</div> : closed ? <div className="py-12 text-center"><p className="font-display text-lg font-bold">This bounty is closed</p><p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#526274]">It already received a submission from another contributor.</p><button onClick={() => setPage('bounties')} className="mt-6 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Find another bounty</button></div> : <>
        <label className="mb-2 block text-sm font-semibold">Your deliverable</label>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the work you completed..." className="min-h-64 w-full resize-y rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-4 text-sm outline-none placeholder:text-[#7b8c9d] focus:border-[#0c1a2b]"/>
        {error && <p className="mt-4 text-sm text-[#8a3f2c]">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><span className="text-xs text-[#718295]"><ShieldCheck className="mr-1 inline size-4"/>Evaluated by GenLayer validators</span>{wallet.address ? <button disabled={!value.trim()} onClick={submit} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Submit for review <ArrowUpRight className="ml-3 inline size-4"/></button> : <WalletButton full/>}</div>
        {phase === 'submitting' && <div className="mt-6 rounded-xl bg-white/40 p-4 text-center"><p className="font-display text-sm font-bold">Validators are evaluating your work</p><p className="mt-2 text-xs leading-relaxed text-[#526274]">The verdict is written on chain once the committee agrees. This usually takes under a minute.</p></div>}
      </>}
    </section>
  </main>
}`)

const PAGEFROM = B(`const pageFromPath = () => {
  const path = window.location.pathname
  if (path === '/app/create') return 'create'
  if (path === '/app/submit') return 'submit'
  if (path === '/about') return 'home'
  return 'bounties'
}`)

const APP = B(`function App() {
  const [page, setCurrentPage] = useState(pageFromPath)
  const [selectedId, setSelectedId] = useState(() => { try { return window.sessionStorage.getItem('bountiq.selected') } catch { return null } })
  const [bounties, setBounties] = useState(FALLBACK_BOUNTIES)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const wallet = useWallet()

  const load = async () => {
    setLoading(true)
    try {
      const live = await fetchBounties()
      if (live.length > 0) setBounties(live)
      setLoadError(isConfigured() ? '' : 'Contract address is not configured. Set VITE_BOUNTIQ_CONTRACT.')
    } catch (e) {
      setLoadError(e && e.message ? e.message : 'Could not reach the GenLayer contract.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    restoreWallet()
    const handlePop = () => setCurrentPage(pageFromPath())
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const remember = (id) => {
    try { window.sessionStorage.setItem('bountiq.selected', id) } catch {}
    setSelectedId(id)
  }

  const navigate = (next) => {
    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }
    window.history.pushState({}, '', paths[next])
    setCurrentPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (next === 'bounties') load()
  }

  const openBounty = (bounty) => { remember(bounty.id); navigate('submit') }
  const selected = (selectedId && bounties.find((b) => b.id === selectedId)) || null

  if (page === 'home') return <LandingShell setPage={navigate}><Home setPage={navigate} setSelected={(b) => remember(b.id)} bounties={bounties}/></LandingShell>

  const view = page === 'bounties'
    ? <Bounties bounties={bounties} loading={loading} error={loadError} wallet={wallet} onOpen={openBounty}/>
    : page === 'submit'
      ? <Submit selected={selected} setPage={navigate} onSubmitted={load} wallet={wallet}/>
      : <Create setPage={navigate} onCreated={load}/>

  return <AppShell page={page} setPage={navigate}>{view}</AppShell>
}`)

const out = []
let i = 0
while (i < lines.length) {
  const lineNo = i + 1
  if (lineNo === 145) { out.push(...BOUNTY_ROW); i++; continue }
  if (lineNo === 151) { out.push(...BOUNTIES); i++; continue }
  if (lineNo === 153) { out.push(...SUBMIT); i = 177; continue }
  if (lineNo === 219) { out.push(...PAGEFROM); i = 225; continue }
  if (lineNo === 227) { out.push(...APP); i = 266; continue }
  out.push(lines[i]); i++
}

let text = out.join('\n')
const sub = (from, to, label) => {
  if (!text.includes(from)) throw new Error('missing: ' + label)
  text = text.replace(from, to)
}
sub('ShieldCheck, Sparkles, Wallet, LogOut, Copy }', 'ShieldCheck, Sparkles, Wallet, LogOut, Copy, Bell }', 'bell icon')
sub("[['bounties','Marketplace'],['submit','Submit work'],['create','Post bounty']]", "[['bounties','Bounties'],['submit','Submit work'],['create','Post bounty']]", 'nav label')
sub('Marketplace preview', 'Bounty preview', 'home eyebrow')
sub(">Enter marketplace <ArrowUpRight", ">Browse bounties <ArrowUpRight", 'home cta')

writeFileSync(path, text)
console.log('rewired ->', text.split('\n').length, 'lines')