package skirm;

import skirm.core.Hex;
import skirm.core.Json;
import skirm.core.RuleException;
import skirm.game.Game;
import skirm.game.Phase;
import skirm.model.Intel;
import skirm.model.Item;
import skirm.model.Loadout;
import skirm.model.Soldier;
import skirm.model.Vehicle;
import skirm.tactical.ActionType;
import skirm.tactical.Battle;
import skirm.tactical.Combat;
import skirm.tactical.Pathing;
import skirm.tactical.Unit;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Headless soak test: a dumb bot plays many seeded campaigns through the public Game API,
 * asserting simulation invariants and JSON round-tripping after every command.
 * No framework on purpose; run with: java -cp out skirm.SmokeTest
 */
public final class SmokeTest {
    private static int missions, successes, commands;

    public static void main(String[] args) {
        int seeds = args.length > 0 ? Integer.parseInt(args[0]) : 40;
        long t0 = System.nanoTime();
        for (long seed = 1; seed <= seeds; seed++) campaign(seed);
        rejectsIllegalCommands();
        System.out.printf("OK  %d missions, %d successful, %d commands in %d ms%n",
                missions, successes, commands, (System.nanoTime() - t0) / 1_000_000);
    }

    private static void campaign(long seed) {
        Game g = new Game(seed);
        for (int m = 0; m < 3; m++) {
            check(g.phase() == Phase.BRIEFING, "expected briefing");
            snapshot(g);
            if (g.campaign().requisition >= Intel.SATELLITE.cost) g.buyIntel(Intel.SATELLITE);
            g.launch(order(g, seed + m));
            check(g.phase() == Phase.INSERTION, "expected insertion");
            snapshot(g);
            g.proceed();

            int turns = 0;
            while (g.phase() == Phase.TACTICAL) {
                check(turns++ < 40, "battle did not terminate (seed " + seed + ")");
                playTurn(g);
                if (g.phase() == Phase.TACTICAL) {
                    g.endTurn();
                    commands++;
                    invariants(g.battle());
                }
                snapshot(g);
            }
            check(g.phase() == Phase.EXTRACTION, "expected extraction");
            g.proceed();
            check(g.phase() == Phase.DEBRIEF, "expected debrief");
            snapshot(g);
            missions++;
            if (g.debrief().success()) successes++;
            g.proceed();
        }
    }

    private static Game.LaunchOrder order(Game g, long salt) {
        Map<Item, Integer> stock = new EnumMap<>(g.campaign().armory.snapshot());
        List<Integer> team = new ArrayList<>();
        Map<Integer, Loadout> loadouts = new HashMap<>();
        for (Soldier s : g.campaign().roster) {
            if (!s.available() || team.size() == Game.MAX_TEAM) continue;
            Item w = take(stock, Item.CARBINE, Item.SMG, Item.DMR, Item.LMG, Item.AK);
            if (w == null) break;
            team.add(s.id);
            loadouts.put(s.id, new Loadout(w, take(stock, Item.VEST, Item.PLATE), take(stock, Item.MEDKIT, Item.FRAG)));
        }
        Vehicle[] options = Vehicle.values();
        Vehicle in = options[(int) (salt % 3)], out = options[(int) ((salt / 3) % 3)];
        while (in.cost + out.cost > g.campaign().requisition) {
            if (in != Vehicle.FOOT) in = Vehicle.FOOT;
            else out = Vehicle.FOOT;
        }
        return new Game.LaunchOrder(team, loadouts, in, out);
    }

    private static Item take(Map<Item, Integer> stock, Item... prefs) {
        for (Item i : prefs)
            if (stock.getOrDefault(i, 0) > 0) {
                stock.merge(i, -1, Integer::sum);
                return i;
            }
        return null;
    }

    private static void playTurn(Game g) {
        Battle b = g.battle();
        for (Unit u : b.squad()) {
            for (int step = 0; step < 6 && u.onMap() && g.phase() == Phase.TACTICAL; step++) {
                if (!act(g, b, u)) break;
                commands++;
                invariants(b);
            }
        }
    }

    /** One greedy decision. Returns false when the unit has nothing useful left to do. */
    private static boolean act(Game g, Battle b, Unit u) {
        if (b.canSecureIntel(u)) { g.act(u.id, ActionType.INTEL, null, null); return true; }
        if (b.canExfil(u) && b.intelHex() == null) { g.act(u.id, ActionType.EXFIL, null, null); return true; }
        Unit best = null;
        int bestChance = -1;
        for (Unit t : b.units())
            if (t.side == Unit.Side.ENEMY && b.canShoot(u, t)) {
                int c = Combat.hitChance(b, u, u.hex, t).chance();
                if (c > bestChance) { best = t; bestChance = c; }
            }
        if (best != null) { g.act(u.id, ActionType.SHOOT, null, best.id); return true; }
        if (u.ap == 0) return false;

        Hex goal = b.intelHex() != null ? b.intelHex() : nearest(u.hex, b.extractionZone);
        Pathing.Reach reach = Pathing.reach(b, u, u.ap);
        Hex dest = null;
        int bestD = u.hex.distance(goal);
        for (Hex h : reach.cost().keySet())
            if (h.distance(goal) < bestD) { bestD = h.distance(goal); dest = h; }
        if (dest == null) return false;
        g.act(u.id, ActionType.MOVE, dest, null);
        return true;
    }

    private static Hex nearest(Hex from, Set<Hex> zone) {
        Hex best = null;
        for (Hex h : zone) if (best == null || from.distance(h) < from.distance(best)) best = h;
        return best;
    }

    private static void invariants(Battle b) {
        Set<Hex> occupied = new HashSet<>();
        for (Unit u : b.units()) {
            check(u.hp >= 0 && u.hp <= u.maxHp, "hp out of range: " + u.name);
            check(u.ap >= 0, "negative ap: " + u.name);
            if (!u.onMap()) continue;
            check(b.map.passable(u.hex), u.name + " stands on impassable terrain");
            check(occupied.add(u.hex), "two units share " + u.hex);
        }
    }

    private static void snapshot(Game g) {
        String json = Json.write(g.snapshot(List.of()));
        Object back = Json.parse(json);
        check(back instanceof Map<?, ?> m && g.phase().name().equals(m.get("phase")), "snapshot round-trip failed");
        if (g.phase() == Phase.TACTICAL) {
            // Fog boundary: no enemy outside player vision may appear in the payload.
            Battle b = g.battle();
            for (Unit e : b.units())
                if (e.side == Unit.Side.ENEMY && e.onMap() && !b.visible().contains(e.hex))
                    check(!json.contains("\"id\":" + e.id + ",\"side\":\"ENEMY\""), "hidden enemy leaked into view");
        }
    }

    private static void rejectsIllegalCommands() {
        Game g = new Game(99);
        expectRule(() -> g.endTurn(), "end turn during briefing");
        expectRule(() -> g.launch(new Game.LaunchOrder(List.of(), Map.of(), Vehicle.FOOT, Vehicle.FOOT)), "empty team");
        g.buyIntel(Intel.HUMINT);
        expectRule(() -> g.buyIntel(Intel.HUMINT), "duplicate intel");
        int id = g.campaign().roster.get(0).id;
        g.launch(new Game.LaunchOrder(List.of(id), Map.of(id, new Loadout(Item.CARBINE, null, null)), Vehicle.FOOT, Vehicle.FOOT));
        g.proceed();
        Unit u = g.battle().squad().get(0);
        expectRule(() -> g.act(u.id, ActionType.MOVE, new Hex(-50, -50), null), "move off map");
        expectRule(() -> g.act(u.id, ActionType.GRENADE, u.hex, null), "grenade without frag");
    }

    private static void expectRule(Runnable r, String what) {
        try {
            r.run();
        } catch (RuleException e) {
            return;
        }
        throw new AssertionError("expected RuleException for: " + what);
    }

    private static void check(boolean ok, String msg) {
        if (!ok) throw new AssertionError(msg);
    }
}
