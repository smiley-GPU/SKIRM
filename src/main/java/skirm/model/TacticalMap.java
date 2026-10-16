package skirm.model;

import skirm.core.Hex;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Static terrain plus authored zones. Rectangular in odd-r offset space, stored by axial key. */
public final class TacticalMap {
    public final int cols;
    public final int rows;
    private final Map<Hex, Terrain> tiles = new LinkedHashMap<>();

    public final Set<Hex> insertionZone = new LinkedHashSet<>();
    public final Map<Vehicle, Set<Hex>> extractionZones = new EnumMap<>(Vehicle.class);
    public final List<Hex> compoundInterior = new ArrayList<>();
    public Hex objective;

    public TacticalMap(int cols, int rows) {
        this.cols = cols;
        this.rows = rows;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) tiles.put(Hex.fromOffset(c, r), Terrain.OPEN);
    }

    public boolean contains(Hex h) { return tiles.containsKey(h); }

    /** Null when outside the map. */
    public Terrain at(Hex h) { return tiles.get(h); }

    public void set(Hex h, Terrain t) {
        if (tiles.containsKey(h)) tiles.put(h, t);
    }

    public boolean passable(Hex h) {
        Terrain t = tiles.get(h);
        return t != null && t.passable;
    }

    public Collection<Hex> hexes() { return Collections.unmodifiableSet(tiles.keySet()); }

    /** Intermediate hexes must not block; endpoints never block their own sight line. */
    public boolean hasLineOfSight(Hex a, Hex b) {
        List<Hex> line = a.lineTo(b);
        for (int i = 1; i < line.size() - 1; i++) {
            Terrain t = tiles.get(line.get(i));
            if (t == null || t.blocksLos) return false;
        }
        return true;
    }
}
