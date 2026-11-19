// Neon Boulevard — wires the page: photos, layouts, grades, sizes, lettering,
// undo/redo and PNG export. A `?shot=` query sets up a fixed scene for a
// screenshot instead (see shots.js).
import { LAYOUTS, GRADES, SIZES, layoutPanels, drawCover } from './cover.js';

export const SAMPLES = [
  { file: 'convertible.jpg', name: 'Convertible' },
  { file: 'rooftop.jpg', name: 'Rooftop' },
  { file: 'neon.jpg', name: 'Neon street' },
  { file: 'pier.jpg', name: 'Pier' },
  { file: 'boulevard.jpg', name: 'Boulevard' },
];

const canvas = document.getElementById('cover');
const statusLine = document.getElementById('status');
const photos = new Map();
let uploadsSeen = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(file) {
  const key = `sample:${file}`;
  if (!photos.has(key)) photos.set(key, await loadImage(`samples/${file}`));
  return key;
}

// Fresh panels for a layout, cycling through the sample photos.
function freshPanels(layout) {
  const n = LAYOUTS[layout].panels;
  const cycle = ['convertible.jpg', 'rooftop.jpg', 'neon.jpg', 'pier.jpg', 'boulevard.jpg'];
  return Array.from({ length: n }, (_, i) => ({
    photo: `sample:${cycle[i % cycle.length]}`,
    zoom: 1, dx: 0, dy: 0,
  }));
}

let state = {
  layout: 'grid9',
  grade: 'sunset',
  size: '1080x1080',
  title: 'NEON SHORE',
  subtitle: 'one night in the city',
  badge: 'NEON BOULEVARD',
  stars: 5,
  grain: true,
  vignette: true,
  frame: true,
  selected: 0,
  panels: freshPanels('grid9'),
};

// --- Undo / redo -----------------------------------------------------------

const undoStack = [];
const redoStack = [];

function takeSnapshot() { return JSON.stringify(state); }
function pushUndo() {
  undoStack.push(takeSnapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
}
function restoreSnapshot(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

// --- Rendering -------------------------------------------------------------

function applySize() {
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
}

function redraw() {
  applySize();
  drawCover(canvas, state, photos);
}

function syncControls() {
  const markActive = (id, value) => {
    document.querySelectorAll(`#${id} button`).forEach((b) => {
      b.classList.toggle('active', b.dataset.value === value);
    });
  };
  markActive('layouts', state.layout);
  markActive('grades', state.grade);
  markActive('sizes', state.size);
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('stars').value = String(state.stars);
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('frame').checked = state.frame;
  const panel = state.panels[state.selected];
  document.getElementById('zoom').value = panel ? String(panel.zoom) : '1';
  document.getElementById('panelInfo').textContent = state.selected >= 0
    ? `Panel ${state.selected + 1} of ${state.panels.length}`
    : `${state.panels.length} panels`;
  document.querySelectorAll('#samples img').forEach((img) => {
    img.classList.toggle('active', !!panel && panel.photo === `sample:${img.dataset.file}`);
  });
}

// --- Controls --------------------------------------------------------------

function buildChoices(id, items, onPick) {
  const host = document.getElementById(id);
  Object.entries(items).forEach(([value, item]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = value;
    b.textContent = typeof item === 'string' ? item : item.name;
    b.addEventListener('click', () => {
      pushUndo();
      onPick(value);
      syncControls();
      redraw();
    });
    host.appendChild(b);
  });
}

buildChoices('layouts', LAYOUTS, (value) => {
  const old = state.panels;
  state.layout = value;
  const next = freshPanels(value);
  // Keep the photos already placed when the new layout has room for them.
  for (let i = 0; i < Math.min(old.length, next.length); i++) next[i] = old[i];
  state.panels = next;
  state.selected = 0;
});
buildChoices('grades', GRADES, (value) => { state.grade = value; });
buildChoices('sizes', Object.fromEntries(
  Object.keys(SIZES).map((k) => [k, k.replace('x', ' × ')]),
), (value) => { state.size = value; });

const samplesHost = document.getElementById('samples');
SAMPLES.forEach(({ file, name }) => {
  const img = document.createElement('img');
  img.src = `samples/${file}`;
  img.alt = name;
  img.title = name;
  img.dataset.file = file;
  img.addEventListener('click', async () => {
    pushUndo();
    await loadSample(file);
    state.panels[state.selected].photo = `sample:${file}`;
    syncControls();
    redraw();
  });
  samplesHost.appendChild(img);
});

document.getElementById('fillAll').addEventListener('click', () => {
  pushUndo();
  const photo = state.panels[state.selected].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  redraw();
});

document.getElementById('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const key = `upload:${++uploadsSeen}`;
    photos.set(key, await loadImage(dataUrl));
    pushUndo();
    state.panels[state.selected].photo = key;
  }
  syncControls();
  redraw();
});

for (const [id, key] of [['title', 'title'], ['subtitle', 'subtitle'], ['badge', 'badge']]) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
  document.getElementById(id).addEventListener('focus', () => pushUndo());
}
document.getElementById('stars').addEventListener('change', (e) => {
  pushUndo();
  state.stars = Number(e.target.value);
  syncControls();
  redraw();
});
for (const [id, key] of [['grain', 'grain'], ['vignette', 'vignette'], ['frame', 'frame']]) {
  document.getElementById(id).addEventListener('change', (e) => {
    pushUndo();
    state[key] = e.target.checked;
    redraw();
  });
}
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('pointerdown', () => pushUndo());
document.getElementById('zoom').addEventListener('focus', () => pushUndo());

document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(takeSnapshot());
  restoreSnapshot(undoStack.pop());
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(takeSnapshot());
  restoreSnapshot(redoStack.pop());
});

// --- Export ----------------------------------------------------------------

// Renders the cover at W x H offscreen (without the selection outline) and
// returns its PNG blob.
export async function renderExport(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, { ...state, selected: -1 }, photos);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = SIZES[state.size];
  const blob = await renderExport(w, h);
  saveBlob(blob, `cover-${state.size}.png`);
  statusLine.textContent = `Saved cover-${state.size}.png`;
});

document.getElementById('exportAll').addEventListener('click', async () => {
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    const blob = await renderExport(w, h);
    saveBlob(blob, `cover-${name}.png`);
  }
  statusLine.textContent = 'Saved all four sizes.';
});

// --- Panel picking, dragging and zooming on the preview ---------------------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function hitPanel(pt) {
  const panels = layoutPanels(state.layout, canvas.width, canvas.height, state.frame);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const i = hitPanel(pt);
  if (i < 0) return;
  pushUndo();
  state.selected = i;
  syncControls();
  redraw();
  drag = {
    panel: state.panels[i],
    startX: pt.x, startY: pt.y,
    dx: state.panels[i].dx, dy: state.panels[i].dy,
  };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height, state.frame);
  const p = panels[state.selected];
  drag.panel.dx = Math.max(-1, Math.min(1, drag.dx + ((pt.x - drag.startX) / p.w) * 2));
  drag.panel.dy = Math.max(-1, Math.min(1, drag.dy + ((pt.y - drag.startY) / p.h) * 2));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

let wheelUndoAt = 0;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (Date.now() - wheelUndoAt > 800) {
    pushUndo();
    wheelUndoAt = Date.now();
  }
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(2.5, panel.zoom - Math.sign(e.deltaY) * 0.1));
  document.getElementById('zoom').value = String(panel.zoom);
  redraw();
}, { passive: false });

// --- Startup: screenshot scenes or the plain editor ------------------------

const query = new URLSearchParams(location.search);
const shot = query.get('shot');

async function start() {
  await Promise.all([
    document.fonts.load('80px Anton'),
    document.fonts.load('40px Pacifico'),
    document.fonts.ready,
  ]);
  for (const { file } of SAMPLES) await loadSample(file);
  if (shot) {
    const { runShot } = await import('./shots.js');
    await runShot(shot, query, {
      state,
      setState: (patch) => { Object.assign(state, patch); },
    });
  }
  syncControls();
  redraw();
  if (shot) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  }
}
start();
