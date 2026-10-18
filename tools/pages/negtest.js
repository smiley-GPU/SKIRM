(() => { const S = window.SKIRM, G = () => S.G, out = [];
  const ok = (n, c) => out.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
  try {
    S.newCampaign(4242); S.chooseMission(0); S.refresh();
    document.querySelector('[data-step="1"]').click();
    for (const k of Object.keys(G().armory)) G().armory[k] = 0; // the armory empties behind the plan
    document.querySelector('[data-step="1"]').click();
    const counts = [...document.querySelectorAll('.loadout select option')].map((o) => o.textContent).filter((t) => /\((-\d+|0)\)/.test(t));
    ok('no negative or zero counts offered', counts.length === 0);
    document.querySelector('[data-step="2"]').click();
    ok('launch not blocked by gear', !document.querySelector('#launch').disabled && !/short/.test(document.querySelector('.brief-bar .why')?.textContent || ''));
    document.querySelector('#launch').click();
    ok('launched with handguns', G().phase !== 'BRIEFING');
    for (const v of ['FOOT', 'GROUND', 'HELO', 'LSV', 'BOAT', 'HALO', 'MRAP']) {
      S.newCampaign(4242); G().bp = 30; G().rp = 60; S.upgradeDept('LOG'); S.upgradeDept('LOG');
      const mi = G().base.offers.findIndex((m) => !S.vehBlock(m, v, 'ins'));
      if (mi < 0) { out.push(`SKIP ${v}`); continue; }
      S.chooseMission(mi); S.refresh(); document.querySelector('[data-step="2"]').click();
      document.querySelector(`#insertion-${v}`)?.click();
      document.querySelector('#launch').click();
      ok(`transit draws after ${v} insertion`, G().phase === 'INTERLUDE_IN' && !!document.querySelector('.transit-card'));
    }
  } catch (e) { out.push('ERROR ' + e.message); }
  const p = document.createElement('pre'); p.id = 'neg'; p.textContent = out.join('\n'); document.body.append(p);
})();
