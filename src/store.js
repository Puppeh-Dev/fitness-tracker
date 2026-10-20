// All data lives on the device in localStorage. There is no server.

const KEY = 'fitness-tracker:v1';

export function emptyState() {
  return {
    version: 1,
    // equipment: ids from presets.js EQUIPMENT. setting: preferred 'any'|'indoor'|'outdoor'.
    // goal: a presets.js GOALS id or 'any'.
    settings: { unit: 'kg', goalKg: null, equipment: [], setting: 'any', goal: 'any' },
    // Workout templates: { id, name, exercises: [{ name, sets, reps, rest?, load }],
    //   presetId?, focus?, setting?, minutes? }
    templates: [],
    // Index 0 = Monday. Each entry is a template id or null for rest.
    plan: [null, null, null, null, null, null, null],
    // { id, date, name, minutes, kcal, templateId?, notes?, source: 'manual'|'health' }
    workouts: [],
    // { id, date, kg, source: 'manual'|'health' }
    weights: [],
    // A one-day swap of the planned workout for a preset: { day: 'YYYY-MM-DD', presetId }.
    todaySwap: null,
    lastBackupAt: null,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    return normalise(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function normalise(data) {
  const base = emptyState();
  if (!data || typeof data !== 'object') return base;
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...(data.settings || {}) },
    templates: Array.isArray(data.templates) ? data.templates : [],
    plan: Array.isArray(data.plan) && data.plan.length === 7 ? data.plan : base.plan,
    workouts: Array.isArray(data.workouts) ? data.workouts : [],
    weights: Array.isArray(data.weights) ? data.weights : [],
  };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Merge imported Health records, skipping ones already stored. Running the
// Shortcut twice (or with overlapping date ranges) must not create duplicates.
export function mergeHealth(state, { weights, workouts }) {
  const weightKeys = new Set(state.weights.map((w) => `${w.date}|${w.kg}`));
  const workoutKeys = new Set(state.workouts.map((w) => `${w.date}|${w.name}`));
  let addedWeights = 0;
  let addedWorkouts = 0;
  for (const w of weights) {
    const k = `${w.date}|${w.kg}`;
    if (weightKeys.has(k)) continue;
    weightKeys.add(k);
    state.weights.push({ id: uid(), ...w });
    addedWeights++;
  }
  for (const w of workouts) {
    const k = `${w.date}|${w.name}`;
    if (workoutKeys.has(k)) continue;
    workoutKeys.add(k);
    state.workouts.push({ id: uid(), ...w });
    addedWorkouts++;
  }
  return { addedWeights, addedWorkouts };
}
