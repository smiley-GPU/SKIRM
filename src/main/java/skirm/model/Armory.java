package skirm.model;

import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

public final class Armory {
    private final EnumMap<Item, Integer> stock = new EnumMap<>(Item.class);

    public int count(Item item) { return stock.getOrDefault(item, 0); }

    public void add(Item item, int n) { stock.merge(item, n, Integer::sum); }

    public void remove(Item item, int n) {
        int have = count(item);
        if (have < n) throw new IllegalStateException("Armory underflow for " + item);
        stock.put(item, have - n);
    }

    public int countSlot(Item.Slot slot) {
        int n = 0;
        for (Map.Entry<Item, Integer> e : stock.entrySet()) if (e.getKey().slot == slot) n += e.getValue();
        return n;
    }

    public Map<Item, Integer> snapshot() { return Collections.unmodifiableMap(new EnumMap<>(stock)); }
}
