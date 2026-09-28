/** Local-first persistence (localStorage) */

import {
  DEFAULT_WIDGET_PRIVACY,
  normalizeWidgetPrivacy,
} from "./widgetPrivacy.js";
import { normalizeGoals } from "./goals.js";
import { normalizeAssets, demoAssets, isV2Assets, SCHEMA_VERSION } from "./portfolio.js";
import { normalizeFx, defaultFx } from "./currency.js";
import { detectLocale } from "./i18n/index.js";
import { normalizeWidgetStyle, styleFromLegacyTemplate, WIDGET_STYLES } from "./widgetStyle.js";

const KEY = "inertia.v1";
const LEGACY_KEY = "jingchang.v1";
/** Raw pre-v2 save kept once, untouched, when the fixed-bucket model is migrated. */
export const V1_BACKUP_KEY = "inertia.v1.backup-schema1";

export { WIDGET_STYLES, normalizeWidgetStyle };

/** Fresh-install sample data (v2 lists). */
export const DEFAULT_ASSETS = demoAssets("zh-TW");

/** locale omitted until first launch → detect navigator.language */
export const DEFAULT_SETTINGS = {
  // v0.3.1: the "today actual" / "month pace" honesty switch is gone — month rhythm only.
  period: "30d", // 7d | 30d | month
  buyout: false,
  widgetStyle: "rhythm", // rhythm | editorial | sediment
  widgetPrivacy: { ...DEFAULT_WIDGET_PRIVACY, fields: { ...DEFAULT_WIDGET_PRIVACY.fields } },
  fx: defaultFx("TWD"), // base currency + user-editable FX table (see currency.js)
  // locale: set on first launch via i18n.detectLocale()
};

function migrateLegacyKey() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
    } else if (legacy && localStorage.getItem(KEY)) {
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Settings keys dropped in v0.3.1 (removed on load, then the save is rewritten once). */
const RETIRED_SETTINGS = ["honesty"];

function emptyState(locale, now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    paceAnchorAt: now,
    assets: normalizeAssets(demoAssets(locale || safeDetect()), { base: "TWD" }),
    settings: {
      ...DEFAULT_SETTINGS,
      fx: defaultFx("TWD"),
      widgetPrivacy: normalizeWidgetPrivacy(DEFAULT_SETTINGS.widgetPrivacy),
    },
    goals: [],
  };
}

function safeDetect() {
  try {
    return detectLocale();
  } catch {
    return "en";
  }
}

/**
 * Parse + migrate a raw saved object (exported for unit tests).
 * schemaVersion missing/1 → v1 fixed buckets → migrated to v2 lists (TWD base).
 */
export function hydrateState(parsed, { now = Date.now() } = {}) {
  if (!parsed || typeof parsed !== "object") return emptyState(undefined, now);
  const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
  let cleaned = false;
  for (const k of RETIRED_SETTINGS) {
    if (k in settings) {
      delete settings[k];
      cleaned = true;
    }
  }
  // Retired widget privacy field ("todayActual"): normalizeWidgetPrivacy drops unknown keys.
  if (parsed.settings?.widgetPrivacy?.fields && "todayActual" in parsed.settings.widgetPrivacy.fields) cleaned = true;
  // Default widgetStyle is "rhythm". That must not hide a saved legacy template:
  // only an explicit widgetStyle key wins over widgetTemplate.
  const rawSettings = parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {};
  const styleWasSaved = Object.prototype.hasOwnProperty.call(rawSettings, "widgetStyle");
  const legacyTemplate = rawSettings.widgetTemplate;
  const style = styleWasSaved
    ? normalizeWidgetStyle(rawSettings.widgetStyle, legacyTemplate)
    : legacyTemplate != null
      ? styleFromLegacyTemplate(legacyTemplate)
      : "rhythm";
  if (settings.widgetStyle !== style || legacyTemplate != null || (styleWasSaved && !WIDGET_STYLES.includes(rawSettings.widgetStyle))) {
    cleaned = true;
  }
  settings.widgetStyle = style;
  delete settings.widgetTemplate;
  settings.widgetPrivacy = normalizeWidgetPrivacy(settings.widgetPrivacy);
  settings.fx = normalizeFx(parsed.settings?.fx, "TWD");
  const locale = parsed.settings?.locale || safeDetect();
  const wasV1 = !isV2Assets(parsed.assets);
  // Smooth-rhythm anchor: when the asset numbers were last entered. Missing (older saves) or
  // in the future (clock change) → start accruing now, so nothing jumps on upgrade.
  const anchor = Number(parsed.paceAnchorAt);
  const anchorOk = Number.isFinite(anchor) && anchor > 0 && anchor <= now;
  if (!anchorOk) cleaned = true;
  return {
    schemaVersion: SCHEMA_VERSION,
    migratedFrom: wasV1 && parsed.assets ? 1 : undefined,
    needsSave: cleaned || undefined,
    paceAnchorAt: anchorOk ? anchor : now,
    assets: normalizeAssets(parsed.assets, { base: settings.fx.base, locale }),
    settings,
    goals: normalizeGoals(parsed.goals),
  };
}

export function loadState() {
  migrateLegacyKey();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const state = hydrateState(parsed);
    if (state.migratedFrom === 1) {
      try {
        if (!localStorage.getItem(V1_BACKUP_KEY)) localStorage.setItem(V1_BACKUP_KEY, raw);
      } catch {
        /* ignore quota */
      }
      saveState(state);
    } else if (state.needsSave) {
      saveState(state);
    }
    delete state.needsSave;
    return state;
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      paceAnchorAt: state.paceAnchorAt,
      assets: state.assets,
      settings: state.settings,
      goals: normalizeGoals(state.goals),
    })
  );
}

export { normalizeWidgetPrivacy, DEFAULT_WIDGET_PRIVACY };
