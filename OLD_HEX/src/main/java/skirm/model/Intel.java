package skirm.model;

/** Purchasable pre-mission intelligence. */
public enum Intel {
    SATELLITE("Satellite Imagery", 2, "Reveals terrain across the whole area of operations."),
    HUMINT("Deep Intelligence", 3, "Reveals enemy strength, last known positions and expected reinforcements.");

    public final String label;
    public final int cost;
    public final String description;

    Intel(String label, int cost, String description) {
        this.label = label;
        this.cost = cost;
        this.description = description;
    }
}
