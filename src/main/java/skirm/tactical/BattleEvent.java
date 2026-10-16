package skirm.tactical;

import skirm.core.Hex;

import java.util.List;

/**
 * Something the player may know happened. Events are fog-filtered at emit time, so the
 * client can animate and log them without ever learning hidden information.
 */
public record BattleEvent(String type, String text, Integer unit, List<Hex> path, Hex from, Hex to,
                          Integer amount, Boolean hit) {

    static BattleEvent info(String text) { return new BattleEvent("info", text, null, null, null, null, null, null); }

    static BattleEvent turn(String text) { return new BattleEvent("turn", text, null, null, null, null, null, null); }

    static BattleEvent alert(String text) { return new BattleEvent("alert", text, null, null, null, null, null, null); }

    static BattleEvent move(int unit, List<Hex> path, String text) {
        return new BattleEvent("move", text, unit, List.copyOf(path), null, null, null, null);
    }

    static BattleEvent shot(int unit, Hex from, Hex to, boolean hit, int dmg, String text) {
        return new BattleEvent("shot", text, unit, null, from, to, dmg, hit);
    }

    static BattleEvent grenade(int unit, Hex from, Hex to, String text) {
        return new BattleEvent("grenade", text, unit, null, from, to, null, null);
    }

    static BattleEvent damage(int unit, Hex at, int amount, String text) {
        return new BattleEvent("damage", text, unit, null, null, at, amount, true);
    }

    static BattleEvent kill(int unit, Hex at, String text) {
        return new BattleEvent("kill", text, unit, null, null, at, null, null);
    }

    static BattleEvent heal(int unit, Hex at, int amount, String text) {
        return new BattleEvent("heal", text, unit, null, null, at, amount, null);
    }

    static BattleEvent mark(String type, int unit, Hex at, String text) {
        return new BattleEvent(type, text, unit, null, null, at, null, null);
    }
}
