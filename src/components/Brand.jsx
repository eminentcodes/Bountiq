import { useId } from 'react'

// The Bountiq mark: a sealed orb of work carrying a verification check, with a
// reward accent. The same artwork ships as /bountiq-mark.svg for the favicon.
export function Brand({ compact = false, size = 34 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const bgId = 'bqbg' + uid
  const orbId = 'bqorb' + uid
  return <span className="flex items-center gap-2.5 font-display font-extrabold tracking-[-.035em]">
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="shrink-0 rounded-[10px] shadow-[0_6px_16px_rgba(12,26,43,.22)] transition-transform duration-300 hover:scale-[1.06]">
      <defs>
        <linearGradient id={bgId} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E4162" />
          <stop offset="1" stopColor="#0B1827" />
        </linearGradient>
        <radialGradient id={orbId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24.5 22.5) rotate(52) scale(38)">
          <stop stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#C7DBEB" />
          <stop offset="1" stopColor="#6D8CA7" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="19" fill={'url(#' + bgId + ')'} />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="18.25" stroke="#FFFFFF" strokeOpacity=".16" strokeWidth="1.5" />
      <circle cx="32" cy="30" r="15.5" fill={'url(#' + orbId + ')'} />
      <circle cx="25.5" cy="23.5" r="4" fill="#FFFFFF" fillOpacity=".7" />
      <path d="M22.5 31 29 37.5 42.5 23" stroke="#0C1A2B" strokeWidth="5.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="50" cy="50" r="6.5" fill="#69A882" stroke="#0B1827" strokeWidth="2.5" />
    </svg>
    {!compact && <span>Bountiq</span>}
  </span>
}