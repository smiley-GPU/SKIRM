// SKIRM client. The server is authoritative: this file renders snapshots, collects input,
// sends commands, and animates the fog-filtered events that come back.
import { HexView, key, COLORS } from './render.js';

// ------------------------------------------------------------------ utilities

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const api = {
  async call(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  get: (p) => api.call('GET', p),
  post: (p, b = {}) => api.call('POST', p, b),
};

let toastTimer;
function toast(msg, kind = 'error') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

// ------------------------------------------------------------------ app state

let S = null; // latest server snapshot
let mountedPhase = null;
const draft = { mission: null, team: [], loadouts: {}, insertion: 'FOOT', extraction: 'FOOT' };
const tac = {
  view: null, selected: null, mode: 'move', hover: null, busy: false,
  fx: [], anim: new Map(), scene: null, raf: 0, abortArmed: false,
};

async function command(promise) {
  if (tac.busy) return;
  try {
    apply(await promise);
  } catch (e) {
    toast(e.message);
  }
}

function apply(data) {
  S = data;
  if (S.phase !== mountedPhase) {
    mountedPhase = S.phase;
    mount();
  }
  renderChrome();
  update();
  if (S.phase === 'TACTICAL' && S.events?.length) playEvents(S.events);
}

const PHASES = [
  ['BRIEFING', 'Briefing'], ['INSERTION', 'Insertion'], ['TACTICAL', 'Operation'],
  ['EXTRACTION', 'Extraction'], ['DEBRIEF', 'Debrief'],
];

function renderChrome() {
  const idx = PHASES.findIndex(([p]) => p === S.phase);
  $('#phases').innerHTML = PHASES.map(([p, label], i) =>
    `<span class="${i === idx ? 'on' : i < idx ? 'done' : ''}">${label}</span>`).join('<i>›</i>');
  const c = S.campaign;
  $('#stats').innerHTML = `
    <span><b>Mission</b> ${c.missionNumber}</span>
    <span><b>RP</b> ${c.requisition}</span>
    <span><b>Operators</b> ${c.roster.length}</span>`;
}

function mount() {
  cancelAnimationFrame(tac.raf);
  const view = $('#view');
  view.innerHTML = '';
  view.className = `phase-${S.phase.toLowerCase()}`;
  if (S.phase === 'TACTICAL') mountTactical(view);
}

function update() {
  switch (S.phase) {
    case 'BRIEFING': return renderBriefing();
    case 'INSERTION':
    case 'EXTRACTION': return renderReport();
    case 'TACTICAL': return updateTactical();
    case 'DEBRIEF': return renderDebrief();
  }
}

// ------------------------------------------------------------------ briefing

function itemsBySlot(slot) { return S.catalog.items.filter((i) => i.slot === slot); }
function itemLabel(id) { return S.catalog.items.find((i) => i.id === id)?.label ?? id; }

function remainingStock() {
  const left = { ...S.campaign.armory };
  for (const id of draft.team) {
    const l = draft.loadouts[id];
    for (const it of [l.weapon, l.armor, l.utility]) if (it) left[it] = (left[it] || 0) - 1;
  }
  return left;
}

function defaultLoadout() {
  const left = remainingStock();
  const first = (prefs) => prefs.find((p) => (left[p] || 0) > 0) || null;
  return {
    weapon: first(['CARBINE', 'SMG', 'DMR', 'LMG', 'AK']),
    armor: first(['VEST', 'PLATE']),
    utility: first(['MEDKIT', 'FRAG']),
  };
}

function resetDraftIfNewMission() {
  if (draft.mission === S.mission.number) return;
  draft.mission = S.mission.number;
  draft.team = [];
  draft.loadouts = {};
  draft.insertion = 'FOOT';
  draft.extraction = 'FOOT';
  for (const s of S.campaign.roster) {
    if (!s.available || draft.team.length >= S.catalog.maxTeam) continue;
    const l = defaultLoadout();
    if (!l.weapon) break;
    draft.team.push(s.id);
    draft.loadouts[s.id] = l;
  }
}

function transportCost() {
  const v = (id) => S.catalog.vehicles.find((x) => x.id === id)?.cost ?? 0;
  return v(draft.insertion) + v(draft.extraction);
}

function renderBriefing() {
  resetDraftIfNewMission();
  const m = S.mission, c = S.campaign;
  const left = remainingStock();
  const cost = transportCost();
  const budgetOk = cost <= c.requisition;
  const loadoutOk = draft.team.length > 0 && draft.team.every((id) => draft.loadouts[id]?.weapon)
    && Object.values(left).every((n) => n >= 0);

  const intelRows = S.catalog.intel.map((i) => {
    const owned = m.intel.includes(i.id);
    return `<div class="intel-row ${owned ? 'owned' : ''}">
      <div><b>${esc(i.label)}</b><small>${esc(i.description)}</small></div>
      ${owned ? '<span class="chip ok">Acquired</span>'
        : `<button class="btn" data-intel="${i.id}" ${c.requisition < i.cost ? 'disabled' : ''}>Buy · ${i.cost} RP</button>`}
    </div>`;
  }).join('');

  const humint = m.humint ? `<div class="humint">
      <div><b>${m.humint.enemyCount}</b> hostiles confirmed. Positions marked on the map.</div>
      <div>${esc(m.humint.reinforcements)}</div>
    </div>` : '';

  const select = (sid, slot, current, allowNone) => {
    const opts = itemsBySlot(slot).map((it) => {
      const n = (left[it.id] || 0) + (current === it.id ? 1 : 0);
      if (n <= 0 && current !== it.id) return '';
      return `<option value="${it.id}" ${current === it.id ? 'selected' : ''} title="${esc(it.summary)}">${esc(it.label)} (${n})</option>`;
    }).join('');
    return `<select data-sid="${sid}" data-slot="${slot}">${allowNone ? `<option value="">None</option>` : ''}${opts}</select>`;
  };

  const roster = c.roster.map((s) => {
    const on = draft.team.includes(s.id);
    const l = draft.loadouts[s.id];
    const xpPct = s.nextXp > 0 ? Math.min(100, Math.round((s.xp / s.nextXp) * 100)) : 100;
    const status = !s.available ? `<span class="chip warn">Recovering (${s.recovery})</span>` : '';
    return `<div class="op ${on ? 'on' : ''} ${s.available ? '' : 'off'}">
      <label class="op-head">
        <input type="checkbox" data-pick="${s.id}" ${on ? 'checked' : ''} ${s.available ? '' : 'disabled'}>
        <span class="rank">${s.rank}</span>
        <span class="name">${esc(s.name)}</span>
        <span class="meta">${s.missions} ops · ${s.kills} kills</span>
        ${status}
      </label>
      <div class="xp"><i style="width:${xpPct}%"></i><small>${s.xp}${s.nextXp > 0 ? ' / ' + s.nextXp : ''} XP</small></div>
      ${on ? `<div class="loadout">
        ${select(s.id, 'WEAPON', l.weapon, false)}
        ${select(s.id, 'ARMOR', l.armor, true)}
        ${select(s.id, 'UTILITY', l.utility, true)}
      </div>
      <div class="loadout-hint">${[l.weapon, l.armor, l.utility].filter(Boolean).map((id) =>
        esc(S.catalog.items.find((x) => x.id === id).summary)).join(' · ')}</div>` : ''}
    </div>`;
  }).join('');

  const vehicles = (field) => S.catalog.vehicles.map((v) => `
    <label class="veh ${draft[field] === v.id ? 'on' : ''}">
      <input type="radio" name="${field}" value="${v.id}" ${draft[field] === v.id ? 'checked' : ''}>
      <span class="veh-head"><b>${esc(v.label)}</b><span class="cost">${v.cost ? v.cost + ' RP' : 'Free'}</span></span>
      <small>${esc(v.description)}</small>
    </label>`).join('');

  const view = $('#view');
  view.innerHTML = `
  <section class="briefing">
    <div class="col">
      <div class="card dossier">
        <div class="eyebrow">Mission ${m.number} · Briefing</div>
        <h1>${esc(m.codename)}</h1>
        <p class="area">${esc(m.area)}</p>
        <dl class="facts">
          <dt>Conditions</dt><dd>${esc(m.environment.summary)}</dd>
          <dt>Threat</dt><dd>${esc(m.threat)}</dd>
        </dl>
        <ul class="objectives">
          <li><span class="tag primary">Primary</span><b>${esc(m.primary.label)}</b> ${esc(m.primary.description)}</li>
          <li><span class="tag">Secondary</span><b>${esc(m.secondary.label)}</b> ${esc(m.secondary.description)}</li>
        </ul>
      </div>
      <div class="card">
        <h3>Area of operations</h3>
        <div class="preview-wrap"><canvas id="preview"></canvas></div>
        <div class="legend">
          <span><i class="sw ins"></i>Insertion</span><span><i class="sw ext"></i>Extraction (chosen)</span>
          <span><i class="sw obj"></i>Objective</span>${m.humint ? '<span><i class="sw foe"></i>Hostile (HUMINT)</span>' : ''}
          ${m.intel.includes('SATELLITE') ? '' : '<span class="muted">Terrain unknown, buy satellite imagery</span>'}
        </div>
      </div>
      <div class="card">
        <h3>Intelligence</h3>
        ${intelRows}
        ${humint}
      </div>
    </div>
    <div class="col">
      <div class="card">
        <h3>Team <span class="count">${draft.team.length}/${S.catalog.maxTeam}</span></h3>
        <div class="roster">${roster}</div>
        ${c.fallen.length ? `<div class="fallen">In memoriam: ${c.fallen.map(esc).join(', ')}</div>` : ''}
      </div>
      <div class="card">
        <h3>Insertion</h3>
        <div class="vehicles">${vehicles('insertion')}</div>
        <h3>Extraction</h3>
        <div class="vehicles">${vehicles('extraction')}</div>
      </div>
      <div class="card launch">
        <div class="budget">
          <span>Requisition <b>${c.requisition}</b></span>
          <span>Transport <b>${cost}</b></span>
          <span class="${budgetOk ? '' : 'bad'}">Remaining <b>${c.requisition - cost}</b></span>
        </div>
        <button class="btn primary big" id="launch" ${budgetOk && loadoutOk ? '' : 'disabled'}>Launch mission</button>
      </div>
    </div>
  </section>`;

  view.querySelectorAll('[data-intel]').forEach((b) =>
    b.addEventListener('click', () => command(api.post('/api/briefing/intel', { intel: b.dataset.intel }))));
  view.querySelectorAll('[data-pick]').forEach((cb) => cb.addEventListener('change', () => {
    const id = Number(cb.dataset.pick);
    if (cb.checked) {
      if (draft.team.length >= S.catalog.maxTeam) return toast(`Maximum team size is ${S.catalog.maxTeam}.`) || renderBriefing();
      const l = defaultLoadout();
      if (!l.weapon) return toast('No weapons left in the armory.') || renderBriefing();
      draft.team.push(id);
      draft.loadouts[id] = l;
    } else {
      draft.team = draft.team.filter((x) => x !== id);
      delete draft.loadouts[id];
    }
    renderBriefing();
  }));
  view.querySelectorAll('select[data-sid]').forEach((sel) => sel.addEventListener('change', () => {
    draft.loadouts[sel.dataset.sid][sel.dataset.slot.toLowerCase()] = sel.value || null;
    renderBriefing();
  }));
  view.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', () => {
    draft[r.name] = r.value;
    renderBriefing();
  }));
  $('#launch').addEventListener('click', () => command(api.post('/api/briefing/launch', {
    team: draft.team,
    loadouts: Object.fromEntries(draft.team.map((id) => [id, draft.loadouts[id]])),
    insertion: draft.insertion,
    extraction: draft.extraction,
  })));

  drawPreview();
}

function drawPreview() {
  const m = S.mission, map = m.map;
  const canvas = $('#preview');
  const v = new HexView(canvas);
  v.fit(map.cols, map.rows);
  const foes = (m.humint?.enemies || []).map((e, i) => ({
    id: -1 - i, side: 'ENEMY', q: e.q, r: e.r, hp: 1, maxHp: 1, hvt: e.hvt,
  }));
  v.draw({
    tiles: map.tiles,
    zones: {
      insertion: new Set(map.insertion.map((h) => key(h.q, h.r))),
      extraction: new Set(map.extraction[draft.extraction].map((h) => key(h.q, h.r))),
      objective: map.objective,
    },
    units: foes,
  }, performance.now());
}

// ------------------------------------------------------------------ insertion / extraction reports

function renderReport() {
  const r = S.report, m = S.mission;
  const next = S.phase === 'INSERTION' ? 'Begin operation' : 'Proceed to debrief';
  $('#view').innerHTML = `
  <section class="report card">
    <div class="eyebrow">Mission ${m.number} · ${esc(r.title)}</div>
    <h1>${esc(m.codename)}</h1>
    <ol class="narrative">${r.lines.map((l, i) =>
      `<li style="animation-delay:${i * 450}ms" class="${/HOT|IED|spotted|killed|missing|fire|lost/i.test(l) ? 'bad' : ''}">${esc(l)}</li>`).join('')}</ol>
    <button class="btn primary big" id="continue">${next}</button>
  </section>`;
  $('#continue').addEventListener('click', () => command(api.post('/api/continue')));
}

// ------------------------------------------------------------------ tactical

function mountTactical(view) {
  view.innerHTML = `
  <section class="tactical">
    <div class="board">
      <canvas id="board"></canvas>
      <div class="hud" id="hud"></div>
      <div class="hint" id="hint"></div>
    </div>
    <aside class="side">
      <div class="card" id="objectives"></div>
      <div class="card" id="squad"></div>
      <div class="card" id="actions"></div>
      <div class="card log"><h3>Combat log</h3><ol id="log"></ol></div>
    </aside>
  </section>`;
  const canvas = $('#board');
  tac.view = new HexView(canvas);
  tac.selected = null;
  tac.mode = 'move';
  tac.fx = [];
  tac.anim.clear();
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    tac.hover = tac.view.pick(e.clientX - r.left, e.clientY - r.top);
    updateHint();
  });
  canvas.addEventListener('mouseleave', () => { tac.hover = null; updateHint(); });
  canvas.addEventListener('click', onBoardClick);
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); setMode('move'); });
  const loop = (now) => {
    if (S?.phase !== 'TACTICAL') return;
    tac.view.fit(S.battle.cols, S.battle.rows);
    tac.view.draw(buildScene(), now);
    tac.fx = tac.fx.filter((f) => now - f.t0 < f.dur);
    tac.raf = requestAnimationFrame(loop);
  };
  tac.raf = requestAnimationFrame(loop);
}

const B = () => S.battle;
const myUnits = () => B().units.filter((u) => u.side === 'PLAYER');
const unitAt = (q, r) => B().units.find((u) => u.q === q && u.r === r);
const sel = () => myUnits().find((u) => u.id === tac.selected) || null;

function ensureSelection() {
  const mine = myUnits();
  if (!mine.length) { tac.selected = null; return; }
  const cur = sel();
  if (!cur || (cur.ap === 0 && mine.some((u) => u.ap > 0))) {
    tac.selected = (mine.find((u) => u.ap > 0) || mine[0]).id;
    tac.mode = 'move';
  }
}

function setMode(mode) {
  tac.mode = tac.mode === mode ? 'move' : mode;
  renderActions();
  updateHint();
}

function buildScene() {
  const b = B(), u = sel();
  const scene = {
    tiles: b.tiles,
    zones: {
      insertion: new Set(b.insertion.map((h) => key(h.q, h.r))),
      extraction: new Set(b.extraction.map((h) => key(h.q, h.r))),
      objective: b.intelHex,
    },
    units: b.units,
    ghosts: b.ghosts,
    selectedId: tac.selected,
    hover: tac.hover,
    anim: tac.anim,
    fx: tac.fx,
  };
  if (!u || tac.busy) return scene;

  if (tac.mode === 'move') {
    scene.reach = new Map(u.moves.map((m) => [key(m.q, m.r), m]));
    scene.targets = new Map(u.targets.map((t) => [t.id, t.chance]));
    if (tac.hover) {
      const k = key(tac.hover.q, tac.hover.r);
      if (scene.reach.has(k)) {
        const path = [];
        let cur = scene.reach.get(k);
        path.push({ q: cur.q, r: cur.r });
        while (cur && !(cur.pq === u.q && cur.pr === u.r)) {
          cur = scene.reach.get(key(cur.pq, cur.pr));
          if (cur) path.push({ q: cur.q, r: cur.r });
        }
        path.push({ q: u.q, r: u.r });
        scene.path = path.reverse();
        scene.pathSet = new Set(scene.path.map((h) => key(h.q, h.r)));
        scene.label = { q: tac.hover.q, r: tac.hover.r, text: `${scene.reach.get(k).c} AP`, color: COLORS.path };
      }
      const t = unitAt(tac.hover.q, tac.hover.r);
      const tgt = t && u.targets.find((x) => x.id === t.id);
      if (tgt) scene.label = { q: t.q, r: t.r, text: `${tgt.chance}%`, color: '#ff8a80' };
    }
  } else if (tac.mode === 'grenade') {
    scene.grenadeRange = new Set(b.tiles.filter((t) => hexDist(t, u) <= u.grenadeRange).map((t) => key(t.q, t.r)));
    if (tac.hover && hexDist(tac.hover, u) <= u.grenadeRange) {
      scene.blast = new Set(b.tiles.filter((t) => hexDist(t, tac.hover) <= 1).map((t) => key(t.q, t.r)));
    }
  } else if (tac.mode === 'medkit') {
    scene.targets = new Map(u.heal.map((id) => [id, 0]));
  }
  return scene;
}

function hexDist(a, b) { return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2; }

function onBoardClick() {
  if (tac.busy || !tac.hover) return;
  const { q, r } = tac.hover;
  const u = sel();
  const there = unitAt(q, r);

  if (tac.mode === 'medkit' && u) {
    if (there && u.heal.includes(there.id)) return act({ unit: u.id, type: 'MEDKIT', target: there.id });
    return toast('Pick yourself or an adjacent wounded operator.');
  }
  if (tac.mode === 'grenade' && u) return act({ unit: u.id, type: 'GRENADE', q, r });

  if (there?.side === 'PLAYER') {
    tac.selected = there.id;
    tac.mode = 'move';
    return updateTactical();
  }
  if (!u) return;
  if (there?.side === 'ENEMY') {
    if (u.targets.some((t) => t.id === there.id)) return act({ unit: u.id, type: 'SHOOT', target: there.id });
    return toast(u.ap < u.shotCost ? `Not enough AP (${u.shotCost} needed).` : 'No clear shot: out of range or line of sight.');
  }
  if (u.moves.some((m) => m.q === q && m.r === r)) return act({ unit: u.id, type: 'MOVE', q, r });
}

function act(body) {
  tac.mode = 'move';
  return command(api.post('/api/battle/action', body));
}

function updateTactical() {
  ensureSelection();
  const b = B();
  const objState = { done: '✓', progress: '◐', pending: '○', failed: '✗' };
  $('#hud').innerHTML = `
    <span class="turn">Turn <b>${b.turn}</b> / ${b.turnLimit}</span>
    <span class="chip ${b.alerted ? 'bad' : 'ok'}">${b.alerted ? 'ALERTED' : 'UNDETECTED'}</span>
    ${b.intelCarrier ? `<span class="chip gold">Intel: ${esc(b.intelCarrier)}</span>` : ''}`;
  $('#objectives').innerHTML = `<h3>Objectives</h3>` + b.objectives.map((o) => `
    <div class="obj ${o.state}"><span class="mark">${objState[o.state]}</span>
      <div><b>${o.primary ? 'Primary' : 'Secondary'}: ${esc(o.label)}</b><small>${esc(o.note)}</small></div></div>`).join('');
  $('#squad').innerHTML = `<h3>Squad</h3>` + (myUnits().length ? myUnits().map((u) => `
    <button class="sq ${u.id === tac.selected ? 'on' : ''}" data-unit="${u.id}">
      <span class="name">${esc(u.name)}${u.carrier ? ' <i class="gold">◆</i>' : ''}</span>
      <span class="bar hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i></span>
      <span class="pips">${'●'.repeat(u.ap)}${'○'.repeat(Math.max(0, u.maxAp - u.ap))}</span>
    </button>`).join('') : '<p class="muted">No operators on the map.</p>');
  $('#squad').querySelectorAll('[data-unit]').forEach((el) => el.addEventListener('click', () => {
    tac.selected = Number(el.dataset.unit);
    tac.mode = 'move';
    updateTactical();
  }));
  renderActions();
  renderLog();
  updateHint();
}

function renderActions() {
  const u = sel();
  const box = $('#actions');
  if (!u) { box.innerHTML = '<h3>Orders</h3><p class="muted">Awaiting extraction.</p>'; return; }
  box.innerHTML = `
    <h3>${esc(u.name)}</h3>
    <div class="unit-stats">
      <span>HP <b>${u.hp}/${u.maxHp}</b></span><span>AP <b>${u.ap}/${u.maxAp}</b></span>
      <span>${esc(u.weapon)} <small>${u.shotCost} AP · rng ${u.range}</small></span>
      ${u.armor ? `<span>${esc(u.armor)}</span>` : ''}
      <span>${u.utility ? esc(itemLabel(u.utility)) : '<small class="muted">no utility</small>'}</span>
    </div>
    <div class="orders">
      <button class="btn ${tac.mode === 'grenade' ? 'armed' : ''}" data-order="grenade" ${u.canGrenade ? '' : 'disabled'} title="G">Grenade</button>
      <button class="btn ${tac.mode === 'medkit' ? 'armed' : ''}" data-order="medkit" ${u.heal.length ? '' : 'disabled'} title="H">Medkit</button>
      <button class="btn" data-order="intel" ${u.canIntel ? '' : 'disabled'} title="I">Secure intel</button>
      <button class="btn" data-order="exfil" ${u.canExfil ? '' : 'disabled'} title="X">Exfiltrate</button>
    </div>
    <div class="orders end">
      <button class="btn danger" data-order="abort">${tac.abortArmed ? 'Confirm abort?' : 'Abort'}</button>
      <button class="btn primary" data-order="end" title="E">End turn</button>
    </div>`;
  box.querySelectorAll('[data-order]').forEach((b) => b.addEventListener('click', () => order(b.dataset.order)));
}

function order(o) {
  const u = sel();
  if (tac.busy) return;
  if (o !== 'abort') tac.abortArmed = false;
  switch (o) {
    case 'grenade': if (u?.canGrenade) setMode('grenade'); break;
    case 'medkit': if (u?.heal.length) setMode('medkit'); break;
    case 'intel': if (u?.canIntel) act({ unit: u.id, type: 'INTEL' }); break;
    case 'exfil': if (u?.canExfil) act({ unit: u.id, type: 'EXFIL' }); break;
    case 'end': command(api.post('/api/battle/end-turn')); break;
    case 'abort':
      if (!tac.abortArmed) { tac.abortArmed = true; renderActions(); setTimeout(() => { tac.abortArmed = false; if (S.phase === 'TACTICAL') renderActions(); }, 3000); }
      else { tac.abortArmed = false; command(api.post('/api/battle/abort')); }
      break;
  }
}

function renderLog() {
  const ol = $('#log');
  ol.innerHTML = B().log.map((e) => `<li class="ev-${e.type}">${esc(e.text)}</li>`).join('');
  ol.scrollTop = ol.scrollHeight;
}

function updateHint() {
  const el = $('#hint');
  if (!el || S?.phase !== 'TACTICAL') return;
  const u = sel();
  let text = u ? `${u.name}: click a highlighted hex to move, a marked hostile to fire. Right-click cancels.` : 'All operators have left the map.';
  if (u && tac.hover) {
    const there = unitAt(tac.hover.q, tac.hover.r);
    const tgt = there && u.targets.find((t) => t.id === there.id);
    const mv = u.moves.find((m) => m.q === tac.hover.q && m.r === tac.hover.r);
    if (tac.mode === 'grenade') text = 'Grenade: blast radius 1, 3-5 dmg, ignores cover. Friendly fire is on.';
    else if (tac.mode === 'medkit') text = 'Medkit: click yourself or an adjacent wounded operator.';
    else if (tgt) text = `Fire at ${there.name} (${there.hp}/${there.maxHp} HP): ${tgt.chance}%${tgt.mods.length ? '  [' + tgt.mods.join(', ') + ']' : ''}`;
    else if (there?.side === 'ENEMY') text = `${there.name}: ${there.weapon}, ${there.hp}/${there.maxHp} HP. No shot from here.`;
    else if (mv) text = `Move: ${mv.c} AP`;
  }
  el.textContent = text;
}

// ------------------------------------------------------------------ event playback

async function playEvents(events) {
  tac.busy = true;
  const v = tac.view;
  for (const e of events) if (e.type === 'move' && e.path?.length > 1) tac.anim.set(e.unit, v.center(e.path[0].q, e.path[0].r));
  const fx = (f) => tac.fx.push({ t0: performance.now(), ...f });
  for (const e of events) {
    switch (e.type) {
      case 'move':
        if (e.path?.length > 1) await animateMove(e.unit, e.path);
        tac.anim.delete(e.unit);
        break;
      case 'shot':
        if (e.from) fx({ kind: 'tracer', from: e.from, to: e.to, hit: e.hit, dur: 320 });
        else fx({ kind: 'flash', at: e.to, dur: 500 });
        fx({ kind: 'text', at: e.to, text: e.hit ? `-${e.amount}` : 'MISS', color: e.hit ? '#ffd27a' : '#cfd6dc', dur: 1000 });
        await sleep(340);
        break;
      case 'grenade':
        fx({ kind: 'tracer', from: e.from, to: e.to, hit: false, dur: 260 });
        await sleep(240);
        fx({ kind: 'boom', at: e.to, dur: 600 });
        await sleep(200);
        break;
      case 'damage':
        fx({ kind: 'text', at: e.to, text: `-${e.amount}`, color: '#ff8a80', dur: 1000 });
        await sleep(90);
        break;
      case 'kill':
        fx({ kind: 'text', at: e.to, text: 'DOWN', color: '#ff6b6b', dur: 1200 });
        await sleep(220);
        break;
      case 'heal':
        fx({ kind: 'text', at: e.to, text: `+${e.amount}`, color: '#7ee07e', dur: 1000 });
        await sleep(200);
        break;
      case 'intel':
        fx({ kind: 'text', at: e.to, text: 'INTEL', color: COLORS.intel, dur: 1200 });
        break;
      case 'exfil':
        fx({ kind: 'text', at: e.to, text: 'EXFIL', color: '#8be09b', dur: 1200 });
        break;
      case 'alert':
        flashBanner(e.text);
        await sleep(250);
        break;
    }
  }
  tac.anim.clear();
  tac.busy = false;
  updateTactical();
}

function animateMove(unitId, path) {
  const v = tac.view, stepMs = 110;
  const pts = path.map((h) => v.center(h.q, h.r));
  const t0 = performance.now(), total = stepMs * (pts.length - 1);
  return new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / total);
      const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i;
      tac.anim.set(unitId, { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k });
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function flashBanner(text) {
  const board = $('.board');
  if (!board) return;
  const el = document.createElement('div');
  el.className = 'banner';
  el.textContent = text;
  board.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ------------------------------------------------------------------ debrief

function renderDebrief() {
  const d = S.debrief, m = S.mission;
  const list = (items, empty) => items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p class="muted">${empty}</p>`;
  $('#view').innerHTML = `
  <section class="debrief">
    <div class="card">
      <div class="eyebrow">Mission ${m.number} · Debrief</div>
      <h1>${esc(m.codename)}</h1>
      <div class="verdict ${d.success ? 'ok' : 'bad'}">${d.success ? 'Mission success' : 'Mission failed'}</div>
      <ul class="obj-results">${d.objectives.map((o) => `
        <li class="${o.achieved ? 'ok' : 'bad'}"><span>${o.achieved ? '✓' : '✗'}</span>${o.primary ? 'Primary' : 'Secondary'}: <b>${esc(o.label)}</b></li>`).join('')}</ul>
      <p>Requisition awarded: <b>+${d.requisition} RP</b></p>
    </div>
    <div class="card">
      <h3>Personnel</h3>
      <table class="personnel">
        <thead><tr><th>Operator</th><th>Status</th><th>HP</th><th>Kills</th><th>XP</th><th>Rank</th></tr></thead>
        <tbody>${d.soldiers.map((s) => `
          <tr class="${/KIA|MIA/.test(s.status) ? 'lost' : ''}">
            <td>${esc(s.name)}</td><td>${esc(s.status)}</td><td>${s.hp}/${s.maxHp}</td><td>${s.kills}</td>
            <td>${s.xpGained ? '+' + s.xpGained : '-'}</td>
            <td>${s.promotedTo ? `<span class="chip gold">Promoted: ${esc(s.promotedTo)}</span>` : esc(s.rank)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="card split">
      <div><h3>Gear lost</h3>${list(d.gearLost, 'Nothing lost.')}</div>
      <div><h3>Gear gained</h3>${list(d.gearGained, 'Nothing recovered.')}</div>
      ${d.notes.length ? `<div><h3>Notes</h3>${list(d.notes, '')}</div>` : ''}
    </div>
    <button class="btn primary big" id="next">Next mission</button>
  </section>`;
  $('#next').addEventListener('click', () => command(api.post('/api/continue')));
}

// ------------------------------------------------------------------ boot

document.addEventListener('keydown', (e) => {
  if (S?.phase !== 'TACTICAL' || e.target.closest('input,select,textarea')) return;
  const k = e.key.toLowerCase();
  if (k === 'tab') {
    e.preventDefault();
    const mine = myUnits();
    if (!mine.length) return;
    const i = mine.findIndex((u) => u.id === tac.selected);
    tac.selected = mine[(i + 1) % mine.length].id;
    tac.mode = 'move';
    updateTactical();
  } else if (k === 'escape') setMode('move');
  else if (k === 'e') order('end');
  else if (k === 'g') order('grenade');
  else if (k === 'h') order('medkit');
  else if (k === 'i') order('intel');
  else if (k === 'x') order('exfil');
});

window.addEventListener('resize', () => { if (S?.phase === 'BRIEFING') drawPreview(); });

$('#btn-new').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (b.dataset.armed) { delete b.dataset.armed; b.textContent = 'New campaign'; draft.mission = null; command(api.post('/api/campaign/new')); return; }
  b.dataset.armed = '1';
  b.textContent = 'Really restart?';
  setTimeout(() => { delete b.dataset.armed; b.textContent = 'New campaign'; }, 3000);
});

command(api.get('/api/state'));
