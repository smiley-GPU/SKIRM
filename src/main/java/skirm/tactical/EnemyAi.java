package skirm.tactical;

import skirm.core.Hex;

import java.util.ArrayList;
import java.util.List;

import static skirm.tactical.Unit.Side.ENEMY;

/**
 * Two-state hostile behaviour. Unaware: loiter near post, raise the alarm on sight.
 * Alerted: shoot if the odds are acceptable, otherwise utility-score reachable hexes
 * (closing distance, firing position, cover) and move. Alerted units share positions by radio.
 */
final class EnemyAi {
    private static final int MIN_SHOT_CHANCE = 25;

    private EnemyAi() {}

    static void takeTurn(Battle b) {
        for (Unit e : new ArrayList<>(b.units())) {
            if (e.side != ENEMY || !e.onMap()) continue;
            e.ap = e.maxAp();
            if (!b.alerted()) {
                patrol(b, e);
                for (Unit p : b.squad())
                    if (p.onMap() && b.enemySees(e.hex, p.hex)) {
                        b.alert((b.visible().contains(e.hex) ? e.name : "A sentry") + " spotted " + p.name + "! The area is alerted.");
                        break;
                    }
            } else {
                engage(b, e);
            }
        }
    }

    private static void patrol(Battle b, Unit e) {
        if (e.hvt || !b.rng().chance(50)) return;
        Pathing.Reach reach = Pathing.reach(b, e, 2);
        List<Hex> options = reach.cost().keySet().stream()
                .filter(h -> !h.equals(e.hex) && h.distance(e.post) <= 3)
                .sorted((x, y) -> x.q() != y.q() ? Integer.compare(x.q(), y.q()) : Integer.compare(x.r(), y.r()))
                .toList();
        if (!options.isEmpty()) b.moveEnemy(e, reach.pathTo(b.rng().pick(options)));
    }

    private static void engage(Battle b, Unit e) {
        for (int guard = 0; guard < 6 && e.ap > 0 && e.onMap(); guard++) {
            int cost = e.gun().apCost();
            Unit target = bestTarget(b, e, e.hex);
            if (target != null && e.ap >= cost
                    && Combat.hitChance(b, e, e.hex, target).chance() >= MIN_SHOT_CHANCE) {
                b.resolveShot(e, target);
                continue;
            }
            if (e.hvt) return;
            int budget = e.ap >= cost * 2 ? e.ap - cost : e.ap;
            Pathing.Reach reach = Pathing.reach(b, e, budget);
            Hex best = e.hex;
            double bestScore = score(b, e, e.hex);
            for (Hex h : reach.cost().keySet()) {
                if (h.equals(e.hex)) continue;
                double s = score(b, e, h);
                if (s > bestScore + 0.01) {
                    best = h;
                    bestScore = s;
                }
            }
            if (best.equals(e.hex)) return;
            b.moveEnemy(e, reach.pathTo(best));
        }
    }

    private static Unit bestTarget(Battle b, Unit e, Hex from) {
        Unit best = null;
        int bestChance = -1;
        for (Unit p : b.squad()) {
            if (!p.onMap() || from.distance(p.hex) > e.gun().range() || !b.enemySees(from, p.hex)) continue;
            int c = Combat.hitChance(b, e, from, p).chance();
            if (c > bestChance) {
                best = p;
                bestChance = c;
            }
        }
        return best;
    }

    private static double score(Battle b, Unit e, Hex h) {
        Unit nearest = null;
        for (Unit p : b.squad())
            if (p.onMap() && (nearest == null || h.distance(p.hex) < h.distance(nearest.hex))) nearest = p;
        if (nearest == null) return 0;
        double s = -h.distance(nearest.hex);
        Hex saved = e.hex;
        e.hex = h; // evaluate as if standing there
        Unit t = bestTarget(b, e, h);
        if (t != null) s += 6 + Combat.hitChance(b, e, h, t).chance() / 20.0;
        e.hex = saved;
        s += Combat.coverAt(b.map, h, nearest.hex) / 10.0;
        s += b.rng().range(0, 5) / 10.0;
        return s;
    }
}
