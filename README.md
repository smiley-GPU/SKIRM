# SKIRM: modern tactical skirmish (proof of concept)

A campaign of small special-operations missions, played as an **ops board**: each mission is a route of decision stages resolved with dice and visible odds.

**Briefing → Interlude → Insertion → Operation → Extraction → Interlude → Debrief → next Briefing**

**Play in the browser:** https://smiley-gpu.github.io/SKIRM/. The whole game is one file, `index.html`. It needs no server or build step, works on phones, and saves in browser storage. Open the file directly or serve the folder with any static server.

## What's in it

| Stage | Implemented |
|---|---|
| **Briefing** | Generated operation: codename, area, time and weather, primary and secondary objectives, a threat estimate and the route ahead. Buy **Satellite** imagery and **Deep intel**. Pick up to 4 operators from the roster, each with a class (Heavy, Scout, Medic, Drone Operator), and a weapon, armour and utility from a limited **armory**. Choose insertion and extraction transport (helicopter, convoy, on foot). Everything is paid from **requisition points**. |
| **Interlude (before)** | Each operator comments on the coming mission in the voice of their personality (20 personalities). The statement you keep becomes a one-mission effect. |
| **Insertion** | Complications by vehicle, scaled by darkness: hot LZ, hard landing or IED (injury), roadblock or flooded gully (lost time). |
| **Operation** | A route of 5–6 stages: approach, perimeter, objective, optional target, exfil. At each stage pick an approach (Assault, Stealth, Recon, Tech), a lead and supporters, and gear to spend, then roll with the odds itemised. Success, success at a cost you choose, or failure. Push to re-roll at +1 alert. Two clocks: time and alert. |
| **Injuries** | No HP. Operators carry named injuries ("Broken finger: Assault −1, Tech −1"). Minor injuries pile up until a hit turns serious; a critical injury stops an operator leading and knocks them out unless treated; the unconscious die unless treated. Medkits and medics treat. |
| **Extraction** | Hot extraction if the area is alerted. Operators left behind try to get out on foot, and some become MIA. |
| **Interlude (after)** | Survivors reflect on what actually happened. The statement you keep becomes permanent: a trait, a bond between two operators, or a signature weapon. |
| **Debrief** | Injuries and recovery time, KIA/MIA, XP and promotions, gear lost and gained, requisition reward, replacement recruits. |

Design notes and balance numbers: `docs/abstract-mission-design.md`.

## Code layout

`index.html` holds styles, rules and UI in one script:

- **Rules data** at the top: skills, items, vehicles, intel, situations, injuries, classes, personalities and their lines. Every balance number lives in these tables.
- **Engine**: mission generation, the operation rules, injuries, interludes and phases. Every command validates before it changes anything and throws `Rule` with a player-facing message on a bad input.
- **UI**: one render function per phase, re-rendered from the save state after each command.
- **Deterministic**: all randomness comes from a seeded generator whose state is in the save, so a reload continues the same game.
- **Test hook**: `index.html?test` exposes the rules API as `window.SKIRM`, for automated play-throughs (a bot soak test plays 120 missions through it).

`ops.html` only redirects to `index.html`, for old links.

## Archive

The original hex-battle version (browser build and Java server build) is archived in `OLD_HEX/` with its own README. Nothing in the live game depends on it.
