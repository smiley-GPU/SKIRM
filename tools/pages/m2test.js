// Milestone 2 (missing in action): left behind is missing, word comes later, rescues, the last stand.
(() => { const S = window.SKIRM, G = () => S.G, out = [], $ = (q) => document.querySelector(q);
  const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  const lo = (ids) => Object.fromEntries(ids.map((id) => [id, { weapon: null, armor: null, utility: null, kit: null }]));
  const fly = (i, plan) => { // launch offer i with up to four operators, run plan(battle), then get to the debrief
    S.chooseMission(i); const team = G().roster.filter(S.available).slice(0, 4).map((s) => s.id);
    S.launch({ team, loadouts: lo(team), insertion: 'FOOT', extraction: 'FOOT' });
    const it = S.interlude(); S.chooseLine(0); if (!S.interDone(it)) S.chooseLine(it.opts.findIndex((o, k) => k !== 0 && o.topic !== it.opts[0].topic)); S.proceed();
    plan(G().battle);
    if (G().phase === 'EXTRACTION') S.proceed();
    if (S.interlude()) { const o = S.interlude(); S.chooseLine(0); if (!S.interDone(o)) S.chooseLine(o.opts.findIndex((x, k) => k !== 0 && x.topic !== o.opts[0].topic)); S.proceed(); }
    return G().debrief;
  };
  const leaveOneBehind = () => { S.chooseRoute(0); const u = S.team()[0]; S.knockOut(u, `${u.name} goes down.`); S.abort(); return u; };
  const toBase = () => { while (G().recruits > 0) S.enlist('SCOUT'); for (const h of G().debrief.home || []) if (h.chosen == null) S.rescueChange(h.sid, 0); S.proceed(); };
  try {
    S.newCampaign(777);
    // 1. Down and left behind: missing, not dead
    let lostName; const d1 = fly(0, () => { lostName = leaveOneBehind().name; });
    const rec = G().missing.find((r) => r.name === lostName);
    ok('Left behind while down: MIA, not KIA', d1.soldiers.find((s) => s.name === lostName)?.status === 'MIA', d1.soldiers.map((s) => s.status).join());
    ok('A missing file is opened, fate unknown', !!rec && rec.stage === 'UNKNOWN' && typeof rec.alive === 'boolean');
    ok('The debrief says nobody knows yet', d1.notes.some((n) => /missing in action. Nobody knows yet/.test(n)));
    ok('The wall lists them MIA', G().memorial.some((f) => f.name === lostName && f.missing));
    toBase();
    S.refresh(); document.querySelector('[data-tab="BARRACKS"]')?.click();
    ok('The barracks lists them as missing', /Missing in action/.test($('#view').textContent));
    // 2. Word comes: alive (forced), reported after the third mission without a trace
    rec.alive = true; rec.wait = 2;
    const d2 = fly(0, () => { S.chooseRoute(0); S.abort(); });
    ok('No word in time: a report comes anyway, and they are alive', rec.stage === 'RESCUE' && !!rec.src && d2.notes.some((n) => /second objective: bring/.test(n)), `${rec.stage} ${rec.src}`);
    ok('Trace text is filled in', !/[{}]|undefined/.test(rec.trace || '{'), rec.trace);
    toBase();
    const ri = G().base.offers.findIndex((m) => m.rescue === rec.sid);
    ok('Exactly one offer carries the rescue, in the region where they were lost', ri >= 0 && G().base.offers.filter((m) => m.rescue != null).length === 1 && G().base.offers[ri]?.loc === rec.loc);
    const rm = G().base.offers[ri];
    ok('The rescue offer has the holding site and the objective', rm?.secondary === 'RESCUE' && rm.route.some((st) => st.choices[0] === 'HOLD'));
    // 3. Fly the rescue: pass the holding site, then the exfil
    const d3 = fly(ri, (b) => {
      S.chooseRoute(0); const at = b.stages.findIndex((st) => st.choices[0] === 'HOLD'); b.stage = at; S.passStage(S.team()[0], false);
      ok('Freeing them is logged', !!G().battle.rescued && G().battle.log.some((e) => /is alive: thin/.test(e.text)));
      for (let g = 0; g < 6 && G().phase === 'OPERATION'; g++) S.passStage(S.team().find(S.active), false);
    });
    const home = (d3.home || [])[0], s = G().roster.find((x) => x.id === rec.sid);
    ok('The rescue succeeds and they come home', !!home && rec.stage === 'HOME' && s.alive && s.recovery > 0, `${rec.stage} home=${!!home} phase=${G().phase}`);
    ok('Rescue objective done', !!d3.objectives[1].ok);
    ok('Two changes offered, and Back waits for a choice', home?.opts.length === 2 && (() => { try { S.proceed(); return false; } catch (e) { return e instanceof S.Rule; } })());
    const before = s.persona, pk = home.opts.findIndex((o) => o.kind === 'PERSONA'); S.rescueChange(rec.sid, pk);
    ok('A personality change takes', s.persona !== before && s.persona === home.opts[pk]?.id, `${before} -> ${s.persona}`);
    ok('Off the wall, marked home in the file', !G().memorial.some((f) => f.name === s.name) && G().archive.some((a) => a.fallen.some((x) => x.name === s.name && x.home)));
    toBase();
    // 4. Found dead: the last stand at base
    let deadName; fly(0, () => { deadName = leaveOneBehind().name; });
    const dr = G().missing.find((r) => r.name === deadName); dr.alive = false; dr.wait = 2;
    toBase(); dr.legacy = false; fly(0, () => { S.chooseRoute(0); S.abort(); });
    ok('Word that they are dead: the last stand waits', dr.stage === 'STAND' && !/[{}]|undefined/.test(dr.trace || '{'), dr.stage);
    dr.legacy = false; toBase();
    let blocked = false; try { S.chooseMission(0); } catch (e) { blocked = e instanceof S.Rule; }
    ok('The board waits until their last hours are heard', blocked);
    S.refresh(); ok('The board shows the word card', !!$('[data-stand]'));
    $('[data-stand]').click(); ok('The dialog opens on their story', $('#opinfo').open && /last hours/.test($('#opinfo').textContent));
    $('#opinfo [data-beat]').click(); $('#opinfo [data-beat]').click();
    ok('Two beats played, then the final choice', dr.beats.length === 2 && $('#opinfo [data-end]') != null);
    const rp = G().rp; $('#opinfo [data-end="INTEL"]').click();
    ok('Getting the intel out: +RP and a free intel', dr.stage === 'FALLEN' && G().rp === rp + S.MIA.STAND_RP && G().freeIntel === true, `${dr.stage} ${G().rp - rp}`);
    ok('The wall and the file say how it ended', G().memorial.some((f) => f.name === deadName && !f.missing && /Found dead/.test(f.fate || '')) && G().archive.some((a) => a.fallen.some((x) => x.name === deadName && x.story?.length >= 8)));
    $('#opinfo').close();
    S.chooseMission(0); const free = S.intelCost('SATELLITE'); S.buyIntel('SATELLITE');
    ok('Free intel is free, once', free === 0 && !G().freeIntel && S.intelCost('METEO') > 0);
    S.backToBase();
    // 5. Every personality's last stand reads cleanly, with every ending
    const sid = G().roster[0].id, bad = [];
    for (const p of Object.keys(S.PERSONAS)) for (const end of ['INTEL', 'OFFICER', 'LEGACY']) for (const beats of [[0, 0], [1, 1]]) {
      const txt = S.standStory({ sid, name: 'Ana Test', persona: p, loc: 'COAST', beats, end, weapon: 'LMG', officer: end === 'OFFICER' ? { name: 'Captain Rask' } : null });
      if (txt.length !== 8 || txt.some((t) => /[{}]|undefined|null/.test(t) || /(^|[.!?]\s)[a-z]/.test(t))) bad.push(`${p}/${end}`);
    }
    ok('All 20 last stands fill in, every ending, sentences capitalised', !bad.length, bad.slice(0, 4).join(' '));
    // 6. Officer and legacy endings
    G().nemeses.push({ name: 'Major Rask', surname: 'Rask', rank: 2, trait: 'BRUTE', loot: 'DMR', escapes: 1, from: 'Operation Test' });
    const o1 = { sid: G().roster[1].id, name: G().roster[1].name, persona: 'GUARDIAN', loc: 'FOREST', op: 'Operation Test', n: 1, weapon: 'SMG', officer: { name: 'Major Rask', surname: 'Rask' }, alive: false, stage: 'STAND', beats: [0, 1], legacy: false };
    G().missing.push(o1); S.standEnd(o1.sid, 'OFFICER');
    ok('Taking a returning officer with them: gone for good', !G().nemeses.some((x) => x.surname === 'Rask') && G().slain.includes('Rask'));
    const o2 = { ...o1, sid: G().roster[2].id, name: G().roster[2].name, persona: 'JOKER', officer: null, stage: 'STAND', end: null, legacy: true };
    G().missing.push(o2); let noOff = false; try { S.standEnd(o2.sid, 'OFFICER'); } catch (e) { noOff = e instanceof S.Rule; } S.standEnd(o2.sid, 'LEGACY');
    const leg = G().legacy.find((l) => l.id === `LEGACY${o2.sid}`);
    ok('Legacy instead of the officer, not both', noOff && !!leg && G().armory[leg.id] === 1 && /^Punchline \(.+'s legacy\)$/.test(S.ITEMS[leg.id].label), leg && S.ITEMS[leg.id].label);
    ok('A legacy SMG fights as an SMG, for any class that carries one', S.kindOf(leg.id) === 'SMG' && S.classGear('SCOUT', 'weapons').includes(leg.id) === S.CLASSES.SCOUT.weapons.includes('SMG'));
    const o3 = { ...o1, sid: G().roster[3].id, name: G().roster[3].name, officer: null, stage: 'STAND', end: null };
    G().missing.push(o3); S.standEnd(o3.sid, 'OFFICER');
    ok('With no officer to take, the next one is wounded', G().base.offers.filter((m) => m.officer).every((m) => m.officer.trait === 'WOUNDED') && (G().base.offers.some((m) => m.officer) || G().woundNext));
    // 7. Saves: the new state is in the save
    const saved = JSON.stringify(G()); ok('Missing files and legacy weapons are in the save', /"missing":\[/.test(saved) && /"legacy":\[\{/.test(saved));
  } catch (e) { out.push('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'm2'; p.textContent = out.join('\n'); document.body.append(p);
})();
