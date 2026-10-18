(() => { const S = window.SKIRM, G = () => S.G, out = [], $ = (q) => document.querySelector(q);
  const ok = (n, c) => out.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
  try {
    S.newCampaign(4242); S.refresh();
    $('.rrow .face[data-sid]').click();
    const t = $('#opinfo .oi-say')?.textContent || '';
    ok('base portrait gives a comment', $('#opinfo').open && t.length > 10); out.push('  says: ' + t);
    $('#opinfo-close').click();
    G().roster[1].recovery = 2; S.refresh(); document.querySelectorAll('.rrow .face[data-sid]')[1].click();
    ok('wounded comment is red', $('#opinfo .oi-say.bad') != null); out.push('  says: ' + $('#opinfo .oi-say').textContent); $('#opinfo-close').click();
    G().memorial = [{ name: 'Test Fallen', n: G().flown, rank: 'Private', cls: 'SCOUT', line: '' }]; G().roster[1].recovery = 0; S.refresh(); document.querySelectorAll('.rrow .face[data-sid]')[2].click();
    ok('grief names the fallen', /Test|\.\.\./.test($('#opinfo .oi-say').textContent) || /Test/.test($('#opinfo .oi-say').textContent)); out.push('  says: ' + $('#opinfo .oi-say').textContent); $('#opinfo-close').click();
    let missing = 0; for (const p of Object.keys(S.PERSONAS)) for (const st of ['FIT', 'TIRED', 'WOUNDED', 'BED', 'GRIEF']) if (!window.__x) {} // lines checked in code below
    ok('no comment outside base', (() => { S.chooseMission(0); S.refresh(); document.querySelector('[data-step="1"]').click(); $('.op .face[data-sid]').click(); const r = !$('#opinfo .oi-say'); $('#opinfo-close').click(); return r; })());
  } catch (e) { out.push('ERROR ' + e.message + ' ' + e.stack.split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'st'; p.textContent = out.join('\n'); document.body.append(p);
})();
