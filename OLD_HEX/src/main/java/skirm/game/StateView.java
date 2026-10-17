package skirm.game;

import skirm.core.Hex;
import skirm.mission.Mission;
import skirm.model.Intel;
import skirm.model.Item;
import skirm.model.ObjectiveType;
import skirm.model.Soldier;
import skirm.model.TacticalMap;
import skirm.model.Vehicle;
import skirm.tactical.Battle;
import skirm.tactical.BattleEvent;
import skirm.tactical.Combat;
import skirm.tactical.Pathing;
import skirm.tactical.Unit;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static skirm.core.Json.obj;

/**
 * Builds the client view model. This is the fog-of-war boundary: nothing the player
 * should not know (hidden enemies, unexplored terrain) is ever serialised.
 */
final class StateView {
    private StateView() {}

    static Map<String, Object> snapshot(Game g, List<BattleEvent> events) {
        Map<String, Object> root = obj(
                "phase", g.phase(),
                "campaign", campaign(g.campaign()),
                "catalog", catalog(),
                "mission", mission(g.mission(), g.phase() == Phase.BRIEFING));
        switch (g.phase()) {
            case INSERTION -> root.put("report", obj("title", "Insertion", "lines", g.mission().insertionReport));
            case TACTICAL -> root.put("battle", battle(g.battle()));
            case EXTRACTION -> root.put("report", obj("title", "Extraction", "lines", g.mission().extractionReport));
            case DEBRIEF -> root.put("debrief", g.debrief());
            default -> { }
        }
        root.put("events", events);
        return root;
    }

    private static Map<String, Object> campaign(Campaign c) {
        List<Object> roster = new ArrayList<>();
        List<String> fallen = new ArrayList<>();
        for (Soldier s : c.roster) {
            if (!s.alive) {
                fallen.add(s.rank().name() + " " + s.name);
                continue;
            }
            roster.add(obj("id", s.id, "name", s.name, "rank", s.rank().name(), "rankLabel", s.rank().label,
                    "xp", s.xp, "nextXp", s.rank().nextXp(), "kills", s.kills, "missions", s.missions,
                    "hp", s.maxHp(), "available", s.available(), "recovery", s.recovery));
        }
        return obj("missionNumber", c.missionsFlown + 1, "requisition", c.requisition,
                "roster", roster, "fallen", fallen, "armory", c.armory.snapshot());
    }

    private static Map<String, Object> catalog() {
        List<Object> items = new ArrayList<>();
        for (Item i : Item.values()) {
            Map<String, Object> m = obj("id", i, "label", i.label, "slot", i.slot);
            if (i.weapon != null) {
                Item.WeaponStats w = i.weapon;
                m.put("summary", w.apCost() + " AP/shot, range " + w.range() + ", " + w.accuracy() + "% acc, " + w.dmgMin() + "-" + w.dmgMax() + " dmg");
            } else if (i.slot == Item.Slot.ARMOR) {
                m.put("summary", "-" + i.damageReduction + " dmg taken" + (i.apPenalty > 0 ? ", -" + i.apPenalty + " AP" : ""));
            } else {
                m.put("summary", i == Item.MEDKIT ? "Heal +" + Battle.MEDKIT_HEAL + " (self/adjacent), " + Battle.MEDKIT_AP + " AP"
                        : "3-5 dmg radius 1, range " + Battle.GRENADE_RANGE + ", " + Battle.GRENADE_AP + " AP, ignores cover");
            }
            items.add(m);
        }
        List<Object> vehicles = Arrays.stream(Vehicle.values())
                .map(v -> (Object) obj("id", v, "label", v.label, "cost", v.cost, "description", v.description)).toList();
        List<Object> intel = Arrays.stream(Intel.values())
                .map(i -> (Object) obj("id", i, "label", i.label, "cost", i.cost, "description", i.description)).toList();
        return obj("items", items, "vehicles", vehicles, "intel", intel, "maxTeam", Game.MAX_TEAM);
    }

    private static Map<String, Object> mission(Mission m, boolean briefing) {
        Map<String, Object> v = obj(
                "number", m.number, "codename", m.codename, "area", m.area,
                "environment", obj("time", m.env.time(), "weather", m.env.weather(), "vision", m.env.visionRange(),
                        "summary", m.env.summary()),
                "primary", obj("id", m.primary, "label", m.primary.label, "description", m.primary.description),
                "secondary", obj("id", m.secondary, "label", m.secondary.label, "description", m.secondary.description),
                "threat", m.threatEstimate(),
                "intel", m.intel,
                "insertion", m.insertion, "extraction", m.extraction);
        if (!briefing) return v;

        boolean sat = m.intel.contains(Intel.SATELLITE);
        v.put("map", obj("cols", m.map.cols, "rows", m.map.rows,
                "tiles", tiles(m.map, sat ? Set.copyOf(m.map.hexes()) : Set.of(), Set.copyOf(m.map.hexes())),
                "insertion", m.map.insertionZone, "extraction", m.map.extractionZones, "objective", m.map.objective));
        if (m.intel.contains(Intel.HUMINT)) {
            v.put("humint", obj(
                    "enemyCount", m.spawns.size(),
                    "enemies", m.spawns.stream().map(s -> (Object) obj("q", s.hex().q(), "r", s.hex().r(), "hvt", s.hvt(), "weapon", s.weapon().label)).toList(),
                    "reinforcements", m.reinforceTurn > 0
                            ? "Expect " + m.reinforceCount + " reinforcements from the east around turn " + m.reinforceTurn + "."
                            : "No reinforcements expected."));
        }
        return v;
    }

    private static List<Object> tiles(TacticalMap map, Set<Hex> known, Set<Hex> visible) {
        List<Object> out = new ArrayList<>(map.cols * map.rows);
        for (Hex h : map.hexes())
            out.add(obj("q", h.q(), "r", h.r(), "t", known.contains(h) ? map.at(h) : null, "v", visible.contains(h)));
        return out;
    }

    private static Map<String, Object> battle(Battle b) {
        List<Object> units = new ArrayList<>();
        for (Unit u : b.units()) {
            if (!u.onMap()) continue;
            if (u.side == Unit.Side.PLAYER) units.add(operator(b, u));
            else if (b.visible().contains(u.hex))
                units.add(obj("id", u.id, "side", u.side, "name", u.name, "q", u.hex.q(), "r", u.hex.r(),
                        "hp", u.hp, "maxHp", u.maxHp, "weapon", u.weapon.label, "hvt", u.hvt));
        }
        List<Object> ghosts = new ArrayList<>();
        for (Map.Entry<Integer, Hex> e : b.lastSeen().entrySet()) {
            Unit u = b.unit(e.getKey());
            if (u != null && u.onMap() && !b.visible().contains(u.hex))
                ghosts.add(obj("id", u.id, "q", e.getValue().q(), "r", e.getValue().r()));
        }
        List<BattleEvent> log = b.log();
        Unit carrier = b.unit(b.intelCarrier());
        return obj(
                "turn", b.turn(), "turnLimit", b.turnLimit(), "alerted", b.alerted(),
                "cols", b.map.cols, "rows", b.map.rows,
                "tiles", tiles(b.map, b.explored(), b.visible()),
                "insertion", b.map.insertionZone, "extraction", b.extractionZone,
                "intelHex", b.intelHex(), "intelCarrier", carrier == null ? null : carrier.name,
                "objectives", List.of(objective(b, b.mission.primary, true), objective(b, b.mission.secondary, false)),
                "units", units, "ghosts", ghosts,
                "log", log.subList(Math.max(0, log.size() - 60), log.size()));
    }

    private static Map<String, Object> operator(Battle b, Unit u) {
        Pathing.Reach reach = Pathing.reach(b, u, u.ap);
        List<Object> moves = new ArrayList<>();
        for (Map.Entry<Hex, Integer> e : reach.cost().entrySet()) {
            if (e.getKey().equals(u.hex)) continue;
            Hex p = reach.prev().get(e.getKey());
            moves.add(obj("q", e.getKey().q(), "r", e.getKey().r(), "c", e.getValue(), "pq", p.q(), "pr", p.r()));
        }
        List<Object> targets = new ArrayList<>();
        List<Object> heal = new ArrayList<>();
        for (Unit t : b.units()) {
            if (t.side == Unit.Side.ENEMY && b.canShoot(u, t)) {
                Combat.HitChance hc = Combat.hitChance(b, u, u.hex, t);
                targets.add(obj("id", t.id, "chance", hc.chance(), "mods", hc.mods()));
            }
            if (t.side == Unit.Side.PLAYER && b.canHeal(u, t)) heal.add(t.id);
        }
        return obj("id", u.id, "side", u.side, "name", u.name, "q", u.hex.q(), "r", u.hex.r(),
                "hp", u.hp, "maxHp", u.maxHp, "ap", u.ap, "maxAp", u.maxAp(),
                "weapon", u.weapon.label, "shotCost", u.gun().apCost(), "range", u.gun().range(),
                "armor", u.armor == null ? null : u.armor.label, "utility", u.utility,
                "moves", moves, "targets", targets, "heal", heal,
                "canGrenade", u.utility == Item.FRAG && u.ap >= Battle.GRENADE_AP, "grenadeRange", Battle.GRENADE_RANGE,
                "canIntel", b.canSecureIntel(u), "canExfil", b.canExfil(u),
                "carrier", Integer.valueOf(u.id).equals(b.intelCarrier()));
    }

    private static Map<String, Object> objective(Battle b, ObjectiveType t, boolean primary) {
        boolean casualties = b.squad().stream().anyMatch(u -> !u.alive());
        String state;
        String note;
        switch (t) {
            case RETRIEVE_INTEL -> {
                state = b.intelCarrier() != null ? "progress" : "pending";
                note = b.intelCarrier() != null ? "Carrier must extract" : "Find and secure the cache";
            }
            case ELIMINATE_HVT -> {
                state = b.hvtKilled() ? "done" : "pending";
                note = b.hvtKilled() ? "Target down" : "Target in compound";
            }
            case NO_CASUALTIES -> {
                state = casualties ? "failed" : "progress";
                note = casualties ? "Operator lost" : "All operators alive";
            }
            case UNDETECTED -> {
                state = b.alerted() ? "failed" : "progress";
                note = b.alerted() ? "Alarm raised" : "Undetected";
            }
            default -> throw new IllegalStateException();
        }
        return obj("label", t.label, "primary", primary, "state", state, "note", note);
    }
}
