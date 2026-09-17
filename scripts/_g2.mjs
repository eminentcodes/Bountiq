import fs from 'node:fs'
const p = 'src/main.jsx'
let s = fs.readFileSync(p, 'utf8')
function rep(from, to, label) {
  if (!s.includes(from)) throw new Error('missing anchor: ' + label)
  s = s.split(from).join(to)
  console.log('ok', label)
}

// ---- confirm-discard dialog -------------------------------------------------
const discard = 'function ConfirmDiscard({ onKeep, onDiscard }) {\n' +
  '  return <Modal onClose={onKeep} size="max-w-md">\n' +
  '    <StateMark tone="error"/>\n' +
  '    <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#3f5468]">Unsaved bounty</p>\n' +
  '    <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Leave without publishing?</h2>\n' +
  '    <p className="mt-3 text-sm font-medium leading-relaxed text-[#3a4f61]">You have filled in a bounty that has not been published. If you leave now these details are lost and the form starts empty.</p>\n' +
  '    <div className="mt-6 flex flex-wrap gap-3">\n' +
  '      <button onClick={onDiscard} className="rounded-xl bg-[#8a3f2c] px-5 py-3 text-sm font-semibold text-white">Discard and leave</button>\n' +
  '      <button onClick={onKeep} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467]">Keep editing</button>\n' +
  '    </div>\n' +
  '  </Modal>\n' +
  '}\n\n'
rep('function CreateBountyModal({ onClose, onCreated }) {', discard + 'function CreateBountyModal({ onClose, onCreated, onDirtyChange }) {', 'ConfirmDiscard')

// ---- draft dirty tracking ---------------------------------------------------
rep("function CreateBountyModal({ onClose, onCreated, onDirtyChange }) {\n  const [draft, setDraft] = useState(EMPTY_DRAFT)\n  const [fieldErrors, setFieldErrors] = useState({})\n  const [message, setMessage] = useState('')\n  const [phase, setPhase] = useState('form')\n  const [created, setCreated] = useState(null)\n",
    "function CreateBountyModal({ onClose, onCreated, onDirtyChange }) {\n  const [draft, setDraft] = useState(EMPTY_DRAFT)\n  const [fieldErrors, setFieldErrors] = useState({})\n  const [message, setMessage] = useState('')\n  const [phase, setPhase] = useState('form')\n  const [created, setCreated] = useState(null)\n  const [confirmingClose, setConfirmingClose] = useState(false)\n",
    'confirmingClose state')

rep("  const reset = () => { setDraft(EMPTY_DRAFT); setFieldErrors({}); setMessage(''); setCreated(null); setPhase('form') }\n",
    "  const reset = () => { setDraft(EMPTY_DRAFT); setFieldErrors({}); setMessage(''); setCreated(null); setPhase('form') }\n\n" +
    "  const dirty = phase !== 'success' && Boolean(\n" +
    "    draft.title.trim() || draft.brief.trim() || draft.reward.trim() || draft.deadline.trim() ||\n" +
    "    draft.brand.trim() || draft.brandUrl.trim() || draft.criteria.some((c) => c.trim()) ||\n" +
    "    String(draft.slots) !== '1' || String(draft.winners) !== '0'\n" +
    "  )\n\n" +
    "  useEffect(() => { if (onDirtyChange) onDirtyChange(dirty) }, [dirty])\n\n" +
    "  const requestClose = () => { if (dirty) setConfirmingClose(true); else onClose() }\n" +
    "  const withConfirm = (node) => <>{node}{confirmingClose ? <ConfirmDiscard onKeep={() => setConfirmingClose(false)} onDiscard={() => { setConfirmingClose(false); if (onDirtyChange) onDirtyChange(false); onClose() }}/> : null}</>\n",
    'dirty + requestClose')

// ---- route every close path through the guard -------------------------------
rep("  if (phase === 'error') {\n    return <Modal onClose={onClose}>\n      <StateMark tone=\"error\"/>",
    "  if (phase === 'error') {\n    return withConfirm(<Modal onClose={requestClose}>\n      <StateMark tone=\"error\"/>",
    'error modal guard')
rep("      </div>\n    </Modal>\n  }\n\n  const publishing = phase === 'publishing'\n  return <Modal onClose={publishing ? () => {} : onClose} size=\"max-w-2xl\">",
    "      </div>\n    </Modal>)\n  }\n\n  const publishing = phase === 'publishing'\n  return withConfirm(<Modal onClose={publishing ? () => {} : requestClose} size=\"max-w-2xl\">",
    'form modal guard')
rep("    {publishing ? <p className=\"mt-4 rounded-xl bg-[#dce8f1]/70 p-3 text-[11px] leading-relaxed text-[#405467]\">Waiting for the wallet signature and on-chain confirmation. This can take a few seconds.</p> : null}\n  </Modal>\n}",
    "    {publishing ? <p className=\"mt-4 rounded-xl bg-[#dce8f1]/70 p-3 text-[11px] leading-relaxed text-[#405467]\">Waiting for the wallet signature and on-chain confirmation. This can take a few seconds.</p> : null}\n  </Modal>)\n}",
    'form modal close')
rep('<button onClick={onClose} disabled={publishing} aria-label="Close"', '<button onClick={requestClose} disabled={publishing} aria-label="Close"', 'X guard')
rep('<button onClick={onClose} disabled={publishing} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467] disabled:opacity-40">Cancel</button>',
    '<button onClick={requestClose} disabled={publishing} className="rounded-xl bg-white/55 px-5 py-3 text-sm font-semibold text-[#405467] disabled:opacity-40">Cancel</button>',
    'cancel guard')

// ---- Create page passes the flag through -----------------------------------
rep("function Create({ setPage, onCreated, wallet, bounties, submissions }) {",
    "function Create({ setPage, onCreated, wallet, bounties, submissions, onDirtyChange }) {",
    'Create signature')
rep("  const act = async (key, fn, success) => {",
    "  useEffect(() => () => { if (onDirtyChange) onDirtyChange(false) }, [])\n\n  const act = async (key, fn, success) => {",
    'Create unmount clear')
rep("{open ? <CreateBountyModal onClose={() => setOpen(false)} onCreated={onCreated}/> : null}",
    "{open ? <CreateBountyModal onClose={() => setOpen(false)} onCreated={onCreated} onDirtyChange={onDirtyChange}/> : null}",
    'pass onDirtyChange')

fs.writeFileSync(p, s, 'utf8')
console.log('CreateBountyModal guard applied')