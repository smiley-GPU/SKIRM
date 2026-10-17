package skirm.model;

/** Persistent campaign-level operator. Mission-scoped state lives on tactical Unit instead. */
public final class Soldier {
    public static final int BASE_HP = 10;

    public final int id;
    public final String name;
    public int xp;
    public int kills;
    public int missions;
    /** Briefings left before this soldier can deploy again (heavy wounds). */
    public int recovery;
    public boolean alive = true;

    public Soldier(int id, String name, int xp) {
        this.id = id;
        this.name = name;
        this.xp = xp;
    }

    public Rank rank() { return Rank.forXp(xp); }

    public int maxHp() { return BASE_HP; }

    public boolean available() { return alive && recovery == 0; }
}
