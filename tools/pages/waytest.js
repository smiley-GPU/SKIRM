// Every way out, on many missions: open it with a failure, take it, and check the stage moved on and the price was paid.
(() => {
  const S = window.SKIRM, G = () => S.G, res = {}, errs = [];
  const IDS = ['DETOUR', 'BLAST', 'DEMOLITIONS', 'MARKSMAN', 'CQB', 'DIVER', 'MOUNTAINEER', 'INFILTRATOR', 'SIGNALS', 'LINGUIST', 'PATHFINDER', 'ENDURANCE', 'FORCE'];
  const toStage = (seed, mi) => {
    S.newCampaign(seed); G().rp = 40;
    S.chooseMission(mi % G().base.offers.length);
    const team = G().roster.filter(S.available).slice(0, 4).map((s) => s.id), left = { ...G().armory }, lo = {};
    for (const id of team) { const c = S.CLASSES[G().roster.find((s) => s.id === id).cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: f(c.kits) }; }
    S.launch({ team, loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' });
    { const it = S.interlude(); if (it) { S.chooseLine(0); if (!S.interDone(it)) S.chooseLine(it.opts.findIndex((o, k) => k !== 0 && o.topic !== it.opts[0].topic)); } }
    S.proceed();
    S.chooseRoute(0);
    if (S.cur().pick == null) S.chooseFork(0);
  };
  for (let seed = 1; seed <= 60; seed++) for (let mi = 0; mi < 2; mi++) for (const id of IDS) {
    try {
      toStage(seed, mi);
      if (G().phase !== 'OPERATION') continue;
      const b = G().battle;
      for (let hop = 0; hop < 3 && G().phase === 'OPERATION'; hop++) { // try at the perimeter, then further in
        const st = S.cur(); st.failed = 1;
        const w = S.waysOut().find((x) => x.id === id);
        if (!w) { if (S.cur().kind === 'OBJECTIVE' || S.cur().kind === 'EXFIL') break; S.wayOut('FORCE', (() => { const g = S.gearChoices('ANY')[0]; return g ? { uid: g.uid, slot: g.slot } : null; })()); continue; }
        const before = { stage: b.stage, time: b.time, alert: b.alert, gear: S.gearChoices('ANY').length, pick: st.pick, planB: !!b.planB };
        const gc = w.pick ? S.gearChoices(w.pick) : [];
        S.wayOut(id, gc.length ? { uid: gc[0].uid, slot: gc[0].slot } : null);
        const moved = id === 'DETOUR' ? st.pick !== before.pick && b.stage === before.stage : (b.stage > before.stage || G().phase !== 'OPERATION');
        if (!moved) errs.push(`${id} s${seed}: did not move on`);
        if (id === 'DETOUR' && b.time !== before.time - (b.planB && !before.planB ? 0 : 1)) errs.push(`DETOUR s${seed}: time ${before.time}->${b.time}`);
        if (['FORCE', 'LINGUIST'].includes(id) && G().phase === 'OPERATION' && S.gearChoices('ANY').length >= before.gear) errs.push(`${id} s${seed}: no gear lost`);
        res[id] = (res[id] || 0) + 1;
        break;
      }
    } catch (e) { errs.push(`${id} s${seed}: ${e.message}`); }
  }
  // push complications: force a push on a failed roll and check each 1 produced a line
  let comps = 0;
  for (let seed = 1; seed <= 40; seed++) {
    try {
      toStage(seed, 0);
      const st = S.cur(), sit = S.sitOf(st), units = S.team().filter(S.ready).map((u) => u.id);
      const lead = S.bestLead(sit.opts[0], units); if (lead == null) continue;
      S.execute({ opt: 0, ids: [lead], lead, gear: [] });
      const r = G().battle.roll;
      if (S.outcomeOf(r) === 'PARTIAL') { S.push(); const ones = r.rerolled.filter((i) => r.dice[i] === 1).length; if ((r.comp || []).length !== ones) errs.push(`push s${seed}: ${ones} ones, ${(r.comp || []).length} complications`); comps += ones; }
    } catch (e) { errs.push(`push s${seed}: ${e.message}`); }
  }
  const lines = [`${errs.length ? 'FAIL' : 'PASS'} every way past moves the stage on and charges its price (${Object.values(res).reduce((a, n) => a + n, 0)} taken, ${errs.length} problems)`, ...errs.slice(0, 25).map((e) => 'FAIL ' + e), 'taken: ' + JSON.stringify(res)];
  const p = document.createElement('pre'); p.id = 'wt'; p.textContent = lines.join('\n'); document.body.append(p);
})();
