package skirm.mission;

import skirm.core.Hex;
import skirm.core.Rng;
import skirm.model.TacticalMap;
import skirm.model.Terrain;
import skirm.model.Vehicle;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Layout: insertion on the west edge, a walled compound in the east holding the objective,
 * a helicopter clearing to the north-east and a road along the south. Clutter is scattered
 * first, structures stamped over it, then the result is rejected unless every zone connects.
 */
public final class MapGenerator {
    public static final int COLS = 18;
    public static final int ROWS = 12;

    private MapGenerator() {}

    public static TacticalMap generate(Rng rng) {
        for (int attempt = 0; attempt < 100; attempt++) {
            TacticalMap m = attempt(rng);
            if (connected(m)) return m;
        }
        throw new IllegalStateException("Map generation failed to produce a connected layout");
    }

    private static TacticalMap attempt(Rng rng) {
        TacticalMap m = new TacticalMap(COLS, ROWS);

        for (int i = 0; i < 7; i++) blob(m, rng, Terrain.ROUGH, rng.range(2, 4), rng.range(2, COLS - 2), rng.range(0, ROWS - 1));
        if (rng.chance(50)) blob(m, rng, Terrain.WATER, rng.range(1, 2), rng.range(4, 8), rng.range(2, ROWS - 3));
        for (int i = 0; i < 2; i++) ruin(m, rng);
        for (int i = 0; i < 12; i++) blob(m, rng, Terrain.LOW_COVER, rng.range(0, 1), rng.range(2, COLS - 2), rng.range(0, ROWS - 1));

        compound(m, rng);

        for (int c = 9; c < COLS; c++) m.set(Hex.fromOffset(c, ROWS - 1), Terrain.ROAD);

        for (int r = ROWS / 2 - 2; r <= ROWS / 2 + 1; r++)
            for (int c = 0; c <= 1; c++) {
                Hex h = Hex.fromOffset(c, r);
                m.set(h, Terrain.OPEN);
                m.insertionZone.add(h);
            }

        Set<Hex> helo = new LinkedHashSet<>();
        for (int r = 0; r <= 1; r++)
            for (int c = 13; c <= 15; c++) {
                Hex h = Hex.fromOffset(c, r);
                m.set(h, Terrain.OPEN);
                helo.add(h);
            }
        Set<Hex> ground = new LinkedHashSet<>();
        for (int c = 13; c < COLS; c++) ground.add(Hex.fromOffset(c, ROWS - 1));
        Set<Hex> foot = new LinkedHashSet<>();
        for (int r = 0; r < ROWS; r++) {
            Hex h = Hex.fromOffset(0, r);
            if (m.passable(h)) foot.add(h);
        }
        m.extractionZones.put(Vehicle.HELO, helo);
        m.extractionZones.put(Vehicle.GROUND, ground);
        m.extractionZones.put(Vehicle.FOOT, foot);
        return m;
    }

    private static void blob(TacticalMap m, Rng rng, Terrain t, int extra, int col, int row) {
        List<Hex> cells = new ArrayList<>();
        Hex seed = Hex.fromOffset(col, row);
        if (m.at(seed) != Terrain.OPEN) return;
        m.set(seed, t);
        cells.add(seed);
        for (int i = 0; i < extra; i++) {
            Hex n = rng.pick(rng.pick(cells).neighbors());
            if (m.at(n) == Terrain.OPEN) {
                m.set(n, t);
                cells.add(n);
            }
        }
    }

    private static void ruin(TacticalMap m, Rng rng) {
        Hex h = Hex.fromOffset(rng.range(4, 9), rng.range(1, ROWS - 2));
        int dir = rng.range(0, 5);
        int len = rng.range(2, 3);
        for (int i = 0; i < len; i++) {
            if (m.at(h) == Terrain.OPEN) m.set(h, Terrain.WALL);
            h = h.neighbor(dir);
        }
    }

    private static void compound(TacticalMap m, Rng rng) {
        int cw = rng.range(4, 5), ch = rng.range(4, 5);
        int c0 = rng.range(10, COLS - cw - 1), r0 = rng.range(3, ROWS - ch - 3);
        List<Hex> perimeter = new ArrayList<>();
        for (int r = r0; r < r0 + ch; r++)
            for (int c = c0; c < c0 + cw; c++) {
                Hex h = Hex.fromOffset(c, r);
                boolean edgeC = c == c0 || c == c0 + cw - 1, edgeR = r == r0 || r == r0 + ch - 1;
                if (edgeC || edgeR) {
                    m.set(h, Terrain.WALL);
                    if (!(edgeC && edgeR)) perimeter.add(h);
                } else {
                    m.set(h, Terrain.OPEN);
                    m.compoundInterior.add(h);
                }
            }
        int doors = rng.range(2, 3);
        for (int i = 0; i < doors; i++) m.set(perimeter.remove(rng.index(perimeter.size())), Terrain.OPEN);

        m.objective = Hex.fromOffset(c0 + cw / 2, r0 + ch / 2);
        List<Hex> spare = new ArrayList<>(m.compoundInterior);
        spare.remove(m.objective);
        Hex crate = rng.pick(spare);
        m.set(crate, Terrain.LOW_COVER);
        m.compoundInterior.remove(crate);
    }

    private static boolean connected(TacticalMap m) {
        Set<Hex> reach = reachableFrom(m, m.insertionZone.iterator().next());
        if (!reach.contains(m.objective) || !reach.containsAll(m.insertionZone)) return false;
        for (Set<Hex> zone : m.extractionZones.values())
            if (zone.stream().noneMatch(reach::contains)) return false;
        return true;
    }

    public static Set<Hex> reachableFrom(TacticalMap m, Hex start) {
        Set<Hex> seen = new HashSet<>();
        ArrayDeque<Hex> open = new ArrayDeque<>();
        seen.add(start);
        open.add(start);
        while (!open.isEmpty()) {
            Hex h = open.poll();
            for (Hex n : h.neighbors())
                if (m.passable(n) && seen.add(n)) open.add(n);
        }
        return seen;
    }
}
