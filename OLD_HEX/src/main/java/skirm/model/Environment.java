package skirm.model;

public record Environment(TimeOfDay time, Weather weather) {
    public enum TimeOfDay { DAY, DUSK, NIGHT }

    public enum Weather { CLEAR, RAIN, FOG }

    public int visionRange() {
        int v = switch (time) {
            case DAY -> 8;
            case DUSK -> 7;
            case NIGHT -> 5;
        };
        v -= switch (weather) {
            case CLEAR -> 0;
            case RAIN -> 1;
            case FOG -> 3;
        };
        return Math.max(3, v);
    }

    public int accuracyMod() {
        int m = switch (time) {
            case DAY -> 0;
            case DUSK -> -5;
            case NIGHT -> -10;
        };
        return m + (weather == Weather.RAIN ? -5 : 0);
    }

    /** Darkness hides an approach: scales insertion complication odds. */
    public double complicationFactor() {
        return switch (time) {
            case DAY -> 1.0;
            case DUSK -> 0.8;
            case NIGHT -> 0.6;
        };
    }

    public String summary() {
        String t = switch (time) {
            case DAY -> "Daylight";
            case DUSK -> "Dusk";
            case NIGHT -> "Night";
        };
        String w = switch (weather) {
            case CLEAR -> "clear skies";
            case RAIN -> "heavy rain";
            case FOG -> "dense fog";
        };
        return t + ", " + w + ". Visibility " + visionRange() + " hexes"
                + (accuracyMod() != 0 ? ", accuracy " + accuracyMod() + "%." : ".");
    }
}
