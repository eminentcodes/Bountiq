import { readFileSync, writeFileSync } from 'node:fs'
const g = 'src/lib/genlayer.js'
let s = readFileSync(g, 'utf8')
const sub = (from, to, label) => {
  if (!s.includes(from)) throw new Error('missing anchor: ' + label)
  s = s.replace(from, to)
}

// create_bounty now takes the number of submissions the creator wants
sub(
  'export async function createBounty({ title, brief, criteria, reward, deadline }) {\n' +
  '  const clean = criteria.map((c) => c.trim()).filter(Boolean)\n' +
  "  if (clean.length === 0) throw new Error('Add at least one acceptance criterion')\n" +
  '  return send(\'create_bounty\', [\n' +
  '    title.trim(),\n' +
  '    brief.trim(),\n' +
  '    JSON.stringify(clean),\n' +
  '    reward.trim(),\n' +
  '    deadline.trim(),\n' +
  '  ])\n' +
  '}',
  'export async function createBounty({ title, brief, criteria, reward, deadline, slots }) {\n' +
  '  const clean = criteria.map((c) => c.trim()).filter(Boolean)\n' +
  "  if (clean.length === 0) throw new Error('Add at least one acceptance criterion')\n" +
  '  const wanted = Number.parseInt(slots, 10)\n' +
  "  if (!Number.isFinite(wanted) || wanted < 1) throw new Error('Set how many submissions you want (at least 1)')\n" +
  '  if (wanted > 50) throw new Error(\'At most 50 submissions are supported\')\n' +
  '  return send(\'create_bounty\', [\n' +
  '    title.trim(),\n' +
  '    brief.trim(),\n' +
  '    JSON.stringify(clean),\n' +
  '    reward.trim(),\n' +
  '    deadline.trim(),\n' +
  '    wanted,\n' +
  '  ])\n' +
  '}',
  'createBounty'
)

// one call returns bounties + submissions
sub(
  'export async function fetchBounties() {',
  'export async function fetchState() {\n' +
  '  if (!isConfigured()) throw new Error(\'VITE_BOUNTIQ_CONTRACT is not configured\')\n' +
  '  const raw = await getClient().readContract({\n' +
  '    account: activeAccount(),\n' +
  '    address: CONTRACT_ADDRESS,\n' +
  "    functionName: 'get_state',\n" +
  '  })\n' +
  '  const parsed = parseJson(raw, null)\n' +
  '  if (!parsed || !Array.isArray(parsed.bounties)) throw new Error(\'Unexpected response from get_state\')\n' +
  '  return { bounties: parsed.bounties.map(decorate), submissions: parsed.submissions || [] }\n' +
  '}\n' +
  '\n' +
  'export async function fetchBounties() {',
  'fetchState'
)

// creator actions
sub(
  "export async function submitWork(bountyId, content) {\n  return send('submit_work', [bountyId, content])\n}",
  "export async function submitWork(bountyId, content) {\n  return send('submit_work', [bountyId, content])\n}\n" +
  '\n' +
  '/** Creator accepts or declines a submission by hand, overriding the GenLayer verdict if needed. */\n' +
  "export async function reviewSubmission(submissionId, decision) {\n  return send('review_submission', [submissionId, decision])\n}\n" +
  '\n' +
  "export async function approvePayment(submissionId) {\n  return send('approve_payment', [submissionId])\n}\n" +
  '\n' +
  "export async function markPaid(submissionId) {\n  return send('mark_paid', [submissionId])\n}",
  'creator actions'
)

// slot helpers + friendlier errors
sub(
  'export function shortAddress(address) {',
  "export function remainingSlots(bounty) {\n  return Math.max(0, (bounty.slots || 0) - (bounty.submissionCount || 0))\n}\n" +
  '\n' +
  'export function isFull(bounty) {\n  return remainingSlots(bounty) === 0 || bounty.status !== \'open\'\n}\n' +
  '\n' +
  'export function shortAddress(address) {',
  'slot helpers'
)

sub(
  "  if (/not open for submissions/i.test(raw)) return 'This bounty already has a submission.'",
  "  if (/no longer accepting/i.test(raw)) return 'This bounty is no longer accepting submissions.'\n" +
  "  if (/all the submissions it asked for/i.test(raw)) return 'This bounty already has all the submissions it asked for.'\n" +
  "  if (/Only the bounty creator/i.test(raw)) return 'Only the bounty creator can manage its submissions.'\n" +
  "  if (/Accept the submission before/i.test(raw)) return 'Accept the submission before approving its payment.'\n" +
  "  if (/Approve the payment before/i.test(raw)) return 'Approve the payment before marking it paid.'",
  'error messages'
)

writeFileSync(g, s)
console.log('genlayer.js updated')