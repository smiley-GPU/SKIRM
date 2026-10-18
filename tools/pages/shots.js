(() => { const S = window.SKIRM, G = () => S.G, B = () => S.G.battle, want = new URLSearchParams(location.search).get('shot'), $ = (q) => document.querySelector(q);
  const exec = () => { const sit = S.sitOf(S.cur()), ids = S.team().filter(S.ready).map((u) => u.id); for (let k = 0; k < sit.opts.length; k++) { const l = S.bestLead(sit.opts[k], ids); if (l != null && S.poolOf(sit.opts[k], [l], [], false, l).value > 0) { S.execute({ opt: k, ids: [l], lead: l, gear: [] }); return B().roll; } } };
  try {
    S.newCampaign(4242); G().rp = 30;
    const team = G().roster.filter(S.available).slice(0, 4); team.forEach((s) => { if (s.persona === 'PHILOSOPHER') s.persona = 'QUIET'; });
    S.chooseMission(0);
    const left = { ...G().armory }, lo = {};
    for (const s of team) { const c = S.CLASSES[s.cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[s.id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: null }; }
    S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' }); S.chooseLine(0); S.proceed(); S.chooseRoute(0);
    if (want === 'BACK') { S.refresh(); return; }
    S.chooseFork(0);
    if (want === 'DOTS') { S.team().forEach((u) => { u.util = 'FRAG'; }); S.refresh(); [...document.querySelectorAll('[data-act="opt"]')].find((t) => /Assault/i.test(t.textContent))?.click(); $('[data-act="gear"]')?.click(); $('[data-act="details"]').click(); return; }
    if (want === 'FAIL' || want === 'CLOSE') { if (want === 'CLOSE') B().time = 1; const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; if (want === 'FAIL') { S.refresh(); return; } S.resolve(); S.refresh(); return; }
    if (want === 'WAYS') { const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; S.resolve(); S.refresh(); return; }
    for (let t = 0; t < 40 && G().phase === 'OPERATION'; t++) { const st = S.cur(); if (st.pick == null) { S.chooseFork(0); continue; } const r = exec(); if (!r) { S.abort(); continue; } r.dice = r.dice.map(() => 6); S.resolve(); }
    if (G().phase === 'EXTRACTION') S.proceed(); if (S.interlude()) { S.chooseLine(0); S.proceed(); }
    S.proceed(); S.refresh();
    if (want === 'FILE') $('.archive [data-file="0"]').click(); // ARCH: use a tall height to see the archive below the board
  } catch (e) { document.title = 'ERR ' + e.message; }
})();
