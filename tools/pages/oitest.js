(() => { const S = window.SKIRM, G = () => S.G, out = [], $ = (q) => document.querySelector(q);
  const ok = (n, c) => out.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
  try {
    S.newCampaign(4242); S.chooseMission(0); S.refresh();
    $('[data-step="1"]').click();
    ok('no stock counts in dropdowns', ![...document.querySelectorAll('.loadout option')].some((o) => /\(\d+\)/.test(o.textContent)));
    const before = document.querySelectorAll('[data-pick]:checked').length;
    $('.op .face[data-sid]').click();
    ok('briefing portrait opens details', $('#opinfo').open && /Skills/.test($('#opinfo').textContent) && /planned gear/.test($('#opinfo').textContent));
    ok('team unchanged by the click', document.querySelectorAll('[data-pick]:checked').length === before);
    $('#opinfo-close').click();
    const team = G().roster.filter(S.available).slice(0, 4).map((s) => s.id), left = { ...G().armory }, lo = {};
    for (const id of team) { const c = S.CLASSES[G().roster.find((s) => s.id === id).cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: f(c.kits) }; }
    S.launch({ team, loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' }); if (S.interlude()) S.chooseLine(0); S.proceed(); S.chooseRoute(0); if (S.cur().pick == null) S.chooseFork(0); S.refresh();
    const pressed = [...document.querySelectorAll('.optoggle')].map((b) => b.getAttribute('aria-pressed')).join();
    $('.opcard .face[data-sid]').click();
    ok('operation portrait opens live details', $('#opinfo').open && /as they are now/.test($('#opinfo').textContent));
    ok('fireteam unchanged by the click', [...document.querySelectorAll('.optoggle')].map((b) => b.getAttribute('aria-pressed')).join() === pressed);
    $('#opinfo-close').click();
    G().battle.nerve = 0;
    for (let t = 0; t < 40; t++) {
      const units = S.team().filter(S.ready).map((u) => u.id), sit = S.sitOf(S.cur()), lead = S.bestLead(sit.opts[0], units);
      if (lead == null) break;
      S.execute({ opt: 0, ids: [lead], lead, gear: [] }); S.refresh();
      const o = S.outcomeOf(G().battle.roll);
      if (o !== 'SUCCESS') {
        ok(`no push button at Nerve 0 (${o})`, !$('[data-act="push"]') && !!$('.no-nerve'));
        let refused = false; try { S.push(); } catch (e) { refused = /No Nerve/.test(e.message); } ok(`rules refuse a push at Nerve 0 (${o})`, refused);
        break;
      }
      S.resolve(); if (G().phase !== 'OPERATION') break; if (S.cur().pick == null && S.cur().kind !== 'APPROACH') S.chooseFork(0);
    }
  } catch (e) { out.push('ERROR ' + e.message + ' ' + e.stack.split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'oi'; p.textContent = out.join('\n'); document.body.append(p);
})();
