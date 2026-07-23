import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

/*
  v26 — the same desktop, rebuilt on the real tooling.

  What changed and why (the long version is frontend-basics-map.md):

  · OWNERSHIP. React state now owns only WHAT EXISTS — which windows,
    z-order, minimized/maximized flags, rest rects. All continuous
    geometry (x, y, w, h, scale, opacity) lives in springs that write
    to the DOM directly, off React's render path. No more setState on
    pointermove.
  · GESTURES. @use-gesture/react measures (down, offset, velocity,
    direction); @react-spring/web actuates; the dozen lines between
    them are policy. `immediate: down` gives the 1:1 grip; on release
    the throw target is PROJECTED from measured velocity and sprung
    to — the documented-robust momentum pattern, replacing ~30 lines
    of hand-rolled velocity tracking from v24/v25.
  · FEEL LIVES IN ONE PLACE. Four named spring configs below (grip /
    settle / throw / pop). Tuning taste = editing these numbers.
  · EVERYTHING IS INTERRUPTIBLE. Open, close, minimize-to-taskbar
    (FLIP), restore, maximize are all springs — retargeting mid-flight
    just works; no transition classes, no keyframes, no two-writers
    fights.
  · MOBILE IS A POLICY, NOT A CSS OVERRIDE. Narrow viewport ⇒ every
    window's target rect is the workspace and drag/resize don't bind.
    Same state machine.
  · REDUCED MOTION. The go() helper injects immediate:true everywhere
    when the OS asks — same end states, physics off.

  Intended home: a local Vite + React project (see map §8). The two
  imports above are real npm packages and may not resolve in the chat
  preview; that's expected — this file is the reference implementation
  for the Claude Code build, not a chat toy.

  Unchanged, verbatim: the 22 claims, the grounded-ask block, ledger,
  honesty flags, icons, palette, all window content renderers.
*/

/* ---- feel lives here ---- */
const SPRING = {
  grip:   { tension: 500, friction: 40 },          /* only used at release edges; drags are immediate */
  settle: { tension: 300, friction: 30 },          /* arrivals: open, restore, maximize */
  throw:  { tension: 170, friction: 26 },          /* post-release momentum glide */
  pop:    { tension: 420, friction: 34 },          /* exits: close, minimize */
};
const MIN_W = 300, MIN_H = 220, TASKBAR_H = 44, CASCADE = 30;
const MOBILE_Q = 700;

const THOUGHTS = [
  { id: "origin-seed", ch: "origins", ext: "q", kind: "doc",
    title: "[what set the curiosity going]",
    body: "[Gabriel's words: the earliest thing that made building feel inevitable — one honest sentence, not an origin myth.]" },
  { id: "origin-degree", ch: "origins", ext: "log", kind: "doc",
    title: "[degree], [university] · [years]",
    body: "[The education line from the resume, verbatim once confirmed.]",
    receipt: "[pending: the LinkedIn export fills this exactly.]" },

  { id: "b10x", ch: "proof", ext: "measure", kind: "measure", num: "10×",
    title: "faster report-writing — BMO, early career",
    body: "A reporting tool that cut report-writing time ten-fold. [Gabriel's note: what a report took before and after, who used it.]",
    receipt: "[how the ten-fold was counted — what counted as a report, over what period, verified by whom. until written: unverified — ask.]" },

  { id: "q-thinking", ch: "question", ext: "q", kind: "doc",
    title: "what happens to thinking when the tool answers?",
    body: "The question that started everything independent. If the machine completes your sentence, whose sentence is it?" },
  { id: "thesis", ch: "question", ext: "conviction", kind: "daemon", since: "[year]",
    title: "interfaces you think through, not consume from",
    body: "A tool should leave you more capable when it's taken away — not more dependent while it's present. Every process on this system is a rule derived from this, a thing built to test it, or a number that came back." },
  { id: "essay-headed", ch: "question", ext: "essay", kind: "doc",
    title: "[essay: the thesis, in public]",
    body: "What cognitive offloading and misplaced confidence do to the person holding the tool. [draft title — real title and body pulled from Substack]",
    links: [["read it", "https://m1ndovermatter.substack.com"]] },

  { id: "region", ch: "currents/aws", ext: "measure", kind: "measure", num: "~70 → 0",
    title: "manual tasks in a region build",
    body: "Co-owned automating an AWS region build: roughly seventy manual tasks, thirty-plus engineer-days per region, taken to full automation.",
    receipt: "[how the seventy was counted, what thirty-plus engineer-days is based on, what stayed manual. until written: unverified — ask.]" },
  { id: "promo", ch: "currents/aws", ext: "log", kind: "doc",
    title: "promoted — SDE II · AWS · Vancouver · July 2026",
    body: "The region work and the agent work in this directory are what the promotion stands on.",
    receipt: "verifiable by reference." },
  { id: "idea-memory", ch: "currents/aws", ext: "conviction", kind: "daemon", since: "[year]",
    title: "memory is only useful if it stays current",
    body: "An agent that remembers is an agent that can be wrong at scale — stale knowledge doesn't just fail to help, it actively misleads. Keeping operational memory alive, not just kept, is the job." },
  { id: "devops", ch: "currents/aws", ext: "build", kind: "doc",
    title: "AWS DevOps Agent — memory & learned skills",
    body: "Owned the launch of agent memory and learned skills, publicly documented. The agent investigates incidents; this work is what it carries between them.",
    receipt: "[public docs link pending.]",
    links: [["public docs", "#"]] },
  { id: "traj", ch: "currents/aws", ext: "measure", kind: "traj", num: "6 → 3",
    title: "the same alarm, investigated three ways",
    receipt: "[pending Gabriel's check that the stale trace is honest to real agent behavior — a dramatization until confirmed.]" },
  { id: "m-latency", ch: "currents/aws", ext: "measure", kind: "measure", num: "50%",
    title: "learning-agent latency, gone",
    body: "Half the latency — my measurement, and I want you to ask me how.",
    receipt: "[verbatim from the repo's methodology note: what was measured, across how many seeded replays, before and after what, and what would falsify it.]" },

  { id: "rule-ask", ch: "currents/independent", ext: "rule", kind: "policy",
    title: "the model may only ask questions",
    body: "A hard rule: the model's entire output surface is questions. It cannot suggest, complete, or approve. Enforced in code, not in a prompt — inspectable in the Cartographer repo." },
  { id: "cartographer", ch: "currents/independent", ext: "build", kind: "doc",
    title: "Cognitive Cartographer",
    body: "A writing environment with one voice removed — argument graph, gap analysis, and a model that can only ask. Public code. Not a demo of the rule — the rule, running.",
    receipt: "[repo link pending.]",
    links: [["code", "#"]] },
  { id: "essay-ai", ch: "currents/independent", ext: "essay", kind: "doc",
    title: "[essay: writing with the rule on]",
    body: "The essay Cartographer produced — where the tool helped, where it flattened. Proof the rule survives contact with real writing. [draft title — from Substack]",
    links: [["read it", "https://m1ndovermatter.substack.com"]] },
  { id: "sindri", ch: "currents/independent", ext: "build", kind: "doc",
    title: "a local research tool",
    body: "Runs entirely on my own machine — epistemic actions preserved, nothing phoned home. The essay is the documentation.",
    links: [["the write-up", "https://m1ndovermatter.substack.com"]] },
  { id: "rule-complete", ch: "currents/independent", ext: "rule", kind: "policy",
    title: "completion affordances: banned",
    body: "The same conviction, aimed at learning: an education tool that refuses to do the student's thinking. No autocomplete, no answer button, nothing to harvest. Architectural, not configurable." },
  { id: "paideia", ch: "currents/independent", ext: "build", kind: "doc",
    title: "Paideia",
    body: "The education platform where the ban is the architecture. Students externalize reasoning instead of collecting the machine's. Working build; repo going public.",
    receipt: "[link pending.]",
    links: [["code", "#"]] },
  { id: "substack", ch: "currents/independent", ext: "essay", kind: "doc",
    title: "m1ndovermatter",
    body: "The notebook where the thinking is done in public — every essay on this system lives on it.",
    links: [["visit", "https://m1ndovermatter.substack.com"]] },
  { id: "consult", ch: "currents/independent", ext: "note", kind: "doc",
    title: "[independent practice]",
    body: "[One line on the consulting practice, if it belongs here at all — Gabriel's call.]" },

  { id: "reach", ch: "now", ext: "conviction", kind: "daemon", since: "2026",
    title: "next: the same conviction, built for more people",
    body: "[Gabriel's words: one honest paragraph about what he's reaching toward — the kind of team, the kind of problem, why now.]" },
  { id: "personal", ch: "now", ext: "note", kind: "doc",
    title: "[the person outside the work]",
    body: "[Optional, deletable: one human paragraph — whatever survives Gabriel's edit.]" },
  { id: "door", ch: "now", ext: "card", kind: "hello",
    title: "say hello",
    body: "If anything on this system felt worth a second look, I'd like to talk. References, transcripts, and the receipts behind every monitor, on request.",
    receipt: "[email] · [portfolio URL]",
    links: [["substack", "https://m1ndovermatter.substack.com"], ["github", "#"], ["email", "#"]] },
];

const DIRS = ["origins", "proof", "question", "currents/aws", "currents/independent", "now"];

const RUNS = {
  none: { label: "no note", steps: ["alarm", "deploys? no", "metrics? no", "dead end", "config → drift", "root cause · 6 steps"] },
  good: { label: "good note", steps: ["alarm", "note: last config change", "config → drift · 3 steps"] },
  stale: { label: "stale note", steps: ["alarm", "note: config change (months old)", "config? unchanged since", "flag: note is stale", "widen: metrics → leak · 5 steps"] },
};

const STORYLINE = ["b10x", "thesis", "rule-ask", "cartographer", "region", "promo", "devops", "m-latency", "reach", "door"];

const DIR_LABEL = {
  origins: "Origins", proof: "First Proof", question: "The Question",
  "currents/aws": "AWS", "currents/independent": "Independent", now: "Now",
};
const EXT_COLOR = {
  conviction: "var(--cyan)", rule: "var(--cyan)", measure: "var(--gold)",
  build: "var(--ink)", essay: "var(--ink)", log: "var(--ink60)",
  note: "var(--ink60)", q: "var(--ink60)", card: "var(--gold)",
};
const ICON_PATH = {
  folder: <path d="M4 7.6C4 6.7 4.7 6 5.6 6h4l1.6 2h7.2c.9 0 1.6.7 1.6 1.6v6.8c0 .9-.7 1.6-1.6 1.6H5.6C4.7 17 4 16.3 4 15.4V7.6z" />,
  card: <path d="M5 6.5h14a1.6 1.6 0 011.6 1.6v5.8a1.6 1.6 0 01-1.6 1.6h-8.6L7 18v-2.5H5a1.6 1.6 0 01-1.6-1.6V8.1A1.6 1.6 0 015 6.5z" />,
  log: <><path d="M7.5 4.5h6l4 4V19a1 1 0 01-1 1h-9a1 1 0 01-1-1V5.5a1 1 0 011-1z" /><path d="M13.5 4.5v4h4" /><line x1="9" y1="12.5" x2="15" y2="12.5" /><line x1="9" y1="15.5" x2="14" y2="15.5" /></>,
  measure: <><rect x="4" y="6.2" width="16" height="11.6" rx="2.4" /><path d="M6.5 12.5h2.6l1.3-3 1.8 5 1.4-2h4" /></>,
  conviction: <><rect x="4.5" y="6.5" width="15" height="2.6" rx="1.3" /><rect x="4.5" y="10.7" width="11" height="2.6" rx="1.3" /><rect x="4.5" y="14.9" width="8" height="2.6" rx="1.3" /></>,
};

const LEXICON = {
  remember: ["memory"], remembering: ["memory"], recall: ["memory"], forget: ["memory"],
  stale: ["memory", "current"], notes: ["memory"],
  job: ["aws", "work", "promoted"], career: ["work", "promoted", "bmo"], day: ["work"],
  fast: ["latency", "10"], faster: ["latency", "10"], speed: ["latency"], slow: ["latency"],
  proof: ["measurement", "receipts", "ask"], evidence: ["measurement", "receipts"],
  numbers: ["measurement", "50", "70", "10"], number: ["measurement"], metrics: ["measurement"],
  school: ["degree", "university", "origins"], education: ["degree", "learning", "paideia"],
  teach: ["education", "paideia"], student: ["education", "learning"],
  talk: ["hello", "door"], contact: ["hello", "door"], reach: ["hello", "door", "next"],
  email: ["hello", "door"], hire: ["hello", "door", "next"], hi: ["hello", "door"],
  afraid: ["confidence", "offloading", "thesis"], fear: ["offloading", "thesis"],
  worry: ["offloading"], scared: ["offloading"],
  fun: ["cartographer", "paideia", "built", "personal"], play: ["cartographer", "built"],
  built: ["build"], made: ["build"], projects: ["build"], project: ["build"],
  code: ["build", "cartographer", "paideia", "sindri"],
  write: ["essay", "writing", "substack"], wrote: ["essay", "writing"], read: ["essay", "substack"],
  blog: ["essay", "substack"], article: ["essay", "writing"], articles: ["essay"],
  ai: ["model", "thinking", "questions", "agent"], llm: ["model", "questions"],
  why: ["thesis", "thinking", "question"], believe: ["thesis"], philosophy: ["thesis", "thinking"],
  incident: ["agent", "aws", "steps"], incidents: ["agent", "aws"],
  debug: ["agent", "steps"], outage: ["agent"], alarm: ["agent", "steps"],
  cloud: ["aws"], amazon: ["aws"],
  story: ["origins", "bmo", "thesis", "next"], life: ["origins", "personal", "next"],
  history: ["origins", "bmo"], began: ["origins"], start: ["origins", "bmo"],
  promotion: ["promoted"], promoted: ["promoted"],
  person: ["personal"], human: ["personal"], film: ["personal"], movie: ["personal"],
  vancouver: ["aws", "promoted"], local: ["sindri"], private: ["sindri"],
};

const INDEX = THOUGHTS.map(t => {
  const bag = (t.id + " " + t.form + " " + t.ch + " " + (t.num || "") + " " + t.title + " " +
    (t.sub || "") + " " + t.body)
    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
  return { id: t.id, bag: new Set(bag) };
});

function localMatch(query) {
  const raw = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  if (!raw.length) return [];
  const toks = new Map();
  raw.forEach(w => {
    toks.set(w, Math.max(toks.get(w) || 0, 2));
    (LEXICON[w] || []).forEach(s => toks.set(s, Math.max(toks.get(s) || 0, 1.5)));
  });
  const scored = INDEX.map(({ id, bag }) => {
    let s = 0;
    toks.forEach((wgt, tk) => {
      if (bag.has(tk)) { s += wgt; return; }
      const pre = tk.slice(0, 4);
      for (const b of bag) { if (b.startsWith(pre)) { s += wgt * 0.5; break; } }
    });
    return { id, s };
  }).filter(x => x.s >= 2).sort((a, b) => b.s - a.s);
  if (!scored.length) return [];
  const top = scored[0].s;
  return scored.filter(x => x.s >= top * 0.55).slice(0, 6).map(x => x.id);
}

const MISS_LINES = [
  "the hall is quiet on that one — what's behind the question?",
  "no shelf answers that yet. what made you ask?",
  "that word isn't kept here. try it another way?",
];
function localLine(query, n) {
  if (n > 0) return n + " place" + (n === 1 ? "" : "s") + " in the hall lit — walk toward the light";
  let h = 0; for (let i = 0; i < query.length; i++) h = (h * 31 + query.charCodeAt(i)) | 0;
  return MISS_LINES[Math.abs(h) % MISS_LINES.length];
}

const VALID_IDS = new Set(THOUGHTS.map(t => t.id));

/* the corpus: Gabriel's repository — loader is the real architecture,
   sample stands in inside this sandbox */
const GITHUB_SOURCES = [
  /* "https://raw.githubusercontent.com/[user]/[repo]/main/essays/01-....md", */
];
const SAMPLE_CORPUS = [
  { src: "cartographer/README.md", text: "Cognitive Cartographer is a writing environment with one voice removed. The model's entire output surface is questions — enforced in code, not in a prompt. It cannot suggest, complete, or approve. The design bet: the effort of writing is the thinking, so the tool must never do the writing. It maps the argument as a graph, runs gap analysis, and asks. [replace with the actual README]" },
  { src: "notes/latency-methodology.md", text: "[Gabriel's methodology note, verbatim from the repo: what was measured for the 50% learning-agent latency claim, across how many seeded replays, before and after what change, and what would falsify it.]" },
  { src: "aws/devops-agent.md", text: "At AWS I own the launch of agent memory and learned skills for the DevOps Agent — publicly documented. The agent investigates incidents; my work is what it carries between them. The conviction underneath: memory is only useful if it stays current — stale operational knowledge doesn't just fail to help, it actively misleads. Earlier: co-owned automating a region build, roughly seventy manual tasks and thirty-plus engineer-days per region, to full automation. [replace with the repo's actual notes]" },
  { src: "essays/thesis.md", text: "[The essay text, verbatim from the repo: the think-through vs consume-from distinction, cognitive offloading, misplaced confidence — Gabriel's actual published words, not a summary of them.]" },
  { src: "paideia/README.md", text: "Paideia is an education platform where a ban is the architecture: no completion affordances. No autocomplete, no answer button, nothing to harvest. Students externalize reasoning instead of collecting the machine's. [replace with the actual README]" },
  { src: "bio.md", text: "[One page of plain biography from the repo, in Gabriel's words: origins, degree, BMO and the 10x reporting tool, the move to AWS Vancouver, the SDE II promotion in July 2026, the independent practice, what he's reaching toward now.]" },
];
function bagOf(s) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1));
}
function chunkCorpus(docs) {
  const chunks = [];
  docs.forEach(({ src, text }) => {
    const paras = text.split(/\n\s*\n/);
    let buf = "";
    paras.forEach(p => {
      if ((buf + p).length > 700 && buf) { chunks.push({ src, text: buf.trim() }); buf = ""; }
      buf += p + "\n\n";
    });
    if (buf.trim()) chunks.push({ src, text: buf.trim() });
  });
  return chunks.map((c, i) => ({ ...c, id: i, bag: bagOf(c.src + " " + c.text) }));
}
let CORPUS = chunkCorpus(SAMPLE_CORPUS);
let CORPUS_LIVE = false;
async function loadCorpus() {
  if (!GITHUB_SOURCES.length) return;
  try {
    const docs = await Promise.all(GITHUB_SOURCES.map(async (u) => {
      const r = await fetch(u);
      if (!r.ok) throw new Error(String(r.status));
      return { src: u.split("/").slice(-2).join("/"), text: await r.text() };
    }));
    CORPUS = chunkCorpus(docs);
    CORPUS_LIVE = true;
  } catch (e) { /* sample stands; the ledger says so */ }
}
function retrieve(query, k) {
  const raw = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const toks = new Map();
  raw.forEach(w => {
    toks.set(w, 2);
    (LEXICON[w] || []).forEach(s => toks.set(s, Math.max(toks.get(s) || 0, 1.2)));
  });
  return CORPUS.map(c => {
    let s = 0;
    toks.forEach((wgt, tk) => {
      if (c.bag.has(tk)) { s += wgt; return; }
      const pre = tk.slice(0, 4);
      for (const b of c.bag) { if (b.startsWith(pre)) { s += wgt * 0.4; break; } }
    });
    return { c, s };
  }).sort((a, b) => b.s - a.s).slice(0, k).filter(x => x.s > 0).map(x => x.c);
}
async function contextAsk(query, history, signal) {
  const chunks = retrieve(query, 5);
  const ctxBlock = chunks.length
    ? chunks.map(c => "[" + c.src + "]\n" + c.text).join("\n\n---\n\n")
    : "(no relevant material found in the repository)";
  const index = THOUGHTS.map(t =>
    t.id + " | " + t.ch + " | " + (t.num ? t.num + " — " : "") + t.title).join("\n");
  const hist = history.length
    ? "RECENT EXCHANGE (for follow-ups):\n" + history.map(h => "Q: " + h.q + "\nA: " + h.a).join("\n") + "\n\n"
    : "";
  const prompt =
    "You answer visitors' questions on a program on a personal desktop operating system. Your ONLY " +
    "knowledge is the CONTEXT below, drawn from the site owner's own repository. Return ONLY JSON, " +
    'no markdown fences: {"answer":"...","sources":["path"],"lit":["id"],"kind":"answer"|"question"}. Rules: ' +
    "answer = 1 to 4 short sentences, lowercase, spare, neutral voice; " +
    "speak ABOUT the owner (he/his) or about the work itself — never as him, never the word I; " +
    "every claim must be supported by the CONTEXT; you may quote at most one fragment under 12 words, " +
    "attributed by source path in the prose or via sources; " +
    "sources = the context paths actually used (empty if none); " +
    "lit = up to 5 landmark ids from the MAP whose places the answer touches; " +
    'if the context cannot support an answer, kind="question", answer = one plain sentence saying the ' +
    "repository is silent on that, plus one genuinely curious question back; " +
    "no exclamation marks, no emojis, never invent facts, bracketed placeholders in context are gaps — treat them as silence.\n\n" +
    hist +
    "MAP (id | bay | title):\n" + index + "\n\n" +
    "CONTEXT:\n" + ctxBlock + "\n\n" +
    "VISITOR'S QUESTION: " + query;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).map(c => (c.type === "text" ? c.text : "")).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  const lit = Array.isArray(parsed.lit) ? parsed.lit.filter(id => VALID_IDS.has(id)).slice(0, 5) : [];
  const answer = typeof parsed.answer === "string" ? parsed.answer.slice(0, 480) : "";
  const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(s => typeof s === "string").slice(0, 4) : [];
  return { lit, answer, sources };
}

/* ================= App — the discrete state machine =================
   Handlers here change FACTS (exists / z / flags / rest rects), never
   positions. Positions belong to each window's springs below. */
let winSeq = 1;

export default function App() {
  const [wins, setWins] = useState([]);
  const [startOpen, setStartOpen] = useState(false);
  const [read, setRead] = useState(new Set());
  const [litSet, setLitSet] = useState(new Set());
  const [transcript, setTranscript] = useState([]);
  const [askBusy, setAskBusy] = useState(false);
  const [runMode, setRunMode] = useState("none");
  const [runStep, setRunStep] = useState(0);
  const [mobile, setMobile] = useState(false);
  const zTop = useRef(10);
  const cascadeN = useRef(0);
  const taskRefs = useRef(new Map());
  const askInputRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => { loadCorpus(); }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:" + MOBILE_Q + "px)");
    const set = () => setMobile(mq.matches);
    set();
    mq.addEventListener ? mq.addEventListener("change", set) : mq.addListener(set);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", set) : mq.removeListener(set); };
  }, []);

  const markRead = (refId) => setRead(prev => (prev.has(refId) ? prev : new Set(prev).add(refId)));

  const openWindow = useCallback((kind, ref, title) => {
    setWins(prev => {
      const ex = prev.find(w => w.kind === kind && w.ref === ref);
      zTop.current += 1;
      if (ex) return prev.map(w => w.id === ex.id
        ? { ...w, z: zTop.current, minimized: false, restoreFrom: w.minimized ? taskRect(w.id) : null }
        : w);
      cascadeN.current = (cascadeN.current + 1) % 8;
      const off = cascadeN.current * CASCADE;
      const w0 = kind === "folder" ? 300 : kind === "ask" ? 400 : kind === "ledger" ? 460 : kind === "vitals" || kind === "proc" ? 400 : 380;
      const h0 = kind === "ask" ? 380 : kind === "vitals" || kind === "proc" ? 360 : kind === "traj" ? 340 : 320;
      return [...prev, {
        id: winSeq++, kind, ref, title, z: zTop.current,
        rect: { x: 90 + off, y: 60 + off, w: w0, h: h0 },
        minimized: false, maximized: false, closing: false, minimizing: false, restoreFrom: null,
      }];
    });
    if (kind !== "folder") markRead(ref);
  }, []);

  const taskRect = (id) => {
    const el = taskRefs.current.get(id);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width };
  };

  const focusWindow = (id) => {
    zTop.current += 1;
    setWins(prev => prev.map(w => w.id === id ? { ...w, z: zTop.current } : w));
  };
  const requestClose = (id) => setWins(prev => prev.map(w => w.id === id ? { ...w, closing: true } : w));
  const onClosed = (id) => setWins(prev => prev.filter(w => w.id !== id));
  const requestMinimize = (id) => setWins(prev => prev.map(w => w.id === id ? { ...w, minimizing: true } : w));
  const onMinimized = (id, restRect) => setWins(prev => prev.map(w => w.id === id
    ? { ...w, minimizing: false, minimized: true, rect: restRect || w.rect } : w));
  const restoreWindow = (id) => {
    zTop.current += 1;
    setWins(prev => prev.map(w => w.id === id
      ? { ...w, minimized: false, z: zTop.current, restoreFrom: taskRect(id) } : w));
  };
  const clearRestoreFrom = (id) => setWins(prev => prev.map(w => w.id === id ? { ...w, restoreFrom: null } : w));
  const toggleMaximize = (id) => setWins(prev => prev.map(w => w.id === id ? { ...w, maximized: !w.maximized } : w));
  const onDragRest = (id, rect) => setWins(prev => prev.map(w => w.id === id ? { ...w, rect } : w));

  const topWindow = () => wins.filter(w => !w.minimized).reduce((a, b) => (!a || b.z > a.z ? b : a), null);
  const top = topWindow();
  const toggleTaskbarButton = (w) => {
    if (w.minimized) { restoreWindow(w.id); return; }
    if (top && top.id === w.id) requestMinimize(w.id);
    else focusWindow(w.id);
  };

  /* traj demo */
  useEffect(() => {
    const has = wins.some(w => w.kind === "traj" && !w.minimized);
    if (!has) return;
    setRunStep(0);
    const n = RUNS[runMode].steps.length;
    let i = 0;
    const t = setInterval(() => { i++; setRunStep(i); if (i > n + 2) i = 0; }, 520);
    return () => clearInterval(t);
  }, [wins, runMode]);

  /* boot: Ask.exe launches itself */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tm = setTimeout(() => openWindow("ask", "ask", "Ask.exe"), reduced ? 0 : 500);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* placeholder toast */
  useEffect(() => {
    const toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
    let tm = null;
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href="#"]');
      if (!a) return;
      e.preventDefault();
      toast.textContent = '"' + a.textContent.replace("→", "").trim() + '" — placeholder; the real build links here';
      toast.classList.add("show");
      clearTimeout(tm);
      tm = setTimeout(() => toast.classList.remove("show"), 2000);
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); clearTimeout(tm); toast.remove(); };
  }, []);

  /* esc minimizes the top window */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setStartOpen(false); if (top) requestMinimize(top.id); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top]);

  /* ---------- the ask (grounded, verbatim underneath) ---------- */
  const onAskType = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = (askInputRef.current.value || "").trim();
      setLitSet(q ? new Set(localMatch(q)) : new Set());
    }, 170);
  };
  const runAsk = async () => {
    const q = (askInputRef.current.value || "").trim();
    if (!q) return;
    askInputRef.current.value = "";
    setLitSet(new Set());
    const localIds = localMatch(q);
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timeout = setTimeout(() => ctrl.abort(), 9000);
    setAskBusy(true);
    try {
      const { lit, answer, sources } = await contextAsk(q, historyRef.current, ctrl.signal);
      const ids = (lit.length ? lit : localIds).slice(0, 2);
      setTranscript(prev => [...prev, { q, a: answer, sources, k: Date.now() }].slice(-8));
      historyRef.current = [...historyRef.current, { q, a: answer }].slice(-2);
      ids.forEach(id => {
        const t = byId[id];
        if (t) openWindow(t.kind === "conviction" ? "doc" : t.kind, id, t.title);
      });
    } catch (err) {
      setTranscript(prev => [...prev, {
        q,
        a: localIds.length ? "offline — matching files are highlighted; verbalized answers need the wire." : localLine(q, 0),
        sources: [], k: Date.now(),
      }].slice(-8));
    } finally {
      clearTimeout(timeout);
      setAskBusy(false);
    }
  };

  const byId = useMemo(() => { const m = {}; THOUGHTS.forEach(t => { m[t.id] = t; }); return m; }, []);
  const measures = THOUGHTS.filter(t => t.ext === "measure");
  const daemons = THOUGHTS.filter(t => t.kind === "daemon");
  const policies = THOUGHTS.filter(t => t.kind === "policy");

  return (
    <div className="root">
      <Styles />

      <div className="desktop" onPointerDown={() => setStartOpen(false)}>
        <div className="icongrid">
          <Icon label="Ask.exe" ext="card" onOpen={() => openWindow("ask", "ask", "Ask.exe")} />
          <Icon label="Ledger.txt" ext="log" onOpen={() => openWindow("ledger", "ledger", "ledger.txt")} />
          <Icon label="System Monitor" ext="measure" onOpen={() => openWindow("vitals", "vitals", "System Monitor")} />
          <Icon label="Task Manager" ext="conviction" onOpen={() => openWindow("proc", "proc", "Task Manager")} />
          {DIRS.map(d => (
            <Icon key={d} label={DIR_LABEL[d]} ext="folder" onOpen={() => openWindow("folder", d, DIR_LABEL[d])} />
          ))}
        </div>

        {wins.filter(w => !w.minimized).map(w => (
          <DesktopWindow key={w.id} win={w} mobile={mobile}
            isTop={top && top.id === w.id}
            getTaskRect={() => taskRect(w.id)}
            onFocus={() => focusWindow(w.id)}
            onClosed={() => onClosed(w.id)}
            onMinimized={(rect) => onMinimized(w.id, rect)}
            onArrived={() => clearRestoreFrom(w.id)}
            onDragRest={(rect) => onDragRest(w.id, rect)}
            chrome={{
              minimize: () => requestMinimize(w.id),
              maximize: () => toggleMaximize(w.id),
              close: () => requestClose(w.id),
            }}>
            <WinContent w={w} byId={byId} read={read} litSet={litSet}
              openWindow={openWindow} runMode={runMode} setRunMode={setRunMode} runStep={runStep}
              transcript={transcript} askBusy={askBusy} askInputRef={w.kind === "ask" ? askInputRef : null}
              onAskType={onAskType} runAsk={runAsk} measures={measures} daemons={daemons} policies={policies} />
          </DesktopWindow>
        ))}
      </div>

      <div className="taskbar">
        <button className={"startbtn" + (startOpen ? " on" : "")} onPointerDown={e => e.stopPropagation()}
          onClick={() => setStartOpen(s => !s)}>granata/os</button>
        <div className="tbwins">
          {wins.map(w => (
            <button key={w.id}
              ref={el => { if (el) taskRefs.current.set(w.id, el); else taskRefs.current.delete(w.id); }}
              className={"tbwin" + (top && top.id === w.id ? " active" : "") + (w.minimized ? " min" : "")}
              onPointerDown={e => e.stopPropagation()}
              onClick={() => toggleTaskbarButton(w)}>{w.title}</button>
          ))}
        </div>
        <div className="tray">
          <span className={"traydot" + (CORPUS_LIVE ? " live" : "")} title={CORPUS_LIVE ? "repository" : "sample corpus"} />
        </div>
      </div>

      {startOpen && (
        <div className="startmenu" onPointerDown={e => e.stopPropagation()}>
          <button onClick={() => { openWindow("ask", "ask", "Ask.exe"); setStartOpen(false); }}>Ask.exe</button>
          <button onClick={() => { openWindow("ledger", "ledger", "ledger.txt"); setStartOpen(false); }}>ledger.txt</button>
          <button onClick={() => { openWindow("vitals", "vitals", "System Monitor"); setStartOpen(false); }}>System Monitor</button>
          <button onClick={() => { openWindow("proc", "proc", "Task Manager"); setStartOpen(false); }}>Task Manager</button>
          <div className="smdiv" />
          {DIRS.map(d => (
            <button key={d} onClick={() => { openWindow("folder", d, DIR_LABEL[d]); setStartOpen(false); }}>{DIR_LABEL[d]}</button>
          ))}
          <div className="smdiv" />
          <button onClick={() => { openWindow("doc", "door", "say hello"); setStartOpen(false); }}>Say hello</button>
        </div>
      )}
    </div>
  );
}

/* ================= DesktopWindow — springs own the geometry =================
   Discrete flags come down from App; this component translates them into
   spring targets. One writer per property, everything interruptible. */
function DesktopWindow({ win, isTop, mobile, getTaskRect, onFocus, onClosed, onMinimized,
  onArrived, onDragRest, chrome, children }) {
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const prevMaxRect = useRef(null);
  const workspace = () => ({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - TASKBAR_H });

  const [spr, api] = useSpring(() => {
    const r = win.rect;
    if (win.restoreFrom) {
      /* restoring from the taskbar: begin AT the button, tiny and transparent */
      const t = win.restoreFrom;
      return { x: t.cx - r.w / 2, y: t.cy - r.h / 2, w: r.w, h: r.h, s: 0.06, o: 0 };
    }
    /* fresh open: begin slightly low and small */
    return { x: r.x, y: r.y + 14, w: r.w, h: r.h, s: 0.93, o: 0 };
  });

  /* reduced-motion aware start — one gate, every animation obeys it */
  const go = useCallback((props) => api.start({ config: SPRING.settle, ...props, immediate: reduced || props.immediate }),
    [api, reduced]);

  /* arrive at rest (mount) */
  useEffect(() => {
    const t = mobile ? workspace() : win.rect;
    go({ x: t.x, y: t.y, w: t.w, h: t.h, s: 1, o: 1, onRest: onArrived });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* closing → pop out, then tell the parent to delete the fact */
  useEffect(() => {
    if (!win.closing) return;
    go({ s: 0.96, o: 0, config: SPRING.pop, onRest: onClosed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.closing]);

  /* minimizing → FLIP into the taskbar button */
  useEffect(() => {
    if (!win.minimizing) return;
    const t = getTaskRect();
    const rest = { x: spr.x.get(), y: spr.y.get(), w: spr.w.get(), h: spr.h.get() };
    if (!t) { onMinimized(rest); return; }
    const sc = Math.max(0.05, Math.min(0.5, t.w / Math.max(1, rest.w)));
    go({ x: t.cx - rest.w / 2, y: t.cy - rest.h / 2, s: sc, o: 0, config: SPRING.pop,
      onRest: () => onMinimized(rest) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.minimizing]);

  /* maximize / restore-from-maximize */
  useEffect(() => {
    if (mobile) return;
    if (win.maximized) {
      prevMaxRect.current = { x: spr.x.get(), y: spr.y.get(), w: spr.w.get(), h: spr.h.get() };
      const ws = workspace();
      go({ x: ws.x, y: ws.y, w: ws.w, h: ws.h });
    } else if (prevMaxRect.current) {
      go({ ...prevMaxRect.current });
      prevMaxRect.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.maximized]);

  /* mobile ⇔ desktop: geometry is policy */
  useEffect(() => {
    const t = mobile ? workspace() : win.rect;
    go({ x: t.x, y: t.y, w: t.w, h: t.h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  const clampX = (v, ww) => Math.max(-ww + 80, Math.min(window.innerWidth - 60, v));
  const clampY = (v) => Math.max(0, Math.min(window.innerHeight - TASKBAR_H - 20, v));

  /* drag: measure (use-gesture) → policy (12 lines) → actuate (spring).
     immediate:down = 1:1 grip. On release, momentum is PROJECTED from the
     measured velocity (target = point + v·dir·k) and sprung to — springs
     driven immediate don't accumulate their own velocity, so we reckon it. */
  const bindDrag = useDrag(({ down, offset: [ox, oy], velocity: [vx, vy], direction: [dx, dy], last, event }) => {
    if (event.target.closest && event.target.closest("button")) return;
    onFocus();
    if (mobile || win.maximized) return;
    if (last) {
      const k = 140;
      const px = clampX(ox + vx * dx * k, spr.w.get());
      const py = clampY(oy + vy * dy * k);
      go({ x: px, y: py, config: SPRING.throw, onRest: () => onDragRest({ x: px, y: py, w: spr.w.get(), h: spr.h.get() }) });
    } else {
      go({ x: ox, y: oy, immediate: down });
    }
  }, {
    from: () => [spr.x.get(), spr.y.get()],
    bounds: () => ({ left: -spr.w.get() + 80, right: window.innerWidth - 60, top: 0, bottom: window.innerHeight - TASKBAR_H - 20 }),
    rubberband: 0.12,
    filterTaps: true,
  });

  /* resize: same pattern aimed at width/height — a deliberate layout-path
     animation (content must genuinely reflow); see map §1 */
  const bindResize = useDrag(({ down, offset: [ow, oh], last }) => {
    onFocus();
    const w2 = Math.max(MIN_W, ow), h2 = Math.max(MIN_H, oh);
    go({ w: w2, h: h2, immediate: down });
    if (last) onDragRest({ x: spr.x.get(), y: spr.y.get(), w: w2, h: h2 });
  }, {
    from: () => [spr.w.get(), spr.h.get()],
  });

  return (
    <animated.div
      className={"win" + (isTop ? " active top" : "") + (win.maximized || mobile ? " maxed" : "") + (mobile && !isTop ? " hidden" : "")}
      style={{ x: spr.x, y: spr.y, width: spr.w, height: spr.h, scale: spr.s, opacity: spr.o, zIndex: win.z }}
      onPointerDownCapture={() => { if (!isTop) onFocus(); }}>
      <div className="titlebar" {...bindDrag()} onDoubleClick={() => !mobile && chrome.maximize()}>
        <span className="tdot" style={{ background: EXT_COLOR[win.ref] || "var(--gold)" }} />
        <span className="ttitle">{win.title}</span>
        <span className="tbtns">
          <button className="tb min" onClick={chrome.minimize} aria-label="minimize">_</button>
          {!mobile && <button className="tb max" onClick={chrome.maximize} aria-label="maximize">{win.maximized ? "❐" : "□"}</button>}
          <button className="tb close" onClick={chrome.close} aria-label="close">×</button>
        </span>
      </div>
      <div className="winbody">{children}</div>
      {!mobile && !win.maximized && <div className="resize" {...bindResize()} />}
    </animated.div>
  );
}


function Icon({ label, ext, onOpen }) {
  return (
    <button className="icon" onClick={onOpen}>
      <svg className="iglyph" viewBox="0 0 24 24" fill="none" stroke={EXT_COLOR[ext] || "var(--ink)"}
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        {ICON_PATH[ext] || ICON_PATH.log}
      </svg>
      <span className="ilabel">{label}</span>
    </button>
  );
}

function WinContent(props) {
  const { w, byId, read, litSet, openWindow, runMode, setRunMode, runStep,
    transcript, askBusy, askInputRef, onAskType, runAsk, measures, daemons, policies } = props;

  if (w.kind === "folder") {
    const files = THOUGHTS.filter(t => t.ch === w.ref);
    return (
      <div className="filelist">
        {files.map(t => (
          <button key={t.id} className={"frow" + (read.has(t.id) ? " was" : "") + (litSet.has(t.id) ? " lit" : "")}
            onClick={() => openWindow(t.kind === "traj" ? "traj" : t.kind === "conviction" ? "doc" : t.kind, t.id, t.title)}>
            <span className="fdot" style={{ background: EXT_COLOR[t.ext] || "var(--ink)" }} />
            <span className="fname">{t.id}</span><span className="fext">.{t.ext}</span>
          </button>
        ))}
      </div>
    );
  }

  if (w.kind === "ask") {
    return (
      <div className="askwin">
        <div className="asktranscript">
          {transcript.length === 0 && !askBusy && (
            <div className="askempty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
                strokeLinejoin="round" strokeLinecap="round">
                <path d="M5 6.5h14a1.6 1.6 0 011.6 1.6v5.8a1.6 1.6 0 01-1.6 1.6h-8.6L7 18v-2.5H5a1.6 1.6 0 01-1.6-1.6V8.1A1.6 1.6 0 015 6.5z" />
              </svg>
              <p>hi — ask me something.</p>
            </div>
          )}
          {transcript.map(t => (
            <div key={t.k} className="aitem">
              <p className="aq">{t.q}</p>
              <p className="aa">{t.a}</p>
              {t.sources.length > 0 && <p className="asrc">{t.sources.join(" · ")}</p>}
            </div>
          ))}
          {askBusy && <p className="aa busy"><span className="d1">·</span><span className="d2">·</span><span className="d3">·</span></p>}
        </div>
        <div className="askrow">
          <input ref={askInputRef} maxLength={90} placeholder="what do you want to know" onInput={onAskType}
            onKeyDown={e => e.key === "Enter" && runAsk()} />
          <button onClick={runAsk}>→</button>
        </div>
      </div>
    );
  }

  if (w.kind === "ledger") {
    return (
      <div className="ledger">
        {DIRS.map(d => (
          <div key={d} className="lsec">
            <h3>{DIR_LABEL[d]}</h3>
            {THOUGHTS.filter(t => t.ch === d).map(t => (
              <p key={t.id} className="lline"><span className="lt">{t.num ? t.num + " — " : ""}{t.title}</span></p>
            ))}
          </div>
        ))}
        <p className="lfoot">this desktop carries no fact the ledger doesn't also carry · Ask.exe answers
          only from the repository this system is built from, names its sources, and says so when the
          repository is silent · draft copy; bracketed lines await their author · borrowed honestly
          from <a href="https://www.w3.org/History/1945/vbush/" target="_blank" rel="noreferrer">memex trails</a></p>
      </div>
    );
  }

  if (w.kind === "vitals") {
    return (
      <div className="vitalslist">
        {measures.map(t => (
          <button key={t.id} className={"vrow" + (litSet.has(t.id) ? " lit" : "")} onClick={() => openWindow(t.kind === "traj" ? "traj" : "doc", t.id, t.title)}>
            <span className="vnum">{t.num}</span>
            <svg className="vgraph" viewBox="0 0 60 14"><path d="M0 9 L14 9 L18 3 L23 11 L28 9 L60 9" fill="none" /></svg>
          </button>
        ))}
      </div>
    );
  }

  if (w.kind === "proc") {
    return (
      <div className="proclist">
        {daemons.map(t => (
          <button key={t.id} className={"prow" + (litSet.has(t.id) ? " lit" : "")} onClick={() => openWindow("doc", t.id, t.title)}>
            <span className="pdot run" /><span className="pname">{t.id}d</span><span className="psince">{t.since}</span>
          </button>
        ))}
        {policies.map(t => (
          <button key={t.id} className={"prow" + (litSet.has(t.id) ? " lit" : "")} onClick={() => openWindow("doc", t.id, t.title)}>
            <span className="pdot pol" /><span className="pname">{t.id}</span>
          </button>
        ))}
      </div>
    );
  }

  if (w.kind === "traj") {
    const t = byId[w.ref];
    return (
      <div className="trajwin">
        <p className="doctitle">{t.title}</p>
        <div className="segrow">
          {Object.keys(RUNS).map(m => (
            <button key={m} className={"seg" + (runMode === m ? " on" : "")} onClick={() => setRunMode(m)}>{RUNS[m].label}</button>
          ))}
        </div>
        <div className="trace">
          {RUNS[runMode].steps.map((l, k) => (
            <p key={runMode + k} className={"trl" + (runStep > k ? " on" : "") + (l.indexOf("· 3") >= 0 ? " win" : "") + (l.indexOf("stale") >= 0 ? " flag" : "")}>{l}</p>
          ))}
        </div>
        <FlipReceipt text={t.receipt} trigger="quiet" />
      </div>
    );
  }

  /* default: a claim's own document view */
  const t = byId[w.ref];
  if (!t) return null;
  return (
    <div className="docwin">
      {t.num && (t.receipt
        ? <FlipReceipt text={t.receipt} numTrigger={t.num} />
        : <p className="docnum">{t.num}</p>)}
      <p className="doctitle">{t.title}</p>
      {t.body && <p className="docbody">{t.body}</p>}
      {!t.num && t.receipt && <FlipReceipt text={t.receipt} trigger="quiet" />}
      {t.links && (
        <p className="doclinks">{t.links.map(([lt, h]) => (
          <a key={lt} href={h} target={h.indexOf("http") === 0 ? "_blank" : undefined} rel="noreferrer">{lt} →</a>
        ))}</p>
      )}
    </div>
  );
}

function FlipReceipt({ text, trigger, numTrigger }) {
  const [open, setOpen] = useState(false);
  if (numTrigger) {
    return (
      <button className="docnum tappable" onClick={() => setOpen(o => !o)}>
        {numTrigger}
        {open && <span className="receiptpop">{text}</span>}
      </button>
    );
  }
  return (
    <span className="quietflip">
      <button className="dots" onClick={() => setOpen(o => !o)} aria-label="how this was measured">···</button>
      {open && <p className="docreceipt">{text}</p>}
    </span>
  );
}

function Styles() {
  return (
    <style>{`
      :root{
        --bg:#15130F; --panel:#1C1916; --panel2:#221E19; --tbar:#27221C;
        --line:#2E2A24; --line2:#3A342C;
        --ink:#BBB2A0; --ink60:#948C7C; --ink35:#655E51;
        --gold:#C8A55A; --goldDim:#8F7A48;
        --blue:#6B92C4; --cyan:#5FAD9E; --red:#C07358;
        --mono:ui-monospace,Menlo,Consolas,monospace;
        --serif:Georgia,'Times New Roman',serif;
        --ui:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        --ease:cubic-bezier(.25,.85,.3,1); --easeOut:cubic-bezier(.16,1,.3,1);
      }
      *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      html,body{background:var(--bg);height:100%;overscroll-behavior:none}
      body{overflow:hidden}
      .root{font-family:var(--ui);color:var(--ink60);height:100dvh;position:relative}
      a{color:var(--blue);text-decoration:none;border-bottom:1px solid rgba(90,140,200,.3)}
      a:hover{border-color:var(--blue)}
      button{font:inherit;background:none;border:none;cursor:pointer;color:inherit;text-align:left}
      :focus-visible{outline:1.5px solid var(--blue);outline-offset:1px}

      .desktop{position:absolute;inset:0;bottom:44px;overflow:hidden;
        background:
          radial-gradient(120% 90% at 50% -10%, #191A1D, var(--bg) 60%)}

      .icongrid{position:absolute;left:0;top:0;display:grid;grid-template-columns:repeat(auto-fill,84px);
        gap:4px;padding:14px 8px}
      .icon{display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 4px;
        border-radius:8px;width:84px;transition:background .18s ease}
      .icon:hover{background:rgba(255,255,255,.05)}
      .icon:active{transform:scale(.97);transition:transform .1s ease}
      .iglyph{width:27px;height:27px}
      .ilabel{font-size:10.5px;color:var(--ink);text-align:center;line-height:1.3;
        text-shadow:0 1px 3px rgba(0,0,0,.8)}

      /* ---------- windows ---------- */
      .win{position:absolute;left:0;top:0;display:flex;flex-direction:column;border-radius:11px;overflow:hidden;
        background:var(--panel2);border:1px solid var(--line2);
        box-shadow:0 16px 38px rgba(18,12,7,.4);
        transform-origin:center;will-change:transform}
      .win.active{box-shadow:0 20px 48px rgba(18,12,7,.5)}
      .win.maxed{border-radius:0}
      .win.hidden{display:none}

      .titlebar{display:flex;align-items:center;gap:7px;padding:0 8px;height:32px;flex-shrink:0;
        background:var(--tbar);border-bottom:1px solid var(--line2);cursor:grab;user-select:none;touch-action:none;
        transition:background .2s ease}
      .win.active .titlebar{background:#2E2822}
      .titlebar:active{cursor:grabbing}
      .tdot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
      .ttitle{flex:1;font-size:11.5px;color:var(--ink35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        transition:color .2s ease}
      .win.active .ttitle{color:var(--ink)}
      .tbtns{display:flex;gap:4px;flex-shrink:0}
      .tb{width:24px;height:24px;display:grid;place-items:center;font-size:11px;color:var(--ink35);
        border-radius:50%;transition:background .15s ease,color .15s ease,transform .1s ease}
      .win.active .tb{color:var(--ink60)}
      .tb:hover{background:var(--line2);color:var(--ink)}
      .tb:active{transform:scale(.88)}
      .tb.close:hover{background:var(--red);color:#fff}

      .winbody{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:18px 20px 20px;font-size:13px}
      .resize{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;touch-action:none}
      .resize::after{content:'';position:absolute;right:4px;bottom:4px;width:7px;height:7px;
        border-right:1.5px solid var(--line2);border-bottom:1.5px solid var(--line2);border-radius:0 0 3px 0}

      /* ---------- window content ---------- */
      .filelist{display:flex;flex-direction:column;gap:1px}
      .frow{display:flex;align-items:center;gap:8px;padding:7px 9px;font-size:12px;color:var(--ink60);
        border-radius:6px;transition:background .15s ease,color .15s ease,transform .1s ease}
      .frow:hover{background:var(--panel)}
      .frow:active{transform:scale(.985)}
      .frow.was{color:var(--ink)}
      .frow.lit{background:rgba(107,146,196,.1);animation:litflash 1.2s ease-in-out 2}
      @keyframes litflash{0%,100%{opacity:1}50%{opacity:.6}}
      .fdot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
      .fext{color:var(--ink35)}

      .askwin{display:flex;flex-direction:column;height:100%;gap:10px}
      .asktranscript{flex:1;overflow-y:auto}
      .askempty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:10px;color:var(--ink35)}
      .askempty svg{width:34px;height:34px;opacity:.55}
      .askempty p{font-family:var(--serif);font-style:italic;font-size:13.5px}
      .aitem{margin-bottom:16px}
      .aq{font-family:var(--serif);font-style:italic;color:var(--ink35);font-size:12.5px;margin-bottom:4px}
      .aa{font-family:var(--serif);font-size:14px;line-height:1.65;color:var(--ink)}
      .asrc{font-size:9.5px;color:var(--goldDim);margin-top:4px}
      .aa.busy{color:var(--goldDim);letter-spacing:.1em}
      .aa.busy span{animation:dot 1.2s infinite}
      .aa.busy .d2{animation-delay:.2s}.aa.busy .d3{animation-delay:.4s}
      .askrow{display:flex;gap:8px;border-top:1px solid var(--line);padding-top:11px}
      .askrow input{flex:1;background:var(--panel);border:1px solid var(--line2);border-radius:8px;
        padding:8px 12px;color:var(--ink);font-family:var(--serif);font-size:13.5px;outline:none;
        transition:border-color .18s ease}
      .askrow input:focus{border-color:var(--blue)}
      .askrow input::placeholder{color:var(--ink35);font-style:italic}
      .askrow button{color:var(--blue);border:1px solid var(--line2);border-radius:8px;padding:6px 13px;
        transition:border-color .18s ease,background .18s ease,transform .1s ease}
      .askrow button:hover{border-color:var(--blue);background:rgba(107,146,196,.08)}
      .askrow button:active{transform:scale(.94)}
      @keyframes dot{0%,100%{opacity:.2}40%{opacity:1}}

      .ledger .lsec{margin-bottom:13px}
      .lsec h3{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin-bottom:5px}
      .lline{font-family:var(--serif);font-size:12.5px;color:var(--ink60);line-height:1.55}
      .lt{color:var(--ink)}
      .lfoot{margin-top:14px;font-size:10.5px;color:var(--ink35);line-height:1.7}

      .vitalslist{display:flex;flex-direction:column;gap:2px}
      .vrow{display:flex;align-items:center;gap:14px;padding:10px 9px;border-radius:6px;
        transition:background .15s ease,transform .1s ease}
      .vrow:hover{background:var(--panel)}
      .vrow:active{transform:scale(.985)}
      .vrow.lit{background:rgba(107,146,196,.1)}
      .vnum{font-size:18px;color:var(--gold);font-family:var(--serif)}
      .vgraph{width:56px;height:14px;flex-shrink:0;margin-left:auto}
      .vgraph path{stroke:var(--goldDim);stroke-width:1;stroke-dasharray:88;stroke-dashoffset:88;
        animation:vline 3s linear infinite}
      @keyframes vline{to{stroke-dashoffset:-88}}

      .proclist{display:flex;flex-direction:column;gap:1px}
      .prow{display:flex;align-items:center;gap:9px;padding:9px;font-size:12px;border-radius:6px;
        transition:background .15s ease,transform .1s ease}
      .prow:hover{background:var(--panel)}
      .prow:active{transform:scale(.985)}
      .prow.lit{background:rgba(107,146,196,.1)}
      .pdot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
      .pdot.run{background:var(--cyan)}
      .pdot.pol{background:var(--gold)}
      .pname{flex:1;color:var(--ink60)}
      .psince{color:var(--ink35);font-size:10.5px}

      .docwin .docnum{font-size:27px;color:var(--gold);font-family:var(--serif);display:block}
      .docnum.tappable{position:relative;cursor:pointer;padding:2px 4px;margin:-2px -4px;border-radius:6px;
        transition:color .15s ease,background .15s ease}
      .docnum.tappable:hover{color:#D8B876}
      .docnum.tappable:active{transform:scale(.98)}
      .receiptpop{display:block;font-family:var(--ui);font-size:11px;font-weight:400;letter-spacing:0;
        color:var(--ink35);line-height:1.6;margin-top:8px;max-width:44ch;
        animation:softin .22s var(--ease) both}
      @keyframes softin{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
      .doctitle{font-family:var(--serif);font-size:16px;color:var(--ink);font-weight:500;
        line-height:1.42;margin-top:6px}
      .docbody{font-family:var(--serif);font-size:13.5px;line-height:1.75;color:var(--ink60);margin-top:11px}
      .docreceipt{font-size:11.5px;line-height:1.65;color:var(--ink35);margin-top:8px;max-width:48ch;
        animation:softin .22s var(--ease) both}
      .quietflip{display:inline-block;margin-top:10px}
      .dots{color:var(--ink35);font-size:13px;letter-spacing:.15em;padding:6px 8px;margin:-6px -8px;
        border-radius:6px;transition:color .15s ease,background .15s ease}
      .dots:hover{color:var(--gold)}
      .dots:active{transform:scale(.94)}
      .doclinks{margin-top:12px;display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px}

      .trajwin .segrow{display:flex;gap:5px;flex-wrap:wrap;margin:10px 0}
      .seg{font-size:10px;padding:5px 10px;border:1px solid var(--line2);border-radius:7px;color:var(--ink60);
        transition:border-color .15s ease,color .15s ease}
      .seg.on{border-color:var(--gold);color:var(--gold)}
      .trace{min-height:110px}
      .trl{font-family:var(--mono);font-size:11px;color:var(--ink35);opacity:.25;
        transition:opacity .3s var(--ease),color .3s var(--ease)}
      .trl.on{opacity:1;color:var(--ink60)}
      .trl.on.win{color:var(--blue)}
      .trl.on.flag{color:var(--red)}

      /* ---------- taskbar + start menu ---------- */
      .taskbar{position:absolute;left:0;right:0;bottom:0;height:44px;display:flex;align-items:center;
        gap:8px;padding:0 8px;background:var(--tbar);border-top:1px solid var(--line2);z-index:50}
      .startbtn{font-size:11.5px;font-weight:600;color:var(--gold);padding:8px 13px;border-radius:7px;
        letter-spacing:.02em;transition:background .18s ease,transform .1s ease}
      .startbtn:hover,.startbtn.on{background:rgba(200,165,90,.12)}
      .startbtn:active{transform:scale(.96)}
      .tbwins{flex:1;display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;height:32px}
      .tbwins::-webkit-scrollbar{display:none}
      .tbwin{flex-shrink:0;max-width:150px;font-size:10.5px;color:var(--ink60);padding:0 11px;
        border:1px solid var(--line2);border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        background:var(--panel);transition:background .18s ease,border-color .18s ease,color .18s ease,opacity .2s ease,transform .1s ease}
      .tbwin.active{background:var(--panel2);border-color:var(--ink35);color:var(--ink)}
      .tbwin.min{opacity:.5}
      .tbwin:active{transform:scale(.96)}
      .tray{display:flex;align-items:center;flex-shrink:0;padding-right:6px}
      .traydot{width:6px;height:6px;border-radius:50%;background:var(--ink35)}
      .traydot.live{background:var(--cyan)}

      .startmenu{position:absolute;left:6px;bottom:48px;z-index:55;width:200px;
        background:var(--panel2);border:1px solid var(--line2);border-radius:11px;overflow:hidden;
        box-shadow:0 16px 34px rgba(18,12,7,.45);padding:5px;
        animation:startup .22s var(--easeOut) both}
      @keyframes startup{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
      .startmenu button{width:100%;padding:9px 11px;font-size:12px;color:var(--ink60);border-radius:7px;
        transition:background .15s ease,color .15s ease}
      .startmenu button:hover{background:rgba(107,146,196,.1);color:var(--ink)}
      .startmenu button:active{transform:scale(.98)}
      .smdiv{height:1px;background:var(--line);margin:5px 2px}

      .toast{position:fixed;z-index:80;left:50%;bottom:56px;transform:translate(-50%,12px);
        font-size:12px;color:var(--ink);background:var(--panel2);border:1px solid var(--line2);
        border-radius:8px;padding:9px 15px;opacity:0;pointer-events:none;
        transition:opacity .25s var(--ease),transform .25s var(--ease);
        box-shadow:0 12px 28px rgba(18,12,7,.4);
        max-width:88vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .toast.show{opacity:1;transform:translate(-50%,0)}

      /* ---------- mobile: geometry handled by springs (fullscreen targets); CSS only adjusts chrome ---------- */
      @media(max-width:700px){
        .win{border:none;border-radius:0}
        .resize{display:none}
        .titlebar{cursor:default}
        .icongrid{grid-template-columns:repeat(auto-fill,76px)}
        .icon{width:76px}
      }
      @media (prefers-reduced-motion: reduce){
        *{transition-duration:.01ms !important;animation-duration:.01ms !important}
      }
    `}</style>
  );
}
