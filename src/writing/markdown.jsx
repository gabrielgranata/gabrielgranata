/*
  A deliberately small markdown renderer.

  Why hand-rolled: these posts are OUR input — Gabriel writes them — so the
  pathological edge cases a real markdown library exists to survive can't
  occur. What's left is small enough to read, and reading it is the point.

  Supported syntax (exactly what we use, nothing more):
    # ## ###   headings
    **bold**  *italic*  `code`  [text](url)   inline marks
    [text]()   a pending link — destination not written yet
    ```       fenced code blocks
    - item    bullet lists
    > line    quotes
    blank line separates paragraphs

  How to read this file:
    1 · block scan — split lines into blocks (heading, list, code, paragraph)
    2 · inline marks — split a text run into styled pieces
    3 · <Markdown> — turn blocks into React elements

  One rule matters most: we output React ELEMENTS, never an HTML string.
  There is no dangerouslySetInnerHTML here — nothing an input can contain
  becomes markup, so injection is impossible by construction.
*/

/* ── 1 · block scan ────────────────────────────────────────────────
   Walk the lines once, top to bottom, grouping them into blocks.
   A block is a plain object: { type, ... } — data, not markup. */
function parseBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let paragraph = []
  let list = null
  let code = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ type: 'list', items: list })
      list = null
    }
  }

  for (const line of lines) {
    // inside a fenced code block, every line is literal until the closing fence
    if (code !== null) {
      if (line.startsWith('```')) {
        blocks.push({ type: 'code', text: code.join('\n') })
        code = null
      } else {
        code.push(line)
      }
      continue
    }

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      code = []
    } else if (line.trim() === '---') {
      flushParagraph()
      flushList()
      blocks.push({ type: 'hr' })
    } else if (/^#{1,3} /.test(line)) {
      flushParagraph()
      flushList()
      const level = line.indexOf(' ') // "# "→1, "## "→2, "### "→3
      blocks.push({ type: 'h', level, text: line.slice(level + 1) })
    } else if (line.startsWith('- ')) {
      flushParagraph()
      list = list || []
      list.push(line.slice(2))
    } else if (line.startsWith('> ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'quote', text: line.slice(2) })
    } else if (line.trim() === '') {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()
  if (code !== null) blocks.push({ type: 'code', text: code.join('\n') })
  return blocks
}

/* ── 2 · inline marks ──────────────────────────────────────────────
   One regex with one capturing group of alternatives. String.split with
   a CAPTURING regex returns a strictly alternating array:
     even index → plain text (may be empty), odd index → a matched mark.
   That parity is the invariant we dispatch on — never sniff prefixes on
   plain pieces, or ordinary text starting with '[' or '*' gets mangled
   (a bug browser-verification actually caught here). */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g

function renderInline(text) {
  return text.split(INLINE).map((piece, i) => {
    if (i % 2 === 0) return piece // plain text between marks
    if (piece.startsWith('**')) return <strong key={i}>{piece.slice(2, -2)}</strong>
    if (piece.startsWith('`')) return <code key={i}>{piece.slice(1, -1)}</code>
    if (piece.startsWith('[')) {
      const mid = piece.indexOf('](')
      const label = piece.slice(1, mid)
      const href = piece.slice(mid + 2, -1)
      // [text]() — empty href is the pending-link convention: the words are
      // written, the destination isn't. Render honestly, not as a dead <a>.
      if (!href) {
        return (
          <span key={i} className="pend-link" title="link pending">
            {label}
          </span>
        )
      }
      return (
        <a key={i} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
          {label}
        </a>
      )
    }
    return <em key={i}>{piece.slice(1, -1)}</em>
  })
}

/* ── 3 · the component ───────────────────────────────────────────── */
export default function Markdown({ text }) {
  return parseBlocks(text).map((b, i) => {
    switch (b.type) {
      case 'h': {
        const H = ['h2', 'h3', 'h4'][b.level - 1] // post title is the page's h1
        return <H key={i}>{renderInline(b.text)}</H>
      }
      case 'code':
        return (
          <pre key={i}>
            <code>{b.text}</code>
          </pre>
        )
      case 'list':
        return (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        )
      case 'quote':
        return <blockquote key={i}>{renderInline(b.text)}</blockquote>
      case 'hr':
        return <hr key={i} />
      default:
        return <p key={i}>{renderInline(b.text)}</p>
    }
  })
}
