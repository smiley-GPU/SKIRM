package skirm.mission;

import skirm.core.Rng;
import skirm.game.Campaign;
import skirm.model.Item;
import skirm.model.ObjectiveType;
import skirm.model.Rank;
import skirm.model.Soldier;
import skirm.tactical.Battle;
import skirm.tactical.Unit;

import java.util.ArrayList;
import java.util.List;

/** Folds the mission outcome back into persistent campaign state. */
public final class Debrief {
    public static final int ROSTER_FLOOR = 6;

    public record ObjectiveResult(String label, boolean primary, boolean achieved) {}

    public record SoldierResult(String name, String status, int hp, int maxHp, int kills, int xpGained,
                                String rank, String promotedTo) {}

    public record Report(boolean success, List<ObjectiveResult> objectives, List<SoldierResult> soldiers,
                         List<String> gearLost, List<String> gearGained, int requisition, List<String> notes) {}

    private Debrief() {}

    public static Report resolve(Campaign c, Mission m, Battle b, Rng rng) {
        List<Unit> squad = b.squad();
        boolean anyOut = squad.stream().anyMatch(u -> u.exfiltrated && u.alive());
        boolean casualties = squad.stream().anyMatch(u -> !u.alive() || u.missing);
        Unit carrier = b.unit(b.intelCarrier());
        boolean intelOut = carrier != null && carrier.exfiltrated && carrier.alive();

        boolean primaryDone = achieved(m.primary, b, anyOut, casualties, intelOut);
        boolean secondaryDone = achieved(m.secondary, b, anyOut, casualties, intelOut);
        boolean success = anyOut && primaryDone;
        List<ObjectiveResult> objectives = List.of(
                new ObjectiveResult(m.primary.label, true, primaryDone),
                new ObjectiveResult(m.secondary.label, false, secondaryDone));

        int rp = 2 + (success ? 8 : 0) + (secondaryDone ? 4 : 0);
        c.requisition += rp;

        List<SoldierResult> soldiers = new ArrayList<>();
        List<String> lost = new ArrayList<>();
        List<String> gained = new ArrayList<>();
        for (Unit u : squad) {
            Soldier s = c.soldier(u.soldierId);
            Rank before = s.rank();
            int xp = 0;
            String status;
            if (!u.alive() || u.missing) {
                status = u.missing ? "MIA" : "KIA";
                s.alive = false;
                lost.add(u.weapon.label + " (" + u.name + ")");
                if (u.armor != null) lost.add(u.armor.label + " (" + u.name + ")");
                if (u.utility != null) lost.add(u.utility.label + " (" + u.name + ")");
            } else {
                xp += 10 + (success ? 10 : 0) + u.kills * 8 + (u.killedHvt ? 25 : 0) + (carrier == u && intelOut ? 15 : 0);
                if (u.hp <= u.maxHp / 2) {
                    status = "Heavy wound: misses next mission";
                    s.recovery = 2;
                } else if (u.hp < u.maxHp) status = "Light wound";
                else status = "Fit for duty";
                c.armory.add(u.weapon, 1);
                if (u.armor != null) c.armory.add(u.armor, 1);
                if (u.utility != null) c.armory.add(u.utility, 1);
            }
            if (u.consumedUtility != null) lost.add(u.consumedUtility.label + " (expended)");
            s.xp += xp;
            s.kills += u.kills;
            s.missions++;
            Rank after = s.rank();
            soldiers.add(new SoldierResult(u.name, status, u.hp, u.maxHp, u.kills, xp, after.label,
                    s.alive && after != before ? after.label : null));
        }

        if (anyOut) {
            long enemyDead = b.units().stream().filter(u -> u.side == Unit.Side.ENEMY && !u.alive()).count();
            for (int i = 0; i < enemyDead; i++)
                if (rng.chance(30)) {
                    c.armory.add(Item.AK, 1);
                    gained.add("AK Rifle (captured)");
                }
            if (b.hvtKilled() && rng.chance(50)) {
                c.armory.add(Item.SMG, 1);
                gained.add("SMG (HVT's personal weapon)");
            }
            if (intelOut) {
                Item bonus = rng.chance(50) ? Item.MEDKIT : Item.FRAG;
                c.armory.add(bonus, 2);
                gained.add("2x " + bonus.label + " (cache location from recovered intel)");
            }
        }

        List<String> notes = new ArrayList<>();
        while (c.armory.countSlot(Item.Slot.WEAPON) < 4) {
            c.armory.add(Item.CARBINE, 1);
            gained.add("Carbine (quartermaster replacement)");
        }
        while (c.roster.stream().filter(s -> s.alive).count() < ROSTER_FLOOR) {
            Soldier r = c.recruit(0);
            notes.add("New recruit assigned: " + r.name + ".");
        }
        c.missionsFlown++;
        return new Report(success, objectives, soldiers, lost, gained, rp, notes);
    }

    private static boolean achieved(ObjectiveType t, Battle b, boolean anyOut, boolean casualties, boolean intelOut) {
        return switch (t) {
            case RETRIEVE_INTEL -> intelOut;
            case ELIMINATE_HVT -> b.hvtKilled();
            case NO_CASUALTIES -> anyOut && !casualties;
            case UNDETECTED -> anyOut && !b.alerted();
        };
    }
}
