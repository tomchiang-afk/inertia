/** Local-first persistence (localStorage) */

import {
  DEFAULT_WIDGET_PRIVACY,
  normalizeWidgetPrivacy,
} from "./widgetPrivacy.js";
import { normalizeGoals } from "./goals.js";
import { normalizeAssets, demoAssets, isV2Assets, SCHEMA_VERSION } from "./portfolio.js";
import { normalizeFx, defaultFx } from "./currency.js";
import { detectLocale } from "./i18n/index.js";

const KEY = "inertia.v1";
const LEGACY_KEY = "jingchang.v1";
/** Raw pre-v2 save kept once, untouched, when the fixed-bucket model is migrated. */
export const V1_BACKUP_KEY = "inertia.v1.backup-schema1";

export const WIDGET_TEMPLATES = ["paper", "swiss", "sumi", "glass", "noir", "matrix"];

/** Fresh-install sample data (v2 lists). */
export const DEFAULT_ASSETS = demoAssets("zh-TW");

/** locale omitted until first launch → detect navigator.language */
export const DEFAULT_SETTINGS = {
  honesty: "pace", // pace | actual
  period: "30d", // 7d | 30d | month
  buyout: false,
  widgetTemplate: "paper", // paper | swiss | sumi | glass | noir | matrix
  widgetPrivacy: { ...DEFAULT_WIDGET_PRIVACY, fields: { ...DEFAULT_WIDGET_PRIVACY.fields } },
  fx: defaultFx("TWD"), // base currency + user-editable FX table (see currency.js)
  // locale: set on first launch via i18n.detectLocale()
};

export function normalizeWidgetTemplate(id) {
  return WIDGET_TEMPLATES.includes(id) ? id : "paper";
}

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

function emptyState(locale) {
  return {
    schemaVersion: SCHEMA_VERSION,
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
export function hydrateState(parsed) {
  if (!parsed || typeof parsed !== "object") return emptyState();
  const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
  settings.widgetTemplate = normalizeWidgetTemplate(settings.widgetTemplate);
  settings.widgetPrivacy = normalizeWidgetPrivacy(settings.widgetPrivacy);
  settings.fx = normalizeFx(parsed.settings?.fx, "TWD");
  const locale = parsed.settings?.locale || safeDetect();
  const wasV1 = !isV2Assets(parsed.assets);
  return {
    schemaVersion: SCHEMA_VERSION,
    migratedFrom: wasV1 && parsed.assets ? 1 : undefined,
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
    }
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
      assets: state.assets,
      settings: state.settings,
      goals: normalizeGoals(state.goals),
    })
  );
}

export { normalizeWidgetPrivacy, DEFAULT_WIDGET_PRIVACY };
