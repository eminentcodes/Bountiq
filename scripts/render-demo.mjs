import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const SRC = 'C:/Users/Great/Downloads/recording (2).mp4'
const OUT = 'demo/bountiq-demo.mp4'
const TRIM = 157.5

// Voice-over placement, matched to what is on screen in the recording.
const plan = [
  ['01-intro', 0.5],
  ['03-landing', 17.0],
  ['05-bounties', 29.5],
  ['06-submit', 41.6],
  ['07-evaluating', 54.3],
  ['02-problem', 67.2],
  ['10-creator', 93.0],
  ['08-verdict', 108.0],
  ['09-hub', 118.7],
  ['04-contract', 128.2],
  ['11-close', 142.8],
]

for (const [id] of plan) {
  const f = `demo/voice/${id}.mp3`
  if (!existsSync(f)) { console.error('missing', f); process.exit(1) }
}

const inputs = ['-i', SRC]
for (const [id] of plan) inputs.push('-i', `demo/voice/${id}.mp3`)

const parts = plan.map(([, t], i) => {
  const ms = Math.round(t * 1000)
  return `[${i + 1}:a]aresample=48000,adelay=${ms}|${ms}[a${i}]`
})
const mix = plan.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${plan.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95,afade=t=out:st=${TRIM - 2}:d=2[aout]`

const args = [
  '-y', '-hide_banner', '-loglevel', 'error',
  ...inputs,
  '-filter_complex', [...parts, mix].join(';'),
  '-map', '0:v:0', '-map', '[aout]',
  '-c:v', 'copy',
  '-c:a', 'aac', '-b:a', '192k',
  '-t', String(TRIM),
  '-movflags', '+faststart',
  OUT,
]

console.log('rendering', OUT)
execFileSync('ffmpeg', args, { stdio: 'inherit' })
console.log('done')