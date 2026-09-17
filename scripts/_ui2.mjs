import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/main.jsx'
const lines = readFileSync(path, 'utf8').split(/\r?\n/)
const B = (s) => s.split('\n')

const ROW = B(`function BountyRow({ bounty, onClick, mine }) { const Icon = ICONS[bounty.icon] || Sparkles; const v = bounty.verdict; const full = isFull(bounty); return <button onClick={onClick} className="grid w-full grid-cols-[44px_1fr_92px_20px] items-center gap-3 border-b border-[#6b8299]/20 py-5 text-left transition hover:bg-white/25 sm:grid-cols-[44px_1fr_120px_24px] sm:gap-4"><span className={\`grid size-11 place-items-center rounded-xl \${bounty.color}\`}><Icon size={19}/></span><span><span className="flex flex-wrap items-center gap-2"><strong className="font-display text-sm sm:text-base">{bounty.title}</strong>{!full && <span className="rounded-md bg-[#d6ecdf] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4b8d69]">Open</span>}{full && <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">Filled</span>}{mine && <span className="rounded-md bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">Yours</span>}</span><small className="mt-1 hidden text-xs text-[#647587] sm:block">{bounty.description}</small></span><span className="text-right"><strong className="block text-sm">{bounty.reward}</strong><small className="text-[10px] text-[#718295] sm:text-[11px]">{bounty.submissionCount || 0}/{bounty.slots} submitted</small></span><ChevronRight size={18}/></button> }`)

const BOUNTIES = B(`function Bounties({ bounties, loading, error, onOpen, wallet, submissions }) {
  const [panel, setPanel] = useState(false)
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const mine = me ? submissions.filter((s) => (s.contributor || '').toLowerCase() === me) : []
  const titleOf = (id) => { const b = bounties.find((x) => x.id === id); return b ? b.title : id }
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
              : <div className="mt-3 grid gap-2">{mine.map((s) => <button key={s.id} onClick={() => { setPanel(false); onOpen(bounties.find((b) => b.id === s.bountyId) || null) }} className="rounded-xl bg-white/45 p-3 text-left transition hover:bg-white/70"><span className="flex items-center justify-between gap-2"><strong className="text-xs">{titleOf(s.bountyId)}</strong><span className={'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + chip(s.verdict)}>{s.verdict}</span></span><span className="mt-1 block text-[11px] text-[#718396]">Score {s.score}/100 · payment {s.payment}</span></button>)}</div>}
          </div>}
        </div>
        <div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-[#526274]"><Search size={16}/>{loading ? 'Reading contract...' : bounties.length + ' total'}</div>
      </div>
    </div>
    {error && <div className="mb-6 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]">{error}</div>}
    <div className="border-t border-[#6b8299]/25">{bounties.map((b) => <BountyRow key={b.id} bounty={b} mine={Boolean(me) && (b.requester || '').toLowerCase() === me} onClick={() => onOpen(b)}/>)}</div>
  </main>
}`)

const SUBMIT = B(`function Submit({ selected, setPage, onSubmitted, onOpen, wallet, bounties, submissions }) {
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const mine = me ? submissions.filter((s) => (s.contributor || '').toLowerCase() === me) : []
  const titleOf = (id) => { const b = bounties.find((x) => x.id === id); return b ? b.title : id }
  const chip = (v) => v === 'approved' ? 'bg-[#d6ecdf] text-[#4b8d69]' : v === 'revision' ? 'bg-[#f6e7cd] text-[#9a6b21]' : 'bg-[#f3ded9] text-[#8a3f2c]'

  useEffect(() => { setValue(''); setError(''); setPhase('idle') }, [selected && selected.id])

  // No bounty chosen: show everything this wallet has submitted plus what is still open.
  if (!selected) {
    const open = bounties.filter((b) => !isFull(b))
    return <main className="mx-auto max-w-[1080px] py-16">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Submit work</p>
      <h1 className="font-display text-5xl font-bold tracking-[-.06em]">Your work,<br/><span className="text-[#6b8299]">and what is open.</span></h1>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#607486]">Your submissions</h2>
        {!me ? <p className="rounded-[22px] bg-white/40 p-6 text-sm leading-relaxed text-[#526274]">Connect a wallet to see the work you have submitted, its verdict and its payment status.</p>
          : mine.length === 0 ? <p className="rounded-[22px] bg-white/40 p-6 text-sm leading-relaxed text-[#526274]">You have not submitted anything yet. Pick a bounty below to take part.</p>
          : <div className="grid gap-3">{mine.map((s) => <button key={s.id} onClick={() => onOpen(bounties.find((b) => b.id === s.bountyId) || null)} className="glass grid gap-3 rounded-[22px] p-5 text-left transition hover:-translate-y-0.5 sm:grid-cols-[1fr_auto] sm:items-center"><span><span className="flex flex-wrap items-center gap-2"><strong className="font-display text-base">{titleOf(s.bountyId)}</strong><span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + chip(s.verdict)}>{s.verdict}</span><span className="rounded-md bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">creator: {s.review}</span></span><span className="mt-2 block text-xs leading-relaxed text-[#526274]">{s.summary}</span></span><span className="text-right"><span className="block font-display text-lg font-bold">{s.score}<span className="text-xs font-normal text-[#718396]">/100</span></span><span className="text-[11px] text-[#718396]">payment {s.payment}</span></span></button>)}</div>}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#607486]">Open for submissions</h2>
        {open.length === 0 ? <p className="rounded-[22px] bg-white/40 p-6 text-sm text-[#526274]">Every bounty has collected the submissions it asked for.</p>
          : <div className="border-t border-[#6b8299]/25">{open.map((b) => <BountyRow key={b.id} bounty={b} onClick={() => onOpen(b)}/>)}</div>}
      </section>
    </main>
  }

  const bounty = selected
  const mySubmission = submissions.find((s) => s.bountyId === bounty.id && (s.contributor || '').toLowerCase() === me)
  const decided = Boolean(mySubmission)
  const full = isFull(bounty) && !decided

  const submit = async () => {
    setPhase('submitting'); setError('')
    try {
      await submitWorkToChain(bounty.id, value)
      if (onSubmitted) await onSubmitted()
      setPhase('idle')
    } catch (e) {
      setError(e && e.message ? e.message : 'The submission could not be completed.')
      setPhase('error')
    }
  }

  return <main className="mx-auto grid max-w-[1000px] gap-8 py-16 lg:grid-cols-[.8fr_1.2fr]">
    <section>
      <button onClick={() => setPage('submit')} className="mb-8 text-sm text-[#526274]">← All work</button>
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">{decided ? 'Your submission' : 'Submit work'} · {bounty.id}</p>
      <h1 className="font-display text-4xl font-bold tracking-[-.06em]">{bounty.title}</h1>
      <p className="mt-4 leading-relaxed text-[#526274]">{bounty.description}</p>
      <div className="mt-8"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#607486]">Acceptance criteria</p>{(bounty.criteria || []).map((c) => <p key={c} className="mb-2 text-sm"><Check className="mr-2 inline size-4 text-[#4b8d69]"/>{c}</p>)}</div>
      <div className="mt-8 rounded-xl bg-white/40 p-4 text-xs text-[#526274]"><div className="flex justify-between py-1"><span>Reward</span><strong>{bounty.reward}</strong></div><div className="flex justify-between py-1"><span>Deadline</span><strong>{bounty.deadline}</strong></div><div className="flex justify-between py-1"><span>Submissions</span><strong>{bounty.submissionCount || 0} of {bounty.slots}</strong></div></div>
    </section>
    <section className="glass rounded-[22px] p-6 sm:p-8">
      {decided ? <div>
        <Result submission={mySubmission} reward={bounty.reward}/>
        {mySubmission.content && <div className="mt-6 rounded-xl bg-white/30 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#607486]">Your deliverable</p><p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#526274]">{mySubmission.content}</p></div>}
      </div> : full ? <div className="py-12 text-center"><p className="font-display text-lg font-bold">Submissions are full</p><p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#526274]">This bounty collected the {bounty.slots} submissions the creator asked for. It may reopen if the creator requests more.</p><button onClick={() => setPage('submit')} className="mt-6 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Find another bounty</button></div> : <>
        <label className="mb-2 block text-sm font-semibold">Your deliverable</label>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the work you completed..." className="min-h-64 w-full resize-y rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-4 text-sm outline-none placeholder:text-[#7b8c9d] focus:border-[#0c1a2b]"/>
        {error && <p className="mt-4 text-sm text-[#8a3f2c]">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><span className="text-xs text-[#718295]"><ShieldCheck className="mr-1 inline size-4"/>Evaluated by GenLayer validators</span>{wallet.address ? <button disabled={!value.trim() || phase === 'submitting'} onClick={submit} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{phase === 'submitting' ? 'Evaluating...' : 'Submit for review'} <ArrowUpRight className="ml-3 inline size-4"/></button> : <WalletButton full/>}</div>
        {phase === 'submitting' && <div className="mt-6 rounded-xl bg-white/40 p-4 text-center"><p className="font-display text-sm font-bold">Validators are evaluating your work</p><p className="mt-2 text-xs leading-relaxed text-[#526274]">The verdict is written on chain once the committee agrees. This usually takes under a minute.</p></div>}
      </>}
    </section>
  </main>
}`)

const RESULT = B(`function Result({ submission, reward }) {
  const verdict = (submission && submission.verdict) || 'approved'
  const tone = verdict === 'approved' ? { ring: 'bg-[#d6ecdf] text-[#4b8d69]', label: 'GenLayer verdict', title: 'Submission approved', pay: 'Payment queued' } : verdict === 'revision' ? { ring: 'bg-[#f6e7cd] text-[#9a6b21]', label: 'GenLayer verdict', title: 'Revision required', pay: 'Reward held' } : { ring: 'bg-[#f3ded9] text-[#8a3f2c]', label: 'GenLayer verdict', title: 'Submission rejected', pay: 'No payment' }
  const results = (submission && submission.results) || []
  const review = (submission && submission.review) || 'pending'
  const payment = (submission && submission.payment) || 'held'
  const pending = review === 'pending'
  return <div>
    <div className={'mb-6 flex size-12 items-center justify-center rounded-full ' + tone.ring}><Check/></div>
    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">{tone.label}</p>
    <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">{tone.title}</h2>
    <p className="mt-3 text-sm leading-relaxed text-[#526274]">{submission && submission.summary}</p>
    <div className="mt-7 space-y-4">{results.map((r) => <div key={r.criterion} className="rounded-xl bg-white/30 p-4"><div className="flex items-start justify-between gap-3"><strong className="text-sm">{r.criterion}</strong><span className={'shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ' + (r.passed ? 'bg-[#d6ecdf] text-[#4b8d69]' : 'bg-[#f3ded9] text-[#8a3f2c]')}>{r.passed ? 'Met' : 'Missed'}</span></div><p className="mt-2 text-xs leading-relaxed text-[#526274]">{r.reason}</p></div>)}</div>
    <div className="mt-6 space-y-3 rounded-xl bg-white/30 p-4 text-sm"><div className="flex justify-between"><span>Quality score</span><strong>{submission && submission.score} / 100</strong></div><div className="flex justify-between"><span>Reward</span><strong>{reward}</strong></div><div className="flex justify-between"><span>GenLayer verdict</span><strong className={verdict === 'approved' ? 'text-[#4b8d69]' : 'text-[#8a3f2c]'}>{tone.pay}</strong></div><div className="flex justify-between"><span>Creator review</span><strong>{review}</strong></div><div className="flex justify-between"><span>Payment</span><strong>{payment}</strong></div></div>
    {pending && <p className="mt-4 rounded-xl bg-[#f6e7cd]/50 p-3 text-[11px] leading-relaxed text-[#8a6320]">The bounty creator can still review this by hand. Payment is released only after they approve it.</p>}
  </div>
}`)

const CREATE = B(`function Create({ setPage, onCreated, wallet, bounties, submissions }) {
  const [tab, setTab] = useState('create')
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [criteria, setCriteria] = useState(['', '', ''])
  const [reward, setReward] = useState('')
  const [deadline, setDeadline] = useState('')
  const [slots, setSlots] = useState('1')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [expanded, setExpanded] = useState(null)
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const myBounties = me ? bounties.filter((b) => (b.requester || '').toLowerCase() === me) : []
  const forBounty = (id) => submissions.filter((s) => s.bountyId === id)
  const filled = criteria.filter((c) => c.trim()).length
  const ready = title.trim() && brief.trim() && filled > 0 && reward.trim() && deadline.trim() && Number(slots) >= 1

  const setCriterion = (i, v) => setCriteria((prev) => prev.map((c, x) => (x === i ? v : c)))

  const publish = async () => {
    setPhase('publishing'); setError('')
    try {
      await createBounty({ title, brief, criteria, reward, deadline, slots })
      setTitle(''); setBrief(''); setCriteria(['', '', '']); setReward(''); setDeadline(''); setSlots('1')
      if (onCreated) await onCreated()
      setPhase('idle'); setTab('manage')
    } catch (e) {
      setError(e && e.message ? e.message : 'The bounty could not be published.')
      setPhase('error')
    }
  }

  const act = async (key, fn) => {
    setBusy(key); setError('')
    try { await fn(); if (onCreated) await onCreated() }
    catch (e) { setError(e && e.message ? e.message : 'That action could not be completed.') }
    finally { setBusy('') }
  }

  const tabs = [['create', 'Create'], ['manage', 'Manage ' + (myBounties.length ? '(' + myBounties.length + ')' : '')]]

  return <main className="mx-auto max-w-[980px] py-16">
    <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Post bounty</p>
    <h1 className="font-display text-5xl font-bold tracking-[-.06em]">Set the terms,<br/><span className="text-[#6b8299]">then judge the work.</span></h1>

    <div className="mt-8 flex gap-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={'rounded-xl px-4 py-2.5 text-xs font-semibold transition ' + (tab === key ? 'bg-[#0c1a2b] text-white' : 'glass text-[#405467]')}>{label}</button>)}</div>

    {error && <div className="mt-6 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]">{error}</div>}

    {tab === 'create' ? <div className="glass mt-6 grid gap-5 rounded-[22px] p-6 sm:grid-cols-2 sm:p-8">
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Bounty title</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="What needs to be done?"/></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Brief</span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} className="min-h-32 w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="Describe the outcome and context..."/></label>
      <div className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Acceptance criteria</span><p className="mb-3 text-xs text-[#718396]">Published before work starts, and what the validators check.</p><div className="space-y-3">{criteria.map((c, i) => <input key={i} value={c} onChange={(e) => setCriterion(i, e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 text-sm outline-none" placeholder={'Criterion ' + (i + 1)}/>)}</div><button onClick={() => setCriteria((prev) => [...prev, ''])} className="mt-3 text-xs font-semibold text-[#405467]">+ Add criterion</button></div>
      <label><span className="mb-2 block text-sm font-semibold">Reward</span><input value={reward} onChange={(e) => setReward(e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="10 GEN"/></label>
      <label><span className="mb-2 block text-sm font-semibold">Deadline</span><input value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none" placeholder="7 days"/></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Submissions wanted</span><p className="mb-3 text-xs text-[#718396]">The bounty stays open until it collects this many submissions.</p><input type="number" min="1" max="50" value={slots} onChange={(e) => setSlots(e.target.value)} className="w-32 rounded-xl border border-[#9fb5c8]/50 bg-white/45 p-3 outline-none"/></label>
      {wallet.address ? <button disabled={!ready || phase === 'publishing'} onClick={publish} className="sm:col-span-2 rounded-xl bg-[#0c1a2b] px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{phase === 'publishing' ? 'Publishing to GenLayer...' : 'Create bounty'} <Plus className="ml-3 inline size-4"/></button> : <div className="sm:col-span-2"><WalletButton full/></div>}
    </div> : <div className="mt-6">
      {!me ? <WalletButton full/>
        : myBounties.length === 0 ? <p className="rounded-[22px] bg-white/40 p-6 text-sm leading-relaxed text-[#526274]">You have not posted a bounty yet. Create one to start collecting submissions.</p>
        : <div className="grid gap-4">{myBounties.map((b) => {
            const subs = forBounty(b.id)
            const open = expanded === b.id
            return <div key={b.id} className="glass rounded-[22px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="flex flex-wrap items-center gap-2"><strong className="font-display text-lg">{b.title}</strong><span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + (isFull(b) ? 'bg-white/70 text-[#607486]' : 'bg-[#d6ecdf] text-[#4b8d69]')}>{b.status}</span></span>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#526274]">{b.brief}</p>
                  <p className="mt-2 text-[11px] text-[#718396]">{b.reward} · {b.deadline} · {subs.length} of {b.slots} submissions</p>
                </div>
                <button onClick={() => setExpanded(open ? null : b.id)} className="rounded-xl bg-white/55 px-4 py-2.5 text-xs font-semibold text-[#405467]">{open ? 'Hide submissions' : 'Manage submissions'}</button>
              </div>
              {open && <div className="mt-5 border-t border-[#6b8299]/25 pt-5">
                {subs.length === 0 ? <p className="text-xs text-[#718396]">No submissions yet.</p> : <div className="grid gap-3">{subs.map((s) => <div key={s.id} className="rounded-xl bg-white/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-2"><strong className="font-display text-sm">{s.id}</strong><span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + (s.verdict === 'approved' ? 'bg-[#d6ecdf] text-[#4b8d69]' : s.verdict === 'revision' ? 'bg-[#f6e7cd] text-[#9a6b21]' : 'bg-[#f3ded9] text-[#8a3f2c]')}>{s.verdict}</span><span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">{s.score}/100</span><span className="text-[11px] text-[#718396]">from {shortAddress(s.contributor)}</span></span>
                    <span className="text-[11px] text-[#718396]">payment: <strong className="text-[#405467]">{s.payment}</strong> · review: <strong className="text-[#405467]">{s.review}</strong></span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#526274]">{s.summary}</p>
                  <div className="mt-3 grid gap-2">{s.results.map((r) => <p key={r.criterion} className="text-[11px] leading-relaxed text-[#526274]"><span className={'mr-2 font-bold ' + (r.passed ? 'text-[#4b8d69]' : 'text-[#8a3f2c]')}>{r.passed ? 'MET' : 'MISSED'}</span>{r.criterion} — {r.reason}</p>)}</div>
                  <details className="mt-3"><summary className="cursor-pointer text-[11px] font-semibold text-[#405467]">View deliverable</summary><p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[#526274]">{s.content}</p></details>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={busy === s.id + 'a'} onClick={() => act(s.id + 'a', () => reviewSubmission(s.id, 'accepted'))} className="rounded-xl bg-[#0c1a2b] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-40">Accept</button>
                    <button disabled={busy === s.id + 'd'} onClick={() => act(s.id + 'd', () => reviewSubmission(s.id, 'declined'))} className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#8a3f2c] disabled:opacity-40">Decline</button>
                    <button disabled={busy === s.id + 'p' || s.review !== 'accepted' || s.payment !== 'held'} onClick={() => act(s.id + 'p', () => approvePayment(s.id))} className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#405467] disabled:cursor-not-allowed disabled:opacity-40">Approve payment</button>
                    <button disabled={busy === s.id + 'm' || s.payment !== 'approved'} onClick={() => act(s.id + 'm', () => markPaid(s.id))} className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#405467] disabled:cursor-not-allowed disabled:opacity-40">Mark paid</button>
                  </div>
                </div>)}</div>}
              </div>}
            </div>
          })}</div>}
    </div>}
  </main>
}`)

const APP = B(`function App() {
  const [page, setCurrentPage] = useState(pageFromPath)
  const [selectedId, setSelectedId] = useState(() => { try { return window.sessionStorage.getItem('bountiq.selected') } catch { return null } })
  const [bounties, setBounties] = useState(FALLBACK_BOUNTIES)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const wallet = useWallet()

  const load = async () => {
    setLoading(true)
    try {
      const live = await fetchState()
      if (live.bounties.length > 0) setBounties(live.bounties)
      setSubmissions(live.submissions)
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
    try { id ? window.sessionStorage.setItem('bountiq.selected', id) : window.sessionStorage.removeItem('bountiq.selected') } catch {}
    setSelectedId(id)
  }

  const navigate = (next) => {
    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }
    window.history.pushState({}, '', paths[next])
    if (next === 'submit' && !selectedId) { /* keep whatever was remembered */ }
    if (next === 'bounties') remember(null)
    setCurrentPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    load()
  }

  const openBounty = (bounty) => { if (!bounty) return; remember(bounty.id); navigate('submit') }
  const selected = (selectedId && bounties.find((b) => b.id === selectedId)) || null

  if (page === 'home') return <LandingShell setPage={navigate}><Home setPage={navigate} setSelected={(b) => remember(b.id)} bounties={bounties}/></LandingShell>

  const view = page === 'bounties'
    ? <Bounties bounties={bounties} submissions={submissions} loading={loading} error={loadError} wallet={wallet} onOpen={(b) => { if (!b) return; remember(b.id); navigate('submit') }}/>
    : page === 'submit'
      ? <Submit selected={selected} setPage={navigate} onSubmitted={load} onOpen={openBounty} wallet={wallet} bounties={bounties} submissions={submissions}/>
      : <Create setPage={navigate} onCreated={load} wallet={wallet} bounties={bounties} submissions={submissions}/>

  return <AppShell page={page} setPage={navigate}>{submissions.length ? view : view}</AppShell>
}`)

const out = []
let i = 0
while (i < lines.length) {
  const n = i + 1
  if (n === 145) { out.push(...ROW); i++; continue }
  if (n === 151) { out.push(...BOUNTIES); i = 179; continue }
  if (n === 181) { out.push(...SUBMIT); i = 247; continue }
  if (n === 249) { out.push(...RESULT); i = 254; continue }
  if (n === 256) { out.push(...CREATE); i = 285; continue }
  if (n === 297) { out.push(...APP); i = 351; continue }
  out.push(lines[i]); i++
}

let text = out.join('\n')
const sub = (from, to, label) => {
  if (!text.includes(from)) throw new Error('missing: ' + label)
  text = text.replace(from, to)
}
sub('ShieldCheck, Sparkles, Wallet, LogOut, Copy, Bell }', 'ShieldCheck, Sparkles, Wallet, LogOut, Copy, Bell, Users, X, Banknote }', 'icons')
sub("import { fetchBounties, fetchBounty, createBounty, submitWork as submitWorkToChain, shortAddress, explorerLink, isConfigured, getState, subscribe, restoreWallet, connectBrowserWallet, disconnectWallet, hasBrowserWallet } from './lib/genlayer'",
    "import { fetchState, createBounty, submitWork as submitWorkToChain, reviewSubmission, approvePayment, markPaid, remainingSlots, isFull, shortAddress, explorerLink, isConfigured, getState, subscribe, restoreWallet, connectBrowserWallet, disconnectWallet, hasBrowserWallet } from './lib/genlayer'", 'lib imports')
sub("reward: '5 GEN', deadline: '2 days left',", "reward: '5 GEN', deadline: '2 days left', slots: 3, submissionCount: 0,", 'fallback b1')
sub("reward: '12 GEN', deadline: '5 days left',", "reward: '12 GEN', deadline: '5 days left', slots: 2, submissionCount: 0,", 'fallback b2')
sub("reward: '8 GEN', deadline: '1 week left',", "reward: '8 GEN', deadline: '1 week left', slots: 2, submissionCount: 0,", 'fallback b3')

writeFileSync(path, text)
console.log('rewired ->', text.split('\n').length, 'lines')