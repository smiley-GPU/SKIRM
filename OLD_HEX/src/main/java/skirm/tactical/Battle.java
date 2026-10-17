package skirm.tactical;

import skirm.core.Hex;
import skirm.core.Rng;
import skirm.core.RuleException;
import skirm.mission.Mission;
import skirm.model.Intel;
import skirm.model.Item;
import skirm.model.Loadout;
import skirm.model.ObjectiveType;
import skirm.model.Soldier;
import skirm.model.TacticalMap;
import skirm.model.Terrain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static skirm.tactical.Unit.Side.ENEMY;
import static skirm.tactical.Unit.Side.PLAYER;

/**
 * Authoritative turn-based tactical simulation. All rule checks live here; callers (HTTP layer,
 * AI, tests) issue commands and receive the fog-filtered events those commands produced.
 */
public final class Battle {
    public static final int BASE_TURNS = 12;
    public static final int GRENADE_RANGE = 5;
    public static final int GRENADE_AP = 2;
    public static final int MEDKIT_AP = 2;
    public static final int MEDKIT_HEAL = 5;

    public final Mission mission;
    public final TacticalMap map;
    public final Set<Hex> extractionZone;
    private final Rng rng;
    private final List<Unit> units = new ArrayList<>();
    private int nextId = 1;

    private int turn = 1;
    private int turnLimit;
    private boolean alerted;
    private boolean over;
    private boolean hvtKilled;
    private Integer intelCarrier;
    /** Where the intel physically lies while nobody carries it; null once carried or if absent. */
    private Hex intelHex;

    private final Set<Hex> explored = new HashSet<>();
    private Set<Hex> visible = Set.of();
    private final Map<Integer, Hex> lastSeen = new LinkedHashMap<>();
    private final List<BattleEvent> log = new ArrayList<>();
    private List<BattleEvent> pending = new ArrayList<>();

    public Battle(Mission m, List<Soldier> squad, Map<Integer, Loadout> loadouts, Rng rng) {
        this.mission = m;
        this.map = m.map;
        this.rng = rng;
        this.extractionZone = m.map.extractionZones.get(m.extraction);
        this.turnLimit = BASE_TURNS + m.insertion.turnBonus;
        this.intelHex = m.hasObjective(ObjectiveType.RETRIEVE_INTEL) ? m.map.objective : null;

        List<Hex> lz = new ArrayList<>(m.map.insertionZone);
        for (int i = 0; i < squad.size(); i++) {
            Soldier s = squad.get(i);
            units.add(Unit.operator(nextId++, s, loadouts.get(s.id), lz.get(i)));
        }
        for (Mission.EnemySpawn sp : m.spawns) units.add(Unit.hostile(nextId++, sp));

        if (m.intel.contains(Intel.SATELLITE)) explored.addAll(map.hexes());
        if (m.intel.contains(Intel.HUMINT))
            for (Unit u : units) if (u.side == ENEMY) lastSeen.put(u.id, u.hex);
        recomputeVisibility();
        emit(BattleEvent.turn("Turn 1. Team on the ground."));
    }

    // ---------------------------------------------------------------- commands

    public List<BattleEvent> perform(int unitId, ActionType type, Hex hex, Integer targetId) {
        requireActive();
        Unit u = unit(unitId);
        if (u == null || u.side != PLAYER || !u.onMap()) throw new RuleException("No such operator on the map.");
        pending = new ArrayList<>();
        switch (type) {
            case MOVE -> move(u, hex);
            case SHOOT -> {
                Unit t = unit(targetId);
                if (t == null || !canShoot(u, t)) throw new RuleException("Cannot engage that target.");
                resolveShot(u, t);
            }
            case GRENADE -> {
                if (!canGrenade(u, hex)) throw new RuleException("Cannot throw there.");
                grenade(u, hex);
            }
            case MEDKIT -> {
                Unit t = unit(targetId);
                if (t == null || !canHeal(u, t)) throw new RuleException("Cannot treat that operator.");
                heal(u, t);
            }
            case INTEL -> {
                if (!canSecureIntel(u)) throw new RuleException("No intel to secure here.");
                u.ap -= 1;
                intelCarrier = u.id;
                intelHex = null;
                emit(BattleEvent.mark("intel", u.id, u.hex, u.name + " secured the intel. Get it out!"));
            }
            case EXFIL -> {
                if (!canExfil(u)) throw new RuleException("Must be inside the extraction zone with 1 AP.");
                u.ap -= 1;
                u.exfiltrated = true;
                emit(BattleEvent.mark("exfil", u.id, u.hex, u.name + " boarded extraction."));
            }
        }
        recomputeVisibility();
        checkOver();
        return flush();
    }

    public List<BattleEvent> endTurn() {
        requireActive();
        pending = new ArrayList<>();
        EnemyAi.takeTurn(this);
        if (turn == mission.reinforceTurn) spawnReinforcements();
        turn++;
        if (turn > turnLimit) {
            emit(BattleEvent.alert("Extraction window closed. Anyone left must get out on foot."));
            strandRemaining();
        } else {
            for (Unit u : units) if (u.side == PLAYER) u.ap = u.maxAp();
            emit(BattleEvent.turn("Turn " + turn + " of " + turnLimit + (turn == turnLimit ? ". FINAL TURN, extract now!" : ".")));
        }
        recomputeVisibility();
        checkOver();
        return flush();
    }

    public List<BattleEvent> abort() {
        requireActive();
        pending = new ArrayList<>();
        emit(BattleEvent.alert("Mission aborted. Remaining operators break contact on foot."));
        strandRemaining();
        return flush();
    }

    // ---------------------------------------------------------------- rule queries (also used by the view)

    public boolean canShoot(Unit s, Unit t) {
        if (t.side == s.side || !t.onMap() || s.ap < s.gun().apCost()) return false;
        if (s.side == PLAYER && !visible.contains(t.hex)) return false;
        return s.hex.distance(t.hex) <= s.gun().range() && map.hasLineOfSight(s.hex, t.hex);
    }

    public boolean canGrenade(Unit u, Hex h) {
        return u.utility == Item.FRAG && u.ap >= GRENADE_AP && h != null && map.contains(h)
                && map.at(h) != Terrain.WALL && u.hex.distance(h) <= GRENADE_RANGE && map.hasLineOfSight(u.hex, h);
    }

    public boolean canHeal(Unit u, Unit t) {
        return u.utility == Item.MEDKIT && u.ap >= MEDKIT_AP && t.side == u.side && t.onMap()
                && t.hp < t.maxHp && u.hex.distance(t.hex) <= 1;
    }

    public boolean canSecureIntel(Unit u) { return intelHex != null && u.hex.equals(intelHex) && u.ap >= 1; }

    public boolean canExfil(Unit u) { return extractionZone.contains(u.hex) && u.ap >= 1; }

    // ---------------------------------------------------------------- resolution

    private void move(Unit u, Hex dest) {
        Pathing.Reach reach = Pathing.reach(this, u, u.ap);
        if (!reach.canReach(dest)) throw new RuleException("Destination out of reach.");
        Set<Integer> known = visibleEnemyIds();
        List<Hex> walked = new ArrayList<>(List.of(u.hex));
        Unit spotter = null;
        String halt = null;
        for (Hex step : reach.pathTo(dest)) {
            u.ap -= map.at(step).moveCost;
            u.hex = step;
            walked.add(step);
            recomputeVisibility();
            if (!alerted) spotter = firstEnemySeeing(u.hex);
            Set<Integer> fresh = visibleEnemyIds();
            fresh.removeAll(known);
            if (!fresh.isEmpty()) halt = "Contact! " + u.name + " halts: " + fresh.size() + " hostile(s) sighted.";
            if (spotter != null || halt != null) break;
        }
        emit(BattleEvent.move(u.id, walked, null));
        if (spotter != null)
            alert(u.name + " was spotted by " + (visible.contains(spotter.hex) ? spotter.name : "an unseen sentry") + "!");
        if (halt != null) emit(BattleEvent.info(halt));
    }

    /** Shared by player and AI. Assumes legality was checked. */
    void resolveShot(Unit s, Unit t) {
        Combat.HitChance hc = Combat.hitChance(this, s, s.hex, t);
        boolean ambush = t.side == ENEMY && !alerted;
        s.ap -= s.gun().apCost();
        boolean hit = rng.d100() < hc.chance();
        int dmg = hit ? Combat.damage(rng, s.gun(), t.damageReduction(), ambush) : 0;
        if (hit) t.hp = Math.max(0, t.hp - dmg);

        boolean shooterSeen = s.side == PLAYER || visible.contains(s.hex);
        String text = shooterSeen
                ? s.name + " fires at " + t.name + " (" + hc.chance() + "%): " + (hit ? "HIT for " + dmg : "miss")
                : t.name + " takes fire from an unseen position: " + (hit ? "HIT for " + dmg : "miss");
        emit(BattleEvent.shot(t.id, shooterSeen ? s.hex : null, t.hex, hit, dmg, text));
        if (!t.alive()) onKilled(s, t);

        if (!alerted) {
            boolean silent = s.side == PLAYER && !t.alive() && units.stream().noneMatch(
                    o -> o.side == ENEMY && o.onMap() && (enemySees(o.hex, s.hex) || enemySees(o.hex, t.hex)));
            if (silent) emit(BattleEvent.info("Silent takedown. Nobody noticed."));
            else alert("Gunfire! The area is alerted.");
        }
    }

    private void grenade(Unit u, Hex at) {
        u.ap -= GRENADE_AP;
        u.consumedUtility = u.utility;
        u.utility = null;
        emit(BattleEvent.grenade(u.id, u.hex, at, u.name + " throws a frag grenade."));
        for (Unit v : new ArrayList<>(units)) {
            if (!v.onMap() || v.hex.distance(at) > 1) continue;
            int dmg = Math.max(1, rng.range(3, 5) - v.damageReduction());
            v.hp = Math.max(0, v.hp - dmg);
            if (v.side == PLAYER || visible.contains(v.hex))
                emit(BattleEvent.damage(v.id, v.hex, dmg, v.name + " caught in the blast (-" + dmg + ")."));
            if (!v.alive()) onKilled(u, v);
        }
        alert("Explosion! The area is alerted.");
    }

    private void heal(Unit u, Unit t) {
        int amount = Math.min(MEDKIT_HEAL, t.maxHp - t.hp);
        u.ap -= MEDKIT_AP;
        u.consumedUtility = u.utility;
        u.utility = null;
        t.hp += amount;
        emit(BattleEvent.heal(t.id, t.hex, amount, u.name + " treats " + (t == u ? "own wounds" : t.name) + " (+" + amount + ")."));
    }

    private void onKilled(Unit killer, Unit victim) {
        if (killer.side != victim.side) killer.kills++;
        if (victim.hvt) {
            hvtKilled = true;
            killer.killedHvt = true;
        }
        lastSeen.remove(victim.id);
        boolean seen = victim.side == PLAYER || visible.contains(victim.hex);
        if (seen) emit(BattleEvent.kill(victim.id, victim.hex, victim.side == PLAYER ? victim.name + " is KIA." : victim.name + " is down."));
        if (Integer.valueOf(victim.id).equals(intelCarrier)) {
            intelCarrier = null;
            intelHex = victim.hex;
            emit(BattleEvent.info("The intel was dropped with " + victim.name + "."));
        }
    }

    void alert(String reason) {
        if (alerted) return;
        alerted = true;
        emit(BattleEvent.alert(reason));
    }

    /** Insertion complications. */
    public void raiseAlarm(String reason) { alert(reason); }

    public void delay(int turns) { turnLimit = Math.max(turn + 2, turnLimit - turns); }

    public void injure(Unit u, int dmg) { u.hp = Math.max(1, u.hp - dmg); }

    void moveEnemy(Unit e, List<Hex> path) {
        boolean wasVisible = visible.contains(e.hex);
        List<Hex> seen = new ArrayList<>();
        if (wasVisible) seen.add(e.hex);
        for (Hex h : path) {
            e.ap -= map.at(h).moveCost;
            e.hex = h;
            if (visible.contains(h)) seen.add(h);
        }
        if (seen.isEmpty()) return;
        boolean nowVisible = visible.contains(e.hex);
        if (nowVisible) lastSeen.put(e.id, e.hex);
        emit(BattleEvent.move(e.id, seen, nowVisible && !wasVisible ? "Movement: " + e.name + " sighted." : null));
    }

    private void spawnReinforcements() {
        List<Hex> edge = new ArrayList<>();
        for (int r = 0; r < map.rows; r++) {
            Hex h = Hex.fromOffset(map.cols - 1, r);
            if (map.passable(h) && occupant(h) == null) edge.add(h);
        }
        int n = Math.min(mission.reinforceCount, edge.size());
        for (int i = 0; i < n; i++) {
            Hex h = edge.remove(rng.index(edge.size()));
            units.add(Unit.hostile(nextId++, new Mission.EnemySpawn(h, Item.AK, false)));
        }
        if (n > 0) emit(BattleEvent.alert("Engines to the east: enemy reinforcements have arrived."));
    }

    private void strandRemaining() {
        for (Unit u : units) if (u.side == PLAYER && u.onMap()) u.stranded = true;
        over = true;
    }

    private void checkOver() {
        if (units.stream().noneMatch(u -> u.side == PLAYER && u.onMap())) over = true;
    }

    // ---------------------------------------------------------------- perception

    private void recomputeVisibility() {
        int range = mission.env.visionRange();
        Set<Hex> vis = new HashSet<>();
        for (Unit u : units) {
            if (u.side != PLAYER || !u.onMap()) continue;
            for (Hex h : map.hexes())
                if (u.hex.distance(h) <= range && map.hasLineOfSight(u.hex, h)) vis.add(h);
        }
        visible = vis;
        explored.addAll(vis);
        for (Unit e : units) {
            if (e.side != ENEMY) continue;
            if (!e.onMap()) lastSeen.remove(e.id);
            else if (vis.contains(e.hex)) lastSeen.put(e.id, e.hex);
        }
    }

    int enemyVision() { return Math.max(2, mission.env.visionRange() - (alerted ? 0 : 2)); }

    boolean enemySees(Hex from, Hex to) { return from.distance(to) <= enemyVision() && map.hasLineOfSight(from, to); }

    private Unit firstEnemySeeing(Hex h) {
        for (Unit e : units) if (e.side == ENEMY && e.onMap() && enemySees(e.hex, h)) return e;
        return null;
    }

    private Set<Integer> visibleEnemyIds() {
        Set<Integer> ids = new HashSet<>();
        for (Unit e : units) if (e.side == ENEMY && e.onMap() && visible.contains(e.hex)) ids.add(e.id);
        return ids;
    }

    // ---------------------------------------------------------------- plumbing

    void emit(BattleEvent e) {
        pending.add(e);
        log.add(e);
    }

    private List<BattleEvent> flush() {
        List<BattleEvent> out = pending;
        pending = new ArrayList<>();
        return out;
    }

    private void requireActive() {
        if (over) throw new RuleException("The battle is over.");
    }

    public Unit unit(Integer id) {
        if (id == null) return null;
        for (Unit u : units) if (u.id == id) return u;
        return null;
    }

    public Unit occupant(Hex h) {
        for (Unit u : units) if (u.onMap() && u.hex.equals(h)) return u;
        return null;
    }

    public List<Unit> units() { return Collections.unmodifiableList(units); }

    public List<Unit> squad() { return units.stream().filter(u -> u.side == PLAYER).toList(); }

    public Rng rng() { return rng; }

    public int turn() { return turn; }

    public int turnLimit() { return turnLimit; }

    public boolean alerted() { return alerted; }

    public boolean over() { return over; }

    public boolean hvtKilled() { return hvtKilled; }

    public Integer intelCarrier() { return intelCarrier; }

    public Hex intelHex() { return intelHex; }

    public Set<Hex> visible() { return Collections.unmodifiableSet(visible); }

    public Set<Hex> explored() { return Collections.unmodifiableSet(explored); }

    public Map<Integer, Hex> lastSeen() { return Collections.unmodifiableMap(lastSeen); }

    public List<BattleEvent> log() { return Collections.unmodifiableList(log); }
}
