/*
  The posts registry — single source of truth for on-site writing.
  Adding a post = adding one .md file to ./posts/. Nothing else to update:
  the Writing section, the #writing index, and the post pages all read
  this module.

  How it works:
  - import.meta.glob is a Vite feature: at BUILD time it finds every file
    matching the pattern and (with eager + ?raw) inlines each file's text
    into the bundle. No fetch, no server — the posts ship inside the JS.
  - Each file starts with a tiny frontmatter header between --- lines:
        ---
        title: My title
        date: 2026-07-19
        status: draft        (optional — draft posts render with a tag)
        ---
    parseFrontmatter splits that header off and reads its key: value lines.
  - The slug (URL id) is the filename without .md — rename the file,
    change the address.
*/

const files = import.meta.glob('./posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function parseFrontmatter(raw) {
  const meta = {}
  if (!raw.startsWith('---')) return { meta, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta, body: raw }
  for (const line of raw.slice(3, end).trim().split('\n')) {
    const colon = line.indexOf(':')
    if (colon > 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return { meta, body: raw.slice(end + 4).trim() }
}

export const posts = Object.entries(files)
  .map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw)
    return {
      // every frontmatter key rides along — the epistemic header (confidence,
      // importance) reads them when present, and future metadata costs nothing
      ...meta,
      slug: path.split('/').pop().replace(/\.md$/, ''),
      title: meta.title || '[untitled]',
      date: meta.date || '[date pending]',
      status: meta.status || 'published',
      body,
    }
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))

export function postBySlug(slug) {
  return posts.find(p => p.slug === slug)
}
