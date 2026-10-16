package skirm.core;

import java.util.ArrayList;
import java.util.List;

/** Axial hex coordinate (pointy-top). Immutable value type, safe as a map key. */
public record Hex(int q, int r) {
    private static final int[][] DIRS = {{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1}};

    public int s() { return -q - r; }

    public Hex neighbor(int dir) { return new Hex(q + DIRS[dir][0], r + DIRS[dir][1]); }

    public List<Hex> neighbors() {
        List<Hex> out = new ArrayList<>(6);
        for (int d = 0; d < 6; d++) out.add(neighbor(d));
        return out;
    }

    public int distance(Hex o) {
        return (Math.abs(q - o.q) + Math.abs(r - o.r) + Math.abs(s() - o.s())) / 2;
    }

    /** Hexes on the straight line from this to b, both ends inclusive. */
    public List<Hex> lineTo(Hex b) {
        int n = distance(b);
        List<Hex> out = new ArrayList<>(n + 1);
        // Nudge off exact edges so ties resolve consistently.
        double aq = q + 1e-6, ar = r + 1e-6, as = s() - 2e-6;
        double bq = b.q + 1e-6, br = b.r + 1e-6, bs = b.s() - 2e-6;
        for (int i = 0; i <= n; i++) {
            double t = n == 0 ? 0 : (double) i / n;
            out.add(round(aq + (bq - aq) * t, ar + (br - ar) * t, as + (bs - as) * t));
        }
        return out;
    }

    private static Hex round(double fq, double fr, double fs) {
        long rq = Math.round(fq), rr = Math.round(fr), rs = Math.round(fs);
        double dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
        if (dq > dr && dq > ds) rq = -rr - rs;
        else if (dr > ds) rr = -rq - rs;
        return new Hex((int) rq, (int) rr);
    }

    /** Odd-r offset (col,row) to axial, so maps can be authored as rectangles. */
    public static Hex fromOffset(int col, int row) {
        return new Hex(col - (row - (row & 1)) / 2, row);
    }

    public int col() { return q + (r - (r & 1)) / 2; }

    public int row() { return r; }
}
