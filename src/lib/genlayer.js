// GenLayer client + wallet layer for Bountiq.
//
// Wallets are injected EIP-1193 providers such as MetaMask. Bountiq does not
// create or hold keys. Reads work without a wallet so the marketplace is
// browsable immediately; writes require a connection.

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

export const CONTRACT_ADDRESS = import.meta.env.VITE_BOUNTIQ_CONTRACT
export const EXPLORER = 'https://explorer-studio.genlayer.com'
export const CHAIN_NAME = 'GenLayer Studionet'

const MODE_KEY = 'bountiq.wallet.mode'

// Route RPC through the dev proxy to avoid the Studio RPC's missing CORS headers.
const ENDPOINT = import.meta.env.DEV ? `${window.location.origin}/gl-api` : undefined

let state = { mode: null, address: null, provider: null }
let cachedClient = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener({ ...state })
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState() {
  return { ...state }
}

export function isConnected() {
  return Boolean(state.address)
}

function setState(next) {
  state = { ...state, ...next }
  cachedClient = null
  emit()
}

export function getClient() {
  if (cachedClient) return cachedClient
  if (state.mode === 'browser' && state.provider) {
    cachedClient = createClient({ chain: studionet, provider: state.provider, endpoint: ENDPOINT })
  } else {
    cachedClient = createClient({ chain: studionet, endpoint: ENDPOINT })
  }
  return cachedClient
}

export function hasBrowserWallet() {
  return typeof window !== 'undefined' && Boolean(window.ethereum)
}

async function ensureChain(provider) {
  const chainId = `0x${studionet.id.toString(16)}`
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
  } catch (error) {
    const message = error?.message ?? ''
    if (error?.code === 4902 || /Unrecognized chain|not added|add.*chain/i.test(message)) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: CHAIN_NAME,
            nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
            rpcUrls: [studionet.rpcUrls.default.http[0]],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      })
    } else {
      throw error
    }
  }
}

/** Injected browser wallet, e.g. MetaMask. */
export async function connectBrowserWallet() {
  if (!hasBrowserWallet()) {
    throw new Error('No browser wallet found. Use a demo wallet instead.')
  }
  const provider = window.ethereum
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  if (!accounts || accounts.length === 0) {
    throw new Error('The wallet did not share an account.')
  }
  await ensureChain(provider)
  try {
    window.localStorage.setItem(MODE_KEY, 'browser')
  } catch {}
  setState({ mode: 'browser', address: accounts[0], provider })
  return getState()
}

export function disconnectWallet() {
  try {
    window.localStorage.removeItem(MODE_KEY)
  } catch {}
  setState({ mode: null, address: null, provider: null })
}

/** Re-attach the wallet used previously, without prompting where possible. */
export async function restoreWallet() {
  let mode = null
  try {
    mode = window.localStorage.getItem(MODE_KEY)
  } catch {
    return getState()
  }
  if (mode === 'browser' && hasBrowserWallet()) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts && accounts.length > 0) {
        setState({ mode: 'browser', address: accounts[0], provider: window.ethereum })
      }
    } catch {
      // Silent restore failed; the user can reconnect manually.
    }
  }
  return getState()
}

export function remainingSlots(bounty) {
  return Math.max(0, (bounty.slots || 0) - (bounty.submissionCount || 0))
}

export function isFull(bounty) {
  return remainingSlots(bounty) === 0 || bounty.status !== 'open'
}

export function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function explorerLink(address) {
  return `${EXPLORER}/address/${address}`
}

export function transactionLink(hash) {
  return `${EXPLORER}/tx/${hash}`
}

// ---------------------------------------------------------------- contract API

export function isConfigured() {
  return typeof CONTRACT_ADDRESS === 'string' && /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS)
}

const PALETTE = [
  { color: 'bg-[#c8def0]', icon: 'sparkles' },
  { color: 'bg-[#d8d8ec]', icon: 'file' },
  { color: 'bg-[#ecd7cc]', icon: 'search' },
]

const WEI_PER_GEN = 1000000000000000000n

/** "2.5" -> 2500000000000000000n. Returns null when the text is not a GEN amount. */
export function parseGenToWei(input) {
  const text = String(input ?? "").trim().replace(/,/g, "")
  if (!text || !/^\d*\.?\d*$/.test(text) || text === ".") return null
  const [whole = "", fraction = ""] = text.split(".")
  if (!whole && !fraction) return null
  const padded = (fraction + "0".repeat(18)).slice(0, 18)
  try {
    return BigInt(whole || "0") * WEI_PER_GEN + BigInt(padded || "0")
  } catch {
    return null
  }
}

/** 5 * 10**18 -> "5 GEN". */
export function formatGen(wei, suffix = true) {
  let value
  try {
    value = BigInt(String(wei ?? "0").trim())
  } catch {
    return String(wei)
  }
  const negative = value < 0n
  const absolute = negative ? -value : value
  const whole = absolute / WEI_PER_GEN
  const fraction = (absolute % WEI_PER_GEN).toString().padStart(18, "0").replace(/0+$/, "")
  const text = (negative ? "-" : "") + whole + (fraction ? "." + fraction : "")
  return suffix ? text + " GEN" : text
}

function weiGap(total, held) {
  try {
    const gap = BigInt(String(total ?? "0")) - BigInt(String(held ?? "0"))
    return gap > 0n ? gap : 0n
  } catch {
    return 0n
  }
}

function decorate(bounty, index) {
  const tone = PALETTE[index % PALETTE.length]
  return {
    ...bounty,
    color: tone.color,
    icon: tone.icon,
    description: bounty.brief || bounty.description || "",
    reward: formatGen(bounty.reward),
    rewardWei: String(bounty.reward ?? "0"),
    rewardTotal: formatGen(bounty.rewardTotal),
    escrow: formatGen(bounty.escrow),
    escrowRemaining: formatGen(weiGap(bounty.rewardTotal, bounty.escrow)),
    requester: bounty.requester || "",
    brand: bounty.brand || "",
    brandUrl: bounty.brandUrl || "",
    funded: Boolean(bounty.funded),
    covered: Number(bounty.covered || 0),
    submissionCount: Number(bounty.submissionCount || 0),
    winners: Number(bounty.winners || 0),
    rewardPool: bounty.rewardPool ? formatGen(bounty.rewardPool) : '',
    winnersRewarded: Number(bounty.winnersRewarded || 0),
    poolUnlimited: bounty.poolUnlimited === undefined ? Number(bounty.winners || 0) === 0 : Boolean(bounty.poolUnlimited),
  }
}

function parseJson(value, fallback) {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function readError(error) {
  // viem wraps wallet failures, so prefer the wallet's own wording.
  const raw =
    (error?.details && String(error.details)) ||
    (error?.shortMessage && String(error.shortMessage)) ||
    (error?.message && String(error.message)) ||
    String(error)
  if (/undetermined|timeout/i.test(raw)) {
    return 'The validator committee could not agree on a result. Please try again.'
  }
  if (/no longer accepting/i.test(raw)) return 'This bounty is no longer accepting submissions.'
  if (/all the submissions it asked for/i.test(raw)) return 'This bounty already has all the submissions it asked for.'
  if (/Only the bounty creator/i.test(raw)) return 'Only the bounty creator can manage its submissions.'
  if (/Accept the submission before/i.test(raw)) return 'Accept the submission before approving its payment.'
  if (/Approve the payment before/i.test(raw)) return 'Approve the payment before marking it paid.'
  if (/must be connected|No account/i.test(raw)) return 'Connect a wallet before continuing.'
  if (isTransientRpc(raw)) return 'The RPC dropped the connection before it answered. Nothing is guaranteed to have changed, so check the latest state and try again.'
  return raw
}

export async function fetchState() {
  if (!isConfigured()) throw new Error('VITE_BOUNTIQ_CONTRACT is not configured')
  const raw = await getClient().readContract({
    account: activeAccount(),
    address: CONTRACT_ADDRESS,
    functionName: 'get_state',
  })
  const parsed = parseJson(raw, null)
  if (!parsed || !Array.isArray(parsed.bounties)) throw new Error('Unexpected response from get_state')
  return { bounties: parsed.bounties.map(decorate), submissions: parsed.submissions || [] }
}

export async function fetchBounties() {
  if (!isConfigured()) throw new Error('VITE_BOUNTIQ_CONTRACT is not configured')
  const raw = await getClient().readContract({
    account: activeAccount(),
    address: CONTRACT_ADDRESS,
    functionName: 'get_bounties',
  })
  const list = parseJson(raw, [])
  if (!Array.isArray(list)) throw new Error('Unexpected response from get_bounties')
  return list.map(decorate)
}

export async function fetchBounty(bountyId) {
  if (!isConfigured()) throw new Error('VITE_BOUNTIQ_CONTRACT is not configured')
  const raw = await getClient().readContract({
    account: activeAccount(),
    address: CONTRACT_ADDRESS,
    functionName: 'get_bounty',
    args: [bountyId],
  })
  return parseJson(raw, null)
}

function activeAccount() {
  if (state.mode === 'browser' && state.address) {
    return { address: state.address, type: 'json-rpc' }
  }
  return undefined
}

const TRANSIENT_RPC = /Unexpected end of JSON input|Failed to execute 'json'|unknown RPC error|fetch failed|ECONNRESET|socket hang up|network error|timed out|timeout|502|503|504/i

function isTransientRpc(value) {
  const raw =
    (value && value.details && String(value.details)) ||
    (value && value.shortMessage && String(value.shortMessage)) ||
    (value && value.message && String(value.message)) ||
    String(value)
  return TRANSIENT_RPC.test(raw)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function send(functionName, args, value = 0n) {
  if (!isConfigured()) throw new Error("VITE_BOUNTIQ_CONTRACT is not configured")
  if (!isConnected()) throw new Error("Connect a wallet before continuing.")

  const client = getClient()

  // Studionet occasionally answers with an empty body. Retry the transport a few
  // times instead of failing the whole write on one dropped response.
  let hash = null
  for (let attempt = 0; ; attempt += 1) {
    try {
      hash = await client.writeContract({
        account: activeAccount(),
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value,
      })
      break
    } catch (error) {
      if (attempt >= 1 || !isTransientRpc(error)) throw new Error(readError(error))
      await sleep(1800)
    }
  }

  let receipt = null
  for (let attempt = 0; ; attempt += 1) {
    try {
      receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 400,
        interval: 3000,
      })
      break
    } catch (error) {
      if (attempt >= 3 || !isTransientRpc(error)) throw new Error(readError(error))
      await sleep(2500)
    }
  }

  const leader = receipt?.consensus_data?.leader_receipt?.[0]
  if (leader && leader.execution_result !== "SUCCESS") {
    throw new Error(readError({ message: String(leader.stderr || leader.error || "Transaction failed") }))
  }
  return { hash, receipt }
}

export class ValidationError extends Error {
  constructor(message, fields) {
    super(message)
    this.name = "ValidationError"
    this.fields = fields || {}
  }
}

/** Client-side checks that mirror the contract's own validation. */
export function validateBountyDraft(draft) {
  const fields = {}

  const title = String(draft.title || "").trim()
  if (!title) fields.title = "Add a title for this bounty."
  else if (title.length > 160) fields.title = "Keep the title under 160 characters."

  const brief = String(draft.brief || "").trim()
  if (!brief) fields.brief = "Describe the outcome you need."
  else if (brief.length > 4000) fields.brief = "Keep the brief under 4000 characters."

  const criteria = (draft.criteria || []).map((c) => String(c || "").trim()).filter(Boolean)
  if (criteria.length === 0) fields.criteria = "Add at least one acceptance criterion."
  else if (criteria.length > 12) fields.criteria = "At most 12 criteria are supported."
  else if (criteria.some((c) => c.length > 300)) fields.criteria = "Each criterion must be under 300 characters."

  const rewardWei = parseGenToWei(draft.reward)
  if (rewardWei === null) fields.reward = "Enter a GEN amount, for example 5 or 2.5."
  else if (rewardWei <= 0n) fields.reward = "The reward must be greater than 0 GEN."

  const slots = Number.parseInt(draft.slots, 10)
  if (!Number.isFinite(slots) || slots < 1) fields.slots = "Ask for at least 1 submission."
  else if (slots > 50) fields.slots = "At most 50 submissions are supported."

  const deadline = String(draft.deadline || "").trim()
  if (!deadline) fields.deadline = "Set a deadline, for example 7 days."
  else if (deadline.length > 120) fields.deadline = "Keep the deadline under 120 characters."

  const brand = String(draft.brand || "").trim()
  if (brand.length > 80) fields.brand = "Keep the brand name under 80 characters."

  const brandUrl = String(draft.brandUrl || "").trim()
  if (brandUrl.length > 200) fields.brandUrl = "Keep the link under 200 characters."

  const winners = Number.parseInt(draft.winners === undefined || draft.winners === '' ? '0' : draft.winners, 10)
  if (!Number.isFinite(winners) || winners < 0) fields.winners = 'Enter how many winners to reward, or 0 for an open pool.'
  else if (winners > 50) fields.winners = 'At most 50 winners are supported.'

  const covered = Number.isFinite(winners) && winners > 0 ? winners : slots
  const escrowWei = rewardWei !== null && Number.isFinite(slots) && slots > 0 ? rewardWei * BigInt(covered) : 0n
  return { fields, title, brief, criteria, rewardWei, slots, winners, deadline, brand, brandUrl, escrowWei }
}

export async function createBounty(draft) {
  const clean = validateBountyDraft(draft)
  if (Object.keys(clean.fields).length > 0) {
    throw new ValidationError("Some details need your attention before this bounty can be published.", clean.fields)
  }
  const value = draft.fund ? clean.escrowWei : 0n
  return send(
    "create_bounty",
    [clean.title, clean.brief, JSON.stringify(clean.criteria), clean.rewardWei.toString(), clean.slots, clean.winners, clean.brand, clean.brandUrl, clean.deadline],
    value
  )
}

export async function resubmitWork(submissionId, content) {
  if (!String(content || '').trim()) throw new Error('A deliverable is required')
  return send('resubmit_work', [String(submissionId).trim(), content])
}

export async function fundBounty(bountyId, amount) {
  const wei = parseGenToWei(amount)
  if (wei === null || wei <= 0n) {
    throw new ValidationError("Enter a GEN amount greater than 0.", { amount: "Enter a GEN amount greater than 0." })
  }
  return send("fund_bounty", [String(bountyId).trim()], wei)
}

export async function submitWork(bountyId, content) {
  return send('submit_work', [bountyId, content])
}

/** Creator accepts or declines a submission by hand, overriding the GenLayer verdict if needed. */
export async function reviewSubmission(submissionId, decision) {
  return send('review_submission', [submissionId, decision])
}

export async function approvePayment(submissionId) {
  return send('approve_payment', [submissionId])
}

export async function markPaid(submissionId) {
  return send('mark_paid', [submissionId])
}