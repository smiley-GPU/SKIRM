package skirm.model;

public enum Rank {
    PVT("Private", 0),
    PFC("Private First Class", 20),
    CPL("Corporal", 50),
    SGT("Sergeant", 90),
    SSG("Staff Sergeant", 140),
    LT("Lieutenant", 200);

    public final String label;
    public final int xp;

    Rank(String label, int xp) {
        this.label = label;
        this.xp = xp;
    }

    public static Rank forXp(int xp) {
        Rank best = PVT;
        for (Rank r : values()) if (xp >= r.xp) best = r;
        return best;
    }

    /** XP needed for the next rank, or -1 at the top. */
    public int nextXp() { return ordinal() + 1 < values().length ? values()[ordinal() + 1].xp : -1; }

    public int accuracyBonus() { return ordinal() * 3; }
}
