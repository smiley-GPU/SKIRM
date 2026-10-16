package skirm.model;

public enum Terrain {
    OPEN(1, true, false),
    ROAD(1, true, false),
    /** Brush / rubble: slow, and conceals whoever stands in it. */
    ROUGH(2, true, false),
    /** Sandbags, crates, low walls: impassable, see-through, gives cover to adjacent units. */
    LOW_COVER(0, false, false),
    WALL(0, false, true),
    WATER(0, false, false);

    public final int moveCost;
    public final boolean passable;
    public final boolean blocksLos;

    Terrain(int moveCost, boolean passable, boolean blocksLos) {
        this.moveCost = moveCost;
        this.passable = passable;
        this.blocksLos = blocksLos;
    }

    /** Hit-chance penalty when this tile sits between shooter and an adjacent target. */
    public int coverValue() {
        return switch (this) {
            case LOW_COVER -> 30;
            case WALL -> 40;
            default -> 0;
        };
    }
}
