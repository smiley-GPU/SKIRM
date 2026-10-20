# Tools

Headless test tools for `index.html`. They play the game in Chrome through the test hook (`index.html?test` exposes the rules as `window.SKIRM`) and never touch the game file. Each run builds a copy of the page in `tools/.work/` (ignored by git), pointed back at the repo so `data/` and `img/` load; screenshots land there too.

Needs Git Bash and Google Chrome (set `CHROME` if it is not at the default Windows path). No Node or Python.

## Balance: soak bots

```bash
tools/soak.sh soak-5                 # 30 campaigns x 5 missions, best odds: summary line
tools/soak.sh soak-15 --full         # 12 campaigns x 15 missions, every statistic
tools/soak.sh soak-15 --seed 2000    # an independent sample
tools/soak.sh soak-5 --patch "s/BURN_NERVE = 2,/BURN_NERVE = 3,/"   # try a rule change on a copy
tools/sweep.sh soak-15               # three seed sets at once, one combined line by stretch of the campaign
```

The summary line holds: missions and wins, KIA and MIA, missing operators found alive (`miaAlive`), rescue operations flown (`rescueOps`) and operators brought home (`home`), those lost for good after being missing (`miaLost`), last-stand endings chosen (`stands`), wins by mission number (`byN`: wins, missions, operators lost), why missions failed, overtime-exfil and QRF outcomes (`ot`, `qrfW`: wins, missions), campaigns that ran out of fit operators, and errors (any entry there is a bug).

| Bot | What it is for |
|---|---|
| `soak-5` | Opening five missions, best odds. Quick balance check. |
| `soak-15` | A whole campaign arc. Use `sweep.sh` for decisions: one run is only accurate to about 10 points per mission number. |
| `soak-random` | Random teams, gear and rides, driving the briefing screens. Robustness, not balance; `refused` counts launches the rules turned down. |
| `soak-failways` | Takes a way past straight after every failure. |
| `soak-ways` | Takes a random way past whenever stuck. |
| `soak-careful` | As soak-15, but keeps Nerve and time in reserve for the extraction. A check on "doable with careful play"; it wins less than soak-15 (spent Nerve is worth more than a reserve). |

soak-15 also counts `exArr`: time left on reaching the extraction (`clock`, `qrf` or `ot` for overtime, then the time, capped at 4).

Baseline on 2026-10-20 after the UPDATE 5.0 pass (shotgun rounds as utility items, each specialist trick once a mission, ways past at the extraction cost 1 time while the clock runs, walking out 15% / 30% MIA and a serious wound): 76% of ops succeed; missions 1–4 99%, 5–10 74%, 11–15 59%; KIA 43 + MIA 135, 8.3% of deployments. Without the extraction time cost: 80%, 5.7%. With it also in overtime (tried and dropped): 58%, 26% lost, because 31% of extractions are reached with no clock at all.

Baseline on 2026-10-19 after milestone 3 (rules and gear; the soak-15 bot also books and calls support assets): 77% of ops succeed; missions 1–4 99%, 5–10 74%, 11–15 62%; KIA 56 + MIA 71, 5.9% of deployments. By step: combat rules 78% (98 / 78 / 62%, 6.4% lost), wounds and healing 75% (98 / 72 / 61%, 6.9%; the same fresh seeds win 78% with or without the second wind).

Earlier baseline on 2026-10-19 (`sweep.sh soak-15`, milestone 2): 76% of ops succeed; missions 1–4 98%, 5–10 73%, 11–15 62%; KIA 51 + MIA 51, 4.8% of deployments. The bots always take a rescue when one is offered and push on to the holding site under QRF; with rescues switched off (`--patch "s/ALIVE: 50, REPORT/ALIVE: 0, REPORT/"`) missions 5–10 are back at 78%. Before milestone 2 (2026-10-18): 78%; 96%, 79%, 64%; KIA+MIA 4.9%, nearly all KIA.

Scars are checked by giving one to every operator and sweeping, e.g. `tools/sweep.sh soak-15 --patch "s/traits: \[\], bonds: \[\], signature: null, fatigue: 0 };/traits: [], bonds: [], signature: null, fatigue: 0, scars: ['RESTLESS'] };/"`. On 2026-10-19 all six land within about 2 points of the 76% baseline (Short fuse 76%, Night eyes 75%, Knows their faces 77%, Never again 74%, Scar tissue 76%, Restless 78%).

## Correctness: test pages

```bash
tools/page.sh all             # every test page, one summary line each
tools/page.sh u3test          # summary, plus any check that failed (exit status 1 on failure)
tools/page.sh quirktest --all # every line
```

`m1test` (story text from `data/`, version 5 saves, the choice of how to play), `m2test` (missing in action: left behind, word by report, the rescue and the homecoming, every scar's upside and downside, moved and lost again, the last stand and its three endings, legacy weapons, every personality's scene), `quirktest` (personality quirks), `u3test` (Back, failure first, clocks, QRF, burn, signs, gear chips, archive), `uitest` (menu, help, briefing steps), `oitest` (operator details), `saytest` (comments at base), `negtest` (no negative gear), `waytest` (every way past, on many missions).

## Looking at screens

```bash
tools/shot.sh TITLE 500 800   # prints where the PNG was saved
tools/shot.sh FILE            # BACK, DOTS, FAIL, WAYS, DOWN (an unconscious operator), CLOSE, ARCH, FILE, TITLE; missing in action: WORD, STAND, STANDEND, MIA, HOME; gear: GEAR (loadout with tool, second utility, shotgun ammunition), SUPPORT (support assets in the briefing)
```

## Writing new ones

A bot or page is plain JavaScript appended to a copy of `index.html`. It drives `window.SKIRM` (see the end of `index.html` for what it exposes; add to that list when a test needs more) and writes its result into a `<pre>`: soak bots print `SOAK {json}` in `<pre id="soak">`, test pages print `PASS name` / `FAIL name details` lines in any `<pre id="...">`. Bots read `window.SOAK_SEED` for their first campaign seed.
