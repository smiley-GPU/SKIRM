# SKIRM: modern tactical skirmish (proof of concept)

A campaign of small special-operations missions, played as an **ops board**: each mission is a route of decision stages resolved with dice and visible odds.

**Base → Briefing → Insertion (with interlude) → Operation → Extraction (with interlude) → Debrief → Base**

**Play in the browser:** https://smiley-gpu.github.io/SKIRM/. The whole game is one file, `index.html`, plus operator portraits in `img/operators/`. It needs no server or build step, works on phones, and saves in browser storage. Open the file directly or serve the folder with any static server.

## What's in it

| Stage | Implemented |
|---|---|
| **Base** | The hub between missions. A **mission board** offers 2–3 operations in different locations, each with a weather forecast, threat and reward. Six departments upgrade with **Base Points (BP)** earned on missions: **Operations** (more missions), **Intelligence** (more intel, better forecasts), **Medical** (treatment beds that speed recovery and clear fatigue), **Engineering** (fabricate gear, kits and consumables, repair damaged vehicles), **Logistics** (more vehicles), **Barracks** (bigger roster, faster rest, trained recruits). Day-to-day spending is **Requisition (RP)**. |
| **Briefing** | Three steps under a pinned bar that shows the team, the transport cost and the RP left: **Intel**, **Team & gear**, **Transport**, then Launch (a greyed-out button always says what is missing). The chosen operation: location, time of day, the forecast and its reliability, what intel says about the enemy force, its officer and the target, and the route ahead. Up to six intel options (satellite, deep intel, weather recon, signals intercept, informant network, UAV overflight), some unlocked by Intelligence upgrades and some cheaper with the right specialist. Pick up to 4 operators (class, specialty, fatigue) with a weapon, armour, kit and utility from a limited **armory**; everyone also carries a **handgun**, so a primary weapon is optional (a handgun-only lead rolls one Assault die fewer outside close quarters, unless they are a CQB specialist), and transport in and out from up to seven vehicles (on foot, convoy, helicopter, light strike vehicle, boat, HALO jump, MRAP) that the location, the forecast and damage allow. |
| **Interlude (before)** | Each operator comments on the coming mission in the voice of their personality (20 personalities). The statement you keep becomes a one-mission effect. |
| **Insertion** | Complications by vehicle, scaled by darkness and weather: hot LZ, hard landing, IED, ambush, a patrol boat, a scattered parachute landing. Vehicles can come back damaged. If the forecast was wrong and the weather grounds the ride, the team walks in. |
| **Operation** | A route of 5–6 stages: approach, perimeter, objective, optional target, exfil. At each stage pick an approach (Assault, Stealth, Recon, Tech), a lead and supporters, and gear to spend, then roll with the odds itemised. Success, success at a cost you choose, or failure. Push to re-roll at +1 alert. Two clocks: time and alert. Operators comment out loud on what happens (a success, a kill, a wound, a fall, the alarm, a new stage) in their personality's voice: speech bubbles that pop up and fade (green for good news, red for bad, yellow for remarks on the situation), kept in the log. |
| **Injuries** | No HP. Operators carry named injuries ("Broken finger: Assault −1, Tech −1"). Minor injuries pile up until a hit turns serious; a critical injury stops an operator leading and knocks them out unless treated; the unconscious die unless treated. Medkits and medics treat. |
| **Enemies** | A faction (militia, regulars or contractors) sets how well they shoot back and what you can take from them. A named **officer** with a trait (sharpshooter, tactician, brute, commander) may hold a stage and carries better gear. Take their position by force and they may die, go out with a grenade that wrecks some of your kit, escape (to a later stage with a grudge, or out of the mission to resurface promoted on a later one), or surrender: prisoners reveal the enemy force on every operation and, after interrogation, can be handed over or recruited. The HVT can be a financier, a bomb-maker or a **warlord**, the real enemy, who is harder to reach and gets back up once. |
| **Weather** | Seven location types, each with its own weather, encounters and routes. Climate hazards: heat waves, wildfire smoke, thunderstorms, flash floods, mudslides and dust storms change the odds, tire the team, and ground or block vehicles. Forecasts can be wrong, and the weather can turn mid-mission. |
| **Operators** | Class gives base dice, gear adds dice, and every operator has a **specialty** (marksman, demolitions, CQB, infiltrator, mountain warfare, combat diver, signals, linguist, pathfinder, endurance) that unlocks special approaches or bends a rule. **Fatigue** builds with leading tests, failures, long routes, heat and carrying the wounded; tired leads roll fewer dice, and resting costs time. |
| **Extraction** | Hot extraction if the area is alerted. Operators left behind try to get out on foot, and some become MIA. |
| **Interlude (after)** | Survivors reflect on what actually happened. The statement you keep becomes permanent: a trait, a bond between two operators, or a signature weapon. |
| **Debrief** | Injuries and recovery time, KIA/MIA, XP and promotions, gear lost and gained (faction loot, the officer's kit), RP and BP, replacement recruits. Then back to base. |

Every screen has a **?** button (how to play, how a stage works, and a glossary of RP, BP, alert, fatigue and the rest) and a **⋯** menu (sound and vibration, new campaign; restarting asks twice).

Design notes and balance numbers: `docs/abstract-mission-design.md`.

## Code layout

`index.html` holds styles, rules and UI in one script:

- **Rules data** at the top: skills, items, vehicles, intel, routes, situations, locations, weather, factions, officers, targets, specialties, base departments, injuries, classes, personalities and their lines. Every balance number lives in these tables.
- **Engine**: the base and mission board, mission generation, the operation rules, injuries, fatigue, weather, interludes and phases. Every command validates before it changes anything and throws `Rule` with a player-facing message on a bad input.
- **UI**: one render function per phase, re-rendered from the save state after each command.
- **Deterministic**: all randomness comes from a seeded generator whose state is in the save, so a reload continues the same game.
- **Test hook**: `index.html?test` exposes the rules API as `window.SKIRM`, for automated play-throughs (a bot soak test plays 150 missions, base included, through it).

Operator portraits (90×90) live in `img/operators/` (`m1`–`m10`, `f1`–`f9`, scaled from the sources in `Images/Operators/`). Each operator gets one at recruitment that nobody else alive has; operators with female first names get an `f` portrait, and names anyone might have get either.

`ops.html` only redirects to `index.html`, for old links.

## Archive

The original hex-battle version (browser build and Java server build) is archived in `OLD_HEX/` with its own README. Nothing in the live game depends on it.
