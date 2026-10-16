package skirm.model;

/** Every piece of gear the armory can stock. Stats live on the enum so balance is one table. */
public enum Item {
    CARBINE(Slot.WEAPON, "Carbine", new WeaponStats(2, 7, 70, 3, 5), 0, 0),
    SMG(Slot.WEAPON, "SMG", new WeaponStats(1, 5, 70, 1, 3), 0, 0),
    DMR(Slot.WEAPON, "Marksman Rifle", new WeaponStats(3, 11, 80, 4, 6), 0, 0),
    LMG(Slot.WEAPON, "LMG", new WeaponStats(2, 8, 58, 3, 6), 0, 0),
    AK(Slot.WEAPON, "AK Rifle", new WeaponStats(2, 7, 62, 3, 5), 0, 0),
    VEST(Slot.ARMOR, "Soft Vest", null, 1, 0),
    PLATE(Slot.ARMOR, "Plate Carrier", null, 2, 1),
    MEDKIT(Slot.UTILITY, "Medkit", null, 0, 0),
    FRAG(Slot.UTILITY, "Frag Grenade", null, 0, 0);

    public enum Slot { WEAPON, ARMOR, UTILITY }

    /** apCost per shot, max range in hexes, base accuracy %, damage range. */
    public record WeaponStats(int apCost, int range, int accuracy, int dmgMin, int dmgMax) {}

    public final Slot slot;
    public final String label;
    public final WeaponStats weapon;
    public final int damageReduction;
    public final int apPenalty;

    Item(Slot slot, String label, WeaponStats weapon, int damageReduction, int apPenalty) {
        this.slot = slot;
        this.label = label;
        this.weapon = weapon;
        this.damageReduction = damageReduction;
        this.apPenalty = apPenalty;
    }
}
