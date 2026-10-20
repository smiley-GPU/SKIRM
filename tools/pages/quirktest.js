(() => { const S = window.SKIRM, G = () => S.G, B = () => S.G.battle, out = [];
  const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  // a fresh mission with four operators whose personalities we choose
  const setup = (personas, seed = 4242) => {
    S.newCampaign(seed); S.chooseMission(0);
    const team = G().roster.filter(S.available).slice(0, 4);
    team.forEach((s, i) => { if (personas[i]) s.persona = personas[i]; });
    const left = { ...G().armory }, lo = {};
    for (const s of team) { const c = S.CLASSES[s.cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[s.id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: null }; }
    S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' });
    return team;
  };
  const go = () => { const it = S.interlude(); if (it) { S.chooseLine(0); if (!S.interDone(it)) S.chooseLine(it.opts.findIndex((o, k) => k !== it.pick && o.topic !== it.opts[it.pick].topic)); } S.proceed(); S.chooseRoute(0); if (S.cur().pick == null) S.chooseFork(0); };
  const roll = (dice) => { const sit = S.sitOf(S.cur()), ids = S.team().filter(S.ready).map((u) => u.id); let opt = 0, lead = null; for (let k = 0; k < sit.opts.length && lead == null; k++) { if (S.lockReason(sit.opts[k])) continue; const l = S.bestLead(sit.opts[k], ids); if (l != null && S.poolOf(sit.opts[k], [l], [], false, l).value > 0) { opt = k; lead = l; } } S.execute({ opt, ids: [lead], lead, gear: [] }); const r = B().roll; r.dice = dice(r.diff, r); return r; };
  const flop = (d, r) => { r.diff = 9; return [1]; };
  const logHas = (re) => B().log.some((e) => re.test(e.text));
  try {
    // Conviction: a believer brings one more Nerve
    { const t = setup(['STOIC', 'JOKER', 'OPTIMIST', 'QUIET']); const base = B().nerveMax; setup(['BELIEVER', 'JOKER', 'OPTIMIST', 'QUIET']); ok('Conviction adds 1 Nerve', B().nerveMax === base + 1, `${base} -> ${B().nerveMax}`); }
    // shock and Unshaken
    { setup(['JOKER', 'OPTIMIST', 'QUIET', 'VETERAN']); go(); B().nerve = 2; S.knockOut(S.team()[1], 'Test.'); ok('Shock: a teammate down costs 1 Nerve', B().nerve === 1, B().nerve); }
    { setup(['STOIC', 'OPTIMIST', 'QUIET', 'VETERAN']); go(); B().nerve = 2; S.knockOut(S.team()[1], 'Test.'); ok('Unshaken: no Nerve lost with a stoic', B().nerve === 2 && logHas(/^Unshaken:/), B().nerve); }
    // Gallows humour
    { setup(['JOKER', 'OPTIMIST', 'QUIET', 'VETERAN']); go(); for (const u of S.team()) u.fat = 5; S.rest(); ok('Gallows humour: rest recovers 3', S.team().every((u) => u.fat === 2), S.team().map((u) => u.fat).join()); }
    // Accepts the odds: once, not after a push
    { setup(['FATALIST', 'JOKER', 'QUIET', 'VETERAN']); go(); B().nerve = 0; roll(flop); S.resolve(); const n1 = B().nerve;
      if (G().phase === 'OPERATION' && B().state === 'PLAN') { roll(flop); S.resolve(); }
      ok('Accepts the odds: +1 Nerve once', n1 === 1 && B().nerve <= 1, `${n1} then ${B().nerve}`); }
    // Silver lining: the first failure tires nobody but the lead's own effort
    { setup(['OPTIMIST', 'JOKER', 'QUIET', 'VETERAN']); go(); const sit = S.sitOf(S.cur()), ids = S.team().filter(S.ready).map((u) => u.id).slice(0, 2);
      const oi = sit.opts.findIndex((o) => S.poolOf(o, ids, [], false, ids[0]).value > 0); S.execute({ opt: oi, ids, lead: ids[0], gear: [] }); B().roll.dice = B().roll.dice.map(() => 1); B().roll.diff = 9; const sup = S.unitById(ids[1]), f0 = sup.fat; S.resolve();
      ok('Silver lining: supporter not tired by the first failure', sup.fat === f0 && logHas(/^Silver lining:/), `${f0} -> ${sup.fat}`); }
    // Clean work
    { setup(['PERFECTIONIST', 'JOKER', 'QUIET', 'VETERAN']); go(); const p = S.team()[0], sit = S.sitOf(S.cur()); p.inj = []; p.fat = 0;
      const oi = sit.opts.findIndex((o) => S.poolOf(o, [p.id], [], false, p.id).value > 0); B().cleanUsed = true; S.execute({ opt: oi, ids: [p.id], lead: p.id, gear: [] });
      const r = B().roll; r.diff = 3; r.dice = [6, 6, 1]; r.clean = false; B().cleanUsed = false; S.cleanWork(r);
      ok('Clean work: partial becomes success', S.outcomeOf(r) === 'SUCCESS' && B().cleanUsed);
      const r2 = { ...r, clean: false }; S.cleanWork(r2); ok('Clean work: once a mission', S.outcomeOf(r2) === 'PARTIAL'); }
    { setup(['LONER', 'JUNKIE', 'GLORY', 'HOMESICK']); go(); const sit = S.sitOf(S.cur()), [a, b2, c, d] = S.team();
      ok('Works alone: +1 die solo', S.poolOf(sit.opts[0], [a.id], [], false, a.id).parts.some((p) => p.label === 'Works alone'));
      ok('Works alone: not with support', !S.poolOf(sit.opts[0], [a.id, b2.id], [], false, a.id).parts.some((p) => p.label === 'Works alone'));
      b2.streak = true; ok('Hot streak: +1 die', S.leadBonuses(b2, sit.opts[0].skill).some((p) => p.label === 'Hot streak'));
      const st = S.cur(), kind = st.kind; st.kind = 'OBJECTIVE'; ok('Big finish at the objective', S.leadBonuses(c, 'ASSAULT').some((p) => p.label === 'Big finish'));
      st.kind = 'EXFIL'; ok('Homeward at exfil', S.leadBonuses(d, 'STEALTH').some((p) => p.label === 'Homeward')); st.kind = kind; }
    // Silent and Carries the wounded
    { setup(['QUIET', 'GUARDIAN', 'JOKER', 'VETERAN']); go(); const st = S.cur(), sit = S.sitOf(st), o = sit.opts.find((x) => x.skill === 'STEALTH') || { ...sit.opts[0], skill: 'STEALTH' };
      const [q, g, j, v] = S.team(); for (const u of [q, g, j, v]) { u.cls = 'HEAVY'; S.G.roster.find((s) => s.id === u.sid).spec = 'ENDURANCE'; }
      const noise = (ids) => (S.difficulty(st, sit, o, ids).mods.find((m) => /^Noise/.test(m.label)) || { label: 'Noise: 0' }).label;
      ok('Silent: the quiet one adds no noise', noise([q.id, g.id, j.id]) === 'Noise: 0' && /Noise: 3 /.test(noise([v.id, g.id, j.id])), noise([q.id, g.id, j.id]) + ' / ' + noise([v.id, g.id, j.id]));
      v.downed = true; const mods = S.difficulty(st, sit, o, [q.id]).mods;
      ok('Carries the wounded: no penalty with a guardian', !mods.some((m) => m.label === 'Carrying wounded') && mods.some((m) => /carries the wounded/.test(m.label))); }
    // Reads the signs
    { let held = 0, n = 0; for (let seed = 1; seed < 30; seed++) { setup(['SUPERSTITIOUS', 'JOKER', 'QUIET', 'VETERAN'], seed); n++; const e = G().mission.env; if (e.weather === e.forecast && e.turnAt == null) held++; }
      ok('Reads the signs: forecast always right, no turn', held === n, `${held}/${n}`); }
    // Two minds
    { setup(['PHILOSOPHER', 'JOKER', 'QUIET', 'VETERAN']); const it = S.interlude(); ok('Two minds offered', it.two);
      S.chooseLine(0); let refused = false; try { S.proceed(); } catch (e) { refused = /second/.test(e.message); } ok('Two minds: must keep a second', refused);
      let same = false; const dup = it.opts.findIndex((o, k) => k !== 0 && o.topic === it.opts[0].topic); if (dup >= 0) { try { S.chooseLine(dup); } catch (e) { same = true; } } else same = true; ok('Two minds: second must be another topic', same);
      S.chooseLine(it.opts.findIndex((o, k) => k !== 0 && o.topic !== it.opts[0].topic)); ok('Two minds: two omens', S.omens().length === 2 && S.interDone(it)); S.proceed(); ok('Two minds: proceeds', G().phase === 'OPERATION'); S.refresh(); }
    // Plan B
    { setup(['PLANNER', 'JOKER', 'QUIET', 'VETERAN']); go();
      const sol = (u) => G().roster.find((s) => s.id === u.sid), pl = S.team().find((u) => sol(u).persona === 'PLANNER');
      for (const u of S.team()) if (u !== pl && sol(u).spec === 'INFILTRATOR') sol(u).spec = 'ENDURANCE';
      sol(pl).spec = 'INFILTRATOR'; const offered = [];
      for (let t = 0; t < 12 && G().phase === 'OPERATION' && !B().over && offered.length < 3; t++) {
        const st = S.cur(); if (st.kind === 'APPROACH') { S.chooseRoute(0); continue; } if (st.pick == null) { S.chooseFork(0); continue; }
        st.failed = 1; const w = S.waysOut().find((x) => x.id === 'INFILTRATOR'); offered.push(w ? w.price : null);
        if (w) S.wayOut('INFILTRATOR'); else break; }
      ok('Plan B: the planner\'s trick works twice, then no more', offered.length === 3 && offered[0] && /Plan B/.test(offered[1] || '') && offered[2] === null, JSON.stringify(offered)); }
    // Keeps kit safe
    { setup(['GEARHEAD', 'JOKER', 'QUIET', 'VETERAN']); go(); const g = S.team()[0]; g.util = 'MEDKIT'; ok('Keeps kit safe: water cannot take their gear', !S.gearChoices('WET').some((c) => c.uid === g.id)); }
    // Rookie grows up
    { S.newCampaign(7); const s = G().roster[0]; for (const x of G().roster) if (x.persona === 'AVENGER') x.persona = 'STOIC'; s.persona = 'ROOKIE'; s.rec = { lost: 1 }; s.xp = 25; const note = S.growUp(s);
      ok('Rookie grows up: lost a teammate -> Avenger', s.persona === 'AVENGER' && /Avenger|avenger/.test(note), s.persona + ' ' + note);
      for (const x of G().roster.slice(2)) if (['FATALIST', 'GLORY', 'GUARDIAN', 'VETERAN'].includes(x.persona)) x.persona = 'QUIET'; const t = G().roster[1]; t.persona = 'ROOKIE'; t.rec = { lost: 1 }; S.growUp(t); ok('Rookie grows up: taken passes down the list', t.persona === 'FATALIST', t.persona); }
    ok('No Rookie hired above Private', (() => { S.newCampaign(9); G().rp = 99; G().base.lv.BARRACKS = 3; for (let i = 0; i < 6; i++) { try { S.enlist('SCOUT', 2); } catch (e) {} } return !G().roster.some((s) => s.persona === 'ROOKIE' && s.xp >= 20); })());
    // the details window shows the quirk
    { S.newCampaign(4242); S.refresh(); const s = G().roster[0]; document.querySelector(`.face[data-sid="${s.id}"]`)?.click(); const d = document.querySelector('#opinfo');
      ok('Details window shows the quirk', !!d?.open && d.textContent.includes(S.PERSONAS[s.persona].q.label)); d?.close(); }
  } catch (e) { out.push('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'qt'; p.textContent = out.join('\n'); document.body.append(p);
})();
