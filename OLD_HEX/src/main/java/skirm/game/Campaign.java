package skirm.game;

import skirm.core.Rng;
import skirm.model.Armory;
import skirm.model.Item;
import skirm.model.Soldier;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Persistent state that survives between missions. */
public final class Campaign {
    private static final List<String> FIRST = List.of(
            "Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan", "Niko", "Tariq", "Elena", "Mika",
            "Jonas", "Aino", "Viktor", "Lena", "Omar", "Petra", "Dario", "Iris", "Kai", "Sasha");
    private static final List<String> LAST = List.of(
            "Hale", "Korhonen", "Reyes", "Novak", "Brandt", "Okafor", "Lindqvist", "Marsh", "Varga", "Sato",
            "Kowalski", "Moreau", "Haddad", "Petrov", "Quinn", "Aalto", "Ferreira", "Doyle", "Ivanova", "Kerr");

    public final Rng rng;
    public final List<Soldier> roster = new ArrayList<>();
    public final Armory armory = new Armory();
    public int requisition = 12;
    public int missionsFlown;
    private int nextSoldierId = 1;
    private final Set<String> usedNames = new HashSet<>();

    private Campaign(long seed) { this.rng = new Rng(seed); }

    public static Campaign create(long seed) {
        Campaign c = new Campaign(seed);
        int[] startingXp = {60, 25, 25, 0, 0, 0};
        for (int xp : startingXp) c.recruit(xp);
        c.armory.add(Item.CARBINE, 4);
        c.armory.add(Item.SMG, 2);
        c.armory.add(Item.DMR, 1);
        c.armory.add(Item.LMG, 1);
        c.armory.add(Item.VEST, 4);
        c.armory.add(Item.PLATE, 2);
        c.armory.add(Item.MEDKIT, 4);
        c.armory.add(Item.FRAG, 4);
        return c;
    }

    public Soldier recruit(int xp) {
        String name;
        do name = rng.pick(FIRST) + " " + rng.pick(LAST);
        while (!usedNames.add(name));
        Soldier s = new Soldier(nextSoldierId++, name, xp);
        roster.add(s);
        return s;
    }

    public Soldier soldier(int id) {
        for (Soldier s : roster) if (s.id == id) return s;
        return null;
    }
}
