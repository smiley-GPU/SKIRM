package skirm.model;

import java.util.ArrayList;
import java.util.List;

/** Weapon is mandatory; armor and utility are optional (null). */
public record Loadout(Item weapon, Item armor, Item utility) {
    public List<Item> items() {
        List<Item> out = new ArrayList<>(3);
        if (weapon != null) out.add(weapon);
        if (armor != null) out.add(armor);
        if (utility != null) out.add(utility);
        return out;
    }
}
