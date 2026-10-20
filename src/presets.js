// Built-in library of structured workouts, filtered by the equipment the
// user owns and whether they want to train indoors or outdoors.

export const EQUIPMENT = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'barbell', label: 'Barbell and rack' },
  { id: 'bench', label: 'Bench' },
  { id: 'pullup_bar', label: 'Pull-up bar' },
  { id: 'bands', label: 'Resistance bands' },
  { id: 'jump_rope', label: 'Skipping rope' },
  { id: 'cardio_machine', label: 'Treadmill, bike or rower' },
  { id: 'bike', label: 'Bike (outdoors)' },
  { id: 'gym', label: 'Gym membership' },
];

export const FOCUS = [
  { id: 'full', label: 'Full body' },
  { id: 'upper', label: 'Upper body' },
  { id: 'lower', label: 'Lower body' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'core', label: 'Core & mobility' },
];

// setting: 'indoor' | 'outdoor' | 'either'
// needs: every listed item is required. Bodyweight-only presets need nothing.
// Exercises: sets, reps (a number or a duration like "40s"), rest in seconds.
const ex = (name, sets, reps, rest = 60, load = '') => ({ name, sets: String(sets), reps: String(reps), rest, load });

export const PRESETS = [
  {
    id: 'bw-full',
    name: 'Bodyweight full body',
    focus: 'full', setting: 'either', minutes: 30, needs: [],
    exercises: [ex('Squat', 3, 15), ex('Push-up', 3, 10), ex('Reverse lunge', 3, '10 each'), ex('Glute bridge', 3, 15), ex('Plank', 3, '40s', 45)],
  },
  {
    id: 'bw-hiit',
    name: 'Bodyweight HIIT circuit',
    focus: 'cardio', setting: 'either', minutes: 20, needs: [],
    exercises: [ex('Jumping jacks', 4, '40s', 20), ex('Squat jump', 4, '30s', 30), ex('Mountain climber', 4, '30s', 30), ex('Burpee', 4, '30s', 60)],
  },
  {
    id: 'bw-core',
    name: 'Core and mobility',
    focus: 'core', setting: 'indoor', minutes: 20, needs: [],
    exercises: [ex('Dead bug', 3, 10, 30), ex('Side plank', 3, '30s each', 30), ex('Bird dog', 3, '8 each', 30), ex("World's greatest stretch", 2, '5 each', 0), ex('Cat-cow', 2, 10, 0)],
  },
  {
    id: 'db-upper',
    name: 'Dumbbell upper body',
    focus: 'upper', setting: 'indoor', minutes: 40, needs: ['dumbbells'],
    exercises: [ex('Dumbbell floor press', 4, 10, 90), ex('One-arm dumbbell row', 4, '10 each', 60), ex('Overhead press', 3, 10, 90), ex('Lateral raise', 3, 12), ex('Hammer curl', 3, 12)],
  },
  {
    id: 'db-lower',
    name: 'Dumbbell lower body',
    focus: 'lower', setting: 'indoor', minutes: 40, needs: ['dumbbells'],
    exercises: [ex('Goblet squat', 4, 10, 90), ex('Romanian deadlift', 4, 10, 90), ex('Split squat', 3, '10 each'), ex('Calf raise', 3, 15, 45)],
  },
  {
    id: 'db-bench-full',
    name: 'Dumbbell and bench full body',
    focus: 'full', setting: 'indoor', minutes: 45, needs: ['dumbbells', 'bench'],
    exercises: [ex('Dumbbell bench press', 4, 8, 90), ex('Bulgarian split squat', 3, '8 each', 90), ex('Chest-supported row', 4, 10), ex('Step-up', 3, '10 each'), ex('Incline curl', 2, 12)],
  },
  {
    id: 'kb-full',
    name: 'Kettlebell full body',
    focus: 'full', setting: 'either', minutes: 30, needs: ['kettlebell'],
    exercises: [ex('Kettlebell swing', 5, 15, 60), ex('Goblet squat', 4, 10), ex('Kettlebell row', 3, '10 each'), ex('Halo', 3, '6 each', 45), ex('Farmer carry', 3, '40s', 60)],
  },
  {
    id: 'bb-strength-a',
    name: 'Barbell strength A',
    focus: 'full', setting: 'indoor', minutes: 50, needs: ['barbell', 'bench'],
    exercises: [ex('Back squat', 5, 5, 180), ex('Bench press', 5, 5, 180), ex('Barbell row', 3, 8, 120)],
  },
  {
    id: 'bb-strength-b',
    name: 'Barbell strength B',
    focus: 'full', setting: 'indoor', minutes: 50, needs: ['barbell'],
    exercises: [ex('Deadlift', 3, 5, 180), ex('Overhead press', 5, 5, 150), ex('Front squat', 3, 8, 120)],
  },
  {
    id: 'pullup-upper',
    name: 'Pull-up bar upper body',
    focus: 'upper', setting: 'indoor', minutes: 30, needs: ['pullup_bar'],
    exercises: [ex('Pull-up (or negative)', 4, '5-8', 120), ex('Push-up', 4, 12), ex('Hanging knee raise', 3, 10), ex('Pike push-up', 3, 8), ex('Dead hang', 2, '30s', 60)],
  },
  {
    id: 'bands-full',
    name: 'Resistance band full body',
    focus: 'full', setting: 'either', minutes: 30, needs: ['bands'],
    exercises: [ex('Banded squat', 3, 15), ex('Band row', 3, 15), ex('Band chest press', 3, 12), ex('Band pull-apart', 3, 15, 45), ex('Banded glute bridge', 3, 15)],
  },
  {
    id: 'rope-intervals',
    name: 'Skipping intervals',
    focus: 'cardio', setting: 'either', minutes: 20, needs: ['jump_rope'],
    exercises: [ex('Skip', 10, '1 min', 30), ex('Plank', 2, '45s', 30)],
  },
  {
    id: 'machine-intervals',
    name: 'Machine intervals',
    focus: 'cardio', setting: 'indoor', minutes: 30, needs: ['cardio_machine'],
    exercises: [ex('Easy warm-up', 1, '5 min', 0), ex('Hard effort', 8, '1 min', 90), ex('Easy cool-down', 1, '5 min', 0)],
  },
  {
    id: 'machine-steady',
    name: 'Steady cardio (machine)',
    focus: 'cardio', setting: 'indoor', minutes: 40, needs: ['cardio_machine'],
    exercises: [ex('Steady pace, can still talk', 1, '40 min', 0)],
  },
  {
    id: 'run-easy',
    name: 'Easy run',
    focus: 'cardio', setting: 'outdoor', minutes: 30, needs: [],
    exercises: [ex('Brisk walk warm-up', 1, '5 min', 0), ex('Easy run, can still talk', 1, '20 min', 0), ex('Walk cool-down', 1, '5 min', 0)],
  },
  {
    id: 'run-intervals',
    name: 'Run intervals',
    focus: 'cardio', setting: 'outdoor', minutes: 30, needs: [],
    exercises: [ex('Easy jog warm-up', 1, '8 min', 0), ex('Fast run', 6, '1 min', 90), ex('Easy jog cool-down', 1, '5 min', 0)],
  },
  {
    id: 'hill-sprints',
    name: 'Hill sprints',
    focus: 'lower', setting: 'outdoor', minutes: 25, needs: [],
    exercises: [ex('Jog warm-up', 1, '8 min', 0), ex('Hill sprint, walk back down', 8, '15-20s', 90), ex('Walking lunge', 3, '10 each', 60)],
  },
  {
    id: 'park-circuit',
    name: 'Park bench circuit',
    focus: 'full', setting: 'outdoor', minutes: 30, needs: [],
    exercises: [ex('Step-up on bench', 3, '10 each'), ex('Incline push-up on bench', 3, 12), ex('Bench dip', 3, 10), ex('Walking lunge', 3, '10 each'), ex('Bear crawl', 3, '20m', 60)],
  },
  {
    id: 'brisk-walk',
    name: 'Brisk walk',
    focus: 'cardio', setting: 'outdoor', minutes: 45, needs: [],
    exercises: [ex('Brisk walk, slightly out of breath', 1, '45 min', 0)],
  },
  {
    id: 'bike-ride',
    name: 'Bike ride',
    focus: 'cardio', setting: 'outdoor', minutes: 60, needs: ['bike'],
    exercises: [ex('Steady ride', 1, '60 min', 0)],
  },
];

// A gym covers everything except an outdoor bike.
export function hasEquipment(owned, needs) {
  const have = new Set(owned);
  return needs.every((n) => have.has(n) || (have.has('gym') && n !== 'bike'));
}

export function matchesSetting(preset, setting) {
  if (!setting || setting === 'any') return true;
  return preset.setting === 'either' || preset.setting === setting;
}

export function availablePresets({ equipment = [], setting = 'any', focus = 'any' } = {}) {
  return PRESETS.filter((p) => hasEquipment(equipment, p.needs)
    && matchesSetting(p, setting)
    && (focus === 'any' || p.focus === focus));
}

// Alternatives for the same focus in the other setting, e.g. it's sunny and
// today's plan is an indoor cardio session.
export function alternatives(workout, setting, equipment) {
  if (!workout?.focus) return [];
  return availablePresets({ equipment, setting, focus: workout.focus })
    .filter((p) => p.id !== workout.presetId)
    // Presets made for that setting first, "either" ones after.
    .sort((a, b) => (b.setting === setting) - (a.setting === setting));
}

export function presetById(id) {
  return PRESETS.find((p) => p.id === id);
}

// Copy a preset into an editable workout the user owns.
export function toTemplate(preset, id) {
  return {
    id,
    name: preset.name,
    presetId: preset.id,
    focus: preset.focus,
    setting: preset.setting,
    minutes: preset.minutes,
    exercises: preset.exercises.map((e) => ({ ...e, load: e.load || '' })),
  };
}

export function labelFor(list, id) {
  return list.find((x) => x.id === id)?.label ?? id;
}
