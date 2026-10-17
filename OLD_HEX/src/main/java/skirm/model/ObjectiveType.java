package skirm.model;

public enum ObjectiveType {
    RETRIEVE_INTEL("Retrieve Intel", "Secure the intel cache inside the compound and get its carrier out."),
    ELIMINATE_HVT("Eliminate HVT", "A high-value target is holed up in the compound. Neutralise him."),
    NO_CASUALTIES("Leave No One", "Bring every operator home alive."),
    UNDETECTED("Ghost", "Complete the operation without the enemy ever raising the alarm.");

    public final String label;
    public final String description;

    ObjectiveType(String label, String description) {
        this.label = label;
        this.description = description;
    }
}
