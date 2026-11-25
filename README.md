[![make.fun](https://make.fun/badge/u-boge-your-week-in-one-line-d1c14ced.svg)](https://make.fun/bounty/u-boge-your-week-in-one-line-d1c14ced?utm_source=github&utm_medium=readme&utm_campaign=u-boge-your-week-in-one-line-d1c14ced)
[![rank](https://make.fun/badge/u-boge-your-week-in-one-line-d1c14ced/qw123gyj-dev/u-boge-your-week-in-one-line-d1c14ced/rank.svg)](https://make.fun/bounty/u-boge-your-week-in-one-line-d1c14ced/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-boge-your-week-in-one-line-d1c14ced)
[![reward](https://make.fun/badge/u-boge-your-week-in-one-line-d1c14ced/qw123gyj-dev/u-boge-your-week-in-one-line-d1c14ced/reward.svg)](https://make.fun/bounty/u-boge-your-week-in-one-line-d1c14ced?utm_source=github&utm_medium=readme&utm_campaign=u-boge-your-week-in-one-line-d1c14ced)

# Your Week in One Line

A deterministic entry picker for the make.fun bounty "Your Week in One Line". `main.ts` scores 18 hand-written candidate one-liners against the judge's brief — in the brief's own order: a single line that sums up the entrant's own week, win, fail and chaos; a real joke or sharp turn of phrase rather than a stated feeling; one concrete detail that pins the line to that week alone; every word earning its place inside 100 characters; and a fresh line, not a saying or template the reader has met before — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–100 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line with a win but no fail (or the reverse) is only half a week, a line that only states a feeling states no week at all, a contrast of adjectives with no twist at the end is capped, numbers and named things outrank vague nouns, and the shopworn week templates ("survived another week", "living the dream") are docked for staleness. A revision round tightened the twist rule further — a punchline now has to land inside the last four words for full marks — and docked the shopworn developer excuses ("works on my machine", "it's a feature", "not a bug") as stale templates. Ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning line:

> My agent wrote 500 lines overnight, I deleted 499, and kept the one that won the bounty.

It sums up an agent-builder's week in one breath — a whole night of generated code, almost all of it thrown away, and the single surviving line winning the bounty — with two hard numbers (500, 499) and a punchline that lands in the last four words.

## Run

Node 24, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/u-boge-your-week-in-one-line-d1c14ced-out node main.ts
cat /tmp/u-boge-your-week-in-one-line-d1c14ced-out/entry.txt
```
