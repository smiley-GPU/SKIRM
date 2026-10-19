// Soak bot: 30 campaigns x 5 missions, always takes the best odds. Prints SOAK {json} in <pre id="soak">.
(() => {
  const S = window.SKIRM, out = [], stats = { missions: 0, wins: 0, kia: 0, mia: 0, ops: 0, tiers: { 1: 0, 2: 0, 3: 0 }, out: 0, passOut: 0, bledOut: 0, hitDown: 0,
    tests: 0, s: 0, p: 0, f: 0, fieldCare: 0, kits: 0, recov: 0, errors: [], costs: { ALERT: 0, TIME: 0, WOUND: 0 }, renders: 0 };
  const G = () => S.G;
  const tierOf = (name) => { const k = Object.keys(S.INJURIES).find((x) => S.INJURIES[x].label === name); return k ? S.INJURIES[k].tier : 0; };
  const render = () => { S.refresh(); stats.renders++; };
  function loadouts(team) {
    const left = { ...G().armory }, lo = {};
    for (const id of team) {
      const c = S.CLASSES[G().roster.find((s) => s.id === id).cls], first = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; };
      lo[id] = { weapon: first(c.weapons), armor: first(c.armor), utility: first(c.utility), kit: first(c.kits) };
    }
    return lo;
  }
  function subsets(a) { const r = []; for (let m = 1; m < 1 << a.length; m++) { const s = a.filter((_, i) => m & (1 << i)); if (s.length <= 3) r.push(s); } return r; }
  function bestPlan() {
    const st = S.cur(), sit = S.sitOf(st), units = S.team().filter(S.ready), b = G().battle;
    let best = null;
    sit.opts.forEach((opt, i) => {
      if (1 + (opt.time || 0) > b.time || S.lockReason(opt)) return;
      for (const ids of subsets(units.map((u) => u.id))) {
        const lead = S.bestLead(opt, ids);
        if (lead == null) continue;
        if (opt.need) stats.specOffered++;
        const gear = ids.filter((id) => { const u = S.team().find((x) => x.id === id); return u.util === 'FRAG' && opt.skill === 'ASSAULT' || u.util === 'BREACH' && ['TECH', 'ASSAULT'].includes(opt.skill); });
        for (const g of [[], gear]) {
          const pool = S.poolOf(opt, ids, g, false, lead), diff = S.difficulty(st, sit, opt, ids), o = S.odds(pool.value, diff.value);
          if (pool.value < 1) continue;
          const score = o.s + 0.5 * o.p - g.length * 0.05 - ids.length * 0.01;
          if (!best || score > best.score) best = { score, opt: i, ids, lead, gear: g };
        }
      }
    });
    return best;
  }
  function care() {
    const b = G().battle;
    for (const t of S.team()) {
      if (!(S.active(t) || t.downed)) continue;
      const need = S.worstNeed(t);
      if (!need) continue;
      const medic = S.team().find((u) => u.cls === 'MEDIC' && S.active(u) && !b.revived.includes(u.id));
      if (medic && S.fieldCareNeed(t)) { S.fieldCare(medic.id, t.id); stats.fieldCare++; continue; }
      if (need === 'MINOR') continue;
      const kit = S.team().find((u) => S.active(u) && u.util === 'MEDKIT');
      if (kit) { S.treat(kit.id, t.id); stats.kits++; }
    }
  }
  function operation() {
    for (let guard = 0; guard < 200 && G().phase === 'OPERATION'; guard++) {
      const b = G().battle, st = S.cur();
      if (b.state === 'ROLLED') {
        const r = b.roll;
        if (S.outcomeOf(r) !== 'SUCCESS' && !r.pushed && b.alert < 5 && b.nerve > 0) { const was = S.outcomeOf(r); try { S.push(); stats.pushes = stats.pushes || {}; stats.pushes[was] = (stats.pushes[was] || 0) + 1; } catch (e) { /* no Nerve or orders */ } }
        for (let k = 0; k < 4 && S.outcomeOf(r) !== "SUCCESS" && b.nerve >= 2; k++) { const short = r.diff - r.dice.filter((d) => d >= 5).length - (r.auto || 0), key = st.kind === "OBJECTIVE" || st.kind === "EXFIL" || b.qrfIn != null; if (short > 1 && !key) break; try { S.burn(); } catch (e) { break; } stats.burns = (stats.burns || 0) + 1; }
        const rs = G().battle.lastResult?.story; if (rs && /undefined|NaN|{/.test(rs)) stats.errors.push('bad result story ' + rs);
        if (r.comp?.length) { stats.comps = (stats.comps || 0) + r.comp.length; for (const c of r.comp) if (/undefined|null/.test(c)) stats.errors.push("bad complication " + c); }
        const o = S.outcomeOf(r); stats.tests++; stats[{ SUCCESS: 's', PARTIAL: 'p', FAIL: 'f' }[o]]++;
        if (o === 'FAIL' && (S.cur().failed || 0) >= 1) { // failed here before: take a way straight from the roll
          const ws = S.waysOut(true), w = ws.find((x) => x.id === 'DETOUR') || ws.find((x) => !x.pick && x.id !== 'CQB') || ws[0];
          if (w) { const gc = w.pick ? S.gearChoices(w.pick) : []; stats.ways = stats.ways || {}; stats.ways[w.id] = (stats.ways[w.id] || 0) + 1; S.failWay(w.id, gc.length ? { uid: gc[gc.length - 1].uid, slot: gc[gc.length - 1].slot } : null); render(); continue; }
        }
        if (o === 'PARTIAL') { const c = b.time > 2 ? 'TIME' : b.alert < 5 ? 'ALERT' : 'WOUND'; stats.costs[c]++; S.resolve(c); } else S.resolve();
        render();
        continue;
      }
      if (st.kind === 'APPROACH') { S.chooseRoute(0); continue; }
      if (st.pick == null) { S.chooseFork(0); continue; }
      if (b.qrfIn != null) { const at = Math.max(b.stages.findIndex((s) => s.kind === "OBJECTIVE"), b.stages.findIndex((s) => s.choices[0] === "HOLD")); if (b.stage > at || at - b.stage + 1 > b.qrfIn) { S.runForIt(); stats.ran = (stats.ran || 0) + 1; continue; } }
      if (b.timeUp) { stats.timeUp = (stats.timeUp || 0) + 1; const ws = S.waysOut(), w = ws.find((x) => !x.pick) || ws[0]; if (w) { const gc = w.pick ? S.gearChoices(w.pick) : []; S.wayOut(w.id, gc.length ? { uid: gc[0].uid, slot: gc[0].slot } : null); } else S.closeWindow(); continue; }
      care();
      { const p0 = bestPlan(), ld = p0 && S.team().find((u) => u.id === p0.lead); if (ld && S.fatState(ld) >= 2 && b.time > 3 && !S.restBlock()) { S.rest(); stats.rests++; continue; } const md = S.team().find((u) => u.cls === 'MEDIC' && S.active(u)); if (ld && S.fatState(ld) >= 2 && md && !b.secondWind) { S.secondWind(md.id); stats.winds = (stats.winds || 0) + 1; continue; } }
      const drone = S.team().find((u) => S.active(u) && u.util === 'DRONE');
      if (drone && !b.drone.used) S.launchDrone(drone.id);
      render();
      const p = bestPlan();
      const ws = S.waysOut();
      if (ws.length && (!p || (st.failed >= 2 && p.score < 0.6))) { // stuck: take a way out rather than abort
        const w = ws.find((x) => x.id === 'DETOUR') || ws.find((x) => !x.pick && x.id !== 'CQB') || ws[0], gc = w.pick ? S.gearChoices(w.pick) : [];
        stats.ways = stats.ways || {}; stats.ways[w.id] = (stats.ways[w.id] || 0) + 1;
        S.wayOut(w.id, gc.length ? { uid: gc[gc.length - 1].uid, slot: gc[gc.length - 1].slot } : null); render(); continue;
      }
      if (!p) { if (st.kind === 'OPTIONAL') S.skip(); else S.abort(); continue; }
      if (st.kind === 'OPTIONAL' && p.score < 0.5 && st.choices[0] !== 'HOLD') { S.skip(); continue; }
      if (sit0().opts[p.opt].need) stats.specUsed++;
  for (const sp of Object.keys(S.SPECS)) for (const p of Object.keys(S.PERSONAS)) if (!S.SAVE_LINES?.[sp]?.[p]) stats.errors.push(`missing save line ${sp}.${p}`);
  for (const p of Object.keys(S.PERSONAS)) if (!S.MEMORIAL?.[p]?.length) stats.errors.push(`missing memorial line ${p}`);
      S.execute({ opt: p.opt, ids: p.ids, lead: p.lead, gear: p.gear });
      render();
    }
  }
  stats.in = {}; stats.after = {}; stats.offered = {}; stats.omenUsed = 0; stats.beaten = 0; stats.hvtBack = 0; stats.traits = {}; stats.bonds = 0; stats.sigs = 0; stats.lines = 0;
  // Every personality covers every topic.
  for (const p of Object.keys(S.PERSONAS)) for (const t of Object.keys(S.TOPICS)) if (!S.LINES[p]?.[t]) stats.errors.push(`missing line ${p}.${t}`);
  let pickN = 0;
  function speak() {
    const it = S.interlude();
    if (!it) return;
    for (const o of it.opts) { stats.lines++; if (it.phase !== "IN") stats.offered[o.topic] = (stats.offered[o.topic] || 0) + 1; if (/[{}]|undefined|null/.test(o.text)) stats.errors.push(`bad text ${o.topic}: ${o.text}`); }
    const i = pickN++ % it.opts.length, o = it.opts[i];
    const tally = it.phase === "IN" ? stats.in : stats.after; tally[o.topic] = (tally[o.topic] || 0) + 1;
    S.chooseLine(i); render();
    if (it.two) { const j = it.opts.findIndex((x, k) => k !== it.pick && x.topic !== it.opts[it.pick].topic); if (j >= 0) { S.chooseLine(j); stats.twoMinds = (stats.twoMinds || 0) + 1; render(); } }
    if (!it.reveal) stats.errors.push('no reveal for ' + o.topic);
    S.proceed();
  }
  const sit0 = () => S.sitOf(S.cur());
  Object.assign(stats, { rests: 0, specOffered: 0, specUsed: 0, upgrades: 0, beds: 0, fabs: 0, repairs: 0, bp: 0, turns: 0, grounded: 0, officers: 0, officerKills: 0, fates: {}, hires: 0, trades: 0, returning: 0, wrecked: 0, grudges: 0, warlords: 0, exhausted: 0, wrongForecast: 0 });
  const ORDER = ['INTEL', 'MED', 'LOG', 'ENG', 'CMD', 'BARRACKS'];
  function base() {
    const g = G(), bs = g.base;
    for (let i = g.captives.length - 1; i >= 0; i--) if (!g.captives[i].wait) { if (g.roster.filter((s) => s.alive).length < 6 + 2 * bs.lv.BARRACKS) { S.hireCaptive(i); stats.hires++; } else { S.tradeCaptive(i); stats.trades++; } }
    for (const d of ORDER) { const lv = bs.lv[d]; if (lv < 3 && g.bp >= [0, 0, 5, 10][lv + 1]) { S.upgradeDept(d); stats.upgrades++; } }
    for (const s of g.roster) if (s.alive && s.recovery && bs.beds.length < bs.lv.MED && g.rp >= 6) { S.toggleBed(s.id); stats.beds++; }
    for (const v of Object.keys(bs.damaged)) if (g.rp >= 7) { S.repair(v); stats.repairs++; }
    if ((g.armory.MEDKIT || 0) < 2 && g.rp >= 8) { S.fabricate('MEDKIT'); stats.fabs++; }
    if ((g.armory.FRAG || 0) < 2 && g.rp >= 8) { S.fabricate('FRAG'); stats.fabs++; }
    render();
    for (const r of (g.missing || []).filter((x) => x.stage === "STAND")) { S.standPick(r.sid, 0, r.sid % 2); S.standPick(r.sid, 1, (r.sid + 1) % 2); const end = ["INTEL", r.legacy ? "LEGACY" : "OFFICER"][stats.missions % 2]; S.standEnd(r.sid, end); (stats.stands ||= {})[end] = (stats.stands[end] || 0) + 1; for (const p of r.story) if (/[{}]|undefined|null/.test(p) && stats.errors.length < 40) stats.errors.push("bad stand " + p); }
    S.chooseMission(0);
  }
  for (let c = 0; c < 30; c++) {
    S.newCampaign((window.SOAK_SEED ?? 1000) + c * 7919);
    for (let mi = 0; mi < 5; mi++) {
      try {
        render(); base(); render();
        const m = G().mission;
        if (G().rp >= 7) S.buyIntel('METEO');
        if (G().rp >= 8 && G().base.lv.INTEL >= 2) S.buyIntel('SIGINT');
        const team = G().roster.filter(S.available).sort((a, c2) => a.fatigue - c2.fatigue).slice(0, 4).map((s) => s.id);
        if (!team.length) { stats.noTeam = (stats.noTeam || 0) + 1; break; } // nobody fit to deploy: the campaign ends here
        stats.recov += G().roster.filter((s) => s.alive && !S.available(s)).length;
        const ins = !S.vehBlock(m, 'HELO', 'ins') && G().rp >= 9 && mi % 2 ? 'HELO' : 'FOOT', ext = !S.vehBlock(m, 'HELO', 'ext') && G().rp >= 9 ? 'HELO' : 'FOOT';
        if (m.officer) stats.officers++; if (m.target === 'WARLORD') stats.warlords++;
        S.launch({ team, loadouts: loadouts(team), insertion: ins, extraction: ext });
        for (const p of S.mapCheck(G().mission)) if (stats.errors.length < 40) stats.errors.push(`map ${G().mission.loc} ${ins}/${ext}: ${p}`); stats.maps = (stats.maps || 0) + 1;
        if (m.env.weather !== m.env.forecast) stats.wrongForecast++;
        render(); speak(); render();
        operation();
        if (G().mission.officer?.dead) stats.officerKills++;
        { const o = G().mission.officer; if (o?.fate) stats.fates[o.fate] = (stats.fates[o.fate] || 0) + 1; if (o?.returning) stats.returning++; if (o?.grudge) stats.grudges++; stats.wrecked += G().battle.units.filter((u) => u.wrecked?.length).length; }
        stats.exhausted += G().battle.units.filter((u) => S.fatState(u) >= 2).length;
        const om = G().battle.omen;
        if (om?.used) stats.omenUsed++; if (om?.beaten) stats.beaten++; if (om?.back) stats.hvtBack++;
        for (const e of G().battle.log) {
          if (e.kind?.startsWith("say-")) { stats.says = stats.says || {}; stats.says[e.kind] = (stats.says[e.kind] || 0) + 1; if (/[{}]|undefined|null/.test(e.text)) stats.errors.push("bad bark " + e.text); }
          { const q = Object.values(S.PERSONAS).find((p) => e.text.startsWith(p.q.label + ": ")); if (q && e.kind === "good") { stats.quirks = stats.quirks || {}; stats.quirks[q.q.label] = (stats.quirks[q.q.label] || 0) + 1; } if (/shakes the team/.test(e.text)) stats.shock = (stats.shock || 0) + 1; }
          if (/passes out from/.test(e.text)) stats.passOut++;
          if (/never wakes up/.test(e.text)) stats.bledOut++;
          if (/The weather turns/.test(e.text)) stats.turns++;
          if (/extraction window has closed/.test(e.text)) stats.timeout = (stats.timeout || 0) + 1;
          if (/no clock left/.test(e.text)) stats.overtime = (stats.overtime || 0) + 1;
          if (/QRF|Quick reaction force/.test(e.text)) stats.qrf = (stats.qrf || 0) + 1;
          if (/while unconscious/.test(e.text)) stats.hitDown++;
        }
        render(); speak(); if (G().phase === "EXTRACTION") S.proceed(); render();
        const d = G().debrief;
        if (!d) throw new Error('no debrief, phase ' + G().phase);
        for (const n of d.notes) { if (/No longer a wide-eyed rookie/.test(n)) stats.grown = (stats.grown || 0) + 1; if (/(Mentor)/.test(n)) stats.mentored = (stats.mentored || 0) + 1; if (/undefined|NaN/.test(n)) stats.errors.push("bad note " + n); }
        stats.scav = (stats.scav || 0) + d.gained.filter((g) => /scavenged/.test(g)).length;
        for (const t of [...(d.aar || []), ...(d.fallen || []).map((f) => f.line)]) if (/undefined|NaN|null|{|}/.test(t) && stats.errors.length < 40) stats.errors.push("bad story " + t);
        if (!d.aar?.length) stats.errors.push("no after-action report"); stats.fallenLines = (stats.fallenLines || 0) + (d.fallen || []).filter((f) => f.line).length;
        stats.missions++; if (d.success) stats.wins++; stats.bp += d.bp;
        { const k = G().mission.n, e = ((stats.byN ||= {})[k] ||= [0, 0, 0]), lost = d.soldiers.filter((s) => s.status === "KIA" || s.status === "MIA").length; e[1]++; if (d.success) e[0]++; e[2] += lost; if (!d.success) { const r = lost === d.soldiers.length ? "allLost" : !d.objectives[0].ok ? "objective" : "other"; (stats.why ||= {})[r] = (stats.why[r] || 0) + 1; } if (G().battle.overtime) { stats.ot = stats.ot || [0, 0]; stats.ot[1]++; if (d.success) stats.ot[0]++; } if (G().battle.qrf) { stats.qrfW = stats.qrfW || [0, 0]; stats.qrfW[1]++; if (d.success) stats.qrfW[0]++; } stats.rp = (stats.rp || 0) + d.rp; }
        if (G().mission.insReport.some((l) => /goes in on foot/.test(l)) || G().mission.extReport.some((l) => /walks out/.test(l))) stats.grounded++;
        for (const s of d.soldiers) {
          stats.ops++;
          if (s.status === 'KIA') stats.kia++; if (s.status === 'MIA') stats.mia++;
          for (const n of s.injuries) if (n === 'Knocked unconscious') stats.out++; else stats.tiers[tierOf(n)]++;
        }
        while (G().recruits > 0) S.enlist(['HEAVY', 'MEDIC', 'SCOUT', 'DRONE'][G().recruits % 4]);
        { const d2 = G().debrief; for (const h of d2.home || []) { S.rescueChange(h.sid, stats.missions % h.opts.length); stats.home = (stats.home || 0) + 1; } if (G().mission.rescue != null) stats.rescueOps = (stats.rescueOps || 0) + 1; for (const n of d2.notes) { if (/killed in action now/.test(n)) stats.miaLost = (stats.miaLost || 0) + 1; if (/has a second objective: bring/.test(n)) stats.miaAlive = (stats.miaAlive || 0) + 1; if (/[{}]|undefined|null/.test(n) && stats.errors.length < 40) stats.errors.push("bad note " + n); } }
        S.proceed(); render();
      } catch (e) { stats.errors.push(`c${c} m${mi}: ${e.message} ${e.stack?.split('\n')[1] || ''}`); break; }
    }
  }
  for (const s of G().roster) { for (const t of s.traits) stats.traits[t] = (stats.traits[t] || 0) + 1; stats.bonds += s.bonds.length; if (s.signature) stats.sigs++; }
  const pre = document.createElement('pre');
  pre.id = 'soak';
  pre.textContent = 'SOAK ' + JSON.stringify(stats, null, 1);
  document.body.appendChild(pre);
})();
