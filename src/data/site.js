// importing an image hands back its bundled URL (same mechanism as
// post images) — used by the talks cards below
import talk1Image from '../talks/talk-1.png'

/*
  All content lives here — components render this, they don't invent it.

  Facts trace to resume-mockup.html (the sole source of facts) or to this
  project's own history. [Bracketed text] is a placeholder, not a claim —
  the same convention the resume uses. Components render bracketed runs in
  muted italic via <PendingText>.
*/

export const identity = {
  name: 'Gabriel Granata',

  positioning:
    'hello. \nthis is a collection of my thoughts, experiments, and ramblings.\n' +
    'personally exploring humanity, AI, and the future of work. \nthis site is a work in progress, and the content is evolving.' +
    '\ni intend to grow with it.',

  // the closing line is its own element so it can carry its own
  // geometry (centered) — alignment belongs to blocks, not to lines

  // Writing task for Gabriel — do not fill in.
  intro: "Take everything with a grain of salt. I am a human exploring what it means to be human.",

  // href: null means the link itself is pending; `note` is the visible placeholder.
  contact: [
    { label: 'GitHub', href: 'https://github.com/gabrielgranata', note: null },
    { label: 'Substack', href: 'https://m1ndovermatter.substack.com', note: null },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/gabrielgranata', note: null },
  ],
}

/*
  Talks. The repo's talks/ folder is served verbatim at /talks/
  (public/talks is a symlink into it; the build copies through it).
  slug routes to the in-site reader (#talks/<slug>); href is the raw
  deck document itself. Titles are the decks' own <title> tags.

  Card images live in src/talks/ (talk-1.png, …), imported at the top
  of this file.
*/
export const talks = [
  {
    // slug is the public address (#talks/<slug>) — the title formatted
    // for a link, not the talks/ folder name. Changing it changes the
    // published address; old addresses fall back to the talks index.
    slug: 'a-framework-for-agentic-engineering',
    title: 'A Framework for Agentic Engineering',
    date: '2026',
    href: '/talks/talk-1-agentic-engineering/',
    image: talk1Image,
  },
  {
    slug: 'what-your-ai-conversations-say-about-how-you-think',
    title: 'What Your AI Conversations Say About How You Think',
    date: '2026',
    href: '/talks/talk-2-ai-mirror/',
    // no image yet — the card renders as a text brief until one exists
  },
]

/*
  Feed entries. types: build | lab | essay | work | note.
  `date` is a display string, kept exactly as honest as the source allows.

  Order is authored by hand, newest first — no sort, because entries with
  pending dates can't be sorted mechanically. When a pending date gets a real
  value, move the entry to its true position.
*/
export const entries = [
  {
    date: 'Jul 19, 2026',
    type: 'note',
    title: 'This site: first sketch built',
    body:
      'One page: a narrative header over a dated feed. Neutral placeholder ' +
      'styling on purpose — the visual direction is still an open call.',
  },
  {
    date: 'Jul 18, 2026',
    type: 'lab',
    title: 'Visual-assets research fan-out',
    body:
      'Three research threads run in parallel: directed AI generation, ' +
      'procedural code-generated art, and real work artifacts treated as ' +
      'aesthetic objects. A map of what to try — nothing adopted yet.',
  },
  {
    date: 'Jul 18, 2026',
    type: 'note',
    title: 'Three visual directions proposed in Paper',
    body:
      'Bookish serif, phosphor terminal, Swiss editorial — three tiles on the ' +
      'canvas, awaiting a pick. The site stays neutral until the call is made.',
  },
  {
    date: 'Jul 18, 2026',
    type: 'lab',
    title: 'Motion hello-world',
    body:
      'A spring and a draggable dot: grab it, throw it, it finds its way home. ' +
      'First contact with react-spring and use-gesture; the tension/friction ' +
      'pair from this exercise is now the site-wide motion constant.',
  },
  {
    date: 'Jul 2026',
    type: 'work',
    title: 'Promoted to SDE II — Amazon Web Services',
  },
  {
    date: '[date pending]',
    type: 'essay',
    title: 'I wrote my last article with AI',
    link: { label: 'Read on Substack', href: 'https://m1ndovermatter.substack.com' },
  },
  {
    date: '[date pending]',
    type: 'essay',
    title: 'Where are we headed?',
    link: { label: 'Read on Substack', href: 'https://m1ndovermatter.substack.com' },
  },
  {
    date: '2026 · [month pending]',
    type: 'build',
    title: 'AI-enabled competitive intelligence',
    body:
      'Vision-model PDF extraction, per-site scraping adapters, two-pass ' +
      'product matching with a human-confirmation gate before any price is ' +
      'trusted. In production for a business client. (Consulting)',
  },
  {
    date: '2026 · [month pending]',
    type: 'build',
    title: 'MrSports ERP',
    body:
      'Inventory & order-management system (Next.js/Supabase) for a print ' +
      'shop, replacing a paper workflow. In daily use since [date pending]. ' +
      '(Consulting)',
  },
  {
    date: '[date pending]',
    type: 'build',
    title: 'Cognitive Cartographer',
    body:
      "Writing environment where the model's only output surface is Socratic " +
      'questions; gap analysis is deterministic.',
    link: { label: 'Repo', href: null },
  },
  {
    date: '[date pending]',
    type: 'build',
    title: 'Paideia',
    body:
      'Education platform, originally built at a hackathon: curriculum graph ' +
      'vs. comprehension graph, updated only through demonstrated reasoning; ' +
      'citation enforced at the render boundary. Working build — repo going public.',
    link: { label: 'Repo', href: null },
  },
  {
    date: 'Oct 2025 – present',
    type: 'work',
    title: 'AWS DevOps Agent',
    body:
      'Owned launch of agent memory and learned-skills capabilities — ' +
      'continual learning and automated skill generation from operational ' +
      'history. Built a trajectory-analysis pipeline over agent investigation ' +
      'journals; used it to build MCP tooling that improved learning-agent ' +
      'latency 50%.',
  },
  {
    date: 'Jan 2024 – Oct 2025',
    type: 'work',
    title: 'AWS Cloud Map',
    body:
      'Co-owned automation of 70 manual tasks across the team, cutting ' +
      'region-build time from 30+ developer-days per region to full ' +
      'automation. Designed and built end-to-end automatic weigh-out, ' +
      'reducing MTTR 80%.',
  },
]
