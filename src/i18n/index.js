/**
 * Inertia i18n — product name "Inertia" is FIXED in every language.
 * Locales: zh-TW, en (fallback), es, ja, ko.
 */
import en from "./en.js";
import zhTW from "./zh-TW.js";
import es from "./es.js";
import ja from "./ja.js";
import ko from "./ko.js";

export const SUPPORTED = ["en", "zh-TW", "es", "ja", "ko"];

const catalogs = {
  en,
  "zh-TW": zhTW,
  es,
  ja,
  ko,
};

/** BCP 47 tags for document.documentElement.lang */
const HTML_LANG = {
  en: "en",
  "zh-TW": "zh-TW",
  es: "es",
  ja: "ja",
  ko: "ko",
};

let current = "en";

export function getLocale() {
  return current;
}

export function detectLocale() {
  const raw = (typeof navigator !== "undefined" && navigator.language) || "en";
  const lower = String(raw).toLowerCase().replace(/_/g, "-");
  if (lower.startsWith("zh")) {
    // Traditional / Taiwan / HK / Macau → zh-TW; otherwise still zh-TW (Taiwan-first)
    return "zh-TW";
  }
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("en")) return "en";
  return "en";
}

/**
 * @param {string} locale
 * @returns {string} normalized supported locale
 */
export function setLocale(locale) {
  const next = SUPPORTED.includes(locale) ? locale : "en";
  current = next;
  if (typeof document !== "undefined") {
    document.documentElement.lang = HTML_LANG[next] || "en";
    const tag = catalogs[next]?.tagline || catalogs.en.tagline;
    document.title = `Inertia — ${tag}`;
  }
  return current;
}

/**
 * Translate key with optional {var} interpolation. Falls back to en, then key.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 */
export function t(key, vars = {}) {
  const dict = catalogs[current] || catalogs.en;
  let s = dict[key];
  if (s == null) s = catalogs.en[key];
  if (s == null) s = key;
  return String(s).replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`
  );
}

export function localeLabel(locale) {
  return t(`settings.lang.${locale}`);
}
