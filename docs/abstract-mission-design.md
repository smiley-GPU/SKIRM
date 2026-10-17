# Abstract mission resolution: design note

The original hex isometric tactical layer is archived in `OLD_HEX/` (also tag `hex-v1` and branch `hex-isometric`). This note explores ways to resolve a mission more abstractly while keeping meaningful player choices. The chosen design is now the whole game, in `index.html`.

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

## Rules of the ops board (`index.html`)

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
- **Injuries (no HP).** The player only sees named injuries and what they do ("Broken finger: Assault −1, Tech −1"); penalties apply to an operator's dice when they lead. Behind the screen each hit rolls 2d6 + modifiers − armour for a hidden tier: minor (cut hand, bruised knee; 3 allowed, Heavy 4), serious (broken finger, cracked ribs; 1 allowed), critical (broken arm, concussion, heavy bleeding; 1 allowed, can't lead, passes out after 2 stages untreated) or knocked out. A hit on a full tier escalates to the next; the unconscious die after 2 stages unless treated. A medkit fixes the worst problem (wakes, splints, straps or cleans up cuts); a medic gives free field care once per stage for the unconscious and critical, and with a kit also clears every minor injury. Debrief: minor injuries heal, serious = 1 mission out, critical = 2, knocked out = 3. Tuning lives in `INJURIES`, `SERIOUS_AT`/`CRITICAL_AT`/`LETHAL_AT`, `CRIT_STAGES` and `RECOVERY`. Promotions, gear and recruiting work as in the original version.

## Interludes and personalities

Every operator has one of 20 personalities (stoic professional, joker, fatalist, rookie, gearhead, glory hound, guardian, superstitious, mercenary, planner, lone wolf, adrenaline junkie, homesick, philosopher, avenger, perfectionist, optimist, old hand, true believer, quiet one). A personality only decides which topics an operator favours (weighted 4x) and how they phrase them; there are no passive bonuses.

- **Before the mission** (after launch, before the insertion report) each operator says one line about a topic that fits this mission: their gear, a threat on the route, the intel (or the lack of it), the conditions, a teammate, the objective, fate, or the way out. The player sees only the topic as a hint and keeps one statement. That becomes a one-mission omen: a gun proves itself (+2 dice once), a teammate pact (+1 die together), conditions read right (first matching test 1 easier), fate ("not today": shrug off one bad hit), and so on. A **feared adversary** adds +1 difficulty where it appears (the HVT instead gets back up once: "not dead yet"); beating it gives everyone involved +15 XP and spoils.
- **After the mission** (after the extraction report, before the debrief) each survivor reflects on something that actually happened to them: a remarkable kill, an explosion, helping or being helped by a teammate, a fallen friend, a weapon that performed, coming back from unconscious, a ghost run, the feared adversary. The kept statement becomes permanent: a trait (Deadeye, Demolitions, Grit, Survivor, Shadow; max 3), a bond (+1 die when both are in the fireteam; max 2, and it turns into Grit if the partner dies) or a signature weapon (+1 die when leading with it). Operators with nothing remarkable reflect generally (+10 XP to everyone if kept).
- Lines are templates in `LINES` (personality × topic, 380 lines), filled with mission details (weapon, threat, teammate, vehicle, weather). Effects live in `applyOmen` / `applyLasting` and the dice and difficulty breakdowns.

## Base, world and operators

- **Base mode.** Between missions the team is at base. The mission board offers 2–3 operations in different locations. Six departments, each with three levels bought with Base Points (BP, earned per mission: 3 for success, more for the secondary, an officer kill, a beaten nemesis or a warlord): Operations, Intelligence, Medical, Engineering, Logistics and Barracks. Requisition (RP) still pays for intel, transport, recruits, treatment, fabrication and repairs. Design intent: BP is the long arc (what kind of unit you build), RP the short one (what this mission costs).
- **Enemies.** Each mission has a faction that moves the return-fire threshold (militia +1, contractors −1) and sets what kills can yield. An officer (more likely later in the campaign) holds one stage with a trait: Sharpshooter (return fire hits more often), Tactician (+1 difficulty), Brute (hits there are more serious) or Commander (failures raise more alert). Taking their position with an approach that kills settles their fate (weights in `OFFICER_FATES`, nudged by trait): killed (their item comes home), killed by their own grenade (their item and one piece of a committed operator's kit or armour are wrecked), escaped (to a later stage of the same operation, 1 harder there; or, with no stage left, out of the mission into `G.nemeses`, to resurface promoted on a later offer, +1 BP and an extra item when finally dealt with; at most 2 escapes), or captured (Stealth +1 harder while escorting them; at base they reveal the enemy force on every offer, and after 2 missions can be handed over for 4 RP and 1 BP or recruited as a corporal whose class and specialty follow their trait). A feared officer gets back up once instead and then never runs or surrenders. Sneaking past leaves them alive. The HVT is a Financier (−1 difficulty, fewer guards), a Bomb-maker, or a Warlord: the real enemy, +1 difficulty, more guards, gets back up once, more reward. Signals intercept reveals the officer; an informant names the faction and the target.
- **Weather.** Seven location types (farmland, highlands, coast, river delta, desert, forest, town) each weight their weather, encounters and routes. Nine weather states include the climate hazards: heat wave and wildfire smoke tire the team every stage; storms and dust ground helicopters; flash floods block road vehicles; mudslides slow them. The forecast is right with the Intelligence level's reliability (60/75/90%); otherwise the real weather is one of its neighbours. 35% of operations see the weather turn at a later stage, which can strand an extraction ride. Weather recon makes the forecast, and any turn, certain.
- **Vehicles.** On foot, convoy and helicopter, then light strike vehicle and boat (Logistics 2; boats only where there is water), then HALO jump (insertion only) and MRAP (Logistics 3; IEDs damage the truck, not the team). IEDs, rough ground and hot extractions can damage vehicles, which then need repairs at base.
- **Specialties and gear.** Dice come from class, rank and gear: weapon, armour and a new kit slot (suppressor, optic, breacher toolkit, ghillie suit, thermal sight). Every operator also carries a permanent handgun (`HANDGUN`, never in the armory or lost), so the primary weapon is optional: a handgun-only lead takes `HANDGUN_PENALTY` (−1) on Assault, except in close quarters (Assault at the objective or optional site, or an option marked `close`: silencing the dogs, the stairwell, the pier) or as a CQB specialist. Specialties and earned traits never add dice. They open approaches that only a specialist can lead (a sniper pair at the sentry post, a free climb, a swim under the boom, talking through a checkpoint) or bend a rule (no Stealth noise, no return fire on a CQB objective, the first alarm jammed, tiring later).
- **Fatigue.** 0–6 per operator. +1 for leading a test, +1 to everyone committed when it fails, +1 for long approach routes, walking in, heat or smoke each stage, and carrying the wounded. Tired (3+) leads roll 1 die fewer, Exhausted (5+) 2. Resting costs 1 time and takes 2 fatigue off everyone. Fatigue carries over between missions (−3 when the team gets home, more for those who stayed); a treatment bed clears it.

### Soak test after these changes (30 campaigns × 5 missions, bot plays the base too)

- Missions won: 124 of 150. KIA 1, MIA 17 (mostly from running out of time; base time went from 8 to 9 to pay for fatigue and rests).
- Officers met in 72 missions and killed in 18; specialist approaches used 122 times; weather turned in 42 operations and grounded a ride in 17.
- BP earned: 568 (about 3.8 per mission). The bot bought 99 department upgrades.
- No errors over 150 missions and about 3,000 screen renders.

## Original bot soak test (120 missions, before injuries, interludes and the base)

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
