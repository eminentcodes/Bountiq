import { readFileSync, writeFileSync } from 'node:fs'
const path = 'src/main.jsx'
let s = readFileSync(path, 'utf8')
const sub = (from, to, label) => {
  if (!s.includes(from)) throw new Error('missing anchor: ' + label)
  s = s.replace(from, to)
}

// Static showcase content for the landing preview. The landing page must not read
// the contract; it only illustrates what the product is about.
sub(
  'function LandingShell({ children, setPage }) {',
  'const SHOWCASE_BOUNTIES = [\n' +
  "  { id: 'x1', title: 'Audit a landing page for clarity', description: 'Review the copy and suggest three improvements for a developer tool.', reward: '5 GEN', deadline: '2 days left', color: 'bg-[#c8def0]', icon: 'sparkles' },\n" +
  "  { id: 'x2', title: 'Write a beginner GenLayer guide', description: 'Create a clear, practical introduction with one working example.', reward: '12 GEN', deadline: '5 days left', color: 'bg-[#d8d8ec]', icon: 'file' },\n" +
  "  { id: 'x3', title: 'Test the onboarding experience', description: 'Use the product as a new user and document three points of friction.', reward: '8 GEN', deadline: '1 week left', color: 'bg-[#ecd7cc]', icon: 'search' },\n" +
  ']\n' +
  '\n' +
  'function LandingShell({ children, setPage }) {',
  'showcase data'
)

// landing preview no longer uses live contract data
sub(
  "return <LandingShell setPage={navigate}><Home setPage={navigate} setSelected={(b) => remember(b.id)} bounties={bounties}/></LandingShell>",
  "return <LandingShell setPage={navigate}><Home setPage={navigate} setSelected={(b) => remember(b.id)} bounties={SHOWCASE_BOUNTIES}/></LandingShell>",
  'landing preview data'
)

// rename Submit work -> Submissions
sub("[['bounties','Bounties'],['submit','Submit work'],['create','Post bounty']]", "[['bounties','Bounties'],['submit','Submissions'],['create','Post bounty']]", 'nav label')
sub('<p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Submit work</p>', '<p className="mb-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#607486]">Submissions</p>', 'submit eyebrow')

writeFileSync(path, s)
console.log('landing showcase + rename applied')