package skirm.tactical;

import skirm.core.Hex;
import skirm.core.Rng;
import skirm.model.Item;
import skirm.model.TacticalMap;
import skirm.model.Terrain;

import java.util.ArrayList;
import java.util.List;

/** Pure combat math. Modifiers are itemised so the UI can explain every percentage. */
public final class Combat {
    public static final int AMBUSH_DAMAGE = 2;

    private Combat() {}

    public record HitChance(int chance, List<String> mods) {}

    public static HitChance hitChance(Battle b, Unit shooter, Hex from, Unit target) {
        Item.WeaponStats g = shooter.gun();
        List<String> mods = new ArrayList<>();
        int d = from.distance(target.hex);
        int c = g.accuracy();
        if (shooter.accuracyBonus > 0) {
            c += shooter.accuracyBonus;
            mods.add("+" + shooter.accuracyBonus + " rank");
        }
        int env = b.mission.env.accuracyMod();
        if (env != 0) {
            c += env;
            mods.add(env + " conditions");
        }
        int falloff = (g.range() + 1) / 2;
        if (d > falloff) {
            int pen = (d - falloff) * 4;
            c -= pen;
            mods.add("-" + pen + " range");
        }
        int cover = coverAt(b.map, target.hex, from);
        if (cover > 0) {
            c -= cover;
            mods.add("-" + cover + " cover");
        }
        if (b.map.at(target.hex) == Terrain.ROUGH) {
            c -= 10;
            mods.add("-10 brush");
        }
        if (d == 1) {
            c += 10;
            mods.add("+10 point blank");
        }
        if (target.side == Unit.Side.ENEMY && !b.alerted()) {
            c += 15;
            mods.add("+15 unaware");
        }
        return new HitChance(Math.max(5, Math.min(95, c)), mods);
    }

    /** Best cover the target gets from an adjacent obstacle on the shooter's side. */
    public static int coverAt(TacticalMap map, Hex target, Hex from) {
        int d = target.distance(from);
        if (d <= 1) return 0;
        int best = 0;
        for (Hex n : target.neighbors()) {
            if (n.distance(from) >= d) continue;
            Terrain t = map.at(n);
            if (t != null) best = Math.max(best, t.coverValue());
        }
        return best;
    }

    public static int damage(Rng rng, Item.WeaponStats g, int damageReduction, boolean ambush) {
        int dmg = rng.range(g.dmgMin(), g.dmgMax()) + (ambush ? AMBUSH_DAMAGE : 0);
        return Math.max(1, dmg - damageReduction);
    }
}
