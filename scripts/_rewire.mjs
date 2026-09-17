// One-shot rewiring of src/main.jsx: mock data -> GenLayer contract.
import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/main.jsx'
const lines = readFileSync(path, 'utf8').split(/\r?\n/)
const B = (s) => s.split('\n')

const IMPORTS = "import { fetchBounties, fetchBounty, createBounty, submitWork as submitWorkToChain, getAccount, shortAddress, explorerLink, isConfigured } from './lib/genlayer'"

const FALLBACK = B(`const ICONS = { sparkles: Sparkles, file: FileCheck2, search: Search }

// Marketing preview content. Replaced by live contract data as soon as the
// on-chain read resolves, so the landing page never renders empty.
const FALLBACK_BOUNTIES = [
  { id: 'b1', title: 'Audit a landing page for clarity', description: 'Review the copy of a developer tool landing page and propose concrete improvements.', reward: '5 GEN', deadline: '2 days left', color: 'bg-[#c8def0]', icon: 'sparkles', criteria: ['Three actionable improvements', 'Clear reasoning for each suggestion', 'Under 500 words'], status: 'open', verdict: '', score: 0, summary: '', results: [] },
  { id: 'b2', title: 'Write a beginner GenLayer guide', description: 'Create a clear, practical introduction to GenLayer for a first-time reader.', reward: '12 GEN', deadline: '5 days left', color: 'bg-[#d8d8ec]', icon: 'file', criteria: ['Explains the core concept accurately', 'Includes one working example', 'Written for a beginner'], status: 'open', verdict: '', score: 0, summary: '', results: [] },
  { id: 'b3', title: 'Test the onboarding experience', description: 'Use the product as a brand new user and document where you got stuck.', reward: '8 GEN', deadline: '1 week left', color: 'bg-[#ecd7cc]', icon: 'search', criteria: ['Three specific friction points', 'Steps to reproduce each issue', 'Prioritized by user impact'], status: 'open', verdict: '', score: 0, summary: '', results: [] },
]`)

const BOUNTIES = B(`function Bounties({ setPage, setSelected, bounties, loading, error }) { return <main className="mx-auto max-w-[1180px] py-16"><div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Open now</p><h1 className="font-display text-5xl font-bold tracking-[-.06em]">Find your next <span className="text-[#6b8299]">challenge.</span></h1></div><div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-[#526274]"><Search size={16}/> {loading ? 'Reading contract...' : bounties.length + ' on GenLayer'}</div></div>{error && <div className="mb-6 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]">{error}</div>}<div className="border-t border-[#6b8299]/25">{bounties.map(b => <BountyRow key={b.id} bounty={b} onClick={() => {setSelected(b);setPage('submit')}} />)}</div></main> }`)

const SUBMIT = B(`function Submit({ selected, setPage, onSubmitted }) {
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const bounty = selected

  if (!bounty) return <main className="mx-auto max-w-[700px] py-24 text-center"><p className="text-sm text-[#526274]">Pick a bounty from the marketplace to submit work.</p><button onClick={() => setPage('bounties')} className="mt-6 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Browse bounties</button></main>

  const submit = async () => {
    setPhase('submitting'); setError('')
    try {
      await submitWorkToChain(bounty.id, value)
      const fresh = await fetchBounty(bounty.id)
      setResult(fresh); setPhase('done')
      if (onSubmitted) onSubmitted()
    } catch (e) {
      setError(e && e.message ? e.message : 'The submission could not be completed.')
      setPhase('error')
    }
  }

  return <main className="mx-auto grid max-w-[1000px] gap-8 py-16 lg:grid-cols-[.8fr_1.2fr]"><section><button onClick={() => setPage('bounties')} className="mb-8 text-sm text-[#526274]">← Back to bounties</button><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Submit work · {bounty.id}</p><h1 className="font-display text-4xl font-bold tracking-[-.06em]">{bounty.title}</h1><p className="mt-4 leading-relaxed text-[#526274]">{bounty.description}</p><div className="mt-8"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#607486]">Acceptance criteria</p>{(bounty.criteria || []).map(c => <p key={c} className="mb-2 text-sm"><Check className="mr-2 inline size-4 text-[#4b8d69]"/>{c}</p>)}</div><div className="mt-8 rounded-xl bg-white/40 p-4 text-xs text-[#526274]"><div className="flex justify-between py-1"><span>Reward</span><strong>{bounty.reward}</strong></div><div className="flex justify-between py-1"><span>Deadline</span><strong>{bounty.deadline}</strong></div><div className="flex justify-between py-1"><span>Status</span><strong>{bounty.status}</strong></div></div></section><section className="glass rounded-[22px] p-6 sm:p-8">{phase === 'done' && result ? <Result bounty={result} setPage={setPage} /> : phase === 'submitting' ? <div className="py-16 text-center"><div className="mx-auto mb-5 size-10 animate-spin rounded-full border-2 border-[#9fb5c8] border-t-[#0c1a2b]"/><p className="font-display text-lg font-bold">Validators are evaluating your work</p><p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#526274]">GenLayer is running the evaluation across the validator committee. This usually takes under a minute and the verdict is written on chain.</p></div> : <><label className="mb-2 block text-sm font-semibold">Your deliverable</label><textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Paste the work you completed..." className="min-h-64 w-full resize-y rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-4 text-sm outline-none placeholder:text-[#7b8c9d] focus:border-[#0c1a2b]"/>{error && <p className="mt-4 text-sm text-[#8a3f2c]">{error}</p>}<div className="mt-5 flex flex-wrap items-center justify-between gap-4"><span className="text-xs text-[#718295]"><ShieldCheck className="mr-1 inline size-4"/>Evaluated by GenLayer validators</span><button disabled={!value.trim()} onClick={submit} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Submit for review <ArrowUpRight className="ml-3 inline size-4"/></button></div></>}</section></main>
}

function Result({ bounty, setPage }) {
  const verdict = bounty.verdict || 'approved'
  const tone = verdict === 'approved' ? { ring: 'bg-[#d6ecdf] text-[#4b8d69]', label: 'Verified outcome', title: 'Submission approved', note: 'The work satisfies the published criteria. The reward is queued for release.', pay: 'Payment queued' } : verdict === 'revision' ? { ring: 'bg-[#f6e7cd] text-[#9a6b21]', label: 'Changes requested', title: 'Revision required', note: 'The validators found criteria that were not yet met. Improve the work and submit again.', pay: 'Reward held' } : { ring: 'bg-[#f3ded9] text-[#8a3f2c]', label: 'Not accepted', title: 'Submission rejected', note: 'The work does not meet the published agreement. The bounty stays closed for this submission.', pay: 'No payment' }
  const results = bounty.results || []
  return <div><div className={'mb-6 flex size-12 items-center justify-center rounded-full ' + tone.ring}><Check/></div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">{tone.label}</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">{tone.title}</h2><p className="mt-3 text-sm leading-relaxed text-[#526274]">{bounty.summary || tone.note}</p><div className="mt-7 space-y-4">{results.map(r => <div key={r.criterion} className="rounded-xl bg-white/30 p-4"><div className="flex items-start justify-between gap-3"><strong className="text-sm">{r.criterion}</strong><span className={'shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ' + (r.passed ? 'bg-[#d6ecdf] text-[#4b8d69]' : 'bg-[#f3ded9] text-[#8a3f2c]')}>{r.passed ? 'Met' : 'Missed'}</span></div><p className="mt-2 text-xs leading-relaxed text-[#526274]">{r.reason}</p></div>)}</div><div className="mt-6 space-y-3 rounded-xl bg-white/30 p-4 text-sm"><div className="flex justify-between"><span>Quality score</span><strong>{bounty.score} / 100</strong></div><div className="flex justify-between"><span>Reward</span><strong>{bounty.reward}</strong></div><div className="flex justify-between"><span>Status</span><strong className={verdict === 'approved' ? 'text-[#4b8d69]' : 'text-[#8a3f2c]'}>{tone.pay}</strong></div></div><button onClick={() => setPage('bounties')} className="mt-6 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Explore more bounties <ArrowUpRight className="ml-3 inline size-4"/></button></div>
}`)

const CREATE = B(`function Create({ setPage, onCreated }) {
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [criteria, setCriteria] = useState(['', '', ''])
  const [reward, setReward] = useState('')
  const [deadline, setDeadline] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const filled = criteria.filter(c => c.trim()).length
  const ready = title.trim() && brief.trim() && filled > 0 && reward.trim() && deadline.trim()

  const setCriterion = (index, value) => setCriteria(prev => prev.map((c, i) => i === index ? value : c))

  const publish = async () => {
    setPhase('publishing'); setError('')
    try {
      await createBounty({ title, brief, criteria, reward, deadline })
      if (onCreated) await onCreated()
      setPhase('idle')
      setPage('bounties')
    } catch (e) {
      setError(e && e.message ? e.message : 'The bounty could not be published.')
      setPhase('error')
    }
  }

  return <main className="mx-auto max-w-[850px] py-16"><button onClick={() => setPage('home')} className="mb-8 text-sm text-[#526274]">← Back home</button><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Create a bounty</p><h1 className="font-display text-5xl font-bold tracking-[-.06em]">Make the outcome<br/><span className="text-[#6b8299]">the agreement.</span></h1><div className="glass mt-10 grid gap-5 rounded-[22px] p-6 sm:grid-cols-2 sm:p-8"><label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Bounty title</span><input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="What needs to be done?"/></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Brief</span><textarea value={brief} onChange={e => setBrief(e.target.value)} className="min-h-32 w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="Describe the outcome and context..."/></label><div className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Acceptance criteria</span><p className="mb-3 text-xs text-[#718396]">These are published before work starts and are what validators check.</p><div className="space-y-3">{criteria.map((c, i) => <input key={i} value={c} onChange={e => setCriterion(i, e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 text-sm outline-none" placeholder={'Criterion ' + (i + 1)}/>)}</div><button onClick={() => setCriteria(prev => [...prev, ''])} className="mt-3 text-xs font-semibold text-[#405467]">+ Add criterion</button></div><label><span className="mb-2 block text-sm font-semibold">Reward</span><input value={reward} onChange={e => setReward(e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="10 GEN"/></label><label><span className="mb-2 block text-sm font-semibold">Deadline</span><input value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="7 days"/></label>{error && <p className="sm:col-span-2 text-sm text-[#8a3f2c]">{error}</p>}<button disabled={!ready || phase === 'publishing'} onClick={publish} className="sm:col-span-2 rounded-xl bg-[#0c1a2b] px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{phase === 'publishing' ? 'Publishing to GenLayer...' : 'Create and fund bounty'} <Plus className="ml-3 inline size-4"/></button></div></main>
}`)

const APP = B(`function App() {
  const [page, setCurrentPage] = useState(pageFromPath)
  const [selected, setSelected] = useState(null)
  const [bounties, setBounties] = useState(FALLBACK_BOUNTIES)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

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
    const handlePop = () => setCurrentPage(pageFromPath())
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const setPage = (next) => {
    const paths = { home: '/', bounties: '/app/bounties', submit: '/app/submit', create: '/app/create' }
    window.history.pushState({}, '', paths[next])
    setCurrentPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (next !== 'home') load()
  }

  if (page === 'home') return <LandingShell setPage={setPage}><Home setPage={setPage} setSelected={setSelected} bounties={bounties}/></LandingShell>
  const view = page === 'bounties' ? <Bounties setPage={setPage} setSelected={setSelected} bounties={bounties} loading={loading} error={loadError}/> : page === 'submit' ? <Submit selected={selected} setPage={setPage} onSubmitted={load}/> : <Create setPage={setPage} onCreated={load}/>
  return <AppShell page={page} setPage={setPage}>{view}</AppShell>
}`)

const out = []
let i = 0
while (i < lines.length) {
  const lineNo = i + 1
  const line = lines[i]

  if (lineNo === 6) { out.push(line, IMPORTS); i++; continue }
  if (lineNo === 8) { out.push(...FALLBACK); i += 5; continue }
  if (lineNo === 49) { out.push('function Home({ setPage, setSelected, bounties }) {'); i++; continue }
  if (lineNo === 69 || lineNo === 71) {
    out.push(line
      .replace('function BountyRow({ bounty, onClick }) { return', 'function BountyRow({ bounty, onClick }) { const Icon = ICONS[bounty.icon] || Sparkles; return')
      .replace('function BountyPreview({ bounty }) { return', 'function BountyPreview({ bounty }) { const Icon = ICONS[bounty.icon] || Sparkles; return')
      .replace('<bounty.icon size={19}/>', '<Icon size={19}/>'))
    i++; continue
  }
  if (lineNo === 75) { out.push(...BOUNTIES); i++; continue }
  if (lineNo === 77) { out.push(...SUBMIT); i += 2; continue }
  if (lineNo === 80) { out.push(...CREATE); i++; continue }
  if (lineNo === 92) { out.push(...APP); i = 105; continue }
  out.push(line); i++
}

let text = out.join('\n')
text = text.replace(
  '<button onClick={() => setPage(\'create\')} className="rounded-xl bg-[#0c1a2b] px-4 py-3 text-xs font-semibold text-white">New bounty <Plus className="ml-2 inline size-3.5"/></button>',
  '<div className="flex items-center gap-2"><a href={explorerLink(getAccount().address)} target="_blank" rel="noreferrer" className="glass hidden rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#405467] sm:block">{shortAddress(getAccount().address)}</a><button onClick={() => setPage(\'create\')} className="rounded-xl bg-[#0c1a2b] px-4 py-3 text-xs font-semibold text-white">New bounty <Plus className="ml-2 inline size-3.5"/></button></div>'
)
writeFileSync(path, text)
console.log('rewired', path, '->', text.split('\n').length, 'lines')