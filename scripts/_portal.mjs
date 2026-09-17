import { readFileSync, writeFileSync } from 'node:fs'
const m = 'src/main.jsx'
let ml = readFileSync(m, 'utf8')

// Ancestors with backdrop-filter become the containing block for position:fixed,
// so the dialog must be portalled to <body> to centre on the viewport.
if (!ml.includes("import { createPortal } from 'react-dom'")) {
  ml = ml.replace("import { createRoot } from 'react-dom/client'", "import { createRoot } from 'react-dom/client'\nimport { createPortal } from 'react-dom'")
}

if (!ml.includes('{open && createPortal(<div role="dialog"')) {
  ml = ml.replace('{open && <div role="dialog"', '{open && createPortal(<div role="dialog"')
}

const tail = '      </div>\n    </div>}\n  </>\n}'
if (!ml.includes(tail)) throw new Error('modal tail anchor not found')
ml = ml.replace(tail, '      </div>\n    </div>, document.body)}\n  </>\n}')

writeFileSync(m, ml)
console.log('portal applied; createPortal refs:', (ml.match(/createPortal/g) || []).length)