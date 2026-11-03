// combat.md "General" (Rounding) and "% Multipliers".
// Inside a formula, values are kept in hundredths (integers), so only the first 2 decimal places count.
// The result is rounded once, at the end: nearest whole number, .50 rounds up.
// Percents are integers where 100 = 100% (normal).

// A whole number in hundredths.
export function h(n: number): number {
  return n * 100;
}

// Hundredths × percent. Anything past the 2nd decimal place is dropped.
export function mulPct(hv: number, pct: number): number {
  return Math.trunc((hv * pct) / 100);
}

// Hundredths ÷ a whole number. Anything past the 2nd decimal place is dropped.
export function divH(hv: number, by: number): number {
  return Math.trunc(hv / by);
}

// Hundredths → nearest whole number, .50 up.
export function roundH(hv: number): number {
  return Math.floor((hv + 50) / 100);
}

// n × pct%, rounded. e.g. pctOf(4, 120) = 5 (4.80).
export function pctOf(n: number, pct: number): number {
  return roundH(mulPct(h(n), pct));
}

// a ÷ b, rounded. e.g. divRound(7, 2) = 4 (3.50).
export function divRound(a: number, b: number): number {
  return roundH(divH(h(a), b));
}
