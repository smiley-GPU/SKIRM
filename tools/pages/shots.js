(() => { const S = window.SKIRM, G = () => S.G, B = () => S.G.battle, want = new URLSearchParams(location.search).get('shot'), $ = (q) => document.querySelector(q);
  const exec = () => { const sit = S.sitOf(S.cur()), ids = S.team().filter(S.ready).map((u) => u.id); for (let k = 0; k < sit.opts.length; k++) { if (S.lockReason(sit.opts[k])) continue; const l = S.bestLead(sit.opts[k], ids); if (l != null && S.poolOf(sit.opts[k], [l], [], false, l).value > 0) { S.execute({ opt: k, ids: [l], lead: l, gear: [] }); return B().roll; } } };
  try {
    S.newCampaign(4242); G().rp = 30;
    if (['WORD', 'STAND', 'STANDEND', 'MIA'].includes(want)) { // missing in action: word on the board, the last stand, the barracks list
      const s = G().roster[5], T = window.LS_TEXT; s.alive = false; s.mia = true; s.persona = 'LONER';
      const rec = { sid: s.id, name: s.name, persona: 'LONER', loc: 'FOREST', op: 'Operation Grey Lantern', n: 1, weapon: 'DMR', officer: { name: 'Captain Rask', surname: 'Rask' }, alive: want === 'MIA', stage: want === 'MIA' ? 'RESCUE' : 'STAND', wait: 0, window: 2, legacy: false,
        trace: T.TRACE_SOURCE.INFORMANT.replace('{place}', 'the forest').replace('{detail}', T.TRACE_DETAIL.LONER) };
      G().missing.push(rec); G().memorial.push({ name: s.name, rank: 'Private', cls: s.cls, face: s.face, op: rec.op, n: 1, missing: true, by: null, line: '' });
      if (want === 'MIA') { const u = G().roster[4]; u.alive = false; u.mia = true; G().missing.push({ ...rec, sid: u.id, name: u.name, stage: 'UNKNOWN', loc: 'COAST' }); S.rescueMission(G().base.offers[0], rec); G().base.offers[0].loc = 'FOREST'; S.refresh(); $('[data-tab="BARRACKS"]')?.click(); return; }
      S.refresh(); if (want === 'WORD') return;
      $('[data-stand]').click(); $('#opinfo [data-beat]').click(); $('#opinfo [data-beat]').click();
      if (want === 'STANDEND') $('#opinfo [data-end="OFFICER"]').click();
      return;
    }
    const team = G().roster.filter(S.available).slice(0, 4); team.forEach((s) => { if (s.persona === 'PHILOSOPHER') s.persona = 'QUIET'; });
    if (want === 'GEAR' || want === 'SUPPORT') { // the briefing with the new slots, or the support assets
      Object.assign(G().base.lv, { BARRACKS: 2, ENG: 3, CMD: 3 }); Object.assign(G().armory, { SHOTGUN: 1, REBREATHER: 1, STIM: 2, SLUG: 1, BREACHING: 1 });
      S.chooseMission(0); S.buyAsset('OVERWATCH'); S.refresh();
      if (want === 'GEAR') { document.querySelector('[data-step="1"]')?.click(); const sel = document.querySelector('select[data-slot="WEAPON"]'); if (sel) { sel.value = 'SHOTGUN'; sel.dispatchEvent(new Event('change')); } }
      return;
    }
    S.chooseMission(0);
    const left = { ...G().armory }, lo = {};
    for (const s of team) { const c = S.CLASSES[s.cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[s.id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: null }; }
    S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' }); S.chooseLine(0); S.proceed(); S.chooseRoute(0);
    if (want === 'BACK') { S.refresh(); return; }
    S.chooseFork(0);
    if (want === 'DOTS') { S.team().forEach((u) => { u.util = 'FRAG'; }); S.refresh(); [...document.querySelectorAll('[data-act="opt"]')].find((t) => /Assault/i.test(t.textContent))?.click(); $('[data-act="gear"]')?.click(); $('[data-act="details"]').click(); return; }
    if (want === 'FAIL' || want === 'CLOSE') { if (want === 'CLOSE') B().time = 1; const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; if (want === 'FAIL') { S.refresh(); return; } S.resolve(); S.refresh(); return; }
    if (want === 'DOWN') { const v = S.team()[1]; S.knockOut(v, `${v.name} is hit and goes down.`); S.team()[0].util = 'MEDKIT'; S.refresh(); return; }
    if (want === 'WAYS') { const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; S.resolve(); S.refresh(); return; }
    for (let t = 0; t < 40 && G().phase === 'OPERATION'; t++) { const st = S.cur(); if (st.pick == null) { S.chooseFork(0); continue; } const r = exec(); if (!r) { S.abort(); continue; } r.dice = r.dice.map(() => 6); S.resolve(); }
    if (G().phase === 'EXTRACTION') S.proceed(); if (S.interlude()) { S.chooseLine(0); S.proceed(); }
    if (want === 'HOME') { const s = G().roster[5]; G().debrief.home = [{ sid: s.id, name: s.name, face: s.face, cls: s.cls, spec: s.spec, out: 2, words: window.LS_TEXT.RESCUED.GUARDIAN[1], opts: [{ kind: 'SCAR', id: 'NIGHT_EYES' }, { kind: 'SCAR', id: 'RESTLESS' }], chosen: null }]; S.refresh(); return; }
    S.proceed(); S.refresh();
    if (want === 'FILE') $('.archive [data-file="0"]').click(); // ARCH: use a tall height to see the archive below the board
  } catch (e) { document.title = 'ERR ' + e.message; }
})();
