import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GUIDE } from '../src/exercise-guide.js';
import { PRESETS } from '../src/presets.js';

const root = fileURLToPath(new URL('..', import.meta.url));

// Cardio blocks like "Easy run" are self-explanatory and have no guide on purpose.
const strengthMoves = PRESETS.flatMap((p) => p.exercises).filter((e) => !/min$/.test(e.reps));

test('every strength exercise in a preset has a guide', () => {
  const missing = [...new Set(strengthMoves.map((e) => e.name))].filter((n) => !GUIDE[n.toLowerCase()]);
  assert.deepEqual(missing, []);
});

test('every guide picture is bundled and every guide has steps', () => {
  for (const [name, g] of Object.entries(GUIDE)) {
    assert.ok(g.steps.length > 0, name);
    for (const src of g.images) assert.ok(existsSync(root + src), `${name}: ${src}`);
  }
});
