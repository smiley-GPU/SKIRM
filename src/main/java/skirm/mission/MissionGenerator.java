package skirm.mission;

import skirm.core.Hex;
import skirm.core.Rng;
import skirm.model.Environment;
import skirm.model.Environment.TimeOfDay;
import skirm.model.Environment.Weather;
import skirm.model.Item;
import skirm.model.ObjectiveType;
import skirm.model.TacticalMap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class MissionGenerator {
    private static final List<String> ADJECTIVES = List.of(
            "Silent", "Iron", "Broken", "Pale", "Crimson", "Hollow", "Distant", "Bitter", "Northern", "Sudden");
    private static final List<String> NOUNS = List.of(
            "Harrier", "Lantern", "Anvil", "Meridian", "Thicket", "Sparrow", "Bastion", "Ember", "Gauntlet", "Kestrel");
    private static final List<String> AREAS = List.of(
            "Walled farmstead in the Varra highlands",
            "Abandoned pumping station on the Dry Fork",
            "Smuggler's waystation near the Kessel border crossing",
            "Fortified orchard outside the town of Ostrow",
            "Derelict customs post in the Saltmarsh lowlands");

    private MissionGenerator() {}

    public static Mission generate(int number, long seed) {
        Rng rng = new Rng(seed);
        String codename = "Operation " + rng.pick(ADJECTIVES) + " " + rng.pick(NOUNS);
        String area = rng.pick(AREAS);
        TimeOfDay time = rng.pick(List.of(TimeOfDay.values()));
        Weather weather = rng.chance(60) ? Weather.CLEAR : rng.chance(50) ? Weather.RAIN : Weather.FOG;
        Environment env = new Environment(time, weather);

        ObjectiveType primary = rng.chance(50) ? ObjectiveType.RETRIEVE_INTEL : ObjectiveType.ELIMINATE_HVT;
        List<ObjectiveType> rest = Arrays.stream(ObjectiveType.values()).filter(o -> o != primary).toList();
        ObjectiveType secondary = rng.pick(rest);

        TacticalMap map = MapGenerator.generate(rng);
        boolean hvt = primary == ObjectiveType.ELIMINATE_HVT || secondary == ObjectiveType.ELIMINATE_HVT;
        List<Mission.EnemySpawn> spawns = placeEnemies(map, rng, number, hvt);

        int reinforceTurn = 0, reinforceCount = 0;
        if (rng.chance(55)) {
            reinforceTurn = rng.range(5, 8);
            reinforceCount = rng.range(2, 3);
        }
        return new Mission(number, seed, codename, area, env, primary, secondary, map, spawns, reinforceTurn, reinforceCount);
    }

    private static List<Mission.EnemySpawn> placeEnemies(TacticalMap map, Rng rng, int number, boolean hvt) {
        Set<Hex> reach = MapGenerator.reachableFrom(map, map.insertionZone.iterator().next());
        Set<Hex> taken = new HashSet<>();
        taken.add(map.objective);
        List<Mission.EnemySpawn> out = new ArrayList<>();

        if (hvt) {
            List<Hex> inner = map.compoundInterior.stream().filter(h -> !taken.contains(h)).toList();
            Hex h = inner.isEmpty() ? map.objective : rng.pick(inner);
            taken.add(h);
            out.add(new Mission.EnemySpawn(h, Item.SMG, true));
        }

        int guards = Math.min(5 + (number - 1) / 2, 9);
        // Two guards close to the objective...
        List<Hex> near = reach.stream()
                .filter(h -> !taken.contains(h) && h.distance(map.objective) <= 3)
                .sorted(Comparator.comparingInt((Hex h) -> h.distance(map.objective)).thenComparingInt(Hex::q).thenComparingInt(Hex::r))
                .toList();
        for (int i = 0; i < 2 && i < near.size(); i++) {
            Hex h = near.get(Math.min(near.size() - 1, i * 2 + rng.index(2)));
            if (taken.add(h)) out.add(new Mission.EnemySpawn(h, weapon(rng, number), false));
        }
        // ...the rest spread as sentries across the eastern two thirds, well clear of insertion.
        List<Hex> field = reach.stream()
                .filter(h -> h.col() >= 6 && !taken.contains(h))
                .filter(h -> map.insertionZone.stream().allMatch(z -> z.distance(h) >= 7))
                .filter(h -> map.extractionZones.values().stream().noneMatch(z -> z.contains(h)))
                .sorted(Comparator.comparingInt(Hex::q).thenComparingInt(Hex::r))
                .toList();
        int tries = 0;
        while (out.size() < guards + (hvt ? 1 : 0) && tries++ < 400 && !field.isEmpty()) {
            Hex h = rng.pick(field);
            if (taken.contains(h) || out.stream().anyMatch(s -> s.hex().distance(h) < 2)) continue;
            taken.add(h);
            out.add(new Mission.EnemySpawn(h, weapon(rng, number), false));
        }
        return out;
    }

    private static Item weapon(Rng rng, int number) {
        return rng.chance(15 + number * 3) ? Item.LMG : Item.AK;
    }
}
