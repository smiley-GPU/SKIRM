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

The summary line holds: missions and wins, KIA and MIA, wins by mission number (`byN`: wins, missions, operators lost), why missions failed, overtime-exfil and QRF outcomes (`ot`, `qrfW`: wins, missions), campaigns that ran out of fit operators, and errors (any entry there is a bug).

| Bot | What it is for |
|---|---|
| `soak-5` | Opening five missions, best odds. Quick balance check. |
| `soak-15` | A whole campaign arc. Use `sweep.sh` for decisions: one run is only accurate to about 10 points per mission number. |
| `soak-random` | Random teams, gear and rides, driving the briefing screens. Robustness, not balance; `refused` counts launches the rules turned down. |
| `soak-failways` | Takes a way past straight after every failure. |
| `soak-ways` | Takes a random way past whenever stuck. |

Baseline on 2026-10-18 (`sweep.sh soak-15`): 78% of ops succeed; missions 1–4 96%, 5–10 79%, 11–15 64%; KIA+MIA 4.9% of deployments.

## Correctness: test pages

```bash
tools/page.sh u3test          # summary, plus any check that failed (exit status 1 on failure)
tools/page.sh quirktest --all # every line
```

`m1test` (story text from `data/`, version 5 saves, the choice of how to play), `quirktest` (personality quirks), `u3test` (Back, failure first, clocks, QRF, burn, signs, gear chips, archive), `uitest` (menu, help, briefing steps), `oitest` (operator details), `saytest` (comments at base), `negtest` (no negative gear), `waytest` (every way past, on many missions).

## Looking at screens

```bash
tools/shot.sh TITLE 500 800   # prints where the PNG was saved
tools/shot.sh FILE            # BACK, DOTS, FAIL, WAYS, CLOSE, ARCH, FILE, TITLE
```

## Writing new ones

A bot or page is plain JavaScript appended to a copy of `index.html`. It drives `window.SKIRM` (see the end of `index.html` for what it exposes; add to that list when a test needs more) and writes its result into a `<pre>`: soak bots print `SOAK {json}` in `<pre id="soak">`, test pages print `PASS name` / `FAIL name details` lines in any `<pre id="...">`. Bots read `window.SOAK_SEED` for their first campaign seed.
