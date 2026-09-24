/**
 * Ad gate — EDIT ONLY.
 * NEVER on widgets. NEVER on mere browse/view of Home or bucket detail.
 * ONLY when user opens Edit sheet or commits Save — and only if !buyout.
 */

let buyoutGetter = () => false;

export function configureAdGate({ getBuyout }) {
  buyoutGetter = getBuyout || (() => false);
}

/**
 * Run an edit-intent action; show mock interstitial if not bought out.
 * @param {'edit'|'save'} reason
 * @param {() => void} onContinue — called after ad dismissed (or immediately if buyout)
 */
export function withEditAd(reason, onContinue) {
  if (buyoutGetter()) {
    onContinue();
    return;
  }
  showMockInterstitial(reason, onContinue);
}

function showMockInterstitial(reason, onContinue) {
  const existing = document.getElementById("ad-gate-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "ad-gate-modal";
  overlay.className = "ad-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Ad (mock)");

  const reasonLabel =
    reason === "save" ? "before save" : reason === "edit" ? "before edit" : "";

  overlay.innerHTML = `
    <div class="ad-card">
      <div class="ad-kicker">Ad (mock)${reasonLabel ? " · " + reasonLabel : ""}</div>
      <p class="ad-body">Inertia is free. Ads appear only when you edit numbers — never on browse or widgets.</p>
      <p class="ad-hint">Production uses AdMob; buyout turns this off forever.</p>
      <div class="ad-actions">
        <button type="button" class="btn btn-ghost" id="ad-skip" disabled>Skip (1)</button>
        <button type="button" class="btn btn-primary" id="ad-skip-now">Skip</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const skipTimed = overlay.querySelector("#ad-skip");
  const skipNow = overlay.querySelector("#ad-skip-now");
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    overlay.remove();
    onContinue();
  }

  skipNow.addEventListener("click", close);

  let left = 1;
  const timer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(timer);
      skipTimed.disabled = false;
      skipTimed.textContent = "Skip";
      skipTimed.addEventListener("click", close, { once: true });
    } else {
      skipTimed.textContent = `Skip (${left})`;
    }
  }, 1000);
}
