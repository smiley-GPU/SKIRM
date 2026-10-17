// Isometric hex renderer. Pure view: takes a scene description, draws a frame. No game rules here.

const SQRT3 = Math.sqrt(3);
export const ISO = 0.6; // vertical squash of the ground plane

const TERRAIN = {
  OPEN: '#5b6447', ROAD: '#7d7058', ROUGH: '#41593a', WATER: '#2f5871',
  LOW_COVER: '#8b7752', WALL: '#948f84',
};
const HEIGHT = { LOW_COVER: 0.32, WALL: 0.8 };
const UNKNOWN = '#14171a';

export const COLORS = {
  player: '#5cc2e6', enemy: '#e0605a', hvt: '#e8b84a', ghost: '#e0605a',
  reach: '92,194,230', path: '#9fe3ff', extraction: '120,220,140', insertion: '92,160,230',
  grenade: '255,150,60', intel: '#f2d14b',
};

export const key = (q, r) => q + ',' + r;

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function cubeRound(fq, fr) {
  const fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}

// Deterministic per-tile hash for decoration placement (no flicker between frames).
function hash(q, r, i) {
  let h = (q * 374761393 + r * 668265263 + i * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export class HexView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 20;
    this.ox = 0;
    this.oy = 0;
  }

  /** Fit the whole map into the canvas' CSS box. Call on mount and on resize. */
  fit(cols, rows) {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    const pad = 14, head = 1.25;
    const unitsW = SQRT3 * (cols + 0.5);
    const unitsH = (1.5 * (rows - 1) + 2) * ISO + head;
    this.size = Math.max(6, Math.min((w - pad * 2) / unitsW, (h - pad * 2) / unitsH));
    this.ox = (w - unitsW * this.size) / 2 + (SQRT3 / 2) * this.size;
    this.oy = (h - unitsH * this.size) / 2 + this.size * (head + ISO);
  }

  center(q, r) {
    return { x: this.ox + this.size * SQRT3 * (q + r / 2), y: this.oy + this.size * 1.5 * r * ISO };
  }

  pick(px, py) {
    const x = (px - this.ox) / this.size, y = (py - this.oy) / (this.size * ISO);
    return cubeRound((SQRT3 / 3) * x - y / 3, (2 / 3) * y);
  }

  corners(x, y, lift = 0, scale = 1) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push([x + this.size * scale * Math.cos(a), y + this.size * scale * Math.sin(a) * ISO - lift]);
    }
    return pts;
  }

  poly(pts, fill, stroke, lw = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }

  // ------------------------------------------------------------------ frame

  draw(scene, now) {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);

    const rows = new Map();
    for (const t of scene.tiles) {
      if (!rows.has(t.r)) rows.set(t.r, []);
      rows.get(t.r).push(t);
    }
    const unitsByRow = new Map();
    const animated = [];
    for (const u of scene.units) {
      if (scene.anim?.has(u.id)) { animated.push(u); continue; }
      if (!unitsByRow.has(u.r)) unitsByRow.set(u.r, []);
      unitsByRow.get(u.r).push(u);
    }

    // Painter's order: back rows first; units drawn right after their row so walls in front occlude them.
    const order = [...rows.keys()].sort((a, b) => a - b);
    for (const r of order) {
      const row = rows.get(r).sort((a, b) => a.q - b.q);
      for (const t of row) this.drawTile(t, scene, now);
      for (const g of scene.ghosts || []) if (g.r === r) this.drawGhost(g);
      for (const u of unitsByRow.get(r) || []) this.drawUnit(u, this.center(u.q, u.r), scene, now);
    }
    for (const u of animated) this.drawUnit(u, scene.anim.get(u.id), scene, now);

    this.drawPath(scene);
    this.drawFx(scene.fx || [], now);
    if (scene.label) this.drawLabel(scene.label);
  }

  drawTile(t, scene, now) {
    const { x, y } = this.center(t.q, t.r);
    const k = key(t.q, t.r);
    if (!t.t) {
      this.poly(this.corners(x, y), UNKNOWN, 'rgba(255,255,255,0.05)');
    } else {
      const f = t.v ? 1 : 0.5;
      const base = TERRAIN[t.t];
      const h = (HEIGHT[t.t] || 0) * this.size;
      if (h > 0) this.prism(x, y, h, base, f);
      else {
        this.poly(this.corners(x, y), shade(base, f), 'rgba(0,0,0,0.28)');
        this.decorate(t, x, y, f);
      }
    }
    const z = scene.zones || {};
    if (z.extraction?.has(k)) this.poly(this.corners(x, y, 0, 0.92), `rgba(${COLORS.extraction},0.22)`, `rgba(${COLORS.extraction},0.75)`, 1.5);
    else if (z.insertion?.has(k)) this.poly(this.corners(x, y, 0, 0.92), `rgba(${COLORS.insertion},0.14)`, `rgba(${COLORS.insertion},0.45)`);

    if (scene.grenadeRange?.has(k)) this.poly(this.corners(x, y, 0, 0.9), `rgba(${COLORS.grenade},0.10)`);
    if (scene.blast?.has(k)) this.poly(this.corners(x, y, 0, 0.9), `rgba(${COLORS.grenade},0.42)`, `rgba(${COLORS.grenade},0.9)`);
    if (scene.reach?.has(k)) {
      const onPath = scene.pathSet?.has(k);
      this.poly(this.corners(x, y, 0, 0.86), `rgba(${COLORS.reach},${onPath ? 0.38 : 0.16})`, onPath ? COLORS.path : null);
    }
    if (scene.hover && scene.hover.q === t.q && scene.hover.r === t.r)
      this.poly(this.corners(x, y, (HEIGHT[t.t] || 0) * this.size), null, 'rgba(255,255,255,0.8)', 1.5);

    if (z.objective && z.objective.q === t.q && z.objective.r === t.r) this.drawIntel(x, y, now);
  }

  prism(x, y, h, color, f) {
    const top = this.corners(x, y, h), bot = this.corners(x, y, 0);
    this.poly([bot[1], bot[2], top[2], top[1]], shade(color, 0.72 * f), 'rgba(0,0,0,0.35)');
    this.poly([bot[2], bot[3], top[3], top[2]], shade(color, 0.56 * f), 'rgba(0,0,0,0.35)');
    this.poly(top, shade(color, 1.05 * f), 'rgba(0,0,0,0.35)');
  }

  decorate(t, x, y, f) {
    const c = this.ctx, s = this.size;
    if (t.t === 'ROUGH') {
      c.strokeStyle = shade('#6f8f55', f);
      c.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const dx = (hash(t.q, t.r, i) - 0.5) * s * 1.1, dy = (hash(t.q, t.r, i + 9) - 0.5) * s * 0.6;
        c.beginPath();
        c.moveTo(x + dx - 2, y + dy);
        c.lineTo(x + dx, y + dy - 5);
        c.lineTo(x + dx + 2, y + dy);
        c.stroke();
      }
    } else if (t.t === 'WATER') {
      c.strokeStyle = `rgba(160,210,240,${0.35 * f})`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - s * 0.4, y);
      c.quadraticCurveTo(x, y - 3, x + s * 0.4, y);
      c.stroke();
    } else if (t.t === 'ROAD') {
      c.fillStyle = `rgba(230,210,160,${0.25 * f})`;
      c.fillRect(x - s * 0.25, y - 1, s * 0.5, 2);
    }
  }

  drawIntel(x, y, now) {
    const c = this.ctx, s = this.size;
    const bob = Math.sin(now / 300) * 2;
    const cy = y - s * 0.45 + bob;
    c.beginPath();
    c.moveTo(x, cy - s * 0.22);
    c.lineTo(x + s * 0.16, cy);
    c.lineTo(x, cy + s * 0.22);
    c.lineTo(x - s * 0.16, cy);
    c.closePath();
    c.fillStyle = COLORS.intel;
    c.fill();
    c.strokeStyle = '#3a2f08';
    c.lineWidth = 1;
    c.stroke();
  }

  drawUnit(u, pos, scene, now) {
    const c = this.ctx, s = this.size, { x, y } = pos;
    const selected = scene.selectedId === u.id;
    const target = scene.targets?.get(u.id);

    c.beginPath();
    c.ellipse(x, y, s * 0.36, s * 0.36 * ISO, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.fill();
    if (selected) {
      c.lineWidth = 2;
      c.strokeStyle = `rgba(160,230,255,${0.6 + 0.4 * Math.sin(now / 180)})`;
      c.beginPath();
      c.ellipse(x, y, s * 0.5, s * 0.5 * ISO, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (target !== undefined) {
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(255,90,80,0.9)';
      c.setLineDash([4, 3]);
      c.beginPath();
      c.ellipse(x, y, s * 0.5, s * 0.5 * ISO, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
    }

    let color = u.side === 'PLAYER' ? COLORS.player : u.hvt ? COLORS.hvt : COLORS.enemy;
    if (u.side === 'PLAYER' && u.ap === 0) color = shade(color, 0.55);
    c.fillStyle = color;
    c.strokeStyle = 'rgba(0,0,0,0.65)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.roundRect(x - s * 0.17, y - s * 0.72, s * 0.34, s * 0.64, s * 0.09);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(x, y - s * 0.88, s * 0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    if (u.carrier) {
      c.fillStyle = COLORS.intel;
      c.fillRect(x + s * 0.08, y - s * 0.55, s * 0.14, s * 0.14);
    }

    const bw = s * 0.7, bx = x - bw / 2, by = y - s * 1.18;
    const ratio = Math.max(0, u.hp / u.maxHp);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(bx - 1, by - 1, bw + 2, 5);
    c.fillStyle = ratio > 0.6 ? '#6fd36f' : ratio > 0.3 ? '#e6c84f' : '#e0605a';
    c.fillRect(bx, by, bw * ratio, 3);
  }

  drawGhost(g) {
    const c = this.ctx, s = this.size, { x, y } = this.center(g.q, g.r);
    c.save();
    c.setLineDash([3, 3]);
    c.strokeStyle = 'rgba(224,96,90,0.7)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(x - s * 0.17, y - s * 0.72, s * 0.34, s * 0.64, s * 0.09);
    c.stroke();
    c.beginPath();
    c.arc(x, y - s * 0.88, s * 0.15, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    c.fillStyle = 'rgba(224,96,90,0.85)';
    c.font = `bold ${Math.round(s * 0.42)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.fillText('?', x, y - s * 0.3);
  }

  drawPath(scene) {
    if (!scene.path || scene.path.length < 2) return;
    const c = this.ctx;
    c.strokeStyle = COLORS.path;
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.beginPath();
    scene.path.forEach((h, i) => {
      const p = this.center(h.q, h.r);
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    });
    c.stroke();
    c.setLineDash([]);
  }

  drawLabel({ q, r, text, color }) {
    const c = this.ctx, s = this.size, { x, y } = this.center(q, r);
    c.font = `600 ${Math.max(11, Math.round(s * 0.42))}px system-ui, sans-serif`;
    const w = c.measureText(text).width + 12, hgt = Math.max(18, s * 0.62);
    const bx = x - w / 2, by = y - s * 1.75 - hgt;
    c.fillStyle = 'rgba(10,12,14,0.88)';
    c.strokeStyle = color || 'rgba(255,255,255,0.4)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(bx, by, w, hgt, 4);
    c.fill();
    c.stroke();
    c.fillStyle = color || '#e8ecef';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, by + hgt / 2 + 1);
    c.textBaseline = 'alphabetic';
  }

  drawFx(fx, now) {
    const c = this.ctx, s = this.size;
    for (const f of fx) {
      const t = (now - f.t0) / f.dur;
      if (t < 0 || t > 1) continue;
      if (f.kind === 'tracer') {
        const a = this.center(f.from.q, f.from.r), b = this.center(f.to.q, f.to.r);
        const head = Math.min(1, t * 2.2);
        c.strokeStyle = f.hit ? `rgba(255,225,120,${1 - t})` : `rgba(210,210,210,${0.8 - 0.8 * t})`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(a.x, a.y - s * 0.55);
        c.lineTo(a.x + (b.x - a.x) * head, a.y - s * 0.55 + (b.y - a.y) * head);
        c.stroke();
      } else if (f.kind === 'text') {
        const p = this.center(f.at.q, f.at.r);
        c.globalAlpha = 1 - t * t;
        c.font = `bold ${Math.max(12, Math.round(s * 0.5))}px system-ui, sans-serif`;
        c.textAlign = 'center';
        c.lineWidth = 3;
        c.strokeStyle = 'rgba(0,0,0,0.8)';
        c.strokeText(f.text, p.x, p.y - s * 1.35 - t * s * 0.9);
        c.fillStyle = f.color;
        c.fillText(f.text, p.x, p.y - s * 1.35 - t * s * 0.9);
        c.globalAlpha = 1;
      } else if (f.kind === 'boom') {
        const p = this.center(f.at.q, f.at.r);
        c.fillStyle = `rgba(255,170,70,${0.55 * (1 - t)})`;
        c.beginPath();
        c.ellipse(p.x, p.y, s * 2 * t + 2, (s * 2 * t + 2) * ISO, 0, 0, Math.PI * 2);
        c.fill();
      } else if (f.kind === 'flash') {
        const p = this.center(f.at.q, f.at.r);
        c.strokeStyle = `rgba(255,90,80,${1 - t})`;
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(p.x, p.y, s * (0.4 + t), s * (0.4 + t) * ISO, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
  }
}
