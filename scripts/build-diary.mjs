/*
  build-diary.mjs — the Letterboxd pipeline.
  Run with:  npm run diary

  HOW TO READ THIS FILE
  Top to bottom, as a lesson. Each numbered section introduces at most
  one new idea, states it in plain words, then uses it. The output of
  the whole script is one file: src/films/diary.json.

  §1 · The data flow (what this script mechanically does)

      CSV export (complete history,        RSS feed (last ~50 entries,
      frozen at export time)               always fresh, public URL)
              │                                    │
        parse + join                          fetch + parse
              │                                    │
              └────────────► merge ◄───────────────┘
                               │
                     src/films/diary.json   ←  React renders this

      The site never talks to Letterboxd at runtime. This script runs at
      build time on your machine; if Letterboxd is down or changes its
      markup, a *build* fails loudly — the deployed site cannot break.

      diary.json is gitignored: committing it is the act of publishing,
      the same rule as posts.
*/

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/* ============================================================
   §2 · Parsing CSV correctly — a two-state machine

   Concept first: a CSV row is NOT "a line split on commas". Your
   reviews contain commas and real newlines, and Letterboxd wraps such
   fields in double quotes (reviews.csv is 547 lines but only 134
   records). Any line-oriented tool silently corrupts this file.

   The correct parser is a state machine with two states:

     outside quotes:  , ends a field · newline ends a row · " enters quotes
     inside quotes:   everything is literal text, except " which either
                      escapes a quote ("" → one ") or exits quotes

   We walk the text one character at a time and let the current state
   decide what each character means. That's the whole trick — the same
   character (a comma) means "field boundary" in one state and "just a
   comma" in the other.
   ============================================================ */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (insideQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"' // "" is an escaped quote character
          i++
        } else {
          insideQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        insideQuotes = true
      } else if (char === ',') {
        row.push(field)
        field = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++ // windows line ending
        row.push(field)
        field = ''
        if (row.some(f => f !== '')) rows.push(row) // skip blank lines
        row = []
      } else {
        field += char
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/* Turn [[header...], [values...]] into [{header: value}] so the rest of
   the script reads fields by name, not by column position. */
function csvToObjects(text) {
  const [header, ...rows] = parseCsv(text)
  return rows.map(row =>
    Object.fromEntries(header.map((name, i) => [name, row[i] ?? '']))
  )
}

/* ============================================================
   §3 · Loading the export — join diary and reviews on their shared key

   diary.csv   one row per log entry: date, film, rating, rewatch
   reviews.csv the subset of entries that have review text

   Both carry a `Letterboxd URI` (a boxd.it short link) unique per log
   entry — that's the join key (verified in the EDA,
   docs/letterboxd-exploration.md).
   ============================================================ */
const exportFolder = readdirSync('.').find(
  name => name.startsWith('letterboxd-') && name.endsWith('-utc')
)
if (!exportFolder) {
  console.error('No letterboxd-*-utc export folder found in the repo root.')
  process.exit(1)
}

const diaryRows = csvToObjects(
  readFileSync(join(exportFolder, 'diary.csv'), 'utf8')
)
const reviewRows = csvToObjects(
  readFileSync(join(exportFolder, 'reviews.csv'), 'utf8')
)

/* A Map gives O(1) lookup by URI while we walk the diary. */
const reviewByUri = new Map(reviewRows.map(r => [r['Letterboxd URI'], r]))

/* §3b · The entry shape — the contract the React side consumes.
   Derived from what the data actually holds (schema follows data):
   review is an array of paragraph strings, or null for plain watches. */
function paragraphsFromCsv(text) {
  // CSV review text separates paragraphs with blank lines
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
}

const baseEntries = diaryRows.map(row => {
  const review = reviewByUri.get(row['Letterboxd URI'])
  return {
    title: row['Name'],
    year: Number(row['Year']),
    watchedDate: row['Watched Date'],
    loggedDate: row['Date'],
    rating: row['Rating'] === '' ? null : Number(row['Rating']),
    rewatch: row['Rewatch'] === 'Yes',
    review: review ? paragraphsFromCsv(review['Review']) : null,
  }
})

/* ============================================================
   §4 · Fetching the RSS delta

   The feed is plain XML with a known, single-producer shape. We extract
   fields with regular expressions over each <item> block.

   Flagged folklore: "never parse XML with regex" is real advice for
   arbitrary XML from arbitrary producers. It is safe here because the
   domain is closed — one producer (Letterboxd), one consumer (this
   script), checked at build time where failure is a loud console
   message, never a broken page. If Letterboxd changes its markup, the
   next build tells us.
   ============================================================ */
function tagContent(block, tag) {
  // (?:\s[^>]*)? — the open tag may carry attributes, e.g.
  // <guid isPermaLink="false">. Learned the hard way: without this,
  // every item was silently dropped and only the §6 report caught it.
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`))
  return match ? match[1] : ''
}

function paragraphsFromRss(descriptionHtml) {
  return [...descriptionHtml.matchAll(/<p>(.*?)<\/p>/gs)]
    .map(m => m[1].trim())
    .filter(p => !p.startsWith('<img')) // first <p> is the poster image
    .filter(Boolean)
}

async function fetchRssEntries(username) {
  const url = `https://letterboxd.com/${username}/rss/`
  let xml
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'portfolio build script (contact: site owner)' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    xml = await response.text()
  } catch (error) {
    console.warn(`RSS fetch failed (${error.message}) — building from the CSV base only.`)
    return []
  }

  const items = xml.match(/<item>.*?<\/item>/gs) ?? []
  return items
    .filter(item => /letterboxd-(watch|review)-/.test(tagContent(item, 'guid')))
    .map(item => {
      const isReview = tagContent(item, 'guid').startsWith('letterboxd-review-')
      const description = item.match(/<!\[CDATA\[(.*?)\]\]>/s)?.[1] ?? ''
      return {
        title: tagContent(item, 'letterboxd:filmTitle'),
        year: Number(tagContent(item, 'letterboxd:filmYear')),
        watchedDate: tagContent(item, 'letterboxd:watchedDate'),
        loggedDate: tagContent(item, 'letterboxd:watchedDate'),
        rating: tagContent(item, 'letterboxd:memberRating') === ''
          ? null
          : Number(tagContent(item, 'letterboxd:memberRating')),
        rewatch: tagContent(item, 'letterboxd:rewatch') === 'Yes',
        review: isReview ? paragraphsFromRss(description) : null,
      }
    })
}

/* ============================================================
   §5 · The merge — where the two sources become one history

   The design problem, precisely: the CSV base and the RSS delta overlap
   (recent entries appear in both) but share NO identifier — the CSV has
   boxd.it URIs, RSS items don't. So "is this RSS entry already in the
   base?" must be answered from content alone. And the merge must be
   idempotent: this script runs on every build, so merging the same
   feed twice has to produce the same result as merging it once.

   TODO(human) — implement mergeEntries below.
   ============================================================ */
function mergeEntries(baseFromCsv, updatesFromRss) {
  // TODO(human): return one combined array of entries.
  // Decide the dedup key (what makes a CSV entry and an RSS item "the
  // same watch"?) and the conflict policy (when both sources describe
  // one watch, which fields win?). `npm run diary` prints a parsed
  // sample of each source below so you can design against real data.
  return baseFromCsv
}

/* ============================================================
   §6 · Emit + report — make the invisible visible

   The report prints what each stage actually produced, so a merge bug
   shows up here as numbers that don't add up, not as a quiet gap on
   the site.
   ============================================================ */
const rssEntries = await fetchRssEntries('gabrielgranata')
const merged = mergeEntries(baseEntries, rssEntries)

/* newest watch first — a display default, easy to change */
merged.sort((a, b) => (a.watchedDate < b.watchedDate ? 1 : -1))

mkdirSync('src/films', { recursive: true })
writeFileSync('src/films/diary.json', JSON.stringify(merged, null, 2))

console.log(`CSV base:   ${baseEntries.length} entries (${baseEntries.filter(e => e.review).length} with reviews)`)
console.log(`RSS delta:  ${rssEntries.length} entries (${rssEntries.filter(e => e.review).length} with reviews)`)
console.log(`Merged:     ${merged.length} → src/films/diary.json`)
console.log(`Newest:     ${merged[0]?.watchedDate} — ${merged[0]?.title}`)
if (rssEntries.length > 0) {
  console.log('\nSample RSS entry (for designing the merge):')
  console.log(JSON.stringify(rssEntries[0], null, 2))
  console.log('\nSame film in CSV base, if present:')
  const match = baseEntries.find(e => e.title === rssEntries[0].title)
  console.log(match ? JSON.stringify(match, null, 2) : '(not in base — watched after the export)')
}
