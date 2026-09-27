/**
 * Simple financial goals — max 3, align to existing asset math (no ledgers).
 */

export const GOAL_ALIGNS = ["netWorth", "housing", "cash", "passiveMonth"];
export const MAX_GOALS = 3;

export function newGoalId() {
  return (
    "g_" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7)
  );
}

/**
 * @param {unknown} raw
 * @returns {{ id: string, name: string, target: number, align: string, onWidget: boolean }[]}
 */
export function normalizeGoals(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  let widgetAssigned = false;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (out.length >= MAX_GOALS) break;
    const align = GOAL_ALIGNS.includes(item.align) ? item.align : "netWorth";
    const target = Number(item.target);
    const id =
      typeof item.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(item.id)
        ? item.id
        : newGoalId();
    const name =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim().slice(0, 48)
        : "Goal";
    let onWidget = !!item.onWidget;
    if (onWidget) {
      if (widgetAssigned) onWidget = false;
      else widgetAssigned = true;
    }
    out.push({
      id,
      name,
      target: Number.isFinite(target) && target > 0 ? target : 0,
      align,
      onWidget,
    });
  }
  return out;
}

/** The single goal flagged onWidget, or null (widget strip is optional). */
export function primaryGoal(goals) {
  const list = normalizeGoals(goals);
  return list.find((g) => g.onWidget) || null;
}

/**
 * Current value for a goal's align key from derive() + assets.
 * passiveMonth = existing passive.monthly pace (not transactions).
 */
export function alignedValue(goal, assets, derived) {
  const a = goal?.align;
  if (a === "netWorth") return Number(derived?.netWorth) || 0;
  if (a === "housing") return Number(derived?.netEquity) || 0;
  if (a === "cash") return Number(derived?.cashTotal) || 0;
  if (a === "passiveMonth") return Number(assets?.passive?.monthly) || 0;
  return 0;
}

/**
 * Progress ratio (can exceed 1). Bar fill should clamp 0–100.
 * @returns {{ current: number, target: number, ratio: number, pct: number, barPct: number, remaining: number }}
 */
export function goalProgress(goal, assets, derived) {
  const current = alignedValue(goal, assets, derived);
  const target = Math.max(Number(goal?.target) || 0, 0);
  const ratio = target > 0 ? current / target : 0;
  const pct = Math.round(ratio * 100);
  const barPct = Math.min(Math.max(ratio * 100, 0), 100);
  const remaining = Math.max(target - current, 0);
  return { current, target, ratio, pct, barPct, remaining };
}

/** Set onWidget on one goal id; clears others. */
export function withPrimaryOnWidget(goals, id) {
  return normalizeGoals(goals).map((g) => ({
    ...g,
    onWidget: g.id === id,
  }));
}
