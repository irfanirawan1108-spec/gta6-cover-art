// Fixed scenes for screenshots: ?shot=editor shows the page with photos loaded;
// ?shot=cover shows the cover alone, full frame. window.__shotReady is set by
// main.js once the scene has painted.
import { LAYOUTS, GRADES, SIZES } from './cover.js';

function sampleKey(name) {
  return `sample:${name}.jpg`;
}

export async function runShot(shot, query, api) {
  const { state, setState } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const patch = {};
  if (query.get('layout') && LAYOUTS[query.get('layout')]) patch.layout = query.get('layout');
  if (query.get('grade') && GRADES[query.get('grade')]) patch.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) patch.size = query.get('size');
  if (query.get('title') || query.get('caption')) {
    patch.title = query.get('title') ?? query.get('caption');
  }
  if (query.get('subtitle')) patch.subtitle = query.get('subtitle');
  if (query.get('badge')) patch.badge = query.get('badge');
  if (query.get('stars')) patch.stars = Number(query.get('stars'));
  setState(patch);

  // The editor scene needs no panel assignment: the default panels already
  // carry sample photos.
  if (shot === 'editor' && !query.get('photos') && !query.get('photo')) return;

  const names = (query.get('photos') ?? query.get('photo') ?? 'convertible').split(',');
  const count = LAYOUTS[state.layout].panels;
  state.panels = Array.from({ length: count }, (_, i) => ({
    photo: sampleKey(names[i % names.length]),
    zoom: 1,
    dx: 0,
    dy: 0,
  }));
  state.selected = -1;
}
