// Evenly-spaced "nice" integer axis ticks.
//
// The charts used to label the Y axis as Math.round(max × [0,.25,.5,.75,1]), which after
// rounding gives uneven increments (max 5 → 0,1,3,4,5 skips 2; max 10 → 0,3,5,8,10 steps
// by 3,2,3,2). These helpers instead pick a constant "nice" integer step so every gap is
// identical.

// Smallest "nice" number (1, 2, or 5 × 10^k) that is >= x. Always an integer >= 1.
function niceStep(x) {
  if (!(x > 1)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  for (const m of [1, 2, 5]) {
    if (m * pow >= x) return Math.round(m * pow);
  }
  return Math.round(10 * pow);
}

// Single axis: tightest evenly-spaced integer ticks covering rawMax with ~`intervals`
// steps. Returns { max, step, ticks: [0, step, 2·step, …, max] } (ascending).
export function niceTicks(rawMax, intervals = 5) {
  const m = Math.max(1, Math.ceil(rawMax));
  const step = niceStep(m / intervals);
  const max = Math.ceil(m / step) * step;
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  return { max, step, ticks };
}

// Two axes that share the same gridlines (e.g. bars on the left, a cumulative line on the
// right). Both use the same number of equal divisions so the gridlines line up, but each
// gets its own nice integer step — different scales, each internally constant. Every axis
// max is >= its raw max, so nothing ever clips.
export function dualNiceAxes(rawLeft, rawRight, intervals = 5) {
  const axis = (raw) => {
    const step = niceStep(Math.max(1, Math.ceil(raw)) / intervals);
    return { step, max: step * intervals };
  };
  return { intervals, left: axis(rawLeft), right: axis(rawRight) };
}
