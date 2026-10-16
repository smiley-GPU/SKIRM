package skirm.model;

/** Insertion/extraction method. Trades requisition cost against noise, risk and time on target. */
public enum Vehicle {
    HELO("Helicopter", 4, 25, 2,
            "Fast and direct: +2 turns on target. Loud, so a bad LZ can alert the area. Extracts from the northern clearing."),
    GROUND("Ground Convoy", 2, 20, 1,
            "Armoured trucks via the south road: +1 turn on target. Exposed to IEDs and roadblocks. Extracts from the road."),
    FOOT("On Foot", 0, 10, 0,
            "Silent infiltration, no extra time. Rarely detected. Extract by walking out the western edge.");

    public final String label;
    public final int cost;
    /** Base % chance of an insertion complication before environment modifiers. */
    public final int complicationChance;
    public final int turnBonus;
    public final String description;

    Vehicle(String label, int cost, int complicationChance, int turnBonus, String description) {
        this.label = label;
        this.cost = cost;
        this.complicationChance = complicationChance;
        this.turnBonus = turnBonus;
        this.description = description;
    }
}
