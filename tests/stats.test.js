import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyWeights, withTrend, trendChange, weekAdherence, displayToKg, kgToDisplay } from '../src/stats.js';

const w = (date, kg) => ({ date, kg });

test('keeps the last reading of each day', () => {
  const daily = dailyWeights([w('2026-10-01T07:00:00', 80), w('2026-10-01T20:00:00', 81), w('2026-10-02T07:00:00', 79)]);
  assert.deepEqual(daily, [{ day: '2026-10-01', kg: 81 }, { day: '2026-10-02', kg: 79 }]);
});

test('7-day trend averages only the trailing window', () => {
  const weights = Array.from({ length: 10 }, (_, i) => w(`2026-10-${String(i + 1).padStart(2, '0')}T08:00:00`, 80 - i * 0.1));
  const trend = withTrend(dailyWeights(weights));
  // Day 10 averages days 4..10: 79.7..79.1 -> 79.4
  assert.equal(trend.at(-1).trend, 79.4);
  assert.equal(trend[0].trend, 80);
  // Day 3 trend is 79.9 (days 1..3).
  assert.equal(trendChange(trend, 7), -0.5);
  assert.equal(trendChange(trend, 30), null);
});

test('week adherence counts planned days up to today', () => {
  const plan = ['a', null, 'b', null, 'a', null, null];
  // Wednesday 21 Oct 2026; Monday workout logged, Wednesday not yet.
  const now = new Date('2026-10-21T18:00:00');
  const res = weekAdherence(plan, [{ date: '2026-10-19T18:00:00' }], now);
  assert.deepEqual(res, { planned: 2, done: 1 });
});

test('unit conversion round-trips', () => {
  assert.equal(kgToDisplay(80, 'lb'), 176.4);
  assert.equal(displayToKg(176.4, 'lb'), 80);
  assert.equal(kgToDisplay(80, 'kg'), 80);
});
