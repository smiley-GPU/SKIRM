package skirm.mission;

import skirm.core.Hex;
import skirm.core.Rng;
import skirm.model.Vehicle;
import skirm.tactical.Battle;
import skirm.tactical.Unit;

import java.util.ArrayList;
import java.util.List;

/** Abstracted, dice-driven resolution of getting in and getting out. */
public final class Transit {
    private Transit() {}

    /** Applies complications to the freshly built battle and returns the narrative. */
    public static List<String> insertion(Mission m, Battle b) {
        Rng rng = b.rng();
        List<String> rep = new ArrayList<>();
        Vehicle v = m.insertion;
        rep.add(switch (v) {
            case HELO -> "The helicopter runs in low over the ridgeline toward the drop point.";
            case GROUND -> "The convoy rolls in along the south road, lights off.";
            case FOOT -> "The team moves in on foot through the treeline on the western approach.";
        });
        int chance = (int) Math.round(v.complicationChance * m.env.complicationFactor());
        if (!rng.chance(chance)) {
            rep.add("Insertion clean. The team is on the ground, undetected.");
            return rep;
        }
        List<Unit> squad = b.squad();
        Unit victim = rng.pick(squad);
        boolean first = rng.chance(50);
        switch (v) {
            case HELO -> {
                if (first) {
                    rep.add("HOT LZ: small-arms fire on approach. The enemy knows you are here.");
                    b.raiseAlarm("Hot LZ: the enemy is alerted.");
                } else {
                    rep.add("Hard landing. " + victim.name + " is hurt in the drop (-2 HP).");
                    b.injure(victim, 2);
                }
            }
            case GROUND -> {
                if (first) {
                    rep.add("IED strike on the lead vehicle! " + victim.name + " is wounded (-3 HP).");
                    b.injure(victim, 3);
                } else {
                    rep.add("Roadblock. Forced detour: 2 turns lost on target.");
                    b.delay(2);
                }
            }
            case FOOT -> {
                if (first) {
                    rep.add("A goatherd spots the team and runs for the compound. Expect them to be ready.");
                    b.raiseAlarm("Spotted on approach: the enemy is alerted.");
                } else {
                    rep.add("Flooded gully. The approach takes longer than planned: 2 turns lost.");
                    b.delay(2);
                }
            }
        }
        return rep;
    }

    /** Mutates unit hp / missing / exfiltrated flags. Debrief reads the result. */
    public static List<String> extraction(Mission m, Battle b) {
        Rng rng = b.rng();
        List<String> rep = new ArrayList<>();
        Vehicle v = m.extraction;
        List<Unit> out = b.squad().stream().filter(u -> u.exfiltrated && u.alive()).toList();
        List<Unit> stranded = b.squad().stream().filter(u -> u.stranded && u.alive()).toList();

        int hostilesNear = 0;
        for (Unit e : b.units()) {
            if (e.side != Unit.Side.ENEMY || !e.onMap()) continue;
            int d = Integer.MAX_VALUE;
            for (Hex z : b.extractionZone) d = Math.min(d, z.distance(e.hex));
            if (d <= 6) hostilesNear++;
        }
        boolean hot = b.alerted() && hostilesNear > 0;

        if (!out.isEmpty()) {
            rep.add(switch (v) {
                case HELO -> "Rotor wash flattens the clearing as the helicopter flares in.";
                case GROUND -> "The trucks swing round on the road, tailgates down.";
                case FOOT -> "The team slips back out through the western treeline.";
            });
            if (hot) {
                rep.add(hostilesNear + " hostile(s) within range of the extraction point. Taking fire!");
                int chance = switch (v) {
                    case HELO -> 30;
                    case GROUND -> 25;
                    case FOOT -> 40;
                };
                for (Unit u : out) {
                    if (!rng.chance(chance)) continue;
                    int dmg = rng.range(1, 3);
                    u.hp = Math.max(0, u.hp - dmg);
                    rep.add(u.alive() ? u.name + " is hit during extraction (-" + dmg + " HP)." : u.name + " is killed during extraction.");
                }
            } else {
                rep.add("Extraction clean. No contact.");
            }
        }
        for (Unit u : stranded) {
            rep.add(u.name + " missed the extraction and attempts to escape on foot...");
            if (rng.chance(b.alerted() ? 45 : 20)) {
                u.missing = true;
                rep.add("  Contact lost. " + u.name + " is missing in action.");
            } else {
                int dmg = rng.range(1, 4);
                u.hp = Math.max(1, u.hp - dmg);
                u.exfiltrated = true;
                rep.add("  " + u.name + " reaches friendly lines two days later, battered (-" + dmg + " HP).");
            }
        }
        if (out.isEmpty() && stranded.isEmpty()) rep.add("No operators made it to extraction.");
        return rep;
    }
}
