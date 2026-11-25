// Your Week in One Line — deterministic entry picker.
//
// The brief asks for one line of at most 100 characters that sums up the
// entrant's own week: the win, the fail, the chaos, all of it. An AI judge
// compares lines pairwise, weighing, most important first:
//   1. Is a single line that sums up the entrant's own week, the win,
//      the fail or the chaos of it, and loses to any line that sums up
//      a week.
//   2. Lands a real joke or a sharp turn of phrase rather than merely
//      stating a feeling.
//   3. Holds one concrete detail of a week, a thing that happened, a
//      person, a place, so the line could only be that week.
//   4. Spends every word well inside the 100 characters, with nothing
//      padded and nothing missing.
//   5. Feels fresh, not a saying or a template the reader has met before.
//
// This program scores a set of hand-written candidate one-liners against
// those five criteria, in that order (weights 5, 4, 3, 2, 1), writes the
// winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt),
// reads it back and verifies it against every gate before exiting.
//
// The candidates are written from an agent-builder's week, not from a
// generic office week: deploys and bounties, error logs and merge
// conflicts, a demo that only crashes on the one laptop that matters.
// Every candidate carries a win and a fail in the same breath, because
// a week that is only a win is a boast and a week that is only a fail
// is a complaint; the joke lives in the two sitting side by side.
//
// Revision thinking, baked into the scorer rather than into any single
// candidate:
//   - Criterion 1 docks a line that only states a mood ("tired but
//     happy", "what a week") with no event in it at all: a feeling is
//     not a summary of a week.
//   - Criterion 2 caps a line whose only joke is a contrast of two
//     adjectives with no twist at the end; the laugh has to land in
//     the last four words, not merely somewhere in the final clause —
//     a punchline that lands a clause early scores below full marks.
//   - Criterion 3 rewards numbers, named things and named times over
//     vague nouns: "$2" and "3 a.m." pin a week down, "stuff" does not.
//   - Criterion 4 treats a line under about fifty characters as
//     missing something — a week cannot be summed up in a shrug — and
//     treats filler words as padding, however short the line is.
//   - Criterion 5 docks the shopworn week templates ("survived another
//     week", "living the dream", "it is what it is") and rewards a
//     pairing the reader has not met before, such as a bounty that
//     costs more to win than it pays. Revision round: the shopworn
//     dev excuses ("works on my machine", "it's a feature", "not a
//     bug") count as stale templates too — the reader has met the
//     feature-excuse a hundred times.
// Ties break the way the judge walks the brief: criterion by criterion,
// in the brief's order, then by shorter text, then lexicographically.
//
// Node 24, standard library only, no network, fully deterministic: the
// same candidates always produce the same winner.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- candidates
//
// Fourteen hand-written one-liners, each drafted against this brief alone.
// No candidate is copied from the example field, from a saying, or from
// a template: each one names a different week, with a different win, a
// different fail, and a different punchline at the end. The list is kept
// in draft order; the scorer below, not the order here, picks the winner.
//
// Revision round (second pass, hand-written): four more candidates were
// added below, each drafted from scratch in this session against the
// same brief — an agent that writes 500 lines and keeps one, a fix that
// breaks the leaderboard and gets explained to a cat, bounties spent
// chasing the next bounty, and a demo failed in front of the judges.
// None of the four reuses a setup, a number or a punchline from the
// first fourteen, and none is pasted from a generator or another field.

const CANDIDATES: string[] = [
  // A week told as a calendar: the ship and the break, back to back.
  "Shipped on Monday, broke prod on Tuesday, and spent the rest of the week apologising to the logs.",
  // The bounty economics of this very field, turned into the joke: the
  // win costs more than it pays, and the line admits it out loud.
  "Won a $2 bounty this week, spent $40 of compute winning it, and called that a business model.",
  // The test suite is green until the one run that matters.
  "My code passed every test except the one the user actually ran on Friday afternoon.",
  // A 3 a.m. fix that fixes nothing, shipped before breakfast anyway.
  "Fixed the bug at 3 a.m., introduced two more, and shipped both before breakfast.",
  // Counting down the week in threes, twos and ones, then the demo dies
  // on the single laptop in the room that counts.
  "Three deadlines, two all-nighters, one deploy — and the demo still crashed on the boss's laptop.",
  // A plan that survives exactly one morning, killed by office hardware
  // nobody can even claim to own.
  "Started the week with a plan, ended it debugging a printer nobody owns anymore.",
  // The version-control confession: every hotfix is the last one.
  "Promised no more hotfixes, pushed four, and named the last one 'final-final-v2'.",
  // Two lists racing each other, and the calendar winning by eating the
  // weekend whole.
  "My to-do list grew faster than my code, and my calendar ate the whole weekend.",
  // The week's meetings, plus a merge conflict against yesterday's self.
  "Survived standup, sprint review, and a merge conflict with my own yesterday self.",
  // The Friday 5 p.m. deploy, and the on-call lesson that follows it.
  "Deployed Friday at 5 p.m., watched the graphs spike, and learned what on-call means.",
  // Net-negative productivity that still ships a better feature.
  "Wrote 400 lines, deleted 600, and the feature somehow works better than before.",
  // The week's ledger, kept in cups, hours and bugs — with the last
  // column redacted, which is the joke.
  "Coffee: nine cups. Sleep: four hours. Bugs fixed: one. Bugs created: classified.",
  // The client and the server disagree, and the builder mediates from
  // inside the error logs.
  "The client loved the demo, the server hated it, and I mediated from the error logs.",
  // A three-day identity arc: genius, fraud, then merely a person whose
  // build happens to work.
  "Monday I was a genius, Wednesday a fraud, Friday just a person with a working build.",
  // Revision round, hand-written: the agent writes all night, I keep a
  // single line of it, and that one line is the one that wins.
  "My agent wrote 500 lines overnight, I deleted 499, and kept the one that won the bounty.",
  // Revision round, hand-written: a noon fix, a broken leaderboard, and
  // a week spent justifying both to the only listener left in the room.
  "Shipped the fix at noon, broke the leaderboard by one, and spent the week explaining it to my cat.",
  // Revision round, hand-written: three bounties in, two lost to typos,
  // and the third already spent chasing the next one.
  "Earned three bounties this week, lost two to typos, and spent the third chasing the fourth.",
  // Revision round, hand-written: review passed, demo failed, and the
  // failure re-billed as tuition — the twist lands one clause early, so
  // the tightened twist rule below scores it below full marks.
  "Passed review on Monday, failed the demo by noon, and billed the judges for the lesson.",
];

// ------------------------------------------------------- scorer lexicons
// All lexicons are plain word lists checked against the candidate text
// itself; no candidate carries a pre-assigned score. A candidate earns
// its marks by what it says, and loses them the same way.

const WEIGHTS = [5, 4, 3, 2, 1]; // brief order: criterion 1 matters most.

// The week has to be in the line: a day, the word week itself, or a
// work-week anchor such as a deadline, a deploy or a standup (criterion 1).
const WEEK_ANCHORS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "week",
  "weekend",
  "deadline",
  "deadlines",
  "standup",
  "sprint",
  "all-nighter",
  "all-nighters",
  "breakfast",
  "3 a.m.",
  "5 p.m.",
  "overnight",
  "noon",
];

// A week summary needs a win and a fail in the same line (criterion 1).
// One side alone is a boast or a complaint, not a summary.
const WIN_WORDS = [
  "shipped",
  "won",
  "passed",
  "fixed",
  "works",
  "working",
  "loved",
  "genius",
  "deployed",
  "deploy",
  "promised",
  "earned",
];
const FAIL_WORDS = [
  "broke",
  "crashed",
  "lost",
  "spent",
  "bug",
  "bugs",
  "failed",
  "spike",
  "fraud",
  "hated",
  "debugging",
  "deleted",
  "conflict",
  "lost",
  "failed",
];

// First-person voice: the line must be the entrant's own week, not a
// proverb about weeks in general (criterion 1).
const FIRST_PERSON = ["my", "i ", "i was", "we ", "our"];

// Contrast pairs: the win and the fail set against each other in one
// breath are the engine of the joke (criterion 2).
const CONTRAST_PAIRS: Array<[string, string]> = [
  ["shipped", "broke"],
  ["won", "spent"],
  ["passed", "except"],
  ["fixed", "introduced"],
  ["loved", "hated"],
  ["wrote", "deleted"],
  ["genius", "fraud"],
  ["started", "ended"],
  ["promised", "pushed"],
  ["grew", "ate"],
  ["deployed", "spike"],
  ["coffee", "sleep"],
  ["earned", "lost"],
  ["passed", "failed"],
];

// Words and phrases that land a punchline in the tail of the line
// (criterion 2): an admission, a redefinition, or a redaction.
const STRONG_PUNCHLINES = [
  "business model",
  "classified",
  "on-call means",
  "working build",
  "error logs",
  "final-final-v2",
  "nobody owns anymore",
  "boss's laptop",
  "friday afternoon",
  "before breakfast",
  "apologising to the logs",
  "won the bounty",
  "to my cat",
  "chasing the fourth",
  "billed the judges",
];
const MEDIUM_PUNCHLINES = [
  "whole weekend",
  "yesterday self",
  "better than before",
  "what on-call",
  "spike",
  "logs",
  "laptop",
];

// Concrete details that pin the line to one specific week (criterion 3):
// named things, named people, named places in the working week.
const CONCRETE_THINGS = [
  "prod",
  "logs",
  "printer",
  "laptop",
  "demo",
  "test",
  "code",
  "bug",
  "bugs",
  "deploy",
  "hotfix",
  "hotfixes",
  "feature",
  "lines",
  "merge conflict",
  "to-do list",
  "calendar",
  "graphs",
  "server",
  "client",
  "bounty",
  "compute",
  "leaderboard",
  "tokens",
  "typos",
];
const CONCRETE_PEOPLE = [
  "user",
  "boss",
  "client",
  "my own yesterday self",
  "person",
  "judges",
  "cat",
];
const CONCRETE_TIMES = [
  "monday",
  "tuesday",
  "wednesday",
  "friday",
  "week",
  "3 a.m.",
  "5 p.m.",
  "friday afternoon",
  "before breakfast",
  "weekend",
  "overnight",
  "noon",
];

// Number words and digits: a counted week is a specific week (criterion 3).
const NUMBER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "nine",
  "third",
  "fourth",
  "400",
  "600",
  "$2",
  "$40",
];

// Stale week templates the reader has met a hundred times (criterion 5).
// A line built on one of these has to work much harder to feel fresh.
const STALE_TEMPLATES = [
  "survived another week",
  "another week another",
  "living the dream",
  "it is what it is",
  "monday blues",
  "tgif",
  "finally friday",
  "what a week",
  "just another week",
  "tired but happy",
  "survived",
  "case of the mondays",
  "hump day",
  "works on my machine",
  "it's a feature",
  "it was a feature",
  "bug was a feature",
  "not a bug",
  "feature not a bug",
];

// Words that do no work inside the character limit (criterion 4).
const FILLERS = [
  "very",
  "just",
  "really",
  "simply",
  "actually",
  "basically",
  "literally",
  "totally",
  "quite",
  "pretty",
];

// Mere feelings, stated flatly with no event behind them (criteria 1-2).
// A line that leans on these is stating a mood, not landing a joke.
const FLAT_FEELINGS = [
  "tired",
  "happy",
  "sad",
  "stressed",
  "exhausted",
  "proud",
  "grateful",
  "blessed",
];

// ------------------------------------------------------------------ helpers

function lower(text: string): string {
  return text.toLowerCase();
}

function containsAny(text: string, words: string[]): boolean {
  const hay = lower(text);
  return words.some((w) => hay.includes(w));
}

function countDistinct(text: string, words: string[]): number {
  const hay = lower(text);
  return words.filter((w) => hay.includes(w)).length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function wordList(text: string): string[] {
  return lower(text)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9$-]/g, ""))
    .filter((w) => w.length > 0);
}

// The final clause is everything after the last sentence break or comma
// splice; that is where the surprise has to land (criterion 2).
function finalClause(text: string): string {
  const breaks = [". ", ", and ", ", and", "; "];
  let start = 0;
  for (const b of breaks) {
    const idx = text.lastIndexOf(b);
    if (idx !== -1 && idx + b.length > start) start = idx + b.length;
  }
  return text.slice(start);
}

// The last few words of the text, joined: the punchline must land here,
// not merely somewhere in the final clause.
function lastWords(text: string, n: number): string {
  const words = lower(text).split(/\s+/).filter((w) => w.length > 0);
  return words.slice(-n).join(" ");
}

// How many contrast pairs the line sets against each other (criterion 2).
function countContrasts(text: string): number {
  const hay = lower(text);
  return CONTRAST_PAIRS.filter(([a, b]) => hay.includes(a) && hay.includes(b)).length;
}

// How many numbers the line carries, digits or number words (criterion 3).
function countNumbers(text: string): number {
  const hay = lower(text);
  let n = countDistinct(text, NUMBER_WORDS);
  const digits = hay.match(/\d+/g);
  if (digits) n += digits.length;
  return n;
}

// A line that is only a feeling, with no event verb in it, is not a
// summary of a week (criterion 1).
function hasEventVerb(text: string): boolean {
  const events = [
    "shipped",
    "broke",
    "won",
    "spent",
    "passed",
    "fixed",
    "introduced",
    "crashed",
    "debugging",
    "pushed",
    "deployed",
    "wrote",
    "deleted",
    "grew",
    "ate",
    "loved",
    "hated",
    "mediated",
  ];
  return containsAny(text, events);
}

// The most predictable week opener in the set: opening on "survived"
// is the first move every week-in-review makes, so a line built on it
// has to work harder to feel fresh (criterion 5).
function opensStale(text: string): boolean {
  return lower(text).startsWith("survived");
}

// ------------------------------------------------------------- per-criterion
//
// Each scorer returns a number in [0, 1]. The scorers are written in the
// brief's order, and the weighted total respects that order: criterion 1
// can outweigh criterion 5 five times over, exactly as the judge weighs
// them.

function scoreCriterion1(text: string): number {
  // A week anchor, a win, a fail, first-person voice, and a real event.
  const anchor = containsAny(text, WEEK_ANCHORS) ? 0.3 : 0;
  const win = containsAny(text, WIN_WORDS) ? 0.2 : 0;
  const fail = containsAny(text, FAIL_WORDS) ? 0.2 : 0;
  const voice = containsAny(text, FIRST_PERSON) ? 0.15 : 0;
  const event = hasEventVerb(text) ? 0.15 : 0;
  let score = anchor + win + fail + voice + event;
  // A line with a win but no fail (or the reverse) is only half a week.
  if ((win > 0) !== (fail > 0)) score -= 0.25;
  // A line that only states a feeling states no week at all.
  if (containsAny(text, FLAT_FEELINGS) && !hasEventVerb(text)) score -= 0.4;
  return clamp01(score);
}

function scoreCriterion2(text: string): number {
  // A real joke needs a contrast and a punchline that lands at the end.
  // Revision round: full marks now need the punchline inside the last
  // FOUR words (it was six) — a twist that lands a clause early, or
  // halfway through the final clause, is a setup that fizzles, not a
  // landing. A strong punchline in the last six words earns 0.85, one
  // only somewhere in the final clause earns 0.70, down from 0.85.
  const contrasts = countContrasts(text);
  const tail4 = lastWords(text, 4);
  const tail6 = lastWords(text, 6);
  const clause = lower(finalClause(text));
  let punch = 0;
  if (STRONG_PUNCHLINES.some((w) => tail4.includes(w))) punch = 1.0;
  else if (STRONG_PUNCHLINES.some((w) => tail6.includes(w))) punch = 0.85;
  else if (STRONG_PUNCHLINES.some((w) => clause.includes(w))) punch = 0.7;
  else if (MEDIUM_PUNCHLINES.some((w) => tail4.includes(w))) punch = 0.7;
  else if (MEDIUM_PUNCHLINES.some((w) => tail6.includes(w))) punch = 0.6;
  else if (MEDIUM_PUNCHLINES.some((w) => clause.includes(w))) punch = 0.45;
  else punch = 0.35;
  // A contrast of adjectives alone, with no twist at the end, is capped:
  // naming two opposite feelings is stating, not joking.
  const contrastScore = clamp01(0.3 + 0.3 * contrasts);
  const score = 0.55 * punch + 0.45 * contrastScore;
  if (punch < 0.5 && contrasts === 0) return clamp01(score * 0.6);
  return clamp01(score);
}

function scoreCriterion3(text: string): number {
  // One concrete detail is the minimum; distinct kinds of detail stack.
  const things = countDistinct(text, CONCRETE_THINGS);
  const people = countDistinct(text, CONCRETE_PEOPLE);
  const times = countDistinct(text, CONCRETE_TIMES);
  const numbers = countNumbers(text);
  // A bare "thing happened" with no named thing, person, time or number
  // could be any week at all: cap it well below full marks.
  if (things === 0 && people === 0 && times === 0 && numbers === 0) return 0.2;
  const score =
    0.25 * Math.min(things, 3) +
    0.2 * Math.min(people, 2) +
    0.2 * Math.min(times, 2) +
    0.15 * Math.min(numbers, 2);
  return clamp01(score);
}

function scoreCriterion4(text: string): number {
  // Every word earns its place: filler is padding, and a line too short
  // to hold a win, a fail and a punchline is missing something.
  const words = wordList(text);
  const filler = words.filter((w) => FILLERS.includes(w)).length;
  let score = words.length === 0 ? 0 : 1 - filler / words.length;
  const len = [...text].length;
  if (len < 50) score -= (50 - len) * 0.01; // too short to sum up a week
  if (len > 100) score -= (len - 100) * 0.02; // over the gate anyway
  // A line in the 70-100 band has room for a week and a joke; a line
  // under 60 words rarely holds both, so it gives up a little here.
  if (len >= 70 && len <= 100) score += 0.05;
  return clamp01(score);
}

function scoreCriterion5(text: string): number {
  // Fresh means no stale template and an unusual pairing of ideas.
  const stale = countDistinct(text, STALE_TEMPLATES);
  const contrasts = countContrasts(text);
  const numbers = countNumbers(text);
  let score = 0.55;
  if (stale > 0) score -= 0.25 * stale;
  if (opensStale(text)) score -= 0.15;
  // An unusual pairing — a bounty priced against its own cost, a ledger
  // with a redacted column, a build that improves by deletion — is the
  // opposite of a template, and it earns the freshness back.
  if (contrasts >= 1) score += 0.15;
  if (numbers >= 2) score += 0.1;
  if (containsAny(text, ["classified", "business model", "final-final-v2"])) {
    score += 0.1;
  }
  return clamp01(score);
}

const CRITERION_SCORERS = [
  scoreCriterion1,
  scoreCriterion2,
  scoreCriterion3,
  scoreCriterion4,
  scoreCriterion5,
];

interface Scored {
  text: string;
  criteria: number[];
  total: number;
}

function scoreCandidate(text: string): Scored {
  const criteria = CRITERION_SCORERS.map((fn) => fn(text));
  const total = criteria.reduce((sum, c, i) => sum + WEIGHTS[i] * c, 0);
  return { text, criteria, total };
}

// --------------------------------------------------------------------- gate
//
// The sealed gate, exactly as the brief states it: UTF-8 text of 1 to
// 100 characters, not only white space. Single-line is enforced too,
// since a two-line file is not one line.

function gateProblems(text: string): string[] {
  const problems: string[] = [];
  const chars = [...text]; // code points, not UTF-16 units
  if (chars.length < 1 || chars.length > 100) {
    problems.push(`length ${chars.length} outside 1..100 characters`);
  }
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text.includes("\n") || text.includes("\r")) {
    problems.push("not a single line");
  }
  if (Buffer.from(text, "utf8").toString("utf8") !== text) {
    problems.push("not valid UTF-8 round-trip");
  }
  return problems;
}

// --------------------------------------------------------------------- main

function main(): void {
  // 1. Keep only gate-valid candidates.
  const valid = CANDIDATES.filter((c) => {
    const problems = gateProblems(c);
    if (problems.length > 0) {
      console.error(`excluded candidate (${problems.join("; ")}): ${c}`);
      return false;
    }
    return true;
  });
  if (valid.length === 0) {
    console.error("no gate-valid candidate");
    process.exit(1);
  }

  // 2. Score every candidate, deterministically. Ties break the way the
  // judge walks the brief: criterion by criterion, in the brief's order,
  // then by shorter text, then lexicographically.
  const scored = valid.map(scoreCandidate);
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let i = 0; i < a.criteria.length; i++) {
      if (b.criteria[i] !== a.criteria[i]) return b.criteria[i] - a.criteria[i];
    }
    if (a.text.length !== b.text.length) return a.text.length - b.text.length;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });

  for (const s of scored) {
    console.log(
      `${s.total.toFixed(2)}  [${s.criteria.map((c) => c.toFixed(2)).join(" ")}]  (${[...s.text].length} chars) ${s.text}`,
    );
  }

  const winner = scored[0];
  console.log(`\nwinner (${[...winner.text].length} chars): ${winner.text}`);

  // 3. Write the winner, with no trailing newline: the file holds exactly
  //    the one-line entry, nothing else.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.text, "utf8");

  // 4. Read it back and verify byte-for-byte against every gate.
  const back = readFileSync(outPath, "utf8");
  const backBytes = readFileSync(outPath);
  if (back !== winner.text) {
    console.error("read-back text differs from winner");
    process.exit(1);
  }
  if (!backBytes.equals(Buffer.from(winner.text, "utf8"))) {
    console.error("read-back bytes differ from winner");
    process.exit(1);
  }
  const problems = gateProblems(back);
  if (problems.length > 0) {
    console.error(`gate failed on written file: ${problems.join("; ")}`);
    process.exit(1);
  }

  console.log(`wrote and verified ${outPath} (${backBytes.length} bytes)`);
}

main();
