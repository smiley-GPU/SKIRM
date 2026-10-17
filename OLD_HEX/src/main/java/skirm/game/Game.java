package skirm.game;

import skirm.core.Hex;
import skirm.core.Rng;
import skirm.core.RuleException;
import skirm.mission.Debrief;
import skirm.mission.Mission;
import skirm.mission.MissionGenerator;
import skirm.mission.Transit;
import skirm.model.Intel;
import skirm.model.Item;
import skirm.model.Loadout;
import skirm.model.Soldier;
import skirm.model.Vehicle;
import skirm.tactical.ActionType;
import skirm.tactical.Battle;
import skirm.tactical.BattleEvent;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * Facade and phase state machine. Every public method is a command; illegal commands throw
 * RuleException and leave state untouched (validate fully, then commit).
 */
public final class Game {
    public static final int MAX_TEAM = 4;

    public record LaunchOrder(List<Integer> team, Map<Integer, Loadout> loadouts, Vehicle insertion, Vehicle extraction) {}

    private Campaign campaign;
    private Phase phase;
    private Mission mission;
    private Battle battle;
    private Debrief.Report debrief;

    public Game(long seed) { newCampaign(seed); }

    public synchronized void newCampaign(long seed) {
        campaign = Campaign.create(seed);
        beginBriefing();
    }

    private void beginBriefing() {
        for (Soldier s : campaign.roster) if (s.recovery > 0) s.recovery--;
        mission = MissionGenerator.generate(campaign.missionsFlown + 1, campaign.rng.nextLong());
        battle = null;
        debrief = null;
        phase = Phase.BRIEFING;
    }

    public synchronized void buyIntel(Intel intel) {
        require(Phase.BRIEFING);
        if (mission.intel.contains(intel)) throw new RuleException(intel.label + " already acquired.");
        if (campaign.requisition < intel.cost) throw new RuleException("Not enough requisition for " + intel.label + ".");
        campaign.requisition -= intel.cost;
        mission.intel.add(intel);
    }

    public synchronized void launch(LaunchOrder o) {
        require(Phase.BRIEFING);
        if (o.team() == null || o.team().isEmpty() || o.team().size() > MAX_TEAM)
            throw new RuleException("Select between 1 and " + MAX_TEAM + " operators.");
        if (new HashSet<>(o.team()).size() != o.team().size()) throw new RuleException("Duplicate operator in team.");
        if (o.insertion() == null || o.extraction() == null) throw new RuleException("Choose insertion and extraction.");

        Map<Item, Integer> needed = new EnumMap<>(Item.class);
        List<Soldier> squad = new ArrayList<>();
        for (int id : o.team()) {
            Soldier s = campaign.soldier(id);
            if (s == null || !s.available()) throw new RuleException("Operator " + id + " is not available.");
            Loadout l = o.loadouts().get(id);
            if (l == null || l.weapon() == null) throw new RuleException(s.name + " needs a weapon.");
            if (l.weapon().slot != Item.Slot.WEAPON
                    || (l.armor() != null && l.armor().slot != Item.Slot.ARMOR)
                    || (l.utility() != null && l.utility().slot != Item.Slot.UTILITY))
                throw new RuleException("Invalid loadout for " + s.name + ".");
            for (Item i : l.items()) needed.merge(i, 1, Integer::sum);
            squad.add(s);
        }
        for (Map.Entry<Item, Integer> e : needed.entrySet())
            if (campaign.armory.count(e.getKey()) < e.getValue())
                throw new RuleException("Armory is short of " + e.getKey().label + ".");
        int cost = o.insertion().cost + o.extraction().cost;
        if (cost > campaign.requisition) throw new RuleException("Transport costs " + cost + " RP; you have " + campaign.requisition + ".");

        // Commit.
        needed.forEach(campaign.armory::remove);
        campaign.requisition -= cost;
        mission.team = List.copyOf(o.team());
        mission.loadouts = Map.copyOf(o.loadouts());
        mission.insertion = o.insertion();
        mission.extraction = o.extraction();
        battle = new Battle(mission, squad, mission.loadouts, new Rng(mission.seed * 31 + 7));
        mission.insertionReport = Transit.insertion(mission, battle);
        phase = Phase.INSERTION;
    }

    public synchronized List<BattleEvent> act(int unitId, ActionType type, Hex hex, Integer targetId) {
        require(Phase.TACTICAL);
        List<BattleEvent> ev = battle.perform(unitId, type, hex, targetId);
        afterBattleStep();
        return ev;
    }

    public synchronized List<BattleEvent> endTurn() {
        require(Phase.TACTICAL);
        List<BattleEvent> ev = battle.endTurn();
        afterBattleStep();
        return ev;
    }

    public synchronized List<BattleEvent> abort() {
        require(Phase.TACTICAL);
        List<BattleEvent> ev = battle.abort();
        afterBattleStep();
        return ev;
    }

    /** Advances through the non-interactive report screens. */
    public synchronized void proceed() {
        switch (phase) {
            case INSERTION -> phase = Phase.TACTICAL;
            case EXTRACTION -> {
                debrief = Debrief.resolve(campaign, mission, battle, battle.rng());
                phase = Phase.DEBRIEF;
            }
            case DEBRIEF -> beginBriefing();
            default -> throw new RuleException("Nothing to continue in phase " + phase + ".");
        }
    }

    private void afterBattleStep() {
        if (!battle.over()) return;
        mission.extractionReport = Transit.extraction(mission, battle);
        phase = Phase.EXTRACTION;
    }

    private void require(Phase p) {
        if (phase != p) throw new RuleException("Not allowed during " + phase + ".");
    }

    public synchronized Map<String, Object> snapshot(List<BattleEvent> events) {
        return StateView.snapshot(this, events);
    }

    public Phase phase() { return phase; }

    public Campaign campaign() { return campaign; }

    public Mission mission() { return mission; }

    public Battle battle() { return battle; }

    public Debrief.Report debrief() { return debrief; }
}
