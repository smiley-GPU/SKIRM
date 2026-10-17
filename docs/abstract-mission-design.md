# Abstract mission resolution: design note

The hex isometric tactical layer is saved as tag `hex-v1` and branch `hex-isometric`, and is still playable at `index.html`. This note explores ways to resolve a mission more abstractly while keeping meaningful player choices. The chosen prototype is playable at `ops.html`.

## Why look for an alternative

The hex battle is where most of the game's cost sits: map generation, pathing, line of sight, AI and rendering. It is also where a mission takes 20–40 minutes. The briefing (intel, team, gear, transport) and the debrief (wounds, promotions, gear) are the parts that make the campaign feel like *commanding*. An abstract layer should:

1. Keep every briefing choice relevant: intel, class mix, each gear slot, insertion and extraction vehicles, time of day.
2. Give the player a real decision every 20–60 seconds, with visible odds and costs (no hidden die rolls).
3. Produce the same outputs the debrief needs: wounds, KIA/MIA, kills, objectives, consumed and lost gear.
4. Play in about 5 minutes on a phone.

## Options considered

| | A. Operation board (chosen) | B. Zone map | C. Plan and execute |
|---|---|---|---|
| Shape | A route of 5–6 stages (approach, perimeter, objective, optional target, exfil). Each stage is a situation card with 2–3 approaches. | 5–8 abstract zones. Move fireteams between zones, and contacts resolve as abstract firefights. | Assign operators to plan phases before the mission, then watch it resolve with 2–3 "commander's call" interrupts. |
| Choices | Route fork, approach (skill), who leads, who supports, gear spend, push or not, which cost to pay | Movement, split or concentrate, flanking | Mostly up front, few during |
| Briefing link | Strong: intel reveals cards, class = dice, gear = dice/consumables, vehicle = exfil modifiers | Medium | Strong |
| Cost to build | Low | Medium (still spatial: AI, pathing) | Low, but hard to make interesting |
| Risk | Can feel like a slot machine if odds are opaque | Becomes a lite version of the hex game | Low agency, "watching a spreadsheet" |

**Recommendation: A.** It gives the most decisions per minute at the lowest cost, and it is the easiest to test and tune with numbers. B is worth revisiting if playtests show that players miss space and positioning.

## Rules of the prototype (`ops.html`)

- **Two clocks.** *Time* (8, plus 2 for a helicopter or 1 for a convoy) is spent by every action. When it runs out, the extraction window closes and everyone left escapes on foot. *Alert* (0–6): at 3 the enemy is awake, which makes Stealth and Assault +1 harder and adds an extra return-fire die. At 6 a QRF forces you straight to exfil.
- **Stage resolution.** Pick an approach (Assault, Stealth, Recon, Tech) and form a fireteam: a **lead**, who rolls their full skill dice and takes the first hit, and up to 2 **supporters**, who add 1 die each. Spend gear: a frag adds +2 Assault dice, a breaching charge adds +2 Tech or Assault dice but is loud, and the drone strike adds +2. Roll d6; each 5 or 6 is a success.
  - Meet the difficulty and you succeed.
  - Fall one short and you still succeed, but at a cost you choose: +1 alert, −1 time, or the lead takes a hit.
  - Otherwise the attempt fails: you're spotted, take return fire and spend time, and can try again.
  - **Push** re-rolls the misses once, at +1 alert.
- **Odds are always shown**, itemised for both the dice pool and the difficulty, like an XCOM hit-chance breakdown.
- **Stealth noise.** Each non-Scout beyond 2 in a Stealth test adds +1 difficulty. So does carrying a downed operator.
- **Classes.** Each class has dice per skill:
  - Heavy: Assault 3, Stealth 1, Recon 1, Tech 2
  - Scout: Assault 2, Stealth 3, Recon 3, Tech 1, and never counts toward noise
  - Medic: Assault 2, Stealth 2, Recon 1, Tech 1, and can revive once per stage
  - Drone Operator: Assault 1, Stealth 2, Recon 3, Tech 3, and has the drone (reveals 2 stages, +1 Recon die, one strike, can be shot down)

  Rank adds +1 die at CPL and +2 at SSG. Weapons and armour modify dice: LMG Assault +1 and Stealth −1, Plate Stealth −1 (but less damage taken), and so on.
- **Intel.** Satellite reveals what the entry points and targets are, and how each route affects the perimeter. Deep Intel reveals enemy numbers and reinforcement timing, and makes objective tests 1 easier.
- **Environment.** Day makes Stealth +1 harder. Night, rain and fog make Stealth easier and Recon harder.
- **Injuries (no HP).** The player only sees named injuries and what they do ("Broken finger: Assault −1, Tech −1"); penalties apply to an operator's dice when they lead. Behind the screen each hit rolls 2d6 + modifiers − armour for a hidden tier: minor (cut hand, bruised knee; 3 allowed, Heavy 4), serious (broken finger, cracked ribs; 1 allowed), critical (broken arm, concussion, heavy bleeding; 1 allowed, can't lead, passes out after 2 stages untreated) or knocked out. A hit on a full tier escalates to the next; the unconscious die after 2 stages unless treated. A medkit fixes the worst problem (wakes, splints, straps or cleans up cuts); a medic gives free field care once per stage for the unconscious and critical, and with a kit also clears every minor injury. Debrief: minor injuries heal, serious = 1 mission out, critical = 2, knocked out = 3. Tuning lives in `INJURIES`, `SERIOUS_AT`/`CRITICAL_AT`/`LETHAL_AT`, `CRIT_STAGES` and `RECOVERY`. Promotions, gear and recruiting are the same as in the hex game.

## Interludes and personalities

Every operator has one of 20 personalities (stoic professional, joker, fatalist, rookie, gearhead, glory hound, guardian, superstitious, mercenary, planner, lone wolf, adrenaline junkie, homesick, philosopher, avenger, perfectionist, optimist, old hand, true believer, quiet one). A personality only decides which topics an operator favours (weighted 4x) and how they phrase them; there are no passive bonuses.

- **Before the mission** (after launch, before the insertion report) each operator says one line about a topic that fits this mission: their gear, a threat on the route, the intel (or the lack of it), the conditions, a teammate, the objective, fate, or the way out. The player sees only the topic as a hint and keeps one statement. That becomes a one-mission omen: a gun proves itself (+2 dice once), a teammate pact (+1 die together), conditions read right (first matching test 1 easier), fate ("not today": shrug off one bad hit), and so on. A **feared adversary** adds +1 difficulty where it appears (the HVT instead gets back up once: "not dead yet"); beating it gives everyone involved +15 XP and spoils.
- **After the mission** (after the extraction report, before the debrief) each survivor reflects on something that actually happened to them: a remarkable kill, an explosion, helping or being helped by a teammate, a fallen friend, a weapon that performed, coming back from unconscious, a ghost run, the feared adversary. The kept statement becomes permanent: a trait (Deadeye, Demolitions, Grit, Survivor, Shadow; max 3), a bond (+1 die when both are in the fireteam; max 2, and it turns into Grit if the partner dies) or a signature weapon (+1 die when leading with it). Operators with nothing remarkable reflect generally (+10 XP to everyone if kept).
- Lines are templates in `LINES` (personality × topic, 380 lines), filled with mission details (weapon, threat, teammate, vehicle, weather). Effects live in `applyOmen` / `applyLasting` and the dice and difficulty breakdowns.

## Bot soak test (120 missions, bot always takes the best odds)

- Missions won: 105 of 120 (88%).
- Operators lost: 20.
- Tests: 75% clean success, 13% at a cost, 12% fail.
- Approach use: Stealth 119, Tech 121, Assault 111, Recon 100.
- QRF in 40 of 120 missions; drones shot down in 35 of 110 launches.
- No errors. A further 3 missions were played only by clicking the rendered buttons.

It is still forgiving for a perfect-odds player. The tuning knobs are `BASE_TIME`, approach `diff` values, `MAX_SUPPORT`, return-fire thresholds and hit damage, all of which live in data tables at the top of the file.

## Questions for playtest

1. Does choosing the lead feel like a decision, or does everyone just pick the highest dice?
2. Do players ever choose Stealth in daylight?
3. Is "success at a cost" with a choice of three costs fun, or a chore? (An alternative is a random complication card.)
4. Is 5–6 stages per mission the right length?
5. Hybrid idea: use the ops board for most missions and drop into the hex layer only for the objective stage.
