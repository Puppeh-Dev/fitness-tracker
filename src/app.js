import { load, save, normalise, uid, mergeHealth } from './store.js';
import { parseHealthText } from './health.js';
import {
  EQUIPMENT, FOCUS, GOALS, availablePresets, alternatives, presetById, toTemplate, labelFor,
} from './presets.js';
import { GUIDE } from './exercise-guide.js';
import {
  dayKey, dailyWeights, withTrend, trendChange, weekdayIndex, startOfWeek,
  weekAdherence, kgToDisplay, displayToKg,
} from './stats.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TITLES = { today: 'Today', plan: 'Plan', weight: 'Weight', log: 'Workouts', more: 'More' };

let state = load();
let tab = 'today';
// Transient UI state that shouldn't be persisted.
let ui = { editingTemplate: null, loggingFrom: null, browsing: false, filter: null };

const view = document.getElementById('view');

function commit() {
  save(state);
  render();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 2800);
}

const unit = () => state.settings.unit;
const fmtW = (kg) => (kg == null ? '–' : `${kgToDisplay(kg, unit()).toFixed(1)}`);
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const template = (id) => state.templates.find((t) => t.id === id);
const todayInput = () => dayKey(new Date());

function signed(n) {
  if (n == null) return '–';
  const v = kgToDisplay(n, unit());
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}

function weightSeries() {
  return withTrend(dailyWeights(state.weights));
}

// ---------- Today ----------

function weekStrip() {
  const now = new Date();
  const start = startOfWeek(now);
  const todayIdx = weekdayIndex(now);
  const doneDays = new Set(state.workouts.filter((w) => new Date(w.date) >= start).map((w) => weekdayIndex(w.date)));
  return `<div class="week">${DAYS.map((d, i) => {
    const planned = state.plan[i];
    let cls = planned ? '' : 'rest';
    if (doneDays.has(i)) cls = 'done';
    else if (planned && i < todayIdx) cls = 'missed';
    if (i === todayIdx) cls += ' today';
    return `<div class="d ${cls}">${d}</div>`;
  }).join('')}</div>`;
}

// Today's workout: the planned one, unless it was swapped for a preset today.
function todaysWorkout() {
  const planned = template(state.plan[weekdayIndex(new Date())]);
  const swap = state.todaySwap?.day === todayInput() ? presetById(state.todaySwap.presetId) : null;
  return { planned, swap, workout: swap || planned };
}

function settingPill(setting) {
  if (!setting) return '';
  return `<span class="pill">${setting === 'either' ? 'Indoor or outdoor' : setting === 'indoor' ? 'Indoor' : 'Outdoor'}</span>`;
}

function swapCard(planned, swap) {
  if (swap) {
    return `<p class="small muted">Swapped from ${planned ? esc(planned.name) : 'a rest day'} for today. <button class="link" data-action="swap-undo">Undo</button></p>`;
  }
  if (!planned?.focus || planned.setting === 'either') return '';
  const other = planned.setting === 'indoor' ? 'outdoor' : 'indoor';
  const alts = alternatives(planned, other, state.settings.equipment).slice(0, 2);
  if (!alts.length) return '';
  return `
    <details style="margin-top:10px">
      <summary class="small">${other === 'outdoor' ? 'Want to train outside today?' : 'Stuck indoors today?'}</summary>
      <ul class="list">${alts.map((p) => `
        <li class="spread"><span>${esc(p.name)}<br><span class="muted small">${p.minutes} min · ${labelFor(FOCUS, p.focus)}</span></span>
        <button class="link shrink" data-action="swap" data-preset="${p.id}">Swap</button></li>`).join('')}
      </ul>
    </details>`;
}

function renderToday() {
  const { planned, swap, workout: t } = todaysWorkout();
  const series = weightSeries();
  const last = series[series.length - 1];
  const adherence = weekAdherence(state.plan, state.workouts);
  const loggedToday = state.workouts.filter((w) => dayKey(w.date) === todayInput());
  const backupDue = (state.weights.length || state.workouts.length)
    && (!state.lastBackupAt || Date.now() - new Date(state.lastBackupAt).getTime() > 14 * 86400000);

  return `
    ${backupDue ? `<div class="card"><div class="spread"><span class="small">Your data only lives on this phone. Save a backup now and then.</span><button class="link shrink" data-action="go" data-tab="more">Back up</button></div></div>` : ''}
    <div class="card">
      <div class="spread"><h2>This week</h2><span class="muted small">${adherence.done}/${adherence.planned} planned sessions done</span></div>
      ${weekStrip()}
    </div>
    <div class="card">
      <div class="spread"><h2>${t ? esc(t.name) : 'Rest day'}</h2>${t ? `<span class="shrink">${settingPill(t.setting)}</span>` : ''}</div>
      ${t?.minutes ? `<p class="muted small" style="margin:0 0 6px">About ${t.minutes} min</p>` : ''}
      ${t ? exerciseList(t.exercises) : `<p class="muted">Nothing planned today. ${state.templates.length ? '' : 'Set up your week in Plan.'}</p>`}
      ${loggedToday.length
        ? `<p class="good">✓ Logged today: ${loggedToday.map((w) => esc(w.name)).join(', ')}</p>`
        : `<button class="btn" data-action="log-start" data-template="${swap ? '' : t ? t.id : ''}" data-preset="${swap ? swap.id : ''}">${t ? 'Log this workout' : 'Log a workout'}</button>`}
      ${loggedToday.length ? '' : swapCard(planned, swap)}
    </div>
    <div class="card">
      <div class="spread"><h2>Weight</h2><button class="link shrink" data-action="go" data-tab="weight">Details</button></div>
      <div class="stats">
        <div><div class="v">${last ? fmtW(last.kg) : '–'}</div><div class="l">latest ${unit()}</div></div>
        <div><div class="v">${last ? fmtW(last.trend) : '–'}</div><div class="l">7-day avg</div></div>
        <div><div class="v">${signed(trendChange(series, 7))}</div><div class="l">vs last week</div></div>
      </div>
      ${quickWeightForm()}
    </div>`;
}

function exerciseList(exercises) {
  if (!exercises?.length) return '<p class="muted small">No exercises listed.</p>';
  return `<ul class="list">${exercises.map((e) => `
    <li class="spread"><button class="ex-name" data-action="guide" data-name="${esc(e.name)}">${esc(e.name)}${GUIDE[e.name.toLowerCase()]?.images.length ? ' <span class="cam" aria-label="has pictures">▶</span>' : ''}</button><span class="muted small" style="text-align:right">${[
      e.sets && e.reps ? (e.sets === '1' ? esc(e.reps) : `${esc(e.sets)}×${esc(e.reps)}`) : e.sets ? `${esc(e.sets)} sets` : '',
      e.load ? esc(e.load) : '',
      Number(e.rest) > 0 ? `rest ${e.rest}s` : '',
    ].filter(Boolean).join(' · ')}</span></li>`).join('')}</ul>`;
}

function quickWeightForm() {
  return `
    <form data-form="weight" class="row" style="margin-top:12px">
      <input name="value" type="number" inputmode="decimal" step="0.1" min="1" placeholder="Today's weight (${unit()})" required>
      <input name="date" type="hidden" value="${todayInput()}">
      <button class="btn shrink" style="width:auto;margin-top:0">Add</button>
    </form>`;
}

// ---------- Plan ----------

function renderPlan() {
  if (ui.editingTemplate) return renderTemplateEditor();
  if (ui.browsing) return renderPresets();
  const options = (sel) => `<option value="">Rest</option>${state.templates.map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}`;
  return `
    <div class="card">
      <h2>Your week</h2>
      ${state.templates.length ? '' : '<p class="muted small">Create a workout below, then pick which days you do it.</p>'}
      ${DAYS.map((d, i) => `
        <div class="row" style="margin-bottom:6px">
          <span class="shrink" style="width:44px">${d}</span>
          <select data-action="plan-day" data-day="${i}">${options(state.plan[i])}</select>
        </div>`).join('')}
    </div>
    <div class="card">
      <h2>Workouts</h2>
      <ul class="list">
        ${state.templates.map((t) => `
          <li class="spread">
            <span><strong>${esc(t.name)}</strong> ${settingPill(t.setting)}<br><span class="muted small">${t.exercises.length} exercise${t.exercises.length === 1 ? '' : 's'}${t.minutes ? ` · ${t.minutes} min` : ''}</span></span>
            <button class="link shrink" data-action="tpl-edit" data-id="${t.id}">Edit</button>
          </li>`).join('') || '<li class="muted">No workouts yet.</li>'}
      </ul>
      <button class="btn" data-action="browse">Find a workout</button>
      <button class="btn secondary" data-action="tpl-new">Create your own</button>
      ${state.templates.length ? '' : '<button class="btn secondary" data-action="tpl-starter">Add a starter 3-day plan</button>'}
    </div>`;
}

function renderTemplateEditor() {
  const t = ui.editingTemplate;
  return `
    <form data-form="template" class="card">
      <h2>${template(t.id) ? 'Edit workout' : 'New workout'}</h2>
      <label>Name</label>
      <input name="name" value="${esc(t.name)}" placeholder="e.g. Upper body" required>
      <label>Exercises (sets, reps, rest in seconds, weight)</label>
      <div id="ex-rows">
        ${t.exercises.map((e, i) => `
          <div class="ex-row" data-ex="${i}">
            <div class="ex-top">
              <input name="ex-name" value="${esc(e.name)}" placeholder="Exercise">
              <button type="button" class="icon" data-action="ex-remove" data-i="${i}" aria-label="Remove">✕</button>
            </div>
            <div class="ex-nums">
              <input name="ex-sets" value="${esc(e.sets)}" inputmode="numeric" placeholder="Sets" aria-label="Sets">
              <input name="ex-reps" value="${esc(e.reps)}" placeholder="Reps" aria-label="Reps">
              <input name="ex-rest" value="${esc(e.rest ?? '')}" inputmode="numeric" placeholder="Rest s" aria-label="Rest in seconds">
              <input name="ex-load" value="${esc(e.load)}" placeholder="Load" aria-label="Load">
            </div>
          </div>`).join('')}
      </div>
      <button type="button" class="btn secondary" data-action="ex-add">Add exercise</button>
      <button class="btn">Save</button>
      <button type="button" class="btn secondary" data-action="tpl-cancel">Cancel</button>
      ${template(t.id) ? '<button type="button" class="btn danger" data-action="tpl-delete">Delete workout</button>' : ''}
    </form>`;
}

// Keep unsaved edits when adding/removing rows re-renders the editor.
function readTemplateForm() {
  const form = view.querySelector('form[data-form="template"]');
  if (!form) return;
  ui.editingTemplate.name = form.elements.name.value;
  ui.editingTemplate.exercises = [...form.querySelectorAll('.ex-row')].map((row) => ({
    name: row.querySelector('[name="ex-name"]').value.trim(),
    sets: row.querySelector('[name="ex-sets"]').value.trim(),
    reps: row.querySelector('[name="ex-reps"]').value.trim(),
    rest: Number(row.querySelector('[name="ex-rest"]').value) || 0,
    load: row.querySelector('[name="ex-load"]').value.trim(),
  }));
}

function renderPresets() {
  const f = ui.filter ||= { setting: state.settings.setting, focus: 'any', goal: state.settings.goal };
  const owned = state.settings.equipment;
  const list = availablePresets({ equipment: owned, setting: f.setting, focus: f.focus, goal: f.goal });
  const added = new Set(state.templates.map((t) => t.presetId).filter(Boolean));
  const chip = (group, value, label) => `<button type="button" class="chip ${f[group] === value ? 'on' : ''}" data-action="filter" data-group="${group}" data-value="${value}">${label}</button>`;
  return `
    <div class="card">
      <div class="spread"><h2>Find a workout</h2><button class="link shrink" data-action="browse-close">Done</button></div>
      <div class="chips">${chip('goal', 'any', 'Any goal')}${GOALS.map((x) => chip('goal', x.id, x.label)).join('')}</div>
      <div class="chips">${chip('setting', 'any', 'Anywhere')}${chip('setting', 'indoor', 'Indoor')}${chip('setting', 'outdoor', 'Outdoor')}</div>
      <div class="chips">${chip('focus', 'any', 'All')}${FOCUS.map((x) => chip('focus', x.id, x.label)).join('')}</div>
      <p class="small muted">Using your equipment: ${owned.length ? owned.map((id) => esc(labelFor(EQUIPMENT, id))).join(', ') : 'bodyweight only'}. <button class="link" data-action="go" data-tab="more">Change</button></p>
    </div>
    ${list.map((p) => `
      <div class="card">
        <div class="spread"><h2 style="margin:0">${esc(p.name)}</h2><span class="shrink">${settingPill(p.setting)}</span></div>
        <p class="muted small" style="margin:4px 0 0">${p.minutes} min · ${labelFor(FOCUS, p.focus)}${p.needs.length ? ` · ${p.needs.map((n) => labelFor(EQUIPMENT, n)).join(', ')}` : ' · no equipment'}</p>
        <p class="small" style="margin:4px 0 0">Good for: ${p.goals.map((g) => labelFor(GOALS, g)).join(', ')}</p>
        <details style="margin-top:6px"><summary class="small">Exercises</summary>${exerciseList(p.exercises)}</details>
        ${added.has(p.id)
          ? '<p class="good small" style="margin:10px 0 0">✓ In your workouts</p>'
          : `<button class="btn secondary" data-action="preset-add" data-preset="${p.id}">Add to my workouts</button>`}
      </div>`).join('') || '<div class="card"><p class="muted">Nothing matches. Try another filter or add equipment.</p></div>'}`;
}

const STARTER = [
  { name: 'Full body A', exercises: [['Squat', 3, 8], ['Push-up', 3, 10], ['Dumbbell row', 3, 10], ['Plank', 3, '30s']] },
  { name: 'Full body B', exercises: [['Deadlift', 3, 6], ['Overhead press', 3, 8], ['Lunge', 3, 10], ['Dead bug', 3, 10]] },
  { name: 'Cardio 30 min', exercises: [['Run, cycle or brisk walk', 1, '30 min']] },
];

// ---------- Weight ----------

function chart(series) {
  const pts = series.slice(-90);
  if (pts.length < 2) return '<p class="muted small">Add a couple of weigh-ins to see a chart.</p>';
  const W = 320, H = 160, L = 30, R = 6, T = 8, B = 18;
  const goal = state.settings.goalKg;
  const vals = pts.flatMap((p) => [p.kg, p.trend]).concat(goal ? [goal] : []).map((v) => kgToDisplay(v, unit()));
  let min = Math.floor(Math.min(...vals) - 0.5), max = Math.ceil(Math.max(...vals) + 0.5);
  const t0 = new Date(pts[0].day).getTime(), t1 = new Date(pts[pts.length - 1].day).getTime();
  const x = (day) => L + ((new Date(day).getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (kg) => T + (1 - (kgToDisplay(kg, unit()) - min) / (max - min)) * (H - T - B);
  const yv = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [min, (min + max) / 2, max];
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight chart">
      ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${yv(v)}" y2="${yv(v)}"/><text x="2" y="${yv(v) + 3}">${v.toFixed(0)}</text>`).join('')}
      ${goal ? `<line class="goal" x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}"/>` : ''}
      ${pts.map((p) => `<circle class="raw" cx="${x(p.day)}" cy="${y(p.kg)}" r="2"/>`).join('')}
      <polyline class="trend" points="${pts.map((p) => `${x(p.day)},${y(p.trend)}`).join(' ')}"/>
      <text x="${L}" y="${H - 4}">${fmtDate(pts[0].day)}</text>
      <text x="${W - R}" y="${H - 4}" text-anchor="end">${fmtDate(pts[pts.length - 1].day)}</text>
    </svg>
    <p class="muted small">Dots are daily weigh-ins, the line is your 7-day average${goal ? ', dashed line is your goal' : ''}.</p>`;
}

function renderWeight() {
  const series = weightSeries();
  const last = series[series.length - 1];
  const goal = state.settings.goalKg;
  const toGo = last && goal ? Math.round((last.trend - goal) * 10) / 10 : null;
  const recent = [...state.weights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  return `
    <div class="card">
      <div class="stats">
        <div><div class="v">${last ? fmtW(last.trend) : '–'}</div><div class="l">7-day avg (${unit()})</div></div>
        <div><div class="v">${signed(trendChange(series, 30))}</div><div class="l">30 days</div></div>
        <div><div class="v">${toGo == null ? '–' : signed(toGo)}</div><div class="l">${goal ? 'from goal' : 'no goal set'}</div></div>
      </div>
    </div>
    <div class="card">${chart(series)}</div>
    <form data-form="weight" class="card">
      <h2>Add weigh-in</h2>
      <div class="row">
        <input name="value" type="number" inputmode="decimal" step="0.1" min="1" placeholder="${unit()}" required>
        <input name="date" type="date" value="${todayInput()}" required>
      </div>
      <button class="btn">Save</button>
    </form>
    <div class="card">
      <h2>Recent</h2>
      <ul class="list">${recent.map((w) => `
        <li class="spread"><span>${fmtDate(w.date)} ${w.source === 'health' ? '<span class="pill">Health</span>' : ''}</span>
        <span>${fmtW(w.kg)} ${unit()} <button class="icon" data-action="weight-del" data-id="${w.id}" aria-label="Delete">✕</button></span></li>`).join('') || '<li class="muted">No weigh-ins yet.</li>'}
      </ul>
    </div>`;
}

// ---------- Log ----------

function renderLog() {
  const from = ui.loggingFrom;
  const t = from ? template(from.templateId) || presetById(from.presetId) : null;
  const fromPreset = t && !template(t.id);
  const list = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  return `
    <form data-form="workout" class="card">
      <h2>Log a workout</h2>
      <label>Workout</label>
      <select name="templateId" data-action="log-template">
        <option value="">Other</option>
        ${state.templates.map((x) => `<option value="${x.id}" ${t && t.id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>
      <input type="hidden" name="presetId" value="${fromPreset ? t.id : ''}">
      <label>Name</label>
      <input name="name" value="${esc(t ? t.name : '')}" placeholder="e.g. Run" required>
      <div class="row">
        <div><label>Date</label><input name="date" type="date" value="${todayInput()}" required></div>
        <div><label>Minutes</label><input name="minutes" type="number" inputmode="numeric" min="0" placeholder="45" value="${t?.minutes ?? ''}"></div>
      </div>
      <label>Notes (weights used, how it felt)</label>
      <textarea name="notes" style="min-height:70px;font-family:inherit;font-size:16px" placeholder="Squat 3×8 @ 60kg, felt strong"></textarea>
      <button class="btn">Save workout</button>
    </form>
    <div class="card">
      <h2>History</h2>
      <ul class="list">${list.map((w) => `
        <li>
          <div class="spread"><strong>${esc(w.name)}</strong><button class="icon" data-action="workout-del" data-id="${w.id}" aria-label="Delete">✕</button></div>
          <div class="muted small">${fmtDate(w.date)}${w.minutes ? ` · ${Math.round(w.minutes)} min` : ''}${w.kcal ? ` · ${w.kcal} kcal` : ''} ${w.source === 'health' ? '<span class="pill">Health</span>' : ''}</div>
          ${w.notes ? `<div class="small">${esc(w.notes)}</div>` : ''}
        </li>`).join('') || '<li class="muted">Nothing logged yet.</li>'}
      </ul>
    </div>`;
}

// ---------- More ----------

function renderMore() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `
    <div class="card">
      <h2>Import from Apple Health</h2>
      <p class="small muted">Run your "Send to Fitness" Shortcut first. It copies your recent weight and workouts, then tap below.</p>
      <button class="btn" data-action="health-paste">Paste from Shortcut</button>
      <details style="margin-top:10px">
        <summary class="small">Paste manually instead</summary>
        <textarea id="health-text" placeholder="W|2026-10-20T07:10:00Z|82.4 kg&#10;X|2026-10-19T18:00:00Z|Running|32 min|280"></textarea>
        <button class="btn secondary" data-action="health-import-text">Import</button>
      </details>
    </div>
    <form data-form="equipment" class="card">
      <h2>My training</h2>
      <label>Main goal</label>
      <select name="goal">
        <option value="any" ${state.settings.goal === 'any' ? 'selected' : ''}>No particular goal</option>
        ${GOALS.map((g) => `<option value="${g.id}" ${state.settings.goal === g.id ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}
      </select>
      <label>Equipment</label>
      <p class="small muted">Workout suggestions only use what you tick. Bodyweight workouts are always included.</p>
      ${EQUIPMENT.map((e) => `<label class="check"><input type="checkbox" name="eq" value="${e.id}" ${state.settings.equipment.includes(e.id) ? 'checked' : ''}> ${esc(e.label)}</label>`).join('')}
      <label>I usually prefer to train</label>
      <select name="setting">
        ${[['any', 'Indoors or outdoors'], ['indoor', 'Indoors'], ['outdoor', 'Outdoors']].map(([v, l]) => `<option value="${v}" ${state.settings.setting === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button class="btn">Save</button>
    </form>
    <div class="card">
      <h2>Settings</h2>
      <form data-form="settings">
        <div class="row">
          <div><label>Units</label>
            <select name="unit"><option value="kg" ${unit() === 'kg' ? 'selected' : ''}>kg</option><option value="lb" ${unit() === 'lb' ? 'selected' : ''}>lb</option></select></div>
          <div><label>Goal weight (${unit()})</label>
            <input name="goal" type="number" inputmode="decimal" step="0.1" value="${state.settings.goalKg ? kgToDisplay(state.settings.goalKg, unit()) : ''}" placeholder="optional"></div>
        </div>
        <button class="btn">Save settings</button>
      </form>
    </div>
    <div class="card">
      <h2>Backup</h2>
      <p class="small muted">Everything is stored only on this phone. If you delete the app from your home screen, the data goes with it. Last backup: ${state.lastBackupAt ? fmtDate(state.lastBackupAt) : 'never'}.</p>
      <button class="btn" data-action="backup">Save backup file</button>
      <label class="btn secondary" style="display:block;text-align:center;color:var(--accent);margin-top:10px">Restore from backup<input type="file" accept="application/json,.json" data-action="restore" hidden></label>
    </div>
    ${standalone ? '' : `<div class="card"><h2>Install on iPhone</h2><ol class="steps small"><li>Open this page in Safari.</li><li>Tap the Share button.</li><li>Tap <strong>Add to Home Screen</strong>.</li><li>Open it from the home screen from now on, because Safari keeps a separate copy of your data.</li></ol></div>`}
    <div class="card">
      <button class="btn danger" data-action="wipe">Erase all data</button>
      <p class="muted small" style="text-align:center">Fitness v1 · data on this device only</p>
    </div>`;
}

// ---------- Health import ----------

function importHealth(text) {
  const parsed = parseHealthText(text);
  if (!parsed.weights.length && !parsed.workouts.length) {
    toast(parsed.errors.length ? "Couldn't read that. Check the Shortcut's text format." : 'Nothing to import.');
    return;
  }
  const { addedWeights, addedWorkouts } = mergeHealth(state, parsed);
  commit();
  const skipped = parsed.errors.length ? `, ${parsed.errors.length} line(s) skipped` : '';
  if (!addedWeights && !addedWorkouts) return toast(`Already up to date${skipped}.`);
  toast(`Imported ${addedWeights} weigh-in(s) and ${addedWorkouts} workout(s)${skipped}.`);
}

// The Shortcut can also open the app's URL with #import=<text>. That lands in
// Safari rather than the home-screen app on iOS, so the paste route is the
// default; this path is still handy when using the app inside Safari.
function importFromHash() {
  const m = location.hash.match(/^#import=(.*)$/s);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    importHealth(decodeURIComponent(m[1]));
  } catch {
    toast("Couldn't read the import link.");
  }
}

// ---------- Backup ----------

async function backup() {
  const stamp = { ...state, lastBackupAt: new Date().toISOString() };
  const json = JSON.stringify(stamp, null, 2);
  const name = `fitness-backup-${todayInput()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    state.lastBackupAt = stamp.lastBackupAt;
    commit();
    toast('Backup saved. Keep it in Files or iCloud Drive.');
  } catch (e) {
    if (e?.name !== 'AbortError') toast('Backup failed.');
  }
}

async function restore(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const data = normalise(JSON.parse(await file.text()));
    if (!confirm(`Replace current data with this backup (${data.weights.length} weigh-ins, ${data.workouts.length} workouts)?`)) return;
    state = data;
    commit();
    toast('Backup restored.');
  } catch {
    toast("That file isn't a Fitness backup.");
  } finally {
    input.value = '';
  }
}

// ---------- Exercise guide ----------

const sheet = document.getElementById('sheet');

function openGuide(name) {
  const g = GUIDE[name.toLowerCase()];
  const video = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise proper form`)}`;
  sheet.innerHTML = `
    <div class="sheet-card" role="dialog" aria-modal="true" aria-label="${esc(name)}">
      <div class="spread"><h2>${esc(name)}</h2><button class="icon" data-action="guide-close" aria-label="Close">✕</button></div>
      ${g?.images.length ? `
        <div class="frames${g.images.length > 1 ? ' animate' : ''}">
          ${g.images.map((src, i) => `<img src="${src}" alt="${esc(name)}, ${i === 0 ? 'start' : 'end'} position" loading="lazy">`).join('')}
        </div>
        ${g.images.length > 1 ? '<p class="muted small" style="margin:4px 0 0">Start and end positions</p>' : ''}` : ''}
      ${g ? `<ol class="steps">${g.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="muted">No written guide for this one yet.</p>'}
      <a class="btn secondary" href="${video}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">Watch videos on YouTube</a>
      ${g?.images.length ? '<p class="muted small" style="text-align:center">Pictures: Free Exercise DB, public domain</p>' : ''}
    </div>`;
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeGuide() {
  sheet.hidden = true;
  sheet.innerHTML = '';
  document.body.style.overflow = '';
}

sheet.addEventListener('click', (e) => {
  // Tapping the dimmed backdrop or the close button dismisses it.
  if (e.target === sheet || e.target.closest('[data-action="guide-close"]')) closeGuide();
});

// ---------- Events ----------

document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) go(b.dataset.tab);
});

function go(next) {
  tab = next;
  if (next !== 'plan') {
    ui.editingTemplate = null;
    ui.browsing = false;
  }
  if (next !== 'log') ui.loggingFrom = null;
  render();
  window.scrollTo(0, 0);
}

view.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const { action } = el.dataset;
  switch (action) {
    case 'go': return go(el.dataset.tab);
    case 'log-start':
      go('log');
      ui.loggingFrom = { templateId: el.dataset.template || null, presetId: el.dataset.preset || null };
      return render();
    case 'guide':
      return openGuide(el.dataset.name);
    case 'swap':
      state.todaySwap = { day: todayInput(), presetId: el.dataset.preset };
      return commit();
    case 'swap-undo':
      state.todaySwap = null;
      return commit();
    case 'browse':
      ui.browsing = true;
      ui.filter = null;
      render();
      return window.scrollTo(0, 0);
    case 'browse-close':
      ui.browsing = false;
      return render();
    case 'filter':
      ui.filter[el.dataset.group] = el.dataset.value;
      return render();
    case 'preset-add': {
      const p = presetById(el.dataset.preset);
      state.templates.push(toTemplate(p, uid()));
      commit();
      return toast(`Added ${p.name}. Pick a day for it in your week.`);
    }
    case 'tpl-new':
      ui.editingTemplate = { id: uid(), name: '', exercises: [{ name: '', sets: '', reps: '', load: '' }] };
      return render();
    case 'tpl-edit':
      ui.editingTemplate = structuredClone(template(el.dataset.id));
      return render();
    case 'tpl-cancel':
      ui.editingTemplate = null;
      return render();
    case 'tpl-delete': {
      const id = ui.editingTemplate.id;
      if (!confirm('Delete this workout? Days planned with it become rest days.')) return;
      state.templates = state.templates.filter((t) => t.id !== id);
      state.plan = state.plan.map((p) => (p === id ? null : p));
      ui.editingTemplate = null;
      return commit();
    }
    case 'tpl-starter':
      for (const s of STARTER) {
        state.templates.push({ id: uid(), name: s.name, exercises: s.exercises.map(([name, sets, reps]) => ({ name, sets: String(sets), reps: String(reps), load: '' })) });
      }
      // Mon / Wed / Fri strength, Sat cardio.
      state.plan = [state.templates[0].id, null, state.templates[1].id, null, state.templates[0].id, state.templates[2].id, null];
      return commit();
    case 'ex-add':
      readTemplateForm();
      ui.editingTemplate.exercises.push({ name: '', sets: '', reps: '', load: '' });
      render();
      return view.querySelector('.ex-row:last-child input')?.focus();
    case 'ex-remove':
      readTemplateForm();
      ui.editingTemplate.exercises.splice(Number(el.dataset.i), 1);
      return render();
    case 'weight-del':
      state.weights = state.weights.filter((w) => w.id !== el.dataset.id);
      return commit();
    case 'workout-del':
      if (!confirm('Delete this workout?')) return;
      state.workouts = state.workouts.filter((w) => w.id !== el.dataset.id);
      return commit();
    case 'health-paste':
      try {
        importHealth(await navigator.clipboard.readText());
      } catch {
        toast('Paste was blocked. Use "Paste manually instead".');
      }
      return;
    case 'health-import-text':
      return importHealth(document.getElementById('health-text').value);
    case 'backup':
      return backup();
    case 'wipe':
      if (!confirm('Erase all workouts, weigh-ins and plans from this phone?')) return;
      state = normalise({});
      return commit();
  }
});

view.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.action === 'plan-day') {
    state.plan[Number(el.dataset.day)] = el.value || null;
    commit();
  } else if (el.dataset.action === 'log-template') {
    ui.loggingFrom = { templateId: el.value || null };
    const t = template(el.value);
    el.form.elements.name.value = t ? t.name : '';
    el.form.elements.presetId.value = '';
    if (t?.minutes) el.form.elements.minutes.value = t.minutes;
  } else if (el.dataset.action === 'restore') {
    restore(el);
  }
});

view.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const f = form.elements;
  switch (form.dataset.form) {
    case 'weight': {
      const value = parseFloat(String(f.value.value).replace(',', '.'));
      if (!(value > 0)) return;
      // Noon local time keeps the entry on the chosen day whatever the timezone.
      const date = new Date(`${f.date.value}T12:00:00`).toISOString();
      state.weights.push({ id: uid(), date, kg: displayToKg(value, unit()), source: 'manual' });
      commit();
      return toast('Weigh-in saved.');
    }
    case 'template': {
      readTemplateForm();
      const t = ui.editingTemplate;
      t.name = t.name.trim();
      t.exercises = t.exercises.filter((x) => x.name);
      if (!t.name) return;
      const i = state.templates.findIndex((x) => x.id === t.id);
      if (i >= 0) state.templates[i] = t;
      else state.templates.push(t);
      ui.editingTemplate = null;
      commit();
      return toast('Workout saved.');
    }
    case 'workout': {
      const t = template(f.templateId.value) || presetById(f.presetId.value);
      const now = new Date();
      const date = f.date.value === todayInput() ? now.toISOString() : new Date(`${f.date.value}T12:00:00`).toISOString();
      state.workouts.push({
        id: uid(),
        date,
        name: f.name.value.trim(),
        minutes: f.minutes.value ? Number(f.minutes.value) : null,
        kcal: null,
        templateId: t && template(t.id) ? t.id : null,
        presetId: t?.presetId || (t && !template(t.id) ? t.id : undefined),
        exercises: t ? structuredClone(t.exercises) : undefined,
        notes: f.notes.value.trim() || undefined,
        source: 'manual',
      });
      ui.loggingFrom = null;
      commit();
      return toast('Workout logged.');
    }
    case 'equipment': {
      state.settings.equipment = [...form.querySelectorAll('input[name="eq"]:checked')].map((x) => x.value);
      state.settings.setting = f.setting.value;
      state.settings.goal = f.goal.value;
      commit();
      return toast('Training preferences saved.');
    }
    case 'settings': {
      const newUnit = f.unit.value;
      const goalRaw = parseFloat(String(f.goal.value).replace(',', '.'));
      // The goal field is shown in the old unit, so convert with that before switching.
      state.settings.goalKg = goalRaw > 0 ? displayToKg(goalRaw, unit()) : null;
      state.settings.unit = newUnit;
      commit();
      return toast('Settings saved.');
    }
  }
});

// ---------- Render ----------

function render() {
  document.getElementById('title').textContent = TITLES[tab];
  for (const b of document.querySelectorAll('.tabs button')) b.classList.toggle('active', b.dataset.tab === tab);
  view.innerHTML = { today: renderToday, plan: renderPlan, weight: renderWeight, log: renderLog, more: renderMore }[tab]();
}

window.addEventListener('hashchange', importFromHash);
render();
importFromHash();

// Ask the browser not to evict our storage under pressure.
navigator.storage?.persist?.();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
