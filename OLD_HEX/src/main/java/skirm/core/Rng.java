package skirm.core;

import java.util.List;
import java.util.SplittableRandom;

/**
 * Seeded RNG. Every random decision in the simulation goes through one of these,
 * so a mission seed plus the command stream fully reproduces a playthrough.
 */
public final class Rng {
    private final SplittableRandom random;

    public Rng(long seed) { this.random = new SplittableRandom(seed); }

    /** Inclusive on both ends. */
    public int range(int lo, int hi) { return random.nextInt(lo, hi + 1); }

    public int index(int size) { return random.nextInt(size); }

    public boolean chance(int percent) { return random.nextInt(100) < percent; }

    public int d100() { return random.nextInt(100); }

    public long nextLong() { return random.nextLong(); }

    public <T> T pick(List<T> items) { return items.get(random.nextInt(items.size())); }
}
