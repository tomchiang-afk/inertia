/**
 * Smooth month rhythm (月節奏) — the only way Inertia moves numbers between edits.
 *
 * quietDay = mortgage principal / day + time-deposit interest / day + passive income / day
 * (see math.js derive). Between two asset edits, net worth is shown as
 *
 *   entered net worth + quietDay × days since the last asset edit (capped at PACE_MAX_DAYS)
 *
 * so it only ever grows by that even daily pace — never by market moves. The Android widget
 * gets the same anchor (snapshot.live.base / .at) and extrapolates with the same formula
 * (WidgetFormat.extrapolate, same 45-day cap), so app and widget always agree.
 */

export const DAY_MS = 86_400_000;
/** Mirrors WidgetFormat.MAX_EXTRAPOLATE_DAYS. After this, numbers wait for the next update. */
export const PACE_MAX_DAYS = 45;

/** Days of accrual since `anchorAt` (fractional, clamped to [0, PACE_MAX_DAYS]). */
export function paceDays(anchorAt, now = Date.now()) {
  const at = Number(anchorAt);
  const t = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(at) || at <= 0 || !Number.isFinite(t)) return 0;
  return Math.min(Math.max(0, t - at) / DAY_MS, PACE_MAX_DAYS);
}

/** True once accrual has hit the cap (Home suggests updating the numbers). */
export function paceCapped(anchorAt, now = Date.now()) {
  return paceDays(anchorAt, now) >= PACE_MAX_DAYS;
}

/**
 * Add smooth-rhythm accrual to derived numbers.
 * `netWorth` becomes the displayed (accrued) value; `netWorthEntered` keeps the typed total.
 */
export function withPace(derived, anchorAt, now = Date.now()) {
  const days = paceDays(anchorAt, now);
  const accrued = derived.quietDay * days;
  return {
    ...derived,
    netWorthEntered: derived.netWorth,
    netWorth: derived.netWorth + accrued,
    paceAccrued: accrued,
    paceDays: days,
    paceAnchorAt: Number(anchorAt) > 0 ? Number(anchorAt) : null,
  };
}

/** Portion of today's quiet contribution already "earned" (local midnight → now). */
export function todaySoFar(quietDay, now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const frac = Math.min(Math.max((d.getTime() - midnight) / DAY_MS, 0), 1);
  return quietDay * frac;
}
