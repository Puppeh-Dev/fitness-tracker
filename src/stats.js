// Pure helpers for weight trends and weekly plans, kept free of DOM so they can be tested.

const DAY_MS = 86400000;

export function dayKey(dateLike) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// One reading per day (the last one logged that day), oldest first.
export function dailyWeights(weights) {
  const byDay = new Map();
  for (const w of [...weights].sort((a, b) => a.date.localeCompare(b.date))) {
    byDay.set(dayKey(w.date), w);
  }
  return [...byDay.entries()].map(([day, w]) => ({ day, kg: w.kg }));
}

// Trailing 7-day average for each daily reading. Daily weight swings by
// 1-2 kg on water alone, so the trend is what's worth looking at.
export function withTrend(daily, windowDays = 7) {
  return daily.map((point, i) => {
    const end = new Date(point.day).getTime();
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (end - new Date(daily[j].day).getTime() >= windowDays * DAY_MS) break;
      sum += daily[j].kg;
      n++;
    }
    return { ...point, trend: Math.round((sum / n) * 10) / 10 };
  });
}

// Change in trend weight over the last `days`, or null without enough history.
export function trendChange(trendPoints, days) {
  if (trendPoints.length < 2) return null;
  const last = trendPoints[trendPoints.length - 1];
  const cutoff = new Date(last.day).getTime() - days * DAY_MS;
  let base = null;
  for (const p of trendPoints) {
    if (new Date(p.day).getTime() <= cutoff) base = p;
  }
  if (!base) return null;
  return Math.round((last.trend - base.trend) * 10) / 10;
}

// Monday-first weekday index (0 = Monday) to match how most people plan a training week.
export function weekdayIndex(dateLike) {
  return (new Date(dateLike).getDay() + 6) % 7;
}

export function startOfWeek(dateLike) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weekdayIndex(d));
  return d;
}

// How many of this week's planned days (up to today) have a logged workout.
export function weekAdherence(plan, workouts, now = new Date()) {
  const start = startOfWeek(now);
  const todayIdx = weekdayIndex(now);
  const doneDays = new Set(
    workouts.filter((w) => new Date(w.date) >= start).map((w) => weekdayIndex(w.date)),
  );
  let planned = 0;
  let done = 0;
  for (let i = 0; i <= todayIdx; i++) {
    if (plan[i]) {
      planned++;
      if (doneDays.has(i)) done++;
    }
  }
  return { planned, done };
}

export function kgToDisplay(kg, unit) {
  return unit === 'lb' ? Math.round(kg * 2.20462 * 10) / 10 : kg;
}

export function displayToKg(value, unit) {
  return unit === 'lb' ? Math.round((value / 2.20462) * 10) / 10 : value;
}
