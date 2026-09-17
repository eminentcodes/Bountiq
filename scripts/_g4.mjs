import fs from 'node:fs'
const p = 'src/main.jsx'
let s = fs.readFileSync(p, 'utf8')
function rep(from, to, label) {
  if (!s.includes(from)) throw new Error('missing anchor: ' + label)
  s = s.split(from).join(to)
  console.log('ok', label)
}
function splice(startAnchor, endAnchor, replacement, label) {
  const a = s.indexOf(startAnchor)
  const b = s.indexOf(endAnchor, a + 1)
  if (a === -1 || b === -1 || b <= a) throw new Error('splice failed: ' + label)
  s = s.slice(0, a) + replacement + s.slice(b)
  console.log('ok', label)
}

// swap the whole Create function for ManageBountyPage + a leaner Create
splice('function Create({ setPage, onCreated, wallet, bounties, submissions, onDirtyChange }) {', 'function Footer({ goSection, setPage }) {', fs.readFileSync('scripts/_mg.txt', 'utf8'), 'Create -> ManageBountyPage')

// App: manage target + back/forward guard
rep("  const [pendingNav, setPendingNav] = useState(null)",
    "  const [pendingNav, setPendingNav] = useState(null)\n  const [manageTarget, setManageTarget] = useState(null)",
    'manageTarget state')

rep("    setSubmitTarget(null)\n    setCurrentPage(next)",
    "    setSubmitTarget(null)\n    setManageTarget(null)\n    setCurrentPage(next)",
    'clear manage on navigate')

rep("  useEffect(() => {\n    if (pageFromPath() !== 'home') load()\n    restoreWallet()\n    const handlePop = () => setCurrentPage(pageFromPath())\n    window.addEventListener('popstate', handlePop)\n    return () => window.removeEventListener('popstate', handlePop)\n  }, [])",
    "  useEffect(() => {\n    if (pageFromPath() !== 'home') load()\n    restoreWallet()\n  }, [])\n\n  // Browser back/forward must not silently drop a half-written bounty either.\n  useEffect(() => {\n    const paths = { home: '/about', bounties: '/', submit: '/app/submit', create: '/app/create' }\n    const handlePop = () => {\n      const target = pageFromPath()\n      if (createDirty && target !== 'create') {\n        window.history.pushState({}, '', paths[page])\n        setPendingNav(target)\n        return\n      }\n      setSubmitTarget(null)\n      setManageTarget(null)\n      setCurrentPage(target)\n    }\n    window.addEventListener('popstate', handlePop)\n    return () => window.removeEventListener('popstate', handlePop)\n  }, [createDirty, page])",
    'popstate guard')

rep("  const view = submitTarget && submitTarget.bounty\n    ? <SubmitWorkPage target={submitTarget} submissions={submissions} bounties={bounties} wallet={wallet} onBack={() => navigate('bounties')} onManage={() => navigate('submit')} onSubmitted={load}/>\n    : page === 'bounties'",
    "  const view = submitTarget && submitTarget.bounty\n    ? <SubmitWorkPage target={submitTarget} submissions={submissions} bounties={bounties} wallet={wallet} onBack={() => navigate('bounties')} onManage={() => navigate('submit')} onSubmitted={load}/>\n    : manageTarget\n    ? <ManageBountyPage bountyId={manageTarget} bounties={bounties} submissions={submissions} wallet={wallet} onBack={() => setManageTarget(null)} onChanged={load}/>\n    : page === 'bounties'",
    'route to manage page')

rep("      : <Create setPage={navigate} onCreated={load} wallet={wallet} bounties={bounties} submissions={submissions} onDirtyChange={setCreateDirty}/>",
    "      : <Create setPage={navigate} onCreated={load} wallet={wallet} bounties={bounties} submissions={submissions} onDirtyChange={setCreateDirty} onManage={(b) => setManageTarget(b.id)}/>",
    'create onManage')

fs.writeFileSync(p, s, 'utf8')
console.log('manage page wired. lines =', s.split('\n').length)