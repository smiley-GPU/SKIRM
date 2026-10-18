// Menu, help dialog and briefing steps: drive the real buttons and report what happened.
(() => {
  const S = window.SKIRM, $ = (q) => document.querySelector(q), out = [];
  const ok = (name, cond) => out.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  try {
    S.newCampaign(777); S.refresh();
    $('#btn-menu').click();
    ok('menu opens', !$('#menu').hidden && $('#btn-menu').getAttribute('aria-expanded') === 'true');
    const before = $('#btn-sound').getAttribute('aria-checked');
    $('#btn-sound').click();
    ok('sound toggles', $('#btn-sound').getAttribute('aria-checked') !== before && !$('#menu').hidden);
    $('#btn-sound').click();
    const seed = S.G.seed ?? JSON.stringify(S.G.roster.map((s) => s.name));
    $('#btn-new').click();
    ok('new campaign arms first', $('#btn-new').classList.contains('armed') && JSON.stringify(S.G.roster.map((s) => s.name)) === JSON.stringify(S.G.roster.map((s) => s.name)));
    document.body.click();
    ok('outside click closes and disarms', $('#menu').hidden && !$('#btn-new').classList.contains('armed'));
    $('#btn-menu').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok('escape closes menu', $('#menu').hidden);
    $('#btn-help').click();
    ok('help opens', $('#help').open && /Glossary/.test($('#help').textContent));
    $('#help-close').click();
    ok('help closes', !$('#help').open);
    S.chooseMission(0); S.refresh();
    ok('briefing starts at intel', $('.steps [aria-current]').textContent.includes('Intel') && !$('#launch'));
    $('.brief-bar [data-step="1"]').click();
    ok('next goes to team', $('.steps [aria-current]').textContent.includes('Team') && document.querySelectorAll('.slot').length > 0);
    for (let i = 0; i < 9 && $('[data-pick]:checked'); i++) $('[data-pick]:checked').click();
    ok('empty team explains', /at least one operator/.test($('.brief-bar .why')?.textContent || ''));
    $('[data-step="2"]').click();
    ok('launch disabled with no team', $('#launch').disabled);
    $('[data-step="1"]').click();
    $('[data-pick]:not(:disabled)').click();
    $('[data-step="2"]').click();
    ok('launch enabled with a team', !$('#launch').disabled && !$('.brief-bar .why'));
    $('#launch').click();
    ok('launched', S.G.phase !== 'BRIEFING');
  } catch (e) { out.push('ERROR ' + e.message); }
  const pre = document.createElement('pre'); pre.id = 'uitest'; pre.textContent = out.join('\n'); document.body.append(pre);
})();
