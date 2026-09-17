import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, ExternalLink, FileCheck2, Plus, Search, ShieldCheck, Sparkles, Wallet, LogOut, Copy, Bell, Users, X, Banknote } from 'lucide-react'
import { motion } from 'motion/react'
import './index.css'
import { Brand } from './components/Brand'
import { fetchState, createBounty, fundBounty, submitWork as submitWorkToChain, resubmitWork, reviewSubmission, approvePayment, markPaid, remainingSlots, isFull, shortAddress, explorerLink, transactionLink, formatGen, parseGenToWei, validateBountyDraft, isConfigured, getState, subscribe, restoreWallet, connectBrowserWallet, disconnectWallet, hasBrowserWallet } from './lib/genlayer'

const ICONS = { sparkles: Sparkles, file: FileCheck2, search: Search }

const STATUS_TONES = {
  green: 'bg-[#d6ecdf] text-[#4b8d69]',
  red: 'bg-[#f3ded9] text-[#8a3f2c]',
  amber: 'bg-[#f6e7cd] text-[#9a6b21]',
  grey: 'bg-white/70 text-[#607486]',
}

const poolLabel = (b) => (!b || b.poolUnlimited || !b.winners) ? 'Unlimited winners' : b.winners + (b.winners === 1 ? ' winner' : ' winners')

function submissionStatus(s) {
  if (!s) return { key: 'unknown', label: 'Unknown', chip: STATUS_TONES.grey, tone: 'grey' }
  if (s.payment === 'paid') return { key: 'paid', label: 'Paid', chip: STATUS_TONES.green, tone: 'green' }
  if (s.payment === 'approved') return { key: 'rewarded', label: 'Rewarded', chip: STATUS_TONES.green, tone: 'green' }
  if (s.review === 'declined') return { key: 'declined', label: 'Declined', chip: STATUS_TONES.red, tone: 'red' }
  if (s.verdict === 'approved') return { key: 'passed', label: 'Passed check', chip: STATUS_TONES.green, tone: 'green' }
  if (s.verdict === 'rejected') return { key: 'failed', label: 'Failed', chip: STATUS_TONES.red, tone: 'red' }
  if (s.verdict === 'revision') return { key: 'revision', label: 'Needs revision', chip: STATUS_TONES.amber, tone: 'amber' }
  return { key: 'pending', label: 'Pending', chip: STATUS_TONES.grey, tone: 'grey' }
}

function paymentLabel(s) {
  if (!s) return ''
  if (s.payment === 'paid') return 'payment released to your wallet'
  if (s.payment === 'approved') return 'selected for a reward'
  if (s.review === 'declined') return 'not selected by the creator'
  if (s.verdict === 'approved') return 'verified - awaiting the creator'
  return 'awaiting the creator decision'
}

function canRetry(s) {
  if (!s) return false
  return s.verdict !== 'approved' && s.payment !== 'approved' && s.payment !== 'paid'
}

function missedCriteria(s) {
  const missed = ((s && s.results) || []).filter((r) => !r.passed).map((r) => r.criterion)
  return missed.length > 0 ? 'Missed: ' + missed.join(', ') : 'No acceptance criterion was satisfied.'
}
// Marketing preview content for the public landing page. This is intentionally
// static: the landing page never reads the contract, so it always renders fast.
const PREVIEW_BOUNTIES = [
  { id: 'x1', title: 'Audit a landing page for clarity', description: 'Review the copy and suggest three improvements for a developer tool.', reward: '5 GEN', deadline: '2 days left', color: 'bg-[#c8def0]', icon: 'sparkles' },
  { id: 'x2', title: 'Write a beginner GenLayer guide', description: 'Create a clear, practical introduction with one working example.', reward: '12 GEN', deadline: '5 days left', color: 'bg-[#d8d8ec]', icon: 'file' },
  { id: 'x3', title: 'Test the onboarding experience', description: 'Use the product as a new user and document three points of friction.', reward: '8 GEN', deadline: '1 week left', color: 'bg-[#ecd7cc]', icon: 'search' },
]

// Static marketing content for the landing page preview. The landing page never
// reads the contract, so the public homepage always renders instantly.
const SHOWCASE_BOUNTIES = PREVIEW_BOUNTIES

// Shape the marketplace needs before the first on-chain read resolves.
const FALLBACK_BOUNTIES = PREVIEW_BOUNTIES.map((b) => ({
  ...b,
  criteria: [],
  slots: 3,
  submissionCount: 0,
  status: 'open',
  requester: '',
  brand: '',
  brandUrl: '',
  funded: false,
  escrow: '0 GEN',
  rewardTotal: '',
  escrowRemaining: '',
}))

const faqs = [
  ['What is Bountiq?', 'Bountiq is a bounty marketplace where the acceptance criteria are published before work begins and GenLayer helps verify the submitted outcome.'],
  ['How does GenLayer verify work?', 'The bounty brief, acceptance criteria, and deliverable are sent to an intelligent contract. Validators evaluate the same evidence and reach a consensus verdict.'],
  ['When does a contributor get paid?', 'A reward is queued for release after the submission satisfies the published criteria and receives an approved verdict.'],
  ['Can a submission be revised?', 'Yes. A verdict can request revision and explain which criteria were missed, allowing the contributor to improve and resubmit.'],
]

function LandingShell({ children, setPage }) {
  const goSection = (id) => {
    setPage('home')
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 0)
  }
  return <div className="page-bg min-h-dvh px-4 py-4 text-[#0d1a2b] sm:px-8 lg:px-16">
    <nav className="glass sticky top-4 z-30 mx-auto flex h-16 max-w-[1320px] items-center justify-between rounded-2xl px-4 sm:px-6">
      <button onClick={() => goSection('top')} aria-label="Bountiq home"><Brand /></button>
      <div className="hidden items-center gap-1 md:flex">{[['how','How it works'],['explore','Explore'],['verify','Verification'],['faq','FAQ']].map(([id,label]) => <button key={id} onClick={() => goSection(id)} className="rounded-xl px-4 py-2 text-sm text-[#405467] transition hover:bg-white/60 hover:text-[#0d1a2b]">{label}</button>)}</div>
      <button onClick={() => setPage('create')} className="rounded-xl bg-[#0c1a2b] px-4 py-3 text-xs font-semibold text-white transition hover:-translate-y-0.5">Post a bounty <ArrowUpRight className="ml-2 inline size-3.5" /></button>
    </nav>
    {children}
    <Footer goSection={goSection} setPage={setPage}/>
  </div>
}


function useWallet() {
  const [wallet, setWallet] = useState(getState())
  useEffect(() => subscribe(setWallet), [])
  return wallet
}

function WalletButton({ full = false }) {
  const wallet = useWallet()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = "" }
  }, [open])

  const connect = async () => {
    setBusy(true); setError("")
    try { await connectBrowserWallet(); setOpen(false) }
    catch (e) { setError(e && e.message ? e.message : "Could not connect the wallet.") }
    finally { setBusy(false) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(wallet.address); setCopied(true); window.setTimeout(() => setCopied(false), 1600) } catch {}
  }

  return <>
    <button onClick={() => setOpen(true)} className={(full ? "w-full justify-center " : "") + "glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#405467] transition hover:text-[#0d1a2b]"}>
      {wallet.address ? <><span className="size-2 rounded-full bg-[#69a882]"/>{shortAddress(wallet.address)}</> : <><Wallet size={14}/>Connect wallet</>}
    </button>

    {open && createPortal(<div role="dialog" aria-modal="true" onClick={() => setOpen(false)} className="fixed inset-0 z-[100] grid place-items-center bg-[#0d1a2b]/40 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-md rounded-[22px] p-7 text-left shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">{wallet.address ? "Wallet connected" : "Connect a wallet"}</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-[-.04em]">{wallet.address ? "Your GenLayer session" : "Sign in to Bountiq"}</h2>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-lg leading-none font-medium text-[#41566a] transition hover:text-[#0d1a2b]">×</button>
        </div>

        {wallet.address ? <>
          <p className="text-sm leading-relaxed text-[#3a4f61]">Submissions and new bounties are signed by this account on GenLayer Studionet.</p>
          <div className="mt-5 rounded-xl bg-white/45 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Address</p>
            <p className="mt-1.5 break-all font-display text-xs font-semibold text-[#0d1a2b]">{wallet.address}</p>
            <p className="mt-3 text-xs font-medium text-[#41566a]">Network · Studionet</p>
          </div>
          <div className="mt-5 grid gap-2">
            <button onClick={copy} className="flex items-center justify-center gap-2 rounded-xl bg-white/55 px-4 py-3 text-xs font-semibold text-[#405467]"><Copy size={14}/>{copied ? "Copied" : "Copy address"}</button>
            <a href={explorerLink(wallet.address)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-white/55 px-4 py-3 text-xs font-semibold text-[#405467]"><ExternalLink size={14}/>View on explorer</a>
            <button onClick={disconnectWallet} className="flex items-center justify-center gap-2 rounded-xl bg-[#0c1a2b] px-4 py-3 text-xs font-semibold text-white"><LogOut size={14}/>Disconnect wallet</button>
          </div>
        </> : <>
          <p className="text-sm leading-relaxed text-[#3a4f61]">Bountiq does not create or store keys. Connect an injected browser wallet such as MetaMask to sign your transactions.</p>
          <button disabled={busy} onClick={connect} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1a2b] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Waiting for your wallet..." : "Connect browser wallet"}</button>
          {!hasBrowserWallet() && <p className="mt-4 rounded-xl bg-[#f6e7cd]/60 p-3 text-[11px] leading-relaxed text-[#8a6320]">No injected wallet detected. Install MetaMask (or another EIP-1193 wallet, including the GenLayer snap) and reload this page.</p>}
          {error && <p className="mt-4 text-[11px] leading-relaxed text-[#8a3f2c]">{error}</p>}
        </>}
      </div>
    </div>, document.body)}
  </>
}
function LeaveConfirm({ onCancel, onConfirm }) {
  return <Modal onClose={onCancel} size="max-w-md">
    <StateMark tone="info"/>
    <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Leaving the app</p>
    <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Leave the workspace?</h2>
    <p className="mt-3 text-sm leading-relaxed text-[#3a4f61]">You are about to go back to the Bountiq landing page. Your wallet stays connected and nothing you have done is lost.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button onClick={onConfirm} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Leave to landing page</button>
      <button onClick={onCancel} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Stay in the app</button>
    </div>
  </Modal>
}

function AppShell({ children, page, setPage }) {
  const [leaving, setLeaving] = useState(false)
  const askToLeave = () => setLeaving(true)
  return <div className="page-bg min-h-dvh px-4 py-4 text-[#0d1a2b] sm:px-8 lg:px-16">
    <nav className="glass sticky top-4 z-30 mx-auto flex h-16 max-w-[1320px] items-center justify-between rounded-2xl px-4 sm:px-6">
      <button onClick={askToLeave} aria-label="Back to Bountiq landing page"><Brand /></button>
      <div className="hidden items-center gap-1 md:flex">{[['bounties','Bounties'],['submit','Submissions'],['create','Post bounty']].map(([key,label]) => <button key={key} onClick={() => setPage(key)} className={`rounded-xl px-4 py-2 text-sm transition ${page===key?'bg-white/70 font-semibold text-[#0d1a2b]':'text-[#405467] hover:bg-white/40'}`}>{label}</button>)}</div>
      <div className="flex items-center gap-2"><WalletButton/></div>
    </nav>
    {children}
    <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 border-t border-[#6b8299]/20 py-6 text-xs text-[#718396]"><button onClick={askToLeave}>← Back to Bountiq</button><span>App workspace · GenLayer testnet</span></div>
    {leaving ? <LeaveConfirm onCancel={() => setLeaving(false)} onConfirm={() => { setLeaving(false); setPage('home') }}/> : null}
  </div>
}

function Home({ setPage, setSelected }) {
  return <main id="top" className="mx-auto max-w-[1180px]">
    <section className="grid min-h-[570px] items-center gap-10 py-14 lg:grid-cols-2">
      <motion.div initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.65,ease:[.22,1,.36,1]}} className="max-w-xl"><p className="mb-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Verified work marketplace</p><h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-[-.06em] sm:text-7xl">Good work deserves to be <em className="not-italic text-[#55718c]">recognized.</em></h1><p className="my-7 max-w-md text-base leading-relaxed text-[#526274]">Post work, submit outcomes, and verify delivery in one transparent marketplace powered by GenLayer.</p><div className="flex flex-wrap items-center gap-6"><button onClick={() => setPage('bounties')} className="rounded-xl bg-[#0c1a2b] px-5 py-4 text-sm font-semibold text-white transition active:scale-[.98]">Browse bounties <ArrowUpRight className="ml-5 inline size-4" /></button><button onClick={() => document.getElementById('how')?.scrollIntoView({behavior:'smooth'})} className="text-sm font-semibold">See the flow <span className="ml-2">↓</span></button></div></motion.div>
      <motion.div initial={{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} transition={{duration:.8,delay:.12,ease:[.22,1,.36,1]}} className="relative grid min-h-[390px] place-items-center"><div className="absolute size-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.8),rgba(160,191,220,.3)_49%,transparent_70%)] blur-xl"/><motion.div animate={{y:[0,-8,0]}} transition={{duration:5,repeat:Infinity,ease:'easeInOut'}} className="relative size-36 rounded-full bg-[radial-gradient(circle_at_32%_25%,#fff_0_9%,#c2d3e3_34%,#61788e_74%,#eaf4fb_100%)] shadow-2xl"/><motion.div animate={{y:[0,7,0],x:[0,3,0]}} transition={{duration:6,repeat:Infinity,ease:'easeInOut'}} className="absolute -translate-x-36 -translate-y-16 size-16 rounded-full bg-[radial-gradient(circle_at_32%_25%,#fff,#8098ad)] shadow-xl"/><div className="glass absolute bottom-4 right-4 rounded-xl px-4 py-3 text-xs font-semibold"><span className="mr-2 inline-block size-2 rounded-full bg-[#69a882]"/>Work verified</div><div className="absolute bottom-20 right-28 grid size-7 place-items-center rounded-full bg-white text-[#3e9068]"><Check size={16}/></div></motion.div>
    </section>

    <section id="how" className="scroll-mt-28 border-t border-[#6b8299]/20 py-20"><div className="mb-12 grid gap-8 md:grid-cols-2"><div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">How it works</p><h2 className="font-display text-4xl font-bold tracking-[-.06em] sm:text-6xl">From brief to<br/><span className="text-[#6b8299]">verified outcome.</span></h2></div><p className="max-w-md self-end text-lg leading-relaxed text-[#526274]">One agreement moves through three clear states. Everything needed to participate starts on this page.</p></div><div className="grid gap-px overflow-hidden rounded-[22px] bg-white/40 md:grid-cols-3">{[['01','Post','Define the work, criteria, reward, and deadline.'],['02','Submit','A contributor claims the bounty and submits the result.'],['03','Verify','GenLayer evaluates the evidence before payment moves.']].map(([num,title,copy])=><article key={num} className="bg-[#dce8f1] p-7"><span className="font-display text-sm font-bold text-[#6b8299]">{num}</span><h3 className="mt-14 font-display text-2xl font-bold tracking-[-.04em]">{title}</h3><p className="mt-3 text-sm leading-relaxed text-[#526274]">{copy}</p></article>)}</div></section>

    <section id="explore" className="scroll-mt-28 py-20"><motion.div initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.35}} transition={{duration:.55}} className="mb-9"><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Bounty preview</p><h2 className="font-display text-4xl font-bold tracking-[-.06em] sm:text-6xl">Choose work.<br/><span className="text-[#6b8299]">Start immediately.</span></h2><p className="mt-5 max-w-md text-sm leading-relaxed text-[#526274]">A glimpse of the focused, outcome-based work available inside Bountiq.</p></motion.div><div className="pointer-events-none select-none border-t border-[#6b8299]/25" aria-label="Example bounties">{SHOWCASE_BOUNTIES.map((b,i) => <motion.div key={b.id} initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.7}} transition={{duration:.45,delay:i*.08}}><BountyPreview bounty={b}/></motion.div>)}</div></section>

    <section id="verify" className="scroll-mt-28 grid gap-5 py-20 md:grid-cols-2"><Feature title="Submit work without leaving the flow." eyebrow="For contributors" copy="Pick a bounty above, read its acceptance criteria, and send your deliverable directly into verification." action="Browse work" tone="blue" disabled note="Preview only. The live marketplace is inside the app." /><Feature title="Turn an outcome into an agreement." eyebrow="For requesters" copy="Describe what success looks like, set the reward, and publish a bounty from the same product experience." action="Post a bounty" tone="lilac" disabled note="Preview only. Posting opens inside the app." /></section>

    <Faq />
    <section className="my-20 rounded-[22px] bg-[#0c1a2b] px-7 py-14 text-white sm:px-14"><div className="grid items-end gap-8 md:grid-cols-[1fr_auto]"><div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#aebfd0]">Ready to enter</p><h2 className="font-display text-4xl font-bold tracking-[-.06em] sm:text-6xl">Make the outcome<br/><span className="text-[#9eb5ca]">the agreement.</span></h2></div><button onClick={() => setPage('create')} className="rounded-xl bg-white px-5 py-4 text-sm font-semibold text-[#0c1a2b]">Post a bounty <ArrowUpRight className="ml-4 inline size-4"/></button></div></section>
  </main>
}

function Feature({ title, eyebrow, copy, action, tone, onClick, disabled, note }) { return <article className={`min-h-[410px] overflow-hidden rounded-[22px] p-8 ${tone==='blue'?'bg-gradient-to-br from-[#ccdfef] to-[#b9cee0]':'bg-gradient-to-br from-[#d7deea] to-[#c8cadf]'}`}><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">{eyebrow}</p><h3 className="max-w-sm font-display text-4xl font-bold leading-tight tracking-[-.06em]">{title}</h3><p className="my-5 max-w-xs text-sm leading-relaxed text-[#54697b]">{copy}</p><button type="button" disabled={disabled} aria-disabled={disabled ? 'true' : undefined} onClick={disabled ? undefined : onClick} className={'rounded-xl px-4 py-3 text-xs font-semibold ' + (disabled ? 'cursor-not-allowed bg-[#0c1a2b]/20 text-[#3c4c5c]/70' : 'bg-[#0c1a2b] text-white')}>{action} <ArrowUpRight className="ml-4 inline size-3.5"/></button>{note ? <p className="mt-3 text-[11px] leading-relaxed text-[#54697b]">{note}</p> : null}<div className="mt-10 flex justify-end"><div className="glass rounded-2xl px-5 py-4 text-sm shadow-lg"><Check className="mr-2 inline size-4 text-[#4b8d69]"/>Verified outcome</div></div></article> }

function BountyRow({ bounty, onClick, mine }) {
  const Icon = ICONS[bounty.icon] || Sparkles
  const full = isFull(bounty)
  return <button onClick={onClick} className="grid w-full grid-cols-[44px_1fr_110px_20px] items-center gap-3 border-b border-[#6b8299]/20 py-5 text-left transition hover:bg-white/25 sm:grid-cols-[44px_1fr_170px_24px] sm:gap-4">
    <span className={'grid size-11 place-items-center rounded-xl ' + bounty.color}><Icon size={19}/></span>
    <span>
      <span className="flex flex-wrap items-center gap-2">
        <strong className="font-display text-sm sm:text-base">{bounty.title}</strong>
        {!full && <span className="rounded-md bg-[#d6ecdf] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4b8d69]">Open</span>}
        {full && <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">Filled</span>}
        {mine && <span className="rounded-md bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#607486]">Yours</span>}
        {bounty.brand ? <span className="rounded-md bg-[#d8d8ec] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4a4a7a]">{bounty.brand}</span> : null}
      </span>
      <small className="mt-1 hidden text-xs text-[#4c6173] sm:block">{bounty.description}</small>
    </span>
    <span className="text-right">
      <strong className="block text-sm">{bounty.reward}</strong>
      <small className="text-[10px] font-medium text-[#41566a] sm:text-[11px]">{bounty.submissionCount || 0}/{bounty.slots} submissions</small>
    </span>
    <ChevronRight size={18}/>
  </button>
}
function BountyPreview({ bounty }) { const Icon = ICONS[bounty.icon] || Sparkles; return <div className="grid w-full grid-cols-[44px_1fr_86px] items-center gap-3 border-b border-[#6b8299]/20 py-5 sm:grid-cols-[44px_1fr_110px] sm:gap-4"><span className={`grid size-11 place-items-center rounded-xl ${bounty.color}`}><Icon size={19}/></span><span><strong className="font-display text-sm sm:text-base">{bounty.title}</strong><small className="mt-1 hidden text-xs text-[#647587] sm:block">{bounty.description}</small></span><span className="text-right"><strong className="block text-sm">{bounty.reward}</strong><small className="text-[10px] text-[#718295] sm:text-[11px]">{bounty.deadline}</small></span></div> }

function Faq() { const [open,setOpen]=useState(0); return <section id="faq" className="scroll-mt-28 border-t border-[#6b8299]/20 py-20"><div className="grid gap-12 md:grid-cols-[.75fr_1.25fr]"><div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">FAQ</p><h2 className="font-display text-4xl font-bold tracking-[-.06em] sm:text-5xl">A clear system<br/><span className="text-[#6b8299]">needs clear answers.</span></h2></div><div className="border-t border-[#6b8299]/25">{faqs.map(([q,a],i)=><div key={q} className="border-b border-[#6b8299]/25"><button onClick={()=>setOpen(open===i?-1:i)} className="flex w-full items-center justify-between py-5 text-left font-display font-semibold"><span>{q}</span><ChevronDown size={18} className={`transition ${open===i?'rotate-180':''}`}/></button>{open===i&&<p className="max-w-xl pb-6 text-sm leading-relaxed text-[#526274]">{a}</p>}</div>)}</div></div></section> }

function Bounties({ bounties, loading, error, onSubmit, onManage, wallet, submissions, seen, onSeen }) {
  const [panel, setPanel] = useState(false)
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const mine = me ? submissions.filter((s) => (s.contributor || '').toLowerCase() === me) : []
  const unseen = mine.filter((s) => !seen.includes(s.id))
  const titleOf = (id) => { const b = bounties.find((x) => x.id === id); return b ? b.title : id }

  const togglePanel = () => {
    const next = !panel
    setPanel(next)
    if (next && unseen.length > 0) onSeen(unseen.map((s) => s.id))
  }

  return <main className="mx-auto max-w-[1180px] py-16">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Live on GenLayer</p>
        <h1 className="font-display text-5xl font-bold tracking-[-.06em]">Bounties<span className="text-[#6b8299]">.</span></h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#3a4f61]">Open a bounty to read its criteria and send your work. Rewards are released to the wallet you submit with.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button onClick={togglePanel} aria-label="Your submission activity" className="glass relative grid size-11 place-items-center rounded-xl text-[#405467] transition hover:text-[#0d1a2b]">
            <Bell size={17}/>
            {unseen.length > 0 ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#0c1a2b] text-[10px] font-bold text-white">{unseen.length}</span> : null}
          </button>
          {panel ? <div className="glass absolute right-0 top-[52px] z-50 w-80 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Your submissions</p>
              <button onClick={() => { setPanel(false); onManage() }} className="text-[11px] font-semibold text-[#405467]">Manage all</button>
            </div>
            {mine.length === 0
              ? <p className="mt-3 text-xs font-medium leading-relaxed text-[#41566a]">{me ? 'You have not submitted work yet. Open a bounty to take part.' : 'Connect a wallet to track the bounties you have submitted to.'}</p>
              : <div className="mt-3 grid gap-2">{mine.map((s) => { const st = submissionStatus(s); return <button key={s.id} onClick={() => { setPanel(false); onManage() }} className="rounded-xl bg-white/45 p-3 text-left transition hover:bg-white/70">
                  <span className="flex items-center justify-between gap-2"><strong className="text-xs">{titleOf(s.bountyId)}</strong><span className={'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + st.chip}>{st.label}</span></span>
                  <span className="mt-1 block text-[11px] font-medium text-[#41566a]">Score {s.score}/100 - {paymentLabel(s)}</span>
                </button> })}</div>}
          </div> : null}
        </div>
        <div className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-[#3a4f61]"><Search size={16}/>{loading ? 'Reading contract...' : bounties.length + ' total'}</div>
      </div>
    </div>
    {error ? <div className="mb-6 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]">{error}</div> : null}
    {loading && bounties.length === 0 ? <div className="rounded-[22px] bg-white/40 p-8 text-center text-sm text-[#3a4f61]">Reading the latest bounties from GenLayer...</div>
      : bounties.length === 0 ? <div className="glass rounded-[22px] p-10 text-center"><h2 className="font-display text-2xl font-bold">No bounties yet</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#3a4f61]">Nothing is live on this contract yet. Post the first bounty to get started.</p></div>
      : <div className="border-t border-[#6b8299]/25">{bounties.map((b) => <BountyRow key={b.id} bounty={b} mine={Boolean(me) && (b.requester || '').toLowerCase() === me} onClick={() => onSubmit(b)}/>)}</div>}
  </main>
}

function VerdictSummary({ submission, reward }) {
  const results = (submission && submission.results) || []
  const st = submissionStatus(submission)
  return <div>
    <div className="flex flex-wrap items-center gap-2">
      <span className={'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' + st.chip}>{st.label}</span>
      <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Score {submission ? submission.score : 0}/100</span>
      {reward ? <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">{reward}</span> : null}
    </div>
    <p className="mt-3 text-sm leading-relaxed text-[#3a4f61]">{submission ? submission.summary : ''}</p>
    {results.length > 0 ? <div className="mt-4 grid gap-3">{results.map((r) => <div key={r.criterion} className={'rounded-xl p-4 ' + (r.passed ? 'bg-[#d6ecdf]/45' : 'bg-[#f3ded9]/45')}>
      <div className="flex items-start justify-between gap-3">
        <strong className="text-sm text-[#23374a]">{r.criterion}</strong>
        <span className={'shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ' + (r.passed ? STATUS_TONES.green : STATUS_TONES.red)}>{r.passed ? 'Met' : 'Missed'}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#3a4f61]">{r.reason}</p>
    </div>)}</div> : null}
  </div>
}

function SubmitWorkPage({ target, submissions, bounties, wallet, onBack, onManage, onSubmitted }) {
  const bounty = target.bounty
  const live = (bounties || []).find((x) => x.id === bounty.id) || bounty
  const received = Number(live.submissionCount || 0)
  const needed = Number(live.slots || 0)
  const resubmitMode = target.mode === 'resubmit'
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const existing = resubmitMode
    ? submissions.find((s) => s.id === target.submissionId)
    : submissions.find((s) => s.bountyId === bounty.id && (s.contributor || '').toLowerCase() === me)
  const [value, setValue] = useState(existing && existing.content ? existing.content : '')
  const [phase, setPhase] = useState('form')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const full = isFull(bounty) && !resubmitMode

  const shell = (children) => <main className="mx-auto max-w-[1080px] py-16">
    <button onClick={onBack} className="mb-8 text-sm font-medium text-[#405467] transition hover:text-[#0d1a2b]">&larr; Back to bounties</button>
    <div className="glass rounded-[22px] p-6 sm:p-8">{children}</div>
  </main>

  const submit = async () => {
    if (!wallet.address) { setError('Connect a wallet before submitting work.'); return }
    if (!value.trim()) { setError('Paste the work you want verified before submitting.'); return }
    setPhase('submitting'); setError('')
    try {
      if (resubmitMode) await resubmitWork(target.submissionId, value)
      else await submitWorkToChain(bounty.id, value)
      const fresh = onSubmitted ? await onSubmitted() : null
      const list = (fresh && fresh.submissions) || []
      const found = resubmitMode
        ? list.find((s) => s.id === target.submissionId)
        : list.filter((s) => s.bountyId === bounty.id && (s.contributor || '').toLowerCase() === me).sort((a, z) => (a.id < z.id ? 1 : -1))[0]
      setResult(found || null)
      setPhase('success')
    } catch (e) {
      setError(e && e.message ? e.message : 'The submission could not be completed.')
      setPhase('error')
    }
  }

  if (phase === 'submitting') {
    return shell(<div className="grid place-items-center py-12 text-center">
      <span className="relative grid size-20 place-items-center">
        <span className="absolute size-20 animate-ping rounded-full bg-[#c8def0]/60"/>
        <span className="relative grid size-14 place-items-center rounded-full bg-[#dce8f1] text-[#3f5468]"><Sparkles size={24}/></span>
      </span>
      <p className="mt-7 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Evaluating</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Validators are scoring your work.</h2>
      <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-[#3a4f61]">Every acceptance criterion is checked against your deliverable. This usually takes under a minute, so keep this page open.</p>
      <div className="mt-7 flex items-center gap-1.5">
        <span className="size-2 animate-bounce rounded-full bg-[#3f5468]"/>
        <span className="size-2 animate-bounce rounded-full bg-[#3f5468]"/>
        <span className="size-2 animate-bounce rounded-full bg-[#3f5468]"/>
      </div>
    </div>)
  }

  if (phase === 'success') {
    const st = submissionStatus(result)
    const heading = st.tone === 'red' ? 'Your submission did not pass.' : st.tone === 'amber' ? 'Your submission needs changes.' : 'Your submission passed.'
    return shell(<div>
      <StateMark tone={st.tone === 'red' ? 'error' : 'success'}/>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Verification complete</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">{heading}</h2>
      <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-[#3a4f61]">The verdict is written on chain. Passing verification does not guarantee a reward - the bounty creator picks the winners from the pool.</p>
      <p className="mt-4 rounded-xl bg-white/50 p-3 text-[11px] font-semibold text-[#3f5468]">This bounty now has {received} of {needed} submissions. Your entry is one of them.</p>
      {result ? <div className="mt-6"><VerdictSummary submission={result} reward={bounty.reward}/></div> : null}
      <div className="mt-7 flex flex-wrap gap-3">
        <button onClick={onBack} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Back to bounties</button>
        <button onClick={onManage} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Manage my submissions</button>
        {result && canRetry(result) ? <button onClick={() => { setValue(result.content || ''); setPhase('form') }} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#8a3f2c]">Retry submission</button> : null}
      </div>
    </div>)
  }

  if (phase === 'error') {
    return shell(<div>
      <StateMark tone="error"/>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Submission failed</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">That did not go through.</h2>
      <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-[#3a4f61]">{error}</p>
      <p className="mt-3 rounded-xl bg-white/50 p-3 text-[11px] font-medium leading-relaxed text-[#41566a]">Nothing was written on chain. Your deliverable is still in the form.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button onClick={() => setPhase('form')} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Try again</button>
        <button onClick={onBack} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Back to bounties</button>
      </div>
    </div>)
  }

  return shell(<div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">{resubmitMode ? 'Retry submission' : 'Submit work'} - {bounty.id}</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">{bounty.title}</h1>
      <p className="mt-4 text-sm font-medium leading-relaxed text-[#3a4f61]">{bounty.description}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Reward</p><p className="mt-1 text-sm font-bold text-[#23374a]">{bounty.reward}</p></div>
        {bounty.winners > 0 ? <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Reward pool</p><p className="mt-1 text-sm font-bold text-[#23374a]">{bounty.winners === 1 ? '1 winner' : bounty.winners + ' winners'}</p></div> : null}
        {bounty.funded ? <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Escrow</p><p className="mt-1 text-sm font-bold text-[#23374a]">Funded</p></div> : null}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3f5468]">Acceptance criteria</p>
        {(bounty.criteria || []).map((c) => <p key={c} className="mb-1.5 text-sm font-medium text-[#3a4f61]"><Check className="mr-2 inline size-4 text-[#4b8d69]"/>{c}</p>)}
        {bounty.brand ? <p className="mt-3 text-[11px] font-semibold text-[#3f5468]">Brand: {bounty.brand}</p> : null}
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-[#41566a]">Deadline: {bounty.deadline}</p>
        <p className="mt-1 text-[11px] font-semibold text-[#3f5468]">{received} of {needed} submissions received{received < needed ? ' - ' + (needed - received) + ' places left' : ' - the gate is full'}</p>
      </div>
    </section>

    <section>
      {!wallet.address ? <div className="rounded-xl bg-white/50 p-6 text-center">
          <p className="text-sm font-semibold">Connect a wallet to submit work.</p>
          <p className="mt-2 text-[11px] font-medium text-[#41566a]">Rewards are released to the wallet you submit with, so this matters.</p>
          <div className="mt-4 flex justify-center"><WalletButton full/></div>
        </div>
        : full ? <div className="rounded-xl bg-white/50 p-6 text-center">
            <p className="font-display text-lg font-bold">This bounty is full</p>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-[#3a4f61]">It collected the {bounty.slots} submissions the creator asked for. Try another bounty.</p>
            <button onClick={onBack} className="mt-5 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Back to bounties</button>
          </div>
        : existing && !resubmitMode ? <div className="rounded-xl bg-white/50 p-6 text-center">
            <p className="font-display text-lg font-bold">You already submitted to this bounty</p>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-[#3a4f61]">Track it, or retry it if it did not pass, from your submissions page.</p>
            <button onClick={onManage} className="mt-5 rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Manage my submissions</button>
          </div>
        : <div>
          <label className="mb-2 block text-sm font-semibold">Your deliverable</label>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste the work you completed..." className="min-h-64 w-full resize-y rounded-xl border border-[#9fb5c8]/70 bg-white/60 p-4 text-sm text-[#1f3346] outline-none placeholder:text-[#5a6d7e] focus:border-[#0c1a2b]"/>
          {error ? <p className="mt-4 rounded-xl bg-[#f3ded9]/70 p-3 text-sm font-medium text-[#8a3f2c]">{error}</p> : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-medium text-[#41566a]"><ShieldCheck className="mr-1 inline size-4"/>Reward releases to {shortAddress(wallet.address)}</span>
            <button disabled={!value.trim()} onClick={submit} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{resubmitMode ? 'Resubmit for review' : 'Submit for review'} <ArrowUpRight className="ml-3 inline size-4"/></button>
          </div>
        </div>}
    </section>
  </div>)
}
function Submissions({ bounties, submissions, wallet, onRetry, onBrowse }) {
  const [openId, setOpenId] = useState(null)
  const [filter, setFilter] = useState('all')
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const mine = me ? submissions.filter((s) => (s.contributor || '').toLowerCase() === me) : []
  const titleOf = (id) => { const b = bounties.find((x) => x.id === id); return b ? b.title : id }
  const bountyOf = (id) => bounties.find((x) => x.id === id) || null
  const rows = mine.map((s) => ({ s, st: submissionStatus(s), b: bountyOf(s.bountyId) }))
  const counts = {
    all: rows.length,
    passed: rows.filter((r) => r.st.key === 'passed' || r.st.key === 'rewarded' || r.st.key === 'paid').length,
    failed: rows.filter((r) => r.st.key === 'failed' || r.st.key === 'declined').length,
    revision: rows.filter((r) => r.st.key === 'revision').length,
  }
  const tabs = [['all', 'All'], ['passed', 'Approved'], ['failed', 'Failed'], ['revision', 'Needs revision']]
  const visible = filter === 'all' ? rows
    : filter === 'passed' ? rows.filter((r) => r.st.key === 'passed' || r.st.key === 'rewarded' || r.st.key === 'paid')
    : filter === 'failed' ? rows.filter((r) => r.st.key === 'failed' || r.st.key === 'declined')
    : rows.filter((r) => r.st.key === 'revision')

  return <main className="mx-auto max-w-[1080px] py-16">
    <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Submissions</p>
    <h1 className="font-display text-5xl font-bold tracking-[-.06em]">Your submissions<span className="text-[#6b8299]">.</span></h1>
    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#3a4f61]">Every deliverable you sent, its verification verdict, why it passed or failed, and where its reward stands. Open one to see the full breakdown.</p>

    {!me ? <div className="glass mt-10 rounded-[22px] p-8 text-center">
        <div className="flex justify-center"><StateMark tone="info"/></div>
        <h2 className="mt-5 font-display text-2xl font-bold">Connect to manage your submissions</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#3a4f61]">Your submissions, verdicts and rewards are tied to your wallet address.</p>
        <div className="mt-6 flex justify-center"><WalletButton full/></div>
      </div>
      : mine.length === 0 ? <div className="glass mt-10 rounded-[22px] p-10 text-center">
          <div className="flex justify-center"><StateMark tone="info"/></div>
          <h2 className="mt-5 font-display text-2xl font-bold">No submissions yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#3a4f61]">You have not sent work to a bounty from this wallet. Browse the bounties to take part.</p>
          <button onClick={onBrowse} className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-[#0c1a2b] px-5 py-3.5 text-sm font-semibold text-white"><Search size={15}/>Browse bounties</button>
        </div>
      : <div className="mt-10">
        <div className="flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={'rounded-xl px-4 py-2.5 text-xs font-semibold transition ' + (filter === key ? 'bg-[#0c1a2b] text-white' : 'glass text-[#405467]')}>{label} ({counts[key]})</button>)}</div>

        {visible.length === 0 ? <p className="mt-6 rounded-[22px] bg-white/40 p-6 text-sm leading-relaxed text-[#3a4f61]">Nothing in this state yet.</p>
          : <div className="mt-6 grid gap-4">{visible.map(({ s, st, b }) => {
              const open = openId === s.id
              return <article key={s.id} className="glass rounded-[22px] p-5">
                <button onClick={() => setOpenId(open ? null : s.id)} className="flex w-full flex-wrap items-start justify-between gap-4 text-left">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-base">{titleOf(s.bountyId)}</strong>
                      <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + st.chip}>{st.label}</span>
                      <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#3f5468]">Score {s.score}/100</span>
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-[#3a4f61]">{s.summary}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold text-[#405467]">{paymentLabel(s)}</span>
                    <span className="block text-[11px] font-medium text-[#41566a]">{b ? b.reward + ' reward' : 'reward unknown'}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-[#405467]">{open ? 'Hide details' : 'View details'}</span>
                  </span>
                </button>

                {open ? <div className="mt-5 border-t border-[#6b8299]/20 pt-5">
                  <VerdictSummary submission={s} reward={b ? b.reward : ''}/>

                  {canRetry(s) ? <div className="mt-4 rounded-xl bg-[#f6e7cd]/45 p-4">
                    <p className="text-xs font-semibold text-[#8a6320]">{s.verdict === 'rejected' ? 'This submission did not pass verification.' : 'This submission needs changes.'}</p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#8a6320]">{missedCriteria(s)}</p>
                    <button onClick={() => onRetry(s, b)} className="mt-3 rounded-xl bg-[#0c1a2b] px-4 py-2.5 text-xs font-semibold text-white">Retry submission</button>
                  </div> : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/45 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Reward state</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-[#3a4f61]">{b && b.winners ? 'Pool of ' + b.winners + ' - ' + b.winnersRewarded + ' rewarded so far' : 'Open pool - the creator picks the winners'}</p>
                      <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#41566a]">Payment releases to {shortAddress(s.contributor)} - the wallet that submitted this work.</p>
                    </div>
                    <div className="rounded-xl bg-white/45 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Creator review</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-[#3a4f61]">{s.review === 'pending' ? 'Not reviewed yet.' : s.review === 'accepted' ? 'Accepted by the creator.' : 'Declined by the creator.'}</p>
                      {b && !b.funded ? <p className="mt-2 text-[11px] font-semibold text-[#9a6b21]">This bounty is not fully funded yet.</p> : null}
                    </div>
                  </div>

                  <details className="mt-4"><summary className="cursor-pointer text-[11px] font-semibold text-[#405467]">View your deliverable</summary><p className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[#3a4f61]">{s.content}</p></details>
                </div> : null}
              </article>
            })}</div>}
      </div>}
  </main>
}
function Modal({ children, onClose, size }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return createPortal(
    <div onMouseDown={onClose} className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-[#0d1a2b]/45 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} className={'glass my-6 w-full rounded-[22px] p-6 text-left shadow-2xl sm:p-8 ' + (size || 'max-w-xl')}>{children}</div>
    </div>,
    document.body
  )
}

function Field({ label, hint, error, children }) {
  return <label className="block">
    <span className="mb-2 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold">{label}</span>{hint ? <span className="text-[11px] font-semibold text-[#3f5468]">{hint}</span> : null}</span>
    {children}
    {error ? <span className="mt-2 block text-[11px] font-semibold text-[#8a3f2c]">{error}</span> : null}
  </label>
}

function fieldClass(error) {
  return 'w-full rounded-xl border p-3 text-sm outline-none transition ' + (error ? 'border-[#c2705f] bg-[#f3ded9]/40' : 'border-[#9fb5c8]/70 bg-white/60 text-[#1f3346] placeholder:text-[#5a6d7e] focus:border-[#0c1a2b]')
}

const EMPTY_DRAFT = { title: '', brief: '', criteria: ['', ''], reward: '', slots: '1', winners: '0', deadline: '', brand: '', brandUrl: '', fund: true }

function StateMark({ tone }) {
  const ring = tone === 'success' ? 'bg-[#d6ecdf] text-[#4b8d69]' : tone === 'error' ? 'bg-[#f3ded9] text-[#8a3f2c]' : 'bg-[#dce8f1] text-[#405467]'
  return <span className={'grid size-12 shrink-0 place-items-center rounded-full ' + ring}>{tone === 'success' ? <Check size={22}/> : tone === 'error' ? <X size={22}/> : <Sparkles size={20}/>}</span>
}

function ConfirmDiscard({ onKeep, onDiscard }) {
  return <Modal onClose={onKeep} size="max-w-md">
    <StateMark tone="error"/>
    <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Unsaved bounty</p>
    <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Leave without publishing?</h2>
    <p className="mt-3 text-sm font-medium leading-relaxed text-[#3a4f61]">You have filled in a bounty that has not been published. If you leave now these details are lost and the form starts empty.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button onClick={onDiscard} className="rounded-xl bg-[#8a3f2c] px-5 py-3 text-sm font-semibold text-white">Discard and leave</button>
      <button onClick={onKeep} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Keep editing</button>
    </div>
  </Modal>
}

function CreateBountyModal({ onClose, onCreated, onDirtyChange }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [phase, setPhase] = useState('form')
  const [created, setCreated] = useState(null)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const setCriterion = (index, value) => setDraft((d) => ({ ...d, criteria: d.criteria.map((c, i) => (i === index ? value : c)) }))

  const rewardWei = parseGenToWei(draft.reward)
  const slots = Number.parseInt(draft.slots, 10)
  const winners = Number.parseInt(draft.winners === '' ? '0' : draft.winners, 10)
  const covered = Number.isFinite(winners) && winners > 0 ? winners : slots
  const escrow = rewardWei !== null && Number.isFinite(covered) && covered > 0 ? formatGen(rewardWei * BigInt(covered)) : null

  const reset = () => { setDraft(EMPTY_DRAFT); setFieldErrors({}); setMessage(''); setCreated(null); setPhase('form') }

  const dirty = phase !== 'success' && Boolean(
    draft.title.trim() || draft.brief.trim() || draft.reward.trim() || draft.deadline.trim() ||
    draft.brand.trim() || draft.brandUrl.trim() || draft.criteria.some((c) => c.trim()) ||
    String(draft.slots) !== '1' || String(draft.winners) !== '0'
  )

  useEffect(() => { if (onDirtyChange) onDirtyChange(dirty) }, [dirty])

  const requestClose = () => { if (dirty) setConfirmingClose(true); else onClose() }
  const withConfirm = (node) => <>{node}{confirmingClose ? <ConfirmDiscard onKeep={() => setConfirmingClose(false)} onDiscard={() => { setConfirmingClose(false); if (onDirtyChange) onDirtyChange(false); onClose() }}/> : null}</>

  const publish = async () => {
    setMessage(''); setFieldErrors({})
    const check = validateBountyDraft(draft)
    if (Object.keys(check.fields).length > 0) {
      setFieldErrors(check.fields)
      setMessage('Some details need your attention. Fix the highlighted fields and try again.')
      return
    }
    setPhase('publishing')
    try {
      const result = await createBounty(draft)
      setCreated(result)
      if (onCreated) await onCreated()
      setPhase('success')
    } catch (e) {
      setFieldErrors(e && e.fields ? e.fields : {})
      setMessage(e && e.message ? e.message : 'The bounty could not be published. Please try again.')
      setPhase('error')
    }
  }

  if (phase === 'success') {
    return <Modal onClose={onClose}>
      <StateMark tone="success"/>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Bounty published</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Your bounty is live.</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#3a4f61]">Contributors can submit work now. Track every submission and release payment from this page.</p>
      <div className="mt-6 space-y-3 rounded-xl bg-white/40 p-4 text-sm">
        <div className="flex justify-between gap-4"><span className="text-[#3a4f61]">Bounty</span><strong className="text-right">{draft.title}</strong></div>
        <div className="flex justify-between gap-4"><span className="text-[#3a4f61]">Reward</span><strong>{formatGen(rewardWei)} x {covered} rewards</strong></div>
        <div className="flex justify-between gap-4"><span className="text-[#3a4f61]">Escrow</span><strong>{draft.fund && escrow ? escrow + ' funded' : 'Not funded yet'}</strong></div>
      </div>
      {created && created.hash ? <a href={transactionLink(created.hash)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#405467]">View transaction <ExternalLink size={13}/></a> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onClose} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Manage submissions</button>
        <button onClick={reset} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Post another bounty</button>
      </div>
    </Modal>
  }

  if (phase === 'error') {
    return withConfirm(<Modal onClose={requestClose}>
      <StateMark tone="error"/>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Creation failed</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">That did not go through.</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#3a4f61]">{message}</p>
      <p className="mt-3 rounded-xl bg-white/40 p-3 text-[11px] leading-relaxed font-medium text-[#41566a]">Nothing was published. Your details are still in the form, so you can adjust and try again.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setPhase('form')} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white">Edit bounty details</button>
        <button onClick={onClose} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Close</button>
      </div>
    </Modal>)
  }

  const publishing = phase === 'publishing'
  return withConfirm(<Modal onClose={publishing ? () => {} : requestClose} size="max-w-2xl">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Post bounty</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Create a bounty</h2>
      </div>
      <button onClick={requestClose} disabled={publishing} aria-label="Close" className="rounded-lg px-2 py-1 font-medium text-[#41566a] transition hover:text-[#0d1a2b] disabled:opacity-40"><X size={18}/></button>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-[#3a4f61]">Publish the outcome, the acceptance criteria, and the reward. Escrowing the full amount marks the bounty as funded.</p>

    {message ? <div className="mt-5 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]">{message}</div> : null}

    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Bounty title" hint={draft.title.length + '/160'} error={fieldErrors.title}><input value={draft.title} onChange={(e) => set('title', e.target.value)} className={fieldClass(fieldErrors.title)} placeholder="What needs to be done?"/></Field></div>
      <div className="sm:col-span-2"><Field label="Brief" hint={draft.brief.length + '/4000'} error={fieldErrors.brief}><textarea value={draft.brief} onChange={(e) => set('brief', e.target.value)} className={fieldClass(fieldErrors.brief) + ' min-h-32'} placeholder="Describe the outcome, the context, and who it is for."/></Field></div>
      <div className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold">Acceptance criteria</span>
        <p className="mb-3 text-xs font-medium text-[#41566a]">Published before work starts, and what the validators check.</p>
        <div className="space-y-3">{draft.criteria.map((c, i) => <div key={i} className="flex gap-2">
          <input value={c} onChange={(e) => setCriterion(i, e.target.value)} className={fieldClass(fieldErrors.criteria)} placeholder={'Criterion ' + (i + 1)}/>
          {draft.criteria.length > 1 ? <button onClick={() => setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, x) => x !== i) }))} aria-label="Remove criterion" className="rounded-xl bg-white/55 px-3 text-[#8a3f2c]"><X size={14}/></button> : null}
        </div>)}</div>
        <button onClick={() => setDraft((d) => ({ ...d, criteria: [...d.criteria, ''] }))} className="mt-3 text-xs font-semibold text-[#405467]">+ Add criterion</button>
        {fieldErrors.criteria ? <p className="mt-2 text-[11px] font-semibold text-[#8a3f2c]">{fieldErrors.criteria}</p> : null}
      </div>
      <Field label="Reward per submission" hint="in GEN" error={fieldErrors.reward}><input value={draft.reward} onChange={(e) => set('reward', e.target.value)} className={fieldClass(fieldErrors.reward)} placeholder="5"/></Field>
      <Field label="Submissions wanted" hint="1-50" error={fieldErrors.slots}><input type="number" min="1" max="50" value={draft.slots} onChange={(e) => set('slots', e.target.value)} className={fieldClass(fieldErrors.slots)}/></Field>
      <Field label="Winners to reward" hint="0 = open pool" error={fieldErrors.winners}><input type="number" min="0" max="50" value={draft.winners} onChange={(e) => set('winners', e.target.value)} className={fieldClass(fieldErrors.winners)}/></Field>
      <Field label="Deadline" hint="free text" error={fieldErrors.deadline}><input value={draft.deadline} onChange={(e) => set('deadline', e.target.value)} className={fieldClass(fieldErrors.deadline)} placeholder="7 days"/></Field>
      <Field label="Brand" hint="optional" error={fieldErrors.brand}><input value={draft.brand} onChange={(e) => set('brand', e.target.value)} className={fieldClass(fieldErrors.brand)} placeholder="Solana, GenLayer..."/></Field>
      <div className="sm:col-span-2"><Field label="Brand link" hint="optional" error={fieldErrors.brandUrl}><input value={draft.brandUrl} onChange={(e) => set('brandUrl', e.target.value)} className={fieldClass(fieldErrors.brandUrl)} placeholder="https://..."/></Field></div>
    </div>

    <div className="mt-6 rounded-xl bg-white/40 p-4">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={draft.fund} onChange={(e) => set('fund', e.target.checked)} className="mt-0.5 size-4"/>
        <span><span className="block text-sm font-semibold">Escrow the full reward now</span><span className="mt-1 block text-[11px] leading-relaxed font-medium text-[#41566a]">Send {escrow || 'the total'} with this transaction so contributors know the bounty is funded. Leave unchecked to publish unfunded and top up later.</span></span>
      </label>
    </div>

    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-[#41566a]">{escrow ? 'Total escrow ' + escrow : 'Set a reward and slot count to see the total'}</span>
      <div className="flex gap-3">
        <button onClick={requestClose} disabled={publishing} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467] disabled:opacity-40">Cancel</button>
        <button onClick={publish} disabled={publishing} className="rounded-xl bg-[#0c1a2b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{publishing ? 'Publishing...' : 'Publish bounty'}</button>
      </div>
    </div>
    {publishing ? <p className="mt-4 rounded-xl bg-[#dce8f1]/70 p-3 text-[11px] leading-relaxed text-[#405467]">Waiting for the wallet signature and on-chain confirmation. This can take a few seconds.</p> : null}
  </Modal>)
}

function ManageBountyPage({ bountyId, bounties, submissions, wallet, onBack, onChanged }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [funding, setFunding] = useState('')
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const bounty = (bounties || []).find((b) => b.id === bountyId) || null

  if (!bounty) {
    return <main className="mx-auto max-w-[1080px] py-16">
      <button onClick={onBack} className="mb-8 text-sm font-medium text-[#405467] transition hover:text-[#0d1a2b]">&larr; Back to your bounties</button>
      <div className="glass rounded-[22px] p-10 text-center">
        <div className="flex justify-center"><StateMark tone="info"/></div>
        <h2 className="mt-5 font-display text-2xl font-bold">Bounty not found</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#3a4f61]">This bounty is not on the current contract, or it was posted from a different wallet.</p>
      </div>
    </main>
  }

  const subs = (submissions || []).filter((s) => s.bountyId === bounty.id)
  const rewarded = subs.filter((s) => s.payment === 'approved' || s.payment === 'paid').length

  const act = async (key, fn, success) => {
    setBusy(key); setError(''); setNotice('')
    try {
      await fn()
      if (onChanged) await onChanged()
      if (success) setNotice(success)
    } catch (e) {
      setError(e && e.message ? e.message : 'That action could not be completed.')
    } finally {
      setBusy('')
    }
  }

  return <main className="mx-auto max-w-[1080px] py-16">
    <button onClick={onBack} className="mb-8 text-sm font-medium text-[#405467] transition hover:text-[#0d1a2b]">&larr; Back to your bounties</button>

    <header className="glass rounded-[22px] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Managing - {bounty.id}</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">{bounty.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#3a4f61]">{bounty.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + (bounty.status === 'open' ? 'bg-[#d6ecdf] text-[#4b8d69]' : 'bg-white/70 text-[#607486]')}>{bounty.status === 'open' ? 'Open' : 'Filled'}</span>
          <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + (bounty.funded ? 'bg-[#d6ecdf] text-[#4b8d69]' : 'bg-[#f6e7cd] text-[#9a6b21]')}>{bounty.funded ? 'Funded' : 'Unfunded'}</span>
          <span className="rounded-md bg-[#d8d8ec] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4a4a7a]">{poolLabel(bounty)}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Submissions</p><p className="mt-1 text-sm font-bold text-[#23374a]">{subs.length} of {bounty.slots}</p></div>
        <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Reward per winner</p><p className="mt-1 text-sm font-bold text-[#23374a]">{bounty.reward}</p></div>
        <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Escrow</p><p className="mt-1 text-sm font-bold text-[#23374a]">{bounty.escrow} of {bounty.rewardTotal}</p></div>
        <div className="rounded-xl bg-white/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3f5468]">Winners selected</p><p className="mt-1 text-sm font-bold text-[#23374a]">{bounty.winners > 0 ? rewarded + ' of ' + bounty.winners : rewarded}</p></div>
      </div>

      {!bounty.funded ? <div className="mt-5 rounded-xl bg-[#f6e7cd]/45 p-4">
        <p className="text-xs font-semibold text-[#8a6320]">This bounty is not fully funded, and contributors can see that.</p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#8a6320]">Add {bounty.escrowRemaining} to cover the reward pool so the commitment is real.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={funding} onChange={(e) => setFunding(e.target.value)} placeholder={bounty.escrowRemaining} className="w-44 rounded-xl border border-[#9fb5c8]/70 bg-white/60 p-2.5 text-sm text-[#1f3346] outline-none placeholder:text-[#5a6d7e]"/>
          <button disabled={busy === 'fund'} onClick={() => act('fund', () => fundBounty(bounty.id, funding), 'Escrow topped up.')} className="rounded-xl bg-[#0c1a2b] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Add escrow</button>
        </div>
      </div> : null}

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3f5468]">Acceptance criteria</p>
        {(bounty.criteria || []).map((c) => <p key={c} className="mb-1 text-sm font-medium text-[#3a4f61]"><Check className="mr-2 inline size-4 text-[#4b8d69]"/>{c}</p>)}
      </div>
    </header>

    {error ? <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={15}/></button></div> : null}
    {notice ? <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-[#4b8d69]/30 bg-[#d6ecdf]/60 px-4 py-3 text-sm text-[#3f7a5c]"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div> : null}

    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#3f5468]">Submissions ({subs.length} of {bounty.slots})</h2>
        <p className="text-[11px] font-medium text-[#41566a]">{bounty.winners > 0 ? rewarded + ' of ' + bounty.winners + ' winners selected' : 'Open pool - pick the winners yourself'}</p>
      </div>

      {subs.length === 0
        ? <div className="glass rounded-[22px] p-8 text-center">
            <p className="font-display text-lg font-bold">No submissions yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#3a4f61]">Contributors appear here as soon as they send work. Nothing needs doing until then.</p>
          </div>
        : <div className="grid gap-4">{subs.map((s) => {
            const st = submissionStatus(s)
            const alreadyRewarded = s.payment === 'approved' || s.payment === 'paid'
            return <article key={s.id} className="glass rounded-[22px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + st.chip}>{st.label}</span>
                  <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#3f5468]">Score {s.score}/100</span>
                  <span className="text-[11px] font-medium text-[#41566a]">from {shortAddress(s.contributor)}</span>
                </span>
                <span className="text-[11px] font-medium text-[#41566a]">review: <strong className="text-[#405467]">{s.review}</strong> - payment: <strong className="text-[#405467]">{s.payment}</strong></span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#3a4f61]">{s.summary}</p>
              <div className="mt-3 grid gap-2">{(s.results || []).map((r) => <p key={r.criterion} className="text-[11px] leading-relaxed text-[#3a4f61]"><span className={'mr-2 font-bold ' + (r.passed ? 'text-[#4b8d69]' : 'text-[#8a3f2c]')}>{r.passed ? 'MET' : 'MISSED'}</span>{r.criterion} - {r.reason}</p>)}</div>
              <details className="mt-3"><summary className="cursor-pointer text-[11px] font-semibold text-[#405467]">View deliverable</summary><p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[#3a4f61]">{s.content}</p></details>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button disabled={busy === s.id + 'a' || alreadyRewarded} onClick={() => act(s.id + 'a', () => reviewSubmission(s.id, 'accepted'), 'Submission accepted.')} className="rounded-xl bg-[#0c1a2b] px-3 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Accept</button>
                <button disabled={busy === s.id + 'd' || alreadyRewarded} onClick={() => act(s.id + 'd', () => reviewSubmission(s.id, 'declined'), 'Submission declined.')} className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#8a3f2c] disabled:cursor-not-allowed disabled:opacity-40">Decline</button>
                <button disabled={busy === s.id + 'p' || s.review !== 'accepted' || alreadyRewarded} onClick={() => act(s.id + 'p', () => approvePayment(s.id), 'Selected as a winner.')} className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#405467] disabled:cursor-not-allowed disabled:opacity-40">Select as winner</button>
                <button disabled={busy === s.id + 'm' || s.payment !== 'approved'} onClick={() => act(s.id + 'm', () => markPaid(s.id), 'Payment released.')} className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#405467] disabled:cursor-not-allowed disabled:opacity-40">Release payment</button>
                <span className="text-[11px] font-medium text-[#41566a]">Pays {shortAddress(s.contributor)}</span>
              </div>
            </article>
          })}</div>}
    </section>
  </main>
}

function Create({ setPage, onCreated, wallet, bounties, submissions, onDirtyChange, onManage }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const me = wallet && wallet.address ? wallet.address.toLowerCase() : ''
  const myBounties = me ? bounties.filter((b) => (b.requester || '').toLowerCase() === me) : []
  const forBounty = (id) => submissions.filter((s) => s.bountyId === id)

  useEffect(() => () => { if (onDirtyChange) onDirtyChange(false) }, [])

  const openCreate = () => {
    if (!wallet.address) { setError('Connect a wallet before posting a bounty.'); return }
    setError(''); setOpen(true)
  }

  return <main className="mx-auto max-w-[1080px] py-16">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Post bounty</p>
        <h1 className="font-display text-5xl font-bold tracking-[-.06em]">Your bounties<span className="text-[#6b8299]">.</span></h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#3a4f61]">Create bounties, open any one of them to review submissions, and release payment for the work you accept.</p>
      </div>
      <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#0c1a2b] px-5 py-3.5 text-sm font-semibold text-white"><Plus size={16}/>Create a bounty</button>
    </div>

    {error ? <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-[#c2705f]/40 bg-[#f3ded9]/60 px-4 py-3 text-sm text-[#8a3f2c]"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={15}/></button></div> : null}

    {!wallet.address
      ? <div className="glass rounded-[22px] p-8 text-center">
          <div className="flex justify-center"><StateMark tone="info"/></div>
          <h2 className="mt-5 font-display text-2xl font-bold">Connect to post a bounty</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#3a4f61]">Bounties are published by your wallet, so connect one to create and manage them.</p>
          <div className="mt-6 flex justify-center"><WalletButton full/></div>
        </div>
      : myBounties.length === 0
        ? <div className="glass rounded-[22px] p-10 text-center">
            <div className="flex justify-center"><StateMark tone="info"/></div>
            <h2 className="mt-5 font-display text-2xl font-bold">No bounties yet</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#3a4f61]">You have not posted a bounty from this wallet. Create one to start collecting submissions.</p>
            <button onClick={openCreate} className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-[#0c1a2b] px-5 py-3.5 text-sm font-semibold text-white"><Plus size={16}/>Create a bounty</button>
          </div>
        : <div className="grid gap-5">{myBounties.map((b) => {
            const subs = forBounty(b.id)
            return <article key={b.id} className="glass rounded-[22px] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-display text-lg">{b.title}</strong>
                    <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + (b.status === 'open' ? 'bg-[#d6ecdf] text-[#4b8d69]' : 'bg-white/70 text-[#607486]')}>{b.status === 'open' ? 'Open' : 'Filled'}</span>
                    <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ' + (b.funded ? 'bg-[#d6ecdf] text-[#4b8d69]' : 'bg-[#f6e7cd] text-[#9a6b21]')}>{b.funded ? 'Funded' : 'Unfunded'}</span>
                    <span className="rounded-md bg-[#d8d8ec] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4a4a7a]">{poolLabel(b)}</span>
                    {b.brand ? <span className="rounded-md bg-[#d8d8ec] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4a4a7a]">{b.brand}</span> : null}
                  </div>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#3a4f61]">{b.description}</p>
                  <p className="mt-2 text-[11px] font-medium text-[#41566a]">{subs.length} of {b.slots} submissions - {b.reward} per winner - {b.escrow} escrowed of {b.rewardTotal} - {b.deadline}</p>
                </div>
                <button onClick={() => onManage(b)} className="rounded-xl bg-[#0c1a2b] px-4 py-2.5 text-xs font-semibold text-white">Manage submissions ({subs.length})</button>
              </div>
            </article>
          })}</div>}

    {open ? <CreateBountyModal onClose={() => setOpen(false)} onCreated={onCreated} onDirtyChange={onDirtyChange}/> : null}
  </main>
}
function Footer({ goSection, setPage }) { return <footer className="mx-auto max-w-[1180px] border-t border-[#6b8299]/20 py-10"><div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]"><div><Brand /><p className="mt-4 max-w-xs text-sm leading-relaxed text-[#718396]">A transparent bounty marketplace where completed work is verified before rewards move.</p></div><div><p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#607486]">Product</p><div className="grid gap-3 text-sm text-[#526274]"><button onClick={()=>goSection('how')} className="w-fit">How it works</button><button onClick={()=>goSection('explore')} className="w-fit">Explore bounties</button><button onClick={()=>setPage('create')} className="w-fit">Post a bounty</button><button onClick={()=>goSection('faq')} className="w-fit">FAQ</button></div></div><div><p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#607486]">Ecosystem</p><div className="grid gap-3 text-sm text-[#526274]"><a href="https://genlayer.com" target="_blank" rel="noreferrer">GenLayer <ExternalLink className="ml-1 inline size-3"/></a><a href="https://testnet-faucet.genlayer.com" target="_blank" rel="noreferrer">GenLayer faucet <ExternalLink className="ml-1 inline size-3"/></a><a href="https://gentank.xyz" target="_blank" rel="noreferrer">GenTank <ExternalLink className="ml-1 inline size-3"/></a></div></div></div><div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-[#6b8299]/20 pt-6 text-xs text-[#718396]"><span>© 2026 Bountiq</span><span>Built on GenLayer for GenTank.</span></div></footer> }

const pageFromPath = () => {
  const path = window.location.pathname
  if (path === '/app/create') return 'create'
  if (path === '/app/submit') return 'submit'
  if (path === '/about') return 'home'
  return 'bounties'
}

function App() {
  const [page, setCurrentPage] = useState(pageFromPath)
  const [selectedId, setSelectedId] = useState(() => { try { return window.sessionStorage.getItem('bountiq.selected') } catch { return null } })
  const [bounties, setBounties] = useState(FALLBACK_BOUNTIES)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitTarget, setSubmitTarget] = useState(null)
  const [seen, setSeen] = useState(() => { try { return JSON.parse(window.localStorage.getItem('bountiq.seen') || '[]') } catch { return [] } })
  const [createDirty, setCreateDirty] = useState(false)
  const [pendingNav, setPendingNav] = useState(null)
  const [manageTarget, setManageTarget] = useState(null)
  const wallet = useWallet()

  const markSeen = (ids) => setSeen((prev) => {
    const next = Array.from(new Set([...prev, ...ids]))
    try { window.localStorage.setItem('bountiq.seen', JSON.stringify(next)) } catch {}
    return next
  })

  const load = async () => {
    setLoading(true)
    try {
      const live = await fetchState()
      if (live.bounties.length > 0) setBounties(live.bounties)
      setSubmissions(live.submissions)
      setLoadError(isConfigured() ? '' : 'Contract address is not configured. Set VITE_BOUNTIQ_CONTRACT.')
      return live
    } catch (e) {
      setLoadError(e && e.message ? e.message : 'Could not reach the GenLayer contract.')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pageFromPath() !== 'home') load()
    restoreWallet()
  }, [])

  // Browser back/forward must not silently drop a half-written bounty either.
  useEffect(() => {
    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }
    const handlePop = () => {
      const target = pageFromPath()
      if (createDirty && target !== 'create') {
        window.history.pushState({}, '', paths[page])
        setPendingNav(target)
        return
      }
      setSubmitTarget(null)
      setManageTarget(null)
      setCurrentPage(target)
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [createDirty, page])

  const remember = (id) => {
    try { id ? window.sessionStorage.setItem('bountiq.selected', id) : window.sessionStorage.removeItem('bountiq.selected') } catch {}
    setSelectedId(id)
  }

  const goTo = (next) => {
    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }
    window.history.pushState({}, '', paths[next])
    if (next === 'submit' && !selectedId) { /* keep whatever was remembered */ }
    if (next === 'bounties') remember(null)
    setSubmitTarget(null)
    setManageTarget(null)
    setCurrentPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (next !== 'home') load()
  }

  // Never drop a half-written bounty without asking.
  const navigate = (next) => {
    if (createDirty && next !== 'create') { setPendingNav(next); return }
    goTo(next)
  }

  useEffect(() => {
    if (!createDirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [createDirty])

  const selected = (selectedId && bounties.find((b) => b.id === selectedId)) || null

  if (page === 'home') return <LandingShell setPage={navigate}><Home setPage={navigate} setSelected={(b) => remember(b.id)}/></LandingShell>

  const view = submitTarget && submitTarget.bounty
    ? <SubmitWorkPage target={submitTarget} submissions={submissions} bounties={bounties} wallet={wallet} onBack={() => navigate('bounties')} onManage={() => navigate('submit')} onSubmitted={load}/>
    : manageTarget
    ? <ManageBountyPage bountyId={manageTarget} bounties={bounties} submissions={submissions} wallet={wallet} onBack={() => setManageTarget(null)} onChanged={load}/>
    : page === 'bounties'
    ? <Bounties bounties={bounties} submissions={submissions} loading={loading} error={loadError} wallet={wallet} seen={seen} onSeen={markSeen} onManage={() => navigate('submit')} onSubmit={(b) => setSubmitTarget({ bounty: b })}/>
    : page === 'submit'
      ? <Submissions bounties={bounties} submissions={submissions} wallet={wallet} onBrowse={() => navigate('bounties')} onRetry={(s, b) => setSubmitTarget({ bounty: b, submissionId: s.id, mode: 'resubmit' })}/>
      : <Create setPage={navigate} onCreated={load} wallet={wallet} bounties={bounties} submissions={submissions} onDirtyChange={setCreateDirty} onManage={(b) => setManageTarget(b.id)}/>

  return <AppShell page={page} setPage={navigate}>
    {view}
    {pendingNav ? <ConfirmDiscard onKeep={() => setPendingNav(null)} onDiscard={() => { const target = pendingNav; setPendingNav(null); setCreateDirty(false); goTo(target) }}/> : null}
  </AppShell>
}
createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>)
