(() => { const S = window.SKIRM, G = () => S.G, B = () => S.G.battle, out = [], $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  const setup = (seed = 4242) => {
    S.newCampaign(seed); S.chooseMission(0);
    const team = G().roster.filter(S.available).slice(0, 4), left = { ...G().armory }, lo = {};
    for (const s of team) { if (s.persona === 'PHILOSOPHER') s.persona = 'QUIET'; const c = S.CLASSES[s.cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[s.id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: null }; }
    S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' }); S.chooseLine(0); S.proceed();
  };
  const exec = () => { const sit = S.sitOf(S.cur()), ids = S.team().filter(S.ready).map((u) => u.id); for (let k = 0; k < sit.opts.length; k++) { const l = S.bestLead(sit.opts[k], ids); if (l != null && S.poolOf(sit.opts[k], [l], [], false, l).value > 0) { S.execute({ opt: k, ids: [l], lead: l, gear: [] }); return B().roll; } } };
  const toPerimeter = () => { S.chooseRoute(0); };
  try {
    // Back: undo the route and the way in
    { setup(); const t0 = B().time, log0 = B().log.length; toPerimeter(); S.refresh();
      ok('Back to the routes is offered', /Back to the routes/.test($('[data-act="undo"]')?.textContent || ''));
      S.undo(); ok('Undo route: back at the approach, time refunded', S.cur().kind === 'APPROACH' && B().time === t0 && B().log.length === log0, `${S.cur().kind} ${t0}->${B().time}`);
      toPerimeter(); S.chooseFork(0); S.refresh(); ok('Back to the ways in is offered', /Back to the ways in/.test($('[data-act="undo"]')?.textContent || ''));
      S.undo(); ok('Undo way in: fork open again', S.cur().pick == null && S.cur().kind === 'PERIMETER');
      S.undo(); ok('Undo twice: back to the routes', S.cur().kind === 'APPROACH');
      toPerimeter(); S.chooseFork(0); exec(); S.resolve(B().roll && S.outcomeOf(B().roll) === 'PARTIAL' ? 'TIME' : undefined); S.refresh();
      let refused = false; try { S.undo(); } catch (e) { refused = true; } ok('No undo after a roll', refused && !$('[data-act="undo"]')); }
    // Failure first: no ways on the roll; ways after taking the failure
    { setup(); toPerimeter(); S.chooseFork(0); const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; S.refresh();
      ok('Failed roll shows no way buttons', !$('[data-act="fway"]') && !$('[data-act="way"]') && /Take the failure/.test($('[data-act="accept"]')?.textContent || ''));
      S.resolve(); S.refresh(); ok('After the failure: result first, then ways', !!$('.result.FAIL') && !!$('[data-act="way"]'));
      const html = $('#view').innerHTML; ok('Result card comes before the ways', html.indexOf('result FAIL') < html.indexOf('class="ways"')); }
    // Time runs out on a failure: the window is closing, ways or let it close
    { setup(); toPerimeter(); S.chooseFork(0); B().time = 1; const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; S.resolve(); S.refresh();
      const open = S.waysOut().length;
      if (open) { ok('Window closing: timeUp set, not stranded', B().timeUp && G().phase === 'OPERATION' && !S.team().some((u) => u.stranded));
        ok('Let the window close is offered', !!$('[data-act="close"]'));
        let refused = false; try { exec(); } catch (e) { refused = /window is closing/.test(e.message); } ok('No new roll while the window closes', refused);
        S.closeWindow(); ok('Letting it close strands the team', G().phase !== 'OPERATION' || B().over);
      } else out.push('SKIP window closing: no ways'); }
    { setup(); toPerimeter(); S.chooseFork(0); B().time = 1; const r = exec(); r.dice = r.dice.map(() => 1); r.diff = 9; S.resolve();
      if (B().timeUp) { const w = S.waysOut().find((x) => !x.pick) || S.waysOut()[0], gc = w.pick ? S.gearChoices(w.pick) : []; S.wayOut(w.id, gc[0] ? { uid: gc[0].uid, slot: gc[0].slot } : null);
        ok('Way past at the closing window: overtime, straight to exfil', B().overtime && S.cur().kind === 'EXFIL' && G().phase === 'OPERATION', `${B().overtime} ${S.cur().kind} ${G().phase}`);
        const sit = S.sitOf(S.cur()), d = S.difficulty(S.cur(), sit, sit.opts[0], S.team().filter(S.ready).map((u) => u.id));
        ok('Overtime exfil is 1 harder', d.mods.some((m) => m.label === 'Out of time' && m.v === 1));
        S.refresh(); ok('Overtime exfil can still be rolled', !!$('[data-act="exec"]') && /no clock/.test($('[data-act="exec"]').textContent));
        const r2 = exec(); r2.dice = r2.dice.map(() => 6); S.resolve(); ok('Clearing the overtime exfil gets the team out', G().phase !== 'OPERATION' && S.team().some((u) => u.exfil));
      } else out.push('SKIP way at closing window'); }
    // A stage cleared as time runs out counts
    { setup(); toPerimeter(); S.chooseFork(0); B().time = 1; const r = exec(); r.dice = r.dice.map(() => 6); S.resolve(r.diff > r.dice.length ? 'ALERT' : undefined);
      ok('Cleared on the last time: overtime exfil, not stranded', B().overtime && S.cur().kind === 'EXFIL' && !S.team().some((u) => u.stranded), `${B().overtime} ${S.cur().kind}`);
      ok('Skipped stages are marked abandoned', B().stages.filter((s, i) => i < B().stage && s.abandoned).length >= 1); }
    // QRF countdown: two stages under fire, or run; exfil 1 harder
    { setup(); toPerimeter(); S.chooseFork(0); B().alert = 6; const r = exec(); r.dice = r.dice.map(() => 6); S.resolve(S.outcomeOf(r) === 'PARTIAL' ? 'TIME' : undefined);
      ok('QRF called: countdown, not instant', B().qrfIn === 2 && !B().stages.some((s) => s.abandoned), `${B().qrfIn}`);
      if (S.cur().kind !== 'EXFIL') { const sit = S.sitOf(S.cur()) || null; if (sit) { const d = S.difficulty(S.cur(), sit, sit.opts[0], [S.team()[0].id]); ok('QRF closing in: 2 harder', d.mods.some((m) => m.label === 'QRF closing in' && m.v === 2)); } }
      S.refresh(); ok('Countdown chip and Run button shown', !!document.querySelector('.qrf-chip') && !!document.querySelector('[data-act="run"]'));
      if (S.cur().pick == null && S.cur().kind !== 'APPROACH') S.chooseFork(0);
      S.runForIt(); ok('Run: straight to exfil, the rest abandoned', S.cur().kind === 'EXFIL' && B().stages.some((s) => s.abandoned));
      const sit = S.sitOf(S.cur()), d = S.difficulty(S.cur(), sit, sit.opts[0], [S.team()[0].id]); ok('QRF on your heels: exfil 1 harder', d.mods.some((m) => m.label === 'QRF on your heels')); }
    // Burn Nerve: a sure success for BURN_NERVE
    { setup(); toPerimeter(); S.chooseFork(0); B().nerve = B().nerveMax = 5; const r = exec(); r.diff = 3; r.dice = [6, 6, 1, 1]; S.refresh();
      ok('Burn button offered on a shortfall', /Burn 2 Nerve/.test(document.querySelector('[data-act="burn"]')?.textContent || ''));
      S.burn(); ok('Burn: 2 Nerve for one sure success', B().nerve === 3 && r.auto === 1 && S.outcomeOf(r) === 'SUCCESS', `${B().nerve} ${r.auto} ${S.outcomeOf(r)}`);
      S.refresh(); ok('Burned success shows as a gold star', document.querySelectorAll('.die.auto').length === 1 && !document.querySelector('[data-act="burn"]'));
      let refused = false; try { S.burn(); } catch (e) { refused = /Already/.test(e.message); } ok('No burning on a success', refused);
      S.resolve(); }
    { setup(); toPerimeter(); S.chooseFork(0); B().nerve = 1; const r = exec(); r.diff = 3; r.dice = [6, 1, 1]; let refused = false; try { S.burn(); } catch (e) { refused = /takes 2 Nerve/.test(e.message); }
      ok('No burning without 2 Nerve', refused && B().nerve === 1); }
    { setup(); toPerimeter(); S.chooseFork(0); B().nerve = B().nerveMax = 6; const r = exec(); r.diff = 4; r.dice = [6, 1, 1, 1]; S.burn(); let refused = false; try { S.burn(); } catch (e) { refused = /No more Nerve/.test(e.message); } S.refresh(); ok('Only one burn per roll', refused && r.auto === 1 && !document.querySelector('[data-act="burn"]')); }
    // Signs: hindrance dots, help in green
    { setup(); toPerimeter(); S.chooseFork(0); S.refresh(); $('[data-act="details"]')?.click(); S.refresh();
      const hard = $$('.details .mod.hard'), dots = hard.every((e) => /^●+$/.test(e.textContent) || /^−\d$/.test(e.textContent));
      ok('Hindrances show as red dots (or − on dice)', dots, hard.map((e) => e.textContent).join(' '));
      ok('No +N in red anywhere in the breakdown', !$$('.details .mod.hard').some((e) => e.textContent.startsWith('+')));
      ok('Tags never say +N alert', !/\+\d alert/.test($('#view').textContent)); }
    // Gear chips with an x
    { setup(); toPerimeter(); S.chooseFork(0); S.team().forEach((u) => { u.util = 'FRAG'; }); S.refresh(); $$('[data-act="opt"]').find((t) => /Assault/i.test(t.textContent))?.click(); const g = $('[data-act="gear"]');
      if (g) { g.click(); const chip = $('.gear-chosen [data-act="gear"]'); ok('Chosen gear shows as a chip with ✕', !!chip && chip.textContent.includes('✕')); chip?.click(); ok('Tapping the chip cancels it', !$('.gear-chosen')); }
      else out.push('SKIP gear chip: no usable gear'); }
    // Archive
    { setup(); for (let t = 0; t < 40 && G().phase === 'OPERATION'; t++) { const st = S.cur(); if (st.kind === 'APPROACH') { S.chooseRoute(0); continue; } if (st.pick == null) { S.chooseFork(0); continue; } if (B().timeUp) { S.closeWindow(); continue; } const r = exec(); if (!r) { S.abort(); continue; } r.dice = r.dice.map(() => 6); S.resolve(); }
      if (G().phase === 'EXTRACTION') S.proceed(); if (S.interlude()) { S.chooseLine(0); S.proceed(); }
      ok('A mission file is archived at the debrief', G().archive.length === 1 && G().archive[0].team.length === 4 && G().archive[0].aar.length > 0);
      S.proceed(); S.refresh(); ok('Archive shows at base', !!$('.archive [data-file="0"]'));
      $('.archive [data-file="0"]').click(); const d = $('#opinfo'); ok('Opening a file shows the dossier', d.open && /Briefing/.test(d.textContent) && /After-action report/.test(d.textContent) && /Transport/.test(d.textContent));
      ok('File text has no holes', !/undefined|NaN|null/.test(d.textContent)); d.close(); }
  } catch (e) { out.push('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'ut'; p.textContent = out.join('\n'); document.body.append(p);
})();
