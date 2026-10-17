# SKIRM: archived hex version

This folder archives the original hex-battle version of SKIRM. It is no longer developed; the live game is the ops board in the repository root (`../index.html`). The same code is also kept as tag `hex-v1` and branch `hex-isometric`.

The full loop: **Briefing → Insertion → Tactical (turn-based isometric hex) → Extraction → Debrief → next Briefing**

There are two builds:
- **Browser build** (`index.html`): the rules engine and AI ported to JavaScript in one file. It needs no server and saves in browser storage (key `skirm-save-v2`). On GitHub Pages it is at https://smiley-gpu.github.io/SKIRM/OLD_HEX/.
- **Java build** (`src/`, `web/`, `run.ps1`, `run.sh`): the server owns the game and the browser only displays it. Run the scripts from this folder.

In the Java version below, the server owns the game and the browser only displays it.

## Run

Needs JDK 17+ only. There are no other dependencies and no build tool.

```powershell
.\run.ps1                # http://localhost:8080
.\run.ps1 -Seed 42       # reproducible campaign
.\run.ps1 -Test          # headless smoke test (bot plays 120 missions)
```
```sh
./run.sh  |  ./run.sh --seed 42  |  ./run.sh test
```
`pom.xml` is there only so IDEs can import the project.

## What's in the proof

| Stage | Implemented |
|---|---|
| **Briefing** | Generated operation: codename, area, time and weather (affect vision and accuracy), primary and secondary objectives, a vague threat estimate. Buy **Satellite** imagery (reveals terrain) and **Deep intel** (enemy count, positions, reinforcement timing). Pick a team of up to 4, weapon, armor and utility per operator from a limited **armory**, and insertion/extraction transport (helicopter / convoy / on foot), all paid from **requisition points**. |
| **Insertion** | Dice-driven complications by vehicle, scaled by darkness: hot LZ (alerted), hard landing or IED (injury), roadblock or bad terrain (fewer turns). |
| **Tactical** | Procedural 18×12 hex map: a walled compound, cover, brush, water and ruins, with a connectivity check. 4 AP per operator. Movement over terrain costs, line of sight, fog of war with last-seen markers, cover and concealment, itemised hit chances, frag grenades with friendly fire, medkits, an intel pickup that drops if its carrier dies. Stealth: enemies start unaware, and a silent kill on an unaware target doesn't raise the alarm. Enemy AI has two states (patrol, or engage by scoring positions). Reinforcements, and a turn limit tied to the extraction window. |
| **Extraction** | Hot extraction if alerted hostiles are near the zone. Operators left behind try to get out on foot, and some become MIA. |
| **Debrief** | Wounds (light, or heavy = sits out the next mission), KIA/MIA, XP leading to **promotions** (+accuracy), gear lost (dead operators' kit, used consumables), gear gained (captured weapons, caches), requisition reward, replacement recruits. |

## Architecture

```
src/main/java/skirm/
  core/      Hex (axial coords, distance, lines), Rng (seeded), Json, RuleException
  model/     Data and balance tables: Item, Terrain, Vehicle, Environment, Rank, Soldier, Armory, TacticalMap
  mission/   MissionGenerator, MapGenerator, Transit (insertion/extraction), Debrief
  tactical/  Battle (rules), Pathing (Dijkstra), Combat (hit math), EnemyAi, Unit, BattleEvent
  game/      Game (phase state machine facade), Campaign, StateView (view model + fog boundary)
  server/    GameServer (JDK HttpServer: JSON commands + static files)
web/
  index.html, style.css
  js/render.js   isometric hex renderer (pure view: scene in, pixels out)
  js/app.js      phase screens, input → commands, event playback
```

Main design decisions:

- **The server is authoritative.** The client sends *intents* (`MOVE unit→hex`, `SHOOT unit→target`). Every rule check lives in `Battle`, and a command is fully validated before anything changes.
- **Fog of war is enforced on the server.** `StateView` is the only place that serialises game state, and it never sends hidden enemies or unexplored terrain. Events are filtered when they are created. For example, a shot from an unseen enemy arrives without a `from` position. The smoke test checks that nothing leaks.
- **Deterministic.** All randomness comes from seeded `Rng` instances (campaign → mission → battle). The same seed plus the same commands gives the same game, which makes replays, bug reports and future multiplayer lockstep easy.
- **Results come back as events.** Each command returns a snapshot plus the events it caused. The client animates the events (paths, tracers, damage numbers) and renders the snapshot. Animation timing never affects game logic.
- **The client precomputes nothing.** The server sends each operator's reachable hexes (with path parents), valid targets with hit chance and modifier breakdown, and the available actions. The UI can't drift from the rules.
- **Balance lives in enums.** Weapons, armor, vehicles, intel and ranks are each one table, so tuning means editing one file.
- **Generated content is checked.** Maps are rejected and regenerated unless the insertion zone, objective and every extraction zone are connected.
- **The tests play the game.** `SmokeTest` plays 40 seeded campaigns × 3 missions through the public `Game` API. It checks invariants (no shared hexes, HP and AP bounds, units only on passable tiles), round-trips every snapshot through JSON, and checks that illegal commands are rejected.

### HTTP API
`GET /api/state` · `POST /api/campaign/new` · `POST /api/briefing/intel {intel}` ·
`POST /api/briefing/launch {team, loadouts, insertion, extraction}` · `POST /api/continue` ·
`POST /api/battle/action {unit, type, q?, r?, target?}` · `POST /api/battle/end-turn` · `POST /api/battle/abort`
Every call responds with `{phase, campaign, catalog, mission, battle|report|debrief, events}`. A rule violation returns `400 {error}`.

## Controls (tactical)
Click an operator to select it. Click a highlighted hex to move (hover shows path and AP). Click a dashed-ring hostile to fire (hover shows hit % and modifiers).
`Tab` cycles operators · `G` grenade · `H` medkit · `I` secure intel · `X` exfiltrate · `E` end turn · `Esc` or right-click cancels.

## Deliberately out of scope (next steps)
1. **Persistence**: the campaign lives in memory, one session per server. Next: save the campaign as JSON plus a command log for replays.
2. **Reaction fire / overwatch**, suppression, crouch and prone, elevation, destructible cover.
3. **A richer AI**: flanking, squad coordination, retreat, the HVT fleeing, and no "radio cheat" (alerted enemies currently know all player positions).
4. **Content**: more objective types, map templates, events (civilians, weather changing mid-mission), traits and skills on promotion.
5. **Rendering**: sprites instead of primitives, camera pan and zoom for bigger maps, a cutaway view for walls in front of units.
6. **Tests**: move SmokeTest to JUnit, add golden-seed regression tests (seed + commands → expected log hash).
