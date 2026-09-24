/** Local-first persistence (localStorage) */

const KEY = "inertia.v1";
const LEGACY_KEY = "jingchang.v1";

export const DEFAULT_ASSETS = {
  housing: {
    marketValue: 18_000_000,
    mortgage: 5_200_000,
    monthlyPrincipal: 22_000,
  },
  equities: {
    marketValue: 2_450_000,
    dayPnL: -3_200,
    periodPnL: 186_000,
  },
  cash: {
    checking: 420_000,
    timeDeposit: 800_000,
    tdAnnualRate: 1.7,
  },
  passive: {
    monthly: 28_500,
  },
};

/** locale omitted until first launch → detect navigator.language */
export const DEFAULT_SETTINGS = {
  honesty: "pace", // pace | actual
  period: "30d", // 7d | 30d | month
  buyout: false,
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

export function loadState() {
  migrateLegacyKey();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        assets: structuredClone(DEFAULT_ASSETS),
        settings: { ...DEFAULT_SETTINGS },
      };
    }
    const parsed = JSON.parse(raw);
    return {
      assets: {
        ...structuredClone(DEFAULT_ASSETS),
        ...parsed.assets,
        housing: { ...DEFAULT_ASSETS.housing, ...(parsed.assets?.housing || {}) },
        equities: { ...DEFAULT_ASSETS.equities, ...(parsed.assets?.equities || {}) },
        cash: { ...DEFAULT_ASSETS.cash, ...(parsed.assets?.cash || {}) },
        passive: { ...DEFAULT_ASSETS.passive, ...(parsed.assets?.passive || {}) },
      },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return {
      assets: structuredClone(DEFAULT_ASSETS),
      settings: { ...DEFAULT_SETTINGS },
    };
  }
}

export function saveState(state) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      assets: state.assets,
      settings: state.settings,
    })
  );
}
