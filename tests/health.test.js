import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHealthText, parseDuration, parseWeight } from '../src/health.js';
import { emptyState, mergeHealth } from '../src/store.js';

test('parses weight lines in kg, lb and comma decimals', () => {
  assert.equal(parseWeight('82.4 kg'), 82.4);
  assert.equal(parseWeight('82,4 kg'), 82.4);
  assert.equal(parseWeight('181.6 lb'), 82.4);
  assert.equal(parseWeight('82.4'), 82.4);
  assert.equal(parseWeight('kg'), null);
});

test('parses the duration formats Shortcuts produces', () => {
  assert.equal(parseDuration('32 min'), 32);
  assert.equal(parseDuration('1 hr 5 min'), 65);
  assert.equal(parseDuration('32:30'), 32.5);
  assert.equal(parseDuration('1:05:00'), 65);
  assert.equal(parseDuration('1920'), 32); // raw seconds
  assert.equal(parseDuration('45'), 45);
  assert.ok(Number.isNaN(parseDuration('soon')));
});

test('parses a mixed Shortcut payload and reports bad lines', () => {
  const text = [
    'W|2026-10-20T07:10:00Z|82.4 kg',
    'W|20 Oct 2026 at 07:10|82,1 kg',
    'X|2026-10-19T18:00:00Z|Running|32 min|280 kcal',
    'X|2026-10-18T09:00:00Z|Walking|45',
    'nonsense',
    'W||80',
  ].join('\n');
  const { weights, workouts, errors } = parseHealthText(text);
  assert.equal(weights.length, 2);
  assert.equal(weights[1].kg, 82.1);
  assert.deepEqual(workouts.map((w) => [w.name, w.minutes, w.kcal]), [['Running', 32, 280], ['Walking', 45, null]]);
  assert.equal(errors.length, 2);
});

test('importing the same payload twice adds nothing the second time', () => {
  const state = emptyState();
  const parsed = parseHealthText('W|2026-10-20T07:10:00Z|82.4\nX|2026-10-19T18:00:00Z|Running|32 min');
  assert.deepEqual(mergeHealth(state, parsed), { addedWeights: 1, addedWorkouts: 1 });
  assert.deepEqual(mergeHealth(state, parseHealthText('W|2026-10-20T07:10:00Z|82.4\nX|2026-10-19T18:00:00Z|Running|32 min')), { addedWeights: 0, addedWorkouts: 0 });
  assert.equal(state.weights.length, 1);
});
