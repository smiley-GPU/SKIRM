// Milestone 1 (foundation): story text loads from data/, saves are version 5, a new campaign asks how to play.
(() => { const S = window.SKIRM, G = () => S.G, out = [], $ = (q) => document.querySelector(q);
  const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  try {
    const T = window.LS_TEXT || {};
    ok('Story text loads from the data files', ['BARKS', 'LINES', 'SAVE_LINES', 'MEMORIAL', 'BASE_LINES', 'SCENES', 'TIME_WX', 'ARRIVE', 'RESULT', 'VIA', 'WAY_PAST'].every((k) => T[k] && Object.keys(T[k]).length));
    ok('The game reads the same tables', S.LINES === T.LINES && S.SAVE_LINES === T.SAVE_LINES && S.MEMORIAL === T.MEMORIAL);
    S.newCampaign(4242); ok('New saves are version 5, open-ended by default for the test hook', G().v === 5 && G().play === 'open' && Array.isArray(G().memorial) && Array.isArray(G().archive));
    S.refresh(); ok('The base names the way of play', /Open-ended operations/.test($('#view').textContent));
    // New campaign from the menu: asks twice, then the title card offers the two ways to play
    $('#btn-menu')?.click(); $('#btn-new').click(); $('#btn-new').click();
    const modes = [...document.querySelectorAll('.title .mode')];
    ok('A new campaign asks how to play', G().play === null && modes.length === 2, `${G().play} ${modes.length}`);
    ok('The story shows but cannot be started yet', !!modes.find((m) => m.dataset.play === 'story')?.disabled && /In development/.test(modes.find((m) => m.dataset.play === 'story')?.textContent || ''));
    modes.find((m) => m.dataset.play === 'open')?.click();
    ok('Choosing open-ended starts it', G().play === 'open' && !$('.title'));
    ok('The choice is saved', JSON.parse(localStorage.getItem('skirm-ops-v2') || '{}').play === 'open');
    // a full mission still plays from start to debrief on the new save
    const team = G().roster.filter(S.available).slice(0, 4), lo = {};
    for (const s of team) lo[s.id] = { weapon: null, armor: null, utility: null, kit: null };
    S.chooseMission(0); S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' });
    const it = S.interlude(); S.chooseLine(0); if (!S.interDone(it)) S.chooseLine(it.opts.findIndex((o, k) => k !== 0 && o.topic !== it.opts[0].topic)); S.proceed();
    for (let t = 0; t < 60 && G().phase === 'OPERATION'; t++) { const st = S.cur(); if (st.kind === 'APPROACH') { S.chooseRoute(0); continue; } if (st.pick == null) { S.chooseFork(0); continue; } if (G().battle.timeUp) { S.closeWindow(); continue; }
      const sit = S.sitOf(st), ids = S.team().filter(S.ready).map((u) => u.id); let done = false;
      for (let k = 0; k < sit.opts.length && !done; k++) { if (S.lockReason(sit.opts[k]) || (1 + (sit.opts[k].time || 0) > G().battle.time && !G().battle.overtime)) continue; const l = S.bestLead(sit.opts[k], ids); if (l != null && S.poolOf(sit.opts[k], [l], [], false, l).value > 0) { S.execute({ opt: k, ids: [l], lead: l, gear: [] }); done = true; } }
      if (!done) { S.abort(); continue; } const r = G().battle.roll; S.resolve(S.outcomeOf(r) === 'PARTIAL' ? 'TIME' : undefined); }
    if (G().phase === 'EXTRACTION') S.proceed(); if (S.interlude()) { S.chooseLine(0); S.proceed(); }
    ok('A mission plays through to the debrief, with story text', G().phase === 'DEBRIEF' && G().debrief.aar.length > 0 && !/undefined/.test(G().debrief.aar.join(' ')), G().phase);
  } catch (e) { out.push('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'm1'; p.textContent = out.join('\n'); document.body.append(p);
})();
