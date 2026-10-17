package skirm.tactical;

import skirm.core.Hex;
import skirm.model.Terrain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

/** Dijkstra flood over terrain move costs. Other living units block. */
public final class Pathing {
    private Pathing() {}

    public record Reach(Hex origin, Map<Hex, Integer> cost, Map<Hex, Hex> prev) {
        public boolean canReach(Hex h) { return h != null && !h.equals(origin) && cost.containsKey(h); }

        /** Steps from origin (exclusive) to dest (inclusive). */
        public List<Hex> pathTo(Hex dest) {
            List<Hex> out = new ArrayList<>();
            for (Hex h = dest; h != null && !h.equals(origin); h = prev.get(h)) out.add(h);
            Collections.reverse(out);
            return out;
        }
    }

    private record Node(Hex hex, int cost) {}

    public static Reach reach(Battle b, Unit mover, int budget) {
        Set<Hex> occupied = new HashSet<>();
        for (Unit u : b.units()) if (u != mover && u.onMap()) occupied.add(u.hex);

        Map<Hex, Integer> cost = new HashMap<>();
        Map<Hex, Hex> prev = new HashMap<>();
        PriorityQueue<Node> open = new PriorityQueue<>((x, y) -> Integer.compare(x.cost, y.cost));
        cost.put(mover.hex, 0);
        open.add(new Node(mover.hex, 0));
        while (!open.isEmpty()) {
            Node n = open.poll();
            if (n.cost > cost.get(n.hex)) continue;
            for (Hex nb : n.hex.neighbors()) {
                Terrain t = b.map.at(nb);
                if (t == null || !t.passable || occupied.contains(nb)) continue;
                int c = n.cost + t.moveCost;
                if (c > budget || c >= cost.getOrDefault(nb, Integer.MAX_VALUE)) continue;
                cost.put(nb, c);
                prev.put(nb, n.hex);
                open.add(new Node(nb, c));
            }
        }
        return new Reach(mover.hex, cost, prev);
    }
}
