# Bountiq

![React](https://img.shields.io/badge/React-18-087EA4?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![GenLayer](https://img.shields.io/badge/GenLayer-Intelligent%20Contract-5B4FE9)
![Studionet](https://img.shields.io/badge/Studionet-chain%2061999-1F8A70)
![Studio Devnet](https://img.shields.io/badge/Studio%20Devnet-chain%2061997-6E56CF)

**Work is paid when it is proven.** Bountiq is a verified-work marketplace built on **GenLayer Intelligent Contracts**. A creator publishes a bounty with a reward, a submission gate and explicit acceptance criteria. Contributors submit real deliverables. A GenLayer validator committee reads each deliverable, checks it against every published criterion, and writes the verdict on chain before any reward can be released.

> Bountiq is the answer to one specific problem: judgment. On a normal bounty platform the person who posted the work is also the person who decides whether the work is good enough, so contributors have to trust them. Bountiq replaces that trust with a validator committee. Independent validators evaluate the deliverable against the criteria stored in the contract and must agree on the result - verdict, per-criterion pass or fail, a written reason and a score - before it is accepted. The creator keeps the final commercial call on who gets paid, but they no longer get to be the only opinion on whether the work is real.

The key idea is simple. **Acceptance criteria are published up front, and the verdict is produced by consensus rather than by the person paying.** That means a contributor can read exactly what success looks like before they start, and can see exactly which criterion failed if they do not pass.

Bountiq runs on **GenLayer testnet** with test funds only.

## Deployed Contracts

Two deployments exist, from the same contract source. Both are live and public.

### Studio Devnet - chain 61997

This is the deployment that satisfies the Studio Next contract requirement. It runs the ported contract (`contracts/bountiq-devnet.py`) on the newer GenLayer runtime.

| | |
|---|---|
| **Contract address** | `0xa476Bd972187BFCc8bbA05D107C221bC31Be15B5` |
| **Explorer link** | https://explorer-studio-dev.genlayer.com/address/0xa476Bd972187BFCc8bbA05D107C221bC31Be15B5 |
| RPC | `https://studio-dev.genlayer.com/api` |
| Deploy transaction | https://explorer-studio-dev.genlayer.com/tx/0x931708460d3aca812647fcdf5fe615737553cde49874f63a3619f41f5bff4c04 |
| Source | `contracts/bountiq-devnet.py` |
| Live state | 3 seeded bounties, 0 submissions |
| Redeploy | `npm run deploy:devnet` |

> **Direct link:** https://explorer-studio-dev.genlayer.com/address/0xa476Bd972187BFCc8bbA05D107C221bC31Be15B5

### Studionet - chain 61999

The demo video was recorded against this deployment. The app now runs on the Studio Devnet deployment above, which is the same contract ported to the newer runtime.

| | |
|---|---|
| **Contract address** | `0xB86727DcEBb4cB1E11421fB3dF28e9cc326d79e7` |
| **Explorer link** | https://explorer-studio.genlayer.com/address/0xB86727DcEBb4cB1E11421fB3dF28e9cc326d79e7 |
| RPC | `https://studio.genlayer.com/api` |
| Source | `contracts/bountiq.py` |
| Live state | 5 bounties, 8 submissions, verdicts written by the validator committee |
| Redeploy | `node scripts/deploy.mjs` |

> **Direct link:** https://explorer-studio.genlayer.com/address/0xB86727DcEBb4cB1E11421fB3dF28e9cc326d79e7

### Why two chains

**The app reads and writes Studio Devnet, chain 61997.**

Getting there needed two changes. First the contract had to be ported to the newer runtime - `py-genlayer:test` and the current `gl.contract` / `gl.vm` / `gl.storage` namespaces - which is `contracts/bountiq-devnet.py`. Then the frontend had to move from `genlayer-js` 1.x to 2.x, because the 1.x client submits a zero-fee transaction and 61997 rejects that with `FeeValueMustBeNonZero`. The 2.x client is installed under the npm alias `genlayer-js-2` and estimates the fee inside `writeContract`, so no call site had to change.

The Studionet deployment is the earlier one, kept because the demo video was recorded against it. Both were deployed from this repository.

You can check the live state of either deployment yourself:

```bash
npm run verify:state          # reads get_state from both deployments
node scripts/demo-smoke.mjs   # drives the real UI against the live contract
```

## Live Deployment

| | |
|---|---|
| **Live app** | https://REPLACE-WITH-YOUR-VERCEL-URL |
| **Repository** | https://github.com/Eminent18254/bountiq |
| App contract | `0xa476Bd972187BFCc8bbA05D107C221bC31Be15B5` (Studio Devnet 61997) |
| Earlier deployment | `0xB86727DcEBb4cB1E11421fB3dF28e9cc326d79e7` (Studionet 61999) |

The deployment is the static bundle produced by `npm run build` in this repository. `vercel.json` supplies the SPA rewrites, so a hard refresh on any app route resolves instead of returning a 404.



## How Bountiq Works

A bounty is a published agreement. It carries a title, a brief, a list of acceptance criteria, a reward per accepted submission, how many submissions the creator wants, an optional brand the work is for, and a deadline.

A contributor opens a bounty, reads the acceptance criteria, and sends a deliverable. The submission is signed by their own wallet, and the address that signs is the address that is later paid.

The contract then calls the validator committee. A leader model evaluates the deliverable and returns a structured verdict. Every validator independently re-runs the same evaluation and compares:

* the **verdict** must match exactly (`approved`, `revision` or `rejected`),
* the **score** must land within 10 points of the leader,
* the **per-criterion pass/fail flags** may differ on at most a third of the criteria.

If those equivalence conditions are not met, the round does not settle on that result. Nothing is written until the committee agrees.

The accepted verdict is stored on chain per submission: the three values above, plus one entry per acceptance criterion with `criterion`, `passed`, and an evidence-based `reason`.

From there the creator manages the outcome. They can accept or decline a submission by hand - overriding the verdict if they disagree - then approve its payment, then mark it paid, which draws the reward down from the escrow the creator funded at publish time.

## What Makes Bountiq Different

Bountiq is built around three ideas that separate it from a normal bounty board.

### 1. The judge is not the payer

The person funding the work does not get to be the only opinion on whether the work was done. Validators reach consensus on the deliverable against criteria that were written down before anyone submitted. The creator can still override, but the override is an explicit, on-chain act rather than an invisible one.

### 2. The reward is funded before the work starts

A bounty carries a reward in wei and an escrow balance. The creator funds `reward x slots` up front, and the contract only reports a bounty as funded when it actually holds enough to cover the whole pool. A contributor can tell a real commitment from an unfunded promise before spending any time on it.

### 3. Failure is explained, not just declared

Every criterion comes back with a pass or fail and a written reason. A submission that comes back as `revision` can be resubmitted against the same criteria, and the contributor keeps a permanent record of every submission they have made, what it scored, and why.

## The User Journey

**Discover -> Submit -> Verify -> Manage -> Get paid**

A visitor lands on the marketing page, which explains the product and previews the kind of work available. Entering the app takes them to the **Bounties** list, where every row - title, reward, brand, reward pool, and submissions received against the creator's gate - is read live from the contract.

Selecting a bounty opens the submission view: acceptance criteria on one side, the deliverable on the other. Submitting signs a transaction from the connected wallet. The UI moves into an **Evaluating** state while the committee works, then shows the verdict with the per-criterion breakdown, the reason and the score.

The **Submissions** page is the contributor's home. It lists every submission that wallet has made, with status, verdict, reward state, and the payout address that was recorded at submission time. Anything that did not pass keeps a retry path.

The **Post bounty** page is the creator's home. It lists the bounties that wallet created, and each one opens a manage view showing every submission against it. From there a creator accepts or declines submissions, selects winners from the funded pool, and releases payment.

## Why GenLayer

The judgment in Bountiq is subjective. "Is this landing page clear?" and "does this guide explain the product?" are not questions a deterministic contract can answer, and they are exactly the questions a bounty platform has to settle.

Two things make GenLayer the right fit rather than a generic chain with an API call bolted on:

* **The evaluation runs inside the contract.** `_judge` builds the prompt from state that lives on chain - the bounty brief, the criteria, the brand context and the deliverable - and calls `gl.nondet.exec_prompt`. There is no off-chain judge service, and no server holding the scoring logic.
* **The result is consensus, not a single model.** The leader/validator equivalence rule above is enforced by the contract before the verdict is written. A single model having a bad day does not become a payout decision.

The contract also stores meaningful state and validates outcomes: bounties, submissions, per-criterion verdicts, escrow, reward pools, winner caps and payment state. `approve_payment` refuses to run unless the submission was accepted, will not over-allocate past the creator's winner cap, and will not pay more than the escrow holds.

## Architecture

The stack is deliberately small.

* **React 18** with **Vite**
* **Tailwind CSS v4**
* **`genlayer-js` 1.1.8** for reads, writes and the browser wallet
* **`motion`** for the page transitions
* **`lucide-react`** for icons
* **GenLayer Studio Devnet** (chain 61997) for the live app, **GenLayer Studionet** (chain 61999) for the earlier deployment the demo video used
* Python **Intelligent Contract** on GenLayer

The application keeps the interface and the chain layer separate. Everything chain-facing - the client, the wallet, reads, writes, GEN/wei conversion and the bounty form validation - lives in `src/lib/genlayer.js`. The UI never talks to the RPC directly.

```
              You - browser wallet (MetaMask)
                          |
                 connect / sign / send
                          v
            +-------------------------------+
            |   React UI  (src/main.jsx)    |
            |   landing - bounties -        |
            |   submit work - submissions - |
            |   post and manage bounty      |
            +-------------------------------+
                          |
                          v
            +-------------------------------+
            |    src/lib/genlayer.js        |
            |  wallet - reads - writes -    |
            |  GEN/wei math - validation    |
            +-------------------------------+
                          |
                          v
                    genlayer-js
                          |
                          v
        Bountiq Intelligent Contract  (Python)
          contracts/bountiq-devnet.py  -> Studio Devnet  61997  (the app)
          contracts/bountiq.py         -> Studionet      61999  (earlier deploy)
                          |
                          v
          gl.nondet.exec_prompt + leader/validator
                equivalence rule
                          |
                          v
        verdict - criteria - escrow - payment state
```

```
src/
  main.jsx                 the product: landing, bounties, submit work, submissions hub,
                           post and manage bounty, and every modal and state in between
  lib/genlayer.js          everything chain-facing: wallet, client, reads, writes,
                           GEN/wei conversion, bounty form validation
  components/Brand.jsx     the Bountiq wordmark
  index.css                Tailwind v4 entry and design tokens
contracts/
  bountiq-devnet.py        the Intelligent Contract on the Studio Devnet runtime - this is what the app calls
  bountiq.py               the same contract on the Studionet runtime (earlier deployment)
scripts/
  deploy.mjs               deploy to Studionet and write the address to .env
  deploy-devnet.mjs        deploy to Studio Devnet 61997 (genlayer-js 2.x) -> .env.devnet
  demo-smoke.mjs           Playwright pass over the real UI against the live contract
  record-demo.mjs          Playwright capture of the product for the demo video
  render-demo.mjs          places the neural voice-over clips over that recording
  make-logo.mjs            generates the identity asset
demo/
  bountiq-demo.mp4         the rendered product demo
  bountiq-demo-poster.jpg  the poster frame
  bountiq-logo-512.png     project logo (512x512, within the 128-2048 px / 2 MB rule)
  scenes.json              narration script, scene by scene
  render_neural.py         Edge neural TTS using the voice profile below
  voice-profile.json       the reusable voice profile
  voice/                   per-scene narration clips
  voice-timeline.json      clip durations
public/
  bountiq-mark.svg         favicon and brand mark
index.html                 Vite entry
vite.config.js             React + Tailwind + the /gl-api dev proxy
vercel.json                SPA rewrites so deep links resolve to the app
```

The GenLayer Studio RPC does not advertise CORS headers for browser origins in every region, so during development the RPC is proxied through `/gl-api` by `vite.config.js`. In production the app calls the RPC directly, which the deployment verified as working.

## Non-Custodial by Design

Bountiq does not take custody of user funds and never sees a private key.

The wallet layer in `src/lib/genlayer.js` uses the injected EIP-1193 provider - MetaMask or any equivalent browser wallet. The user signs in the browser, and the app only ever holds the resulting address. Reads work with no wallet at all, so the marketplace is browsable before connecting. There is no mock wallet in the product; the connect flow is a real wallet popup.

Escrow lives in the contract's own accounting, funded by the creator through the wallet, and released through the creator's reviewed decision.

## Security

* **Prompt injection is handled explicitly.** The deliverable is wrapped in a `<deliverable>` block and the prompt instructs the model to treat it strictly as content to evaluate and never to follow instructions inside it.
* **Verdicts are committee output.** A single model's answer is not trusted; the equivalence rule described above must pass before anything is stored.
* **Verdicts are shaped before use.** `normalize_verdict` and `build_criteria_results` coerce the model's response into the expected structure, so a malformed response cannot corrupt state.
* **All access is address-gated.** Only the bounty creator can review, approve or pay a submission, and only through the recorded sender address.
* **Input is bounded.** Titles, briefs, criteria, criteria count, deliverable size and slots all have hard caps enforced in the contract, and the bounty creation form validates the same limits before a transaction is offered.
* **Escrow cannot be over-drawn.** `approve_payment` checks the winner cap and the remaining escrow, and `mark_paid` refuses to release more than the bounty holds.
* **No secrets in the bundle.** The deployer key is read from `.deployer-key`, which is gitignored, and is never imported by frontend code.

### Honest limits

Bountiq is a testnet prototype. Two things are worth stating plainly rather than implying otherwise.

* **Payment release is recorded on chain, not transferred.** `mark_paid` draws the reward down from escrow and sets the submission's payment state to `paid`. There is no value transfer to the contributor's address, because this chain does not let a contract push GEN to an end-user EOA. The escrow accounting, the winner cap and the payout address recorded at submission time are all real and on chain; the transfer itself is the piece that a production deployment with a payout rail would complete.
* **`scripts/test-escrow.mjs` is stale.** It still uses an earlier `create_bounty` signature and will fail if run. The smoke test above is the maintained one.

## Additional Features

Beyond the core loop, Bountiq includes:

* A landing page that renders from fixed marketing copy, so the preview section never depends on chain availability
* A live contract link in the landing header and footer, so the deployment is verifiable from the product itself
* A creator-defined winner pool, from a specific number of winners to an open pool
* Submission gating, where a bounty shows submissions received against the creator's requested number
* Persistent submission state, so leaving a page mid-flow does not lose your entry
* A notification indicator for verdicts on the bounties page, which clears once the submission has been viewed
* A submission workspace with verdict, failure reasons, reward state, payout address and a retry path
* A nested creator manage view per bounty, so submissions are reviewed in the context of the bounty they belong to
* Leave confirmation when navigating away from a half-written bounty
* Form validation with field-level errors, plus success, error and empty states across the UI
* Real wallet connect and disconnect, with the connection restored on reload


## What We Built for the Hackathon

Bountiq goes past the boilerplate in the places that matter for a bounty product.

* **Escrow with exact-match funding.** A creator funds `reward x slots`; the contract rejects a partial funding that would leave the pool under-covered, and reports `funded` only when it genuinely holds enough.
* **A winner pool with a cap.** A creator can ask for any number of submissions, and separately decide how many of them get paid, or leave the pool open. The cap is enforced in `approve_payment`, so a later approval cannot silently overrun the pool.
* **Creator review that overrides the verdict.** The committee's verdict is an input to the creator's decision, not a replacement for it.
* **Resubmission after failure.** A `revision` verdict keeps the criteria intact and lets the contributor try again against the same published standard.
* **A real submission workspace.** Verdicts, per-criterion reasons, reward state and the payout address recorded at submission time, all in one place.
* **A landing page that never breaks on chain availability.** The preview section renders fixed marketing content instead of live reads.


### Routes

| Path | Screen |
|---|---|
| `/` | Landing page |
| `/app/bounties` | Bounties list - the workspace entry screen |
| `/app/submit` | Submissions hub |
| `/app/create` | Post bounty and manage created bounties |

The landing page always owns `/`, so a first-time visitor meets the product story before the workspace. `/about` is kept as an alias for the landing page.

## Future Direction

* **Real value transfer on release.** The escrow accounting and payout address are already recorded; a chain with a payout rail completes `mark_paid` into an actual transfer.
* **A staked validator set.** Right now consensus is GenLayer's validator committee. Validators who are wrong on a later-disputed verdict could be slashed.
* **Reputation from verdict history.** Every submission already produces a scored, reasoned, on-chain record. That is a contributor reputation signal waiting to be surfaced.
* **Bounty templates.** Common work - audits, documentation, design review - could ship with a reusable criteria set instead of a blank brief.
* **Multi-criteria weighting.** Criteria currently count equally. A creator should be able to weight them.
* **Milestone bounties.** Splitting a large bounty into verified stages, each released against its own criteria.

**Agreement first. Verified outcome. Payment earned.**

## Built On

[GenLayer](https://genlayer.com) Intelligent Contracts on Studio Devnet (chain 61997) and Studionet (chain 61999) - React 18 - Vite - Tailwind CSS v4 - `genlayer-js` 2.x - `motion` - `lucide-react`.