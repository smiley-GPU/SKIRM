package skirm.tactical;

import skirm.core.Hex;
import skirm.mission.Mission;
import skirm.model.Item;
import skirm.model.Loadout;
import skirm.model.Soldier;

/**
 * Mission-scoped combatant. Plain mutable data (fields are public on purpose): the Battle owns
 * all rule enforcement, units are just component state.
 */
public final class Unit {
    public enum Side { PLAYER, ENEMY }

    public final int id;
    public final Side side;
    public final String name;
    /** Campaign soldier this unit represents; null for hostiles. */
    public final Integer soldierId;
    public final int maxHp;
    public final Item weapon;
    public final Item armor;
    public final boolean hvt;
    public final int accuracyBonus;

    public Hex hex;
    public Hex post;
    public int hp;
    public int ap;
    public Item utility;
    public Item consumedUtility;
    public int kills;
    public boolean killedHvt;
    public boolean exfiltrated;
    public boolean stranded;
    public boolean missing;

    private Unit(int id, Side side, String name, Integer soldierId, int maxHp, Item weapon, Item armor,
                 Item utility, boolean hvt, int accuracyBonus, Hex hex) {
        this.id = id;
        this.side = side;
        this.name = name;
        this.soldierId = soldierId;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.weapon = weapon;
        this.armor = armor;
        this.utility = utility;
        this.hvt = hvt;
        this.accuracyBonus = accuracyBonus;
        this.hex = hex;
        this.post = hex;
        this.ap = maxAp();
    }

    static Unit operator(int id, Soldier s, Loadout l, Hex at) {
        return new Unit(id, Side.PLAYER, s.name, s.id, s.maxHp(), l.weapon(), l.armor(), l.utility(),
                false, s.rank().accuracyBonus(), at);
    }

    static Unit hostile(int id, Mission.EnemySpawn sp) {
        String name = sp.hvt() ? "HVT" : (sp.weapon() == Item.LMG ? "Gunner " : "Insurgent ") + id;
        return new Unit(id, Side.ENEMY, name, null, sp.hvt() ? 6 : 7, sp.weapon(), null, null, sp.hvt(), 0, sp.hex());
    }

    public boolean alive() { return hp > 0; }

    /** Still physically present and able to act on the tactical map. */
    public boolean onMap() { return alive() && !exfiltrated && !stranded && !missing; }

    public int maxAp() { return 4 - (armor == null ? 0 : armor.apPenalty); }

    public Item.WeaponStats gun() { return weapon.weapon; }

    public int damageReduction() { return armor == null ? 0 : armor.damageReduction; }
}
