package skirm.mission;

import skirm.core.Hex;
import skirm.model.Environment;
import skirm.model.Intel;
import skirm.model.Item;
import skirm.model.Loadout;
import skirm.model.ObjectiveType;
import skirm.model.TacticalMap;
import skirm.model.Vehicle;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Everything decided before boots hit the ground. The map and enemy laydown are generated at
 * briefing time so that purchased intel reveals the real situation, not a separate roll.
 */
public final class Mission {
    public record EnemySpawn(Hex hex, Item weapon, boolean hvt) {}

    public final int number;
    public final long seed;
    public final String codename;
    public final String area;
    public final Environment env;
    public final ObjectiveType primary;
    public final ObjectiveType secondary;
    public final TacticalMap map;
    public final List<EnemySpawn> spawns;
    /** 0 = no reinforcements this mission. */
    public final int reinforceTurn;
    public final int reinforceCount;

    public final Set<Intel> intel = EnumSet.noneOf(Intel.class);

    // Plan, fixed at launch.
    public List<Integer> team = List.of();
    public Map<Integer, Loadout> loadouts = Map.of();
    public Vehicle insertion;
    public Vehicle extraction;
    public List<String> insertionReport = List.of();
    public List<String> extractionReport = List.of();

    Mission(int number, long seed, String codename, String area, Environment env,
            ObjectiveType primary, ObjectiveType secondary, TacticalMap map,
            List<EnemySpawn> spawns, int reinforceTurn, int reinforceCount) {
        this.number = number;
        this.seed = seed;
        this.codename = codename;
        this.area = area;
        this.env = env;
        this.primary = primary;
        this.secondary = secondary;
        this.map = map;
        this.spawns = List.copyOf(spawns);
        this.reinforceTurn = reinforceTurn;
        this.reinforceCount = reinforceCount;
    }

    public boolean hasObjective(ObjectiveType t) { return primary == t || secondary == t; }

    /** Deliberately vague: exact numbers are what HUMINT is for. */
    public String threatEstimate() {
        int n = spawns.size();
        if (n <= 5) return "Light: a squad-sized element.";
        if (n <= 7) return "Moderate: a reinforced squad.";
        return "Heavy: platoon-strength presence.";
    }
}
