import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, EQUIPMENT, FOCUS, availablePresets, alternatives, hasEquipment, toTemplate } from '../src/presets.js';

test('every preset uses known equipment, focus and setting', () => {
  const eq = new Set(EQUIPMENT.map((e) => e.id));
  const focus = new Set(FOCUS.map((f) => f.id));
  const ids = new Set();
  for (const p of PRESETS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(p.needs.every((n) => eq.has(n)), p.id);
    assert.ok(focus.has(p.focus), p.id);
    assert.ok(['indoor', 'outdoor', 'either'].includes(p.setting), p.id);
    assert.ok(p.exercises.length > 0, p.id);
  }
});

test('with no equipment only bodyweight presets are offered', () => {
  const list = availablePresets({ equipment: [] });
  assert.ok(list.length > 0);
  assert.ok(list.every((p) => p.needs.length === 0));
});

test('a preset needing two items needs both', () => {
  assert.equal(hasEquipment(['dumbbells'], ['dumbbells', 'bench']), false);
  assert.equal(hasEquipment(['dumbbells', 'bench'], ['dumbbells', 'bench']), true);
});

test('a gym covers everything except an outdoor bike', () => {
  assert.equal(hasEquipment(['gym'], ['barbell', 'bench']), true);
  assert.equal(hasEquipment(['gym'], ['bike']), false);
});

test('indoor filter keeps indoor and either, drops outdoor', () => {
  const list = availablePresets({ equipment: ['gym'], setting: 'indoor' });
  assert.ok(list.some((p) => p.setting === 'either'));
  assert.ok(list.every((p) => p.setting !== 'outdoor'));
});

test('alternatives offer the same focus in the other setting, dedicated ones first', () => {
  const machine = toTemplate(PRESETS.find((p) => p.id === 'machine-intervals'), 't1');
  const alts = alternatives(machine, 'outdoor', []);
  assert.ok(alts.length > 0);
  assert.ok(alts.every((p) => p.focus === 'cardio' && p.setting !== 'indoor'));
  assert.equal(alts[0].setting, 'outdoor');
});

test('alternatives need a focus to match on', () => {
  assert.deepEqual(alternatives({ name: 'My own thing', exercises: [] }, 'outdoor', []), []);
});
