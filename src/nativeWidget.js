/**
 * Bridge to the native Android home-screen widget (local Capacitor plugin
 * `InertiaWidget`, see android/app/src/main/java/app/inertia/wealth/widget).
 * No-op on the web.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { buildWidgetSnapshot } from "./widgetSnapshot.js";

const InertiaWidget = registerPlugin("InertiaWidget");

let timer = null;

function isNative() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("InertiaWidget");
  } catch {
    return false;
  }
}

/** Push a fresh privacy-formatted snapshot to the widget (debounced). */
export function syncNativeWidget(state, { immediate = false } = {}) {
  if (!isNative()) return;
  const run = () => {
    timer = null;
    let snapshot;
    try {
      snapshot = buildWidgetSnapshot(state);
    } catch {
      return;
    }
    InertiaWidget.update({ snapshot }).catch(() => {});
  };
  if (timer) clearTimeout(timer);
  if (immediate) run();
  else timer = setTimeout(run, 300);
}

/** Initial sync + refresh when the app returns to / leaves the foreground. */
export function initNativeWidget(state) {
  if (!isNative()) return;
  syncNativeWidget(state, { immediate: true });
  const again = () => syncNativeWidget(state, { immediate: true });
  App.addListener("resume", again).catch(() => {});
  App.addListener("pause", again).catch(() => {});
}

/** Ask the launcher to place a widget. No-op on web. */
export async function requestPinWidget(size) {
  if (!isNative()) return { ok: false, native: false };
  try {
    const res = await InertiaWidget.requestPin({ size: size === "wide" ? "wide" : "small" });
    return { ok: true, ...(res || {}) };
  } catch {
    return { ok: false, native: true };
  }
}

/** Whether Inertia has at least one widget on the home screen. */
export async function getWidgetStatus() {
  if (!isNative()) return { pinned: false, small: false, wide: false, native: false };
  try {
    const res = await InertiaWidget.getStatus();
    return { pinned: !!res?.pinned, small: !!res?.small, wide: !!res?.wide, native: true };
  } catch {
    return { pinned: false, small: false, wide: false, native: true };
  }
}

/** Android hardware Back. No-op on web. */
export function initBackButton(handler) {
  if (!isNative()) return;
  App.addListener("backButton", handler).catch(() => {});
}

/** Home + Back minimizes the Android shell instead of leaving it. */
export function minimizeApp() {
  if (!isNative()) return;
  App.minimizeApp?.().catch(() => {});
}
