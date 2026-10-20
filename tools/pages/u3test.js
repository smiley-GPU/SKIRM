(() => { const S = window.SKIRM, G = () => S.G, B = () => S.G.battle, out = [], $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
  const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' ' + x}`);
  const setup = (seed = 4242) => {
    S.newCampaign(seed); S.chooseMission(0);
    const team = G().roster.filter(S.available).slice(0, 4), left = { ...G().armory }, lo = {};
    for (const s of team) { if (s.persona === 'PHILOSOPHER') s.persona = 'QUIET'; const c = S.CLASSES[s.cls], f = (p) => { const x = p.find((k) => (left[k] || 0) > 0) || null; if (x) left[x]--; return x; }; lo[s.id] = { weapon: f(c.weapons), armor: f(c.armor), utility: f(c.utility), kit: null }; }
    S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' }); S.chooseLine(0); S.proceed();
  };
  const exec = () => { const sit = S.sitOf(S.cur()), ids = S.team().filter(S.ready).map((u) => u.id); for (let k = 0; k < sit.opts.length; k++) { if (S.lockReason(sit.opts[k])) continue; const l = S.bestLead(sit.opts[k], ids); if (l != null && S.poolOf(sit.opts[k], [l], [], false, l).value > 0) { S.execute({ opt: k, ids: [l], lead: l, gear: [] }); return B().roll; } } };
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
    // No resting in a firefight: not under fire with enemies still here, not with the QRF closing in
    { setup(); toPerimeter(); if (S.cur().pick == null) S.chooseFork(0); S.cur().choices[S.cur().pick] = 'SENTRY'; S.team().forEach((u) => { u.fat = 4; });
      ok('Rest is allowed before anyone shoots', S.restBlock() === '');
      S.cur().underFire = true; let refused = false; try { S.rest(); } catch (e) { refused = e instanceof S.Rule && /under fire/.test(e.message); }
      S.refresh(); ok('Under fire with enemies here: no rest, and the button says why', refused && $('[data-act="rest"]')?.disabled && /under fire/.test($('[data-act="rest"]')?.title || ''));
      S.cur().underFire = false; B().qrfIn = 2; ok('QRF closing in: no rest', /QRF/.test(S.restBlock())); B().qrfIn = null;
      S.cur().underFire = true; S.cur().foesCleared = true; ok('Enemies gone: rest again', S.restBlock() === ''); }
    // Rules 2.0: wear-down, spotted, momentum
    { const t = [[2, 0, 0], [3, 1, 1], [4, 1, 0], [4, 2, 1], [5, 2, 1], [5, 3, 2], [6, 3, 1], [6, 4, 2], [7, 4, 1], [7, 5, 2]];
      ok('Wear earned scales with difficulty', t.every(([d, s, w]) => S.wearFor(s, d) === w), t.filter(([d, s, w]) => S.wearFor(s, d) !== w).join(' | '));
      setup(); toPerimeter(); if (S.cur().pick == null) S.chooseFork(0); const st = S.cur(); st.choices[st.pick] = 'SENTRY'; G().mission.n = 9; // enemy experience +3
      const sit = S.sitOf(st), k = sit.opts.findIndex((o) => o.skill === 'ASSAULT'), ids = S.team().filter(S.ready).map((u) => u.id), lead = S.bestLead(sit.opts[k], ids);
      const foes0 = S.foesOf(st, sit), d0 = S.difficulty(st, sit, sit.opts[k], [lead]).value;
      S.execute({ opt: k, ids: [lead], lead, gear: [] }); const r = B().roll, need = Math.max(1, Math.floor(r.diff / 2)); r.dice = r.dice.map((x, i) => (i < need ? 6 : 1)); r.auto = 0; r.diff = Math.max(r.diff, need + 2); S.resolve();
      ok('A failed Assault with hits wears them down: fewer enemies, easier next try', st.wear >= 1 && S.foesOf(st, sit) === Math.max(1, foes0 - st.wear) && S.difficulty(st, sit, sit.opts[k], [lead]).value < d0, `wear ${st.wear} foes ${foes0}->${S.foesOf(st, sit)}`);
      ok('Wear never takes off more than the enemy part', S.difficulty(st, sit, sit.opts[k], [lead]).mods.find((x) => x.label === 'Worn down').v >= -2);
      ok('Seen here: Stealth closed at this stage', st.spotted && sit.opts.filter((o) => o.skill === 'STEALTH').every((o) => S.lockReason(o)));
      const k2 = sit.opts.findIndex((o) => o.skill !== 'STEALTH' && !o.need); S.execute({ opt: k2, ids: [lead], lead, gear: [] }); const r2 = B().roll; r2.dice = r2.dice.map(() => 6); r2.diff = 1; const skill = sit.opts[k2].skill; S.resolve();
      ok('A success with hits to spare carries momentum to the next stage', B().momentum?.skill === skill && B().momentum.stage === B().stage && S.leadBonuses(S.team().find(S.ready), skill).some((x) => x.label === 'Momentum')); }
    // Wounds named by cause; the stim and the medic's second wind
    { const W = window.LS_TEXT.WOUNDS, ids = Object.keys(S.INJURIES);
      ok('Every wound has a name for every cause', ['GUN', 'BLAST', 'FALL', 'BURN'].every((k) => ids.every((id) => W[k][id])));
      setup(); toPerimeter(); const u = S.team()[0]; u.inj = []; S.hurt(u, 0, 1, 'is hit', 'BURN');
      const names = Object.values(W.BURN).map((x) => (Array.isArray(x) ? x[0] : x));
      ok('A burn is named as a burn', u.inj.length === 1 && names.includes(S.injLabel(u.inj[0])), u.inj.map(S.injLabel).join());
      S.team().forEach((x) => { x.fat = 4; }); u.util = 'STIM'; S.stim(u.id, u.id);
      ok('A stim takes 2 fatigue off, and is used up', u.fat === 2 && !u.util);
      const md = S.team().find((x) => x.cls === 'MEDIC'); if (md) { const before = S.team().filter(S.active).map((x) => x.fat); S.secondWind(md.id); let again = false; try { S.secondWind(md.id); } catch (e) { again = e instanceof S.Rule; }
        ok('Second wind: everyone sheds 1, once a mission', S.team().filter(S.active).every((x, i) => x.fat === Math.max(0, before[i] - 1)) && again); } }
    // Gear: tool slot, second utility, support assets, shotgun and ammunition, new consumables, the named-weapon pool
    { S.newCampaign(5150); const g = G(); g.rp = 60; Object.assign(g.armory, { REBREATHER: 1, STIM: 2, TORCH: 1, SHOTGUN: 1, SLUG: 1 });
      const team = g.roster.filter(S.available).slice(0, 4), base = (s) => ({ weapon: null, armor: null, kit: null, tool: null, utility: null, utility2: null });
      const lo = Object.fromEntries(team.map((s) => [s.id, base(s)])), heavy = team.find((s) => s.cls === 'HEAVY') || team[0], medic = team.find((s) => s.cls === 'MEDIC');
      const tryLaunch = () => { try { S.launch({ team: team.map((s) => s.id), loadouts: lo, insertion: 'FOOT', extraction: 'FOOT' }); return ''; } catch (e) { return e.message; } };
      S.chooseMission(0); lo[heavy.id].kit = 'REBREATHER'; ok('A specialist tool no longer fits the kit slot', /can't carry Rebreather/.test(tryLaunch()));
      lo[heavy.id].kit = null; lo[heavy.id].tool = 'REBREATHER'; lo[heavy.id].utility = 'FRAG'; lo[heavy.id].utility2 = 'STIM';
      ok('A second utility needs Barracks level 2', /Barracks level 2/.test(tryLaunch())); g.base.lv.BARRACKS = 2;
      let busy = ''; try { S.buyAsset('ISR'); } catch (e) { busy = e.message; } ok('Support assets need Operations level 2', /Operations level 2/.test(busy));
      g.base.lv.CMD = 3; S.buyAsset('OVERWATCH'); S.buyAsset('FIRE'); let third = ''; try { S.buyAsset('EW'); } catch (e) { third = e.message; }
      ok('Operations level 3 books two assets, 1 RP cheaper', g.mission.assets.length === 2 && /2 support assets/.test(third));
      lo[heavy.id].weapon = 'SHOTGUN';
      if (medic) { lo[medic.id].utility = 'SLUG'; ok('Special rounds are a utility item and need a shotgun', /no shotgun for the slugs/.test(tryLaunch()), tryLaunch()); lo[medic.id].utility = null; }
      ok('Special rounds are made by Engineering (L2, slugs L3)', S.FAB.BREACHING[0] === 2 && S.FAB.LESS[0] === 2 && S.FAB.SLUG[0] === 3 && S.ITEMS.SLUG.slot === 'UTILITY');
      g.base.lv.ENG = 3; const op = team.find((s) => s.cls === 'DRONE'); if (op) lo[op.id].utility = 'TORCH';
      ok('The loadout launches: tool, two utilities, a shotgun on buckshot', tryLaunch() === '', tryLaunch());
      const it = S.interlude(); S.chooseLine(0); if (!S.interDone(it)) S.chooseLine(it.opts.findIndex((o, k) => k !== 0 && o.topic !== it.opts[0].topic)); S.proceed();
      S.chooseRoute(0); if (S.cur().pick == null) S.chooseFork(0); const st = S.cur(); st.choices[st.pick] = 'SENTRY';
      const hu = S.team().find((u) => u.sid === heavy.id), sit = S.sitOf(st);
      ok('Tool and both utilities reach the field; no special rounds: buckshot', hu.tool === 'REBREATHER' && hu.util === 'FRAG' && hu.util2 === 'STIM' && S.ammoOf(hu) === 'BUCK' && !('ammo' in hu));
      hu.fat = 4; S.stim(hu.id, hu.id); ok('The second utility can be used first: the stim goes, the frag stays', hu.util === 'FRAG' && !hu.util2 && hu.fat === 2);
      ok('Shotgun: -1 at range, +2 in close quarters', S.shotgunMods(hu, 'ASSAULT', sit.opts.find((o) => o.skill === 'ASSAULT'))[0]?.v === -1 && S.shotgunMods(hu, 'ASSAULT', { skill: 'ASSAULT', close: true })[0]?.v === 2);
      hu.util2 = 'SLUG'; ok('Slugs: no close-quarters bonus, no penalty', S.shotgunMods(hu, 'ASSAULT', { skill: 'ASSAULT', close: true }).every((x) => /officer/.test(x.label)));
      hu.util2 = 'LESS'; ok('Less-lethal: +1 Stealth leading', S.shotgunMods(hu, 'STEALTH', null)[0]?.v === 1);
      hu.util2 = 'BREACHING'; ok('Breaching rounds fire as buckshot', S.ammoOf(hu) === 'BUCK');
      const f0 = S.foesOf(st, sit); S.callSupport('OVERWATCH'); ok('Overwatch: one enemy down, +1 Recon die here', S.foesOf(st, sit) === f0 - 1 && S.leadBonuses(hu, 'RECON').some((x) => /Overwatch/.test(x.label)));
      const a0 = B().alert; S.callSupport('FIRE'); ok('Fire mission: worn down by 2, alert +2', st.wear === 2 && B().alert === Math.min(6, a0 + 2));
      st.failed = 1; const w = S.waysOut().find((x) => x.id === 'BLAST'); const a1 = B().alert;
      ok('Breaching rounds open a quiet blast, without a charge', !!w && /breaching rounds/.test(w.price)); S.wayOut('BLAST'); ok('...and the charge-free blast raises no alert, using the rounds up', !hu.util2 && B().alert === a1);
      // A specialist's trick works once a mission; at the extraction point every way past costs 1 time, and none is open without time
      S.cur().failed = 1; const tw = S.waysOut().find((x) => S.SPECS[x.id] && !x.pick);
      if (tw) { S.wayOut(tw.id); if (G().phase === 'OPERATION' && !B().over) { S.cur().failed = 1; ok(`A specialist's trick works once a mission (${tw.id})`, B().tricks.includes(tw.id) && !S.waysOut().some((x) => x.id === tw.id)); } }
      if (G().phase === 'OPERATION' && !B().over) { const ex = B().stages.findIndex((s) => s.kind === 'EXFIL'); B().stage = ex; S.cur().seen = true; S.cur().failed = 1;
        B().time = 0; ok('No way past at the extraction point without time', S.waysOut().length === 0);
        B().time = 2; const fw = S.waysOut().find((x) => x.id === 'FORCE'); ok('At the extraction point a way past costs 1 time', !!fw && /1 time to the pickup/.test(fw.price), fw?.price);
        B().time = 0; B().overtime = true; const ow = S.waysOut().find((x) => x.id === 'FORCE'); ok('In overtime (no clock) the ways stay open, at no time', !!ow && !/time to the pickup/.test(ow.price)); }
      g.legacy.push({ id: 'X1', base: 'CARBINE', label: 'X1' }, { id: 'X2', base: 'AK', label: 'X2' });
      ok('Named weapons: two per class, then the class is closed', !S.namedOpen('SUPRIFLE') && S.namedOpen('SMG')); g.legacy = []; }
    // Starting loadout: the best for the class's role, newest first, a signature weapon always first
    { S.newCampaign(4242); Object.assign(G().armory, { AMR: 2, SUPRIFLE: 2, CERAMIC: 9, THERMAL: 2, LMG: 2, SHOTGUN: 1 }); S.chooseMission(0); S.refresh();
      ok('No anti-materiel rifle for a Heavy', !S.CLASSES.HEAVY.weapons.includes('AMR') && S.bestFor('HEAVY', S.CLASSES.HEAVY.weapons)[0] === 'LMG');
      ok('A Scout takes the newest weapon that serves its role', S.bestFor('SCOUT', S.CLASSES.SCOUT.weapons)[0] === 'SUPRIFLE');
      ok('Newest armour', S.defaultLoadout('HEAVY').armor === 'CERAMIC');
      const sc = G().roster.find((s) => s.cls === 'SCOUT'); sc.signature = 'DMR'; G().armory.DMR = 1;
      ok('A signature weapon always comes first', S.defaultLoadout('SCOUT', sc).weapon === 'DMR'); S.backToBase(); }
    // Repairs: at Logistics, not Engineering
    { S.newCampaign(4242); G().base.damaged.HELO = true; S.refresh(); $('[data-tab="ENG"]')?.click(); const inEng = !!$('[data-repair]');
      $('[data-tab="LOG"]')?.click(); const btn = $('[data-repair="HELO"]'); ok('Damaged vehicles are repaired from Logistics', !inEng && !!btn);
      const rp = G().rp; btn.click(); ok('The repair works from there', !G().base.damaged.HELO && G().rp === rp - 3, `${G().rp} ${rp}`); }
  } catch (e) { out.push('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  const p = document.createElement('pre'); p.id = 'ut'; p.textContent = out.join('\n'); document.body.append(p);
})();
