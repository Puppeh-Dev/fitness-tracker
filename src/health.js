// Parses the text an Apple Shortcut copies to the clipboard.
//
// One record per line, fields separated by "|":
//   W|<date>|<weight>[ unit]
//   X|<date>|<workout type>|<duration>[|<energy kcal>]
//
// The parser is deliberately lenient because Shortcuts formats values
// differently depending on locale and iOS version ("82,4 kg", "32 min",
// "0:32:10", "280 kcal"). Lines it can't read are reported, not fatal.

const LB_PER_KG = 2.20462;

function toNumber(text) {
  if (text == null) return NaN;
  const m = String(text).replace(/\s/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

export function parseWeight(text) {
  const value = toNumber(text);
  if (!Number.isFinite(value) || value <= 0) return null;
  const lower = String(text).toLowerCase();
  if (/\b(lb|lbs|pound)/.test(lower)) return round1(value / LB_PER_KG);
  if (/\b(st|stone)\b/.test(lower)) return round1(value * 6.35029);
  return round1(value);
}

// Returns minutes.
export function parseDuration(text) {
  if (text == null) return NaN;
  const s = String(text).trim().toLowerCase();
  const clock = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clock) {
    const [, a, b, c] = clock.map(Number);
    return c === undefined || Number.isNaN(c) ? round1(a + b / 60) : round1(a * 60 + b + c / 60);
  }
  let total = 0;
  let matched = false;
  for (const [, num, unit] of s.replace(/,/g, '.').matchAll(/(\d+(?:\.\d+)?)\s*(h|hr|hour|m|min|minute|s|sec|second)?/g)) {
    matched = true;
    const n = parseFloat(num);
    if (!unit || unit.startsWith('m')) total += n;
    else if (unit.startsWith('h')) total += n * 60;
    else total += n / 60;
  }
  if (!matched) return NaN;
  // A bare number above 600 is almost certainly seconds (Shortcuts' raw duration).
  if (/^\d+(\.\d+)?$/.test(s) && total > 600) total /= 60;
  return round1(total);
}

export function parseDate(text) {
  if (!text) return null;
  const s = String(text).trim();
  let d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    // "20 Oct 2026 at 07:15" style from Shortcuts' default date format.
    d = new Date(s.replace(/\bat\b/i, ' ').replace(/,/g, ' '));
  }
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseHealthText(text) {
  const weights = [];
  const workouts = [];
  const errors = [];
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    const kind = (parts[0] || '').toUpperCase();
    const date = parseDate(parts[1]);
    if (kind === 'W') {
      const kg = parseWeight(parts[2]);
      if (date && kg) weights.push({ date, kg, source: 'health' });
      else errors.push(line);
    } else if (kind === 'X') {
      const minutes = parseDuration(parts[3]);
      const kcal = toNumber(parts[4]);
      if (date && parts[2] && Number.isFinite(minutes)) {
        workouts.push({
          date,
          name: parts[2],
          minutes,
          kcal: Number.isFinite(kcal) ? Math.round(kcal) : null,
          source: 'health',
        });
      } else errors.push(line);
    } else {
      errors.push(line);
    }
  }
  return { weights, workouts, errors };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
