import fs from 'node:fs'
const p = 'src/main.jsx'
let s = fs.readFileSync(p, 'utf8')
function rep(from, to, label) {
  if (!s.includes(from)) throw new Error('missing anchor: ' + label)
  s = s.split(from).join(to)
  console.log('ok', label)
}

rep("  const [seen, setSeen] = useState(() => { try { return JSON.parse(window.localStorage.getItem('bountiq.seen') || '[]') } catch { return [] } })",
    "  const [seen, setSeen] = useState(() => { try { return JSON.parse(window.localStorage.getItem('bountiq.seen') || '[]') } catch { return [] } })\n  const [createDirty, setCreateDirty] = useState(false)\n  const [pendingNav, setPendingNav] = useState(null)",
    'app guard state')

rep("  const navigate = (next) => {\n    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }",
    "  const goTo = (next) => {\n    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }",
    'rename navigate -> goTo')

rep("    if (next !== 'home') load()\n  }\n",
    "    if (next !== 'home') load()\n  }\n\n  // Never drop a half-written bounty without asking.\n  const navigate = (next) => {\n    if (createDirty && next !== 'create') { setPendingNav(next); return }\n    goTo(next)\n  }\n\n  useEffect(() => {\n    if (!createDirty) return undefined\n    const warn = (e) => { e.preventDefault(); e.returnValue = '' }\n    window.addEventListener('beforeunload', warn)\n    return () => window.removeEventListener('beforeunload', warn)\n  }, [createDirty])\n",
    'navigate guard + beforeunload')

rep("      : <Create setPage={navigate} onCreated={load} wallet={wallet} bounties={bounties} submissions={submissions}/>",
    "      : <Create setPage={navigate} onCreated={load} wallet={wallet} bounties={bounties} submissions={submissions} onDirtyChange={setCreateDirty}/>",
    'pass createDirty setter')

rep("  return <AppShell page={page} setPage={navigate}>{view}</AppShell>",
    "  return <AppShell page={page} setPage={navigate}>\n    {view}\n    {pendingNav ? <ConfirmDiscard onKeep={() => setPendingNav(null)} onDiscard={() => { const target = pendingNav; setPendingNav(null); setCreateDirty(false); goTo(target) }}/> : null}\n  </AppShell>",
    'render discard guard')

fs.writeFileSync(p, s, 'utf8')
console.log('nav guard applied')