// Neon Boulevard — the cover engine. Layouts, sunset/neon colour grades, bold
// poster lettering and the finish effects, all painted onto a 2D canvas. The
// same routine draws the live preview and the exported PNG, so what you see
// is exactly what the file holds.

export const LAYOUTS = {
  grid9: { name: 'Nine-panel grid', panels: 9 },
  hero3: { name: 'Hero + three', panels: 4 },
  quad: { name: 'Four-panel', panels: 4 },
  bleed: { name: 'Full bleed', panels: 1 },
  tilt: { name: 'Tilted snapshots', panels: 3 },
  strip: { name: 'Story strip', panels: 2 },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset', ramp: ['#1a0b2e', '#7b2d8b', '#e84a7f', '#ff8a3d', '#ffd319'] },
  neon: { name: 'Neon Nights', ramp: ['#050514', '#1b1b4d', '#ff2e88', '#22d3ee', '#f0f9ff'] },
  dusk: { name: 'Palm Dusk', ramp: ['#12082b', '#3b1d5e', '#b64a8a', '#ff9e5e', '#ffe9a8'] },
  pink: { name: 'Hot Pink', ramp: ['#14041f', '#5b0f4d', '#c2187a', '#ff5da2', '#ffd6ec'] },
  noir: { name: 'Teal Noir', ramp: ['#020617', '#0f2a3d', '#14666b', '#2dd4bf', '#e0fbf7'] },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
  '1080x1920': [1080, 1920],
};

// Panel boxes for a layout: {x, y, w, h, rot} in canvas pixels, gutters included.
export function layoutPanels(layout, w, h, frame) {
  const gap = Math.round(Math.min(w, h) * 0.012); // white gutter between panels
  const edge = frame ? Math.round(Math.min(w, h) * 0.016) : 0; // outer poster frame
  const x0 = edge, y0 = edge, w0 = w - 2 * edge, h0 = h - 2 * edge;
  const box = (x, y, pw, ph, rot = 0) => ({ x, y, w: pw, h: ph, rot });

  if (layout === 'grid9') {
    const cw = (w0 - 2 * gap) / 3, ch = (h0 - 2 * gap) / 3;
    const out = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) out.push(box(x0 + c * (cw + gap), y0 + r * (ch + gap), cw, ch));
    }
    return out;
  }
  if (layout === 'hero3') {
    const heroH = h0 * 0.58 - gap / 2, botH = h0 - heroH - gap;
    const cw = (w0 - 2 * gap) / 3;
    return [
      box(x0, y0, w0, heroH),
      box(x0, y0 + heroH + gap, cw, botH),
      box(x0 + cw + gap, y0 + heroH + gap, cw, botH),
      box(x0 + 2 * (cw + gap), y0 + heroH + gap, cw, botH),
    ];
  }
  if (layout === 'quad') {
    const cw = (w0 - gap) / 2, ch = (h0 - gap) / 2;
    return [
      box(x0, y0, cw, ch), box(x0 + cw + gap, y0, cw, ch),
      box(x0, y0 + ch + gap, cw, ch), box(x0 + cw + gap, y0 + ch + gap, cw, ch),
    ];
  }
  if (layout === 'tilt') {
    const cw = w0 * 0.52, ch = h0 * 0.62;
    return [
      box(x0 + w0 * 0.02, y0 + h0 * 0.05, cw, ch, -0.1),
      box(x0 + w0 * 0.46, y0 + h0 * 0.12, cw, ch, 0.08),
      box(x0 + w0 * 0.24, y0 + h0 * 0.32, cw, ch, -0.03),
    ];
  }
  if (layout === 'strip') {
    const topH = h0 * 0.42 - gap / 2, midH = h0 * 0.30 - gap / 2;
    return [box(x0, y0, w0, topH), box(x0, y0 + topH + gap, w0, midH)];
  }
  return [box(x0, y0, w0, h0)]; // bleed and anything unknown: one full panel
}

// --- Colour grades ---------------------------------------------------------

// A 256-step lookup table built from a dark-to-light colour ramp.
function buildRampTable(ramp) {
  const stops = ramp.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const a = Math.min(stops.length - 2, Math.floor(t)), b = a + 1, f = t - a;
    for (let ch = 0; ch < 3; ch++) {
      table[i * 3 + ch] = Math.round(stops[a][ch] + (stops[b][ch] - stops[a][ch]) * f);
    }
  }
  return table;
}

const gradedCache = new Map();

// The photo with the grade's gradient map laid over it (cached per photo+grade).
// 72% gradient map, 28% original: the grade reads strong but the photo stays.
export function gradePhoto(img, gradeKey) {
  const cacheKey = `${img.src}|${gradeKey}`;
  const hit = gradedCache.get(cacheKey);
  if (hit) return hit;
  const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const cw = Math.max(2, Math.round(img.naturalWidth * scale));
  const ch = Math.max(2, Math.round(img.naturalHeight * scale));
  const off = document.createElement('canvas');
  off.width = cw;
  off.height = ch;
  const ctx = off.getContext('2d');
  ctx.drawImage(img, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch);
  const px = data.data;
  const table = buildRampTable(GRADES[gradeKey].ramp);
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    const li = Math.max(0, Math.min(255, Math.round(lum)));
    px[i] = Math.round(px[i] * 0.28 + table[li * 3] * 0.72);
    px[i + 1] = Math.round(px[i + 1] * 0.28 + table[li * 3 + 1] * 0.72);
    px[i + 2] = Math.round(px[i + 2] * 0.28 + table[li * 3 + 2] * 0.72);
  }
  ctx.putImageData(data, 0, 0);
  gradedCache.set(cacheKey, off);
  return off;
}

// --- Finish effects --------------------------------------------------------

// Seeded random numbers, so the grain is identical on every render.
function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoiseTile() {
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const ctx = tile.getContext('2d');
  const data = ctx.createImageData(160, 160);
  const rnd = seededRandom(20261119);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return tile;
}

const noiseTile = makeNoiseTile();

// --- Drawing ----------------------------------------------------------------

// One photo inside one panel box: cover-fit, with the panel's zoom and pan.
function paintPanelPhoto(ctx, img, panel, zoom, dx, dy) {
  const { x, y, w, h, rot } = panel;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate(rot);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  const base = Math.max(w / img.width, h / img.height) * zoom;
  const pw = img.width * base, ph = img.height * base;
  ctx.drawImage(img, -pw / 2 + dx * w * 0.4, -ph / 2 + dy * h * 0.4, pw, ph);
  ctx.restore();
}

// Halftone dots across a band, for the poster title block.
function paintHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(9, Math.round(w / 90));
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const r = 1 + ((Math.sin(xx * 0.7) + Math.cos(yy * 0.9)) * 0.5 + 0.5) * 1.6;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Anton text shrunk until it fits, returning the size used.
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

// Title, subtitle, badge ribbon and star meter over the cover.
function paintLettering(ctx, w, h, state, titleY) {
  const title = state.title.trim().toUpperCase();
  if (title) {
    const grad = ctx.createLinearGradient(0, titleY - h * 0.09, 0, titleY + h * 0.01);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.5, '#ff7e3d');
    grad.addColorStop(1, '#ff2975');
    const size = fitTitleSize(ctx, title, w * 0.9, Math.round(w * 0.115));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20, 4, 32, 0.9)';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeText(title, w / 2, titleY);
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, titleY);
  }
  const sub = state.subtitle.trim();
  if (sub) {
    ctx.font = `${Math.round(w * 0.032)}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(w * 0.02);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, w / 2, titleY + h * 0.055);
    ctx.shadowBlur = 0;
  }
}

// The badge ribbon across the top-left corner.
function paintBadge(ctx, w, text) {
  if (!text.trim()) return;
  ctx.save();
  ctx.translate(w * 0.02, w * 0.045);
  ctx.rotate(-0.06);
  const label = ` ${text.trim().toUpperCase()} `;
  ctx.font = `${Math.round(w * 0.024)}px Anton, sans-serif`;
  const tw = ctx.measureText(label).width;
  const bh = Math.round(w * 0.045);
  ctx.fillStyle = '#ffd319';
  ctx.fillRect(0, 0, tw + bh, bh);
  ctx.fillStyle = '#17101f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bh / 2, bh / 2 + 1);
  ctx.restore();
}

// The star heat meter in the top-right corner.
function paintStars(ctx, w, count) {
  if (!count) return;
  const size = Math.round(w * 0.032);
  const stars = '★'.repeat(count);
  ctx.font = `${size}px sans-serif`;
  const tw = ctx.measureText(stars).width;
  const pad = Math.round(w * 0.014);
  ctx.fillStyle = 'rgba(10, 4, 20, 0.55)';
  const bw = tw + pad * 2, bh = size + pad * 1.4;
  ctx.beginPath();
  ctx.roundRect(w - bw - pad, pad, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd319';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(stars, w - bw, pad + bh / 2 + 1);
}

// The whole cover: panels, scrim, halftone title band, lettering, grain, vignette.
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = state.frame ? '#ffffff' : '#17101f';
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h, state.frame);
  panels.forEach((panel, i) => {
    const p = state.panels[i];
    const img = p && photos.get(p.photo);
    if (!img) {
      // Empty panel: a numbered placeholder so the grid still reads.
      ctx.save();
      ctx.fillStyle = '#2b1838';
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.fillStyle = '#6b5578';
      ctx.font = `bold ${Math.round(panel.w * 0.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.restore();
      return;
    }
    paintPanelPhoto(ctx, gradePhoto(img, state.grade), panel, p.zoom, p.dx, p.dy);
    if (state.selected === i) {
      ctx.save();
      ctx.strokeStyle = '#ffd319';
      ctx.lineWidth = Math.max(3, w * 0.004);
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
      ctx.restore();
    }
  });

  // Title zone: a solid band on the story strip, a fading scrim elsewhere.
  const titleZone = state.layout === 'strip'
    ? { y: h * 0.74, h: h * 0.26 }
    : { y: h * 0.66, h: h * 0.34 };
  if (state.layout === 'strip') {
    ctx.fillStyle = '#17101f';
    ctx.fillRect(0, titleZone.y, w, titleZone.h);
  } else {
    const scrim = ctx.createLinearGradient(0, titleZone.y, 0, h);
    scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 20, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, titleZone.y, w, titleZone.h);
  }
  paintHalftone(ctx, w * 0.05, titleZone.y + titleZone.h * 0.08, w * 0.9, Math.min(titleZone.h * 0.22, h * 0.05), 'rgba(255, 210, 25, 0.35)');
  const titleY = state.layout === 'strip' ? h * 0.86 : h - h * 0.115;
  paintLettering(ctx, w, h, state, titleY);
  paintBadge(ctx, w, state.badge);
  paintStars(ctx, w, state.stars);

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
