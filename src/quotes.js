/**
 * Delayed-quote hook (no network in this build).
 *
 * Holding prices are entered by hand and are the source of truth. A delayed-quote backend
 * can be plugged in later with setQuoteProvider(); the UI would then offer an explicit
 * "apply delayed prices" step (an edit path → ad rule applies) and never overwrite silently.
 *
 * Provider contract:
 *   async (requests: Array<{ symbol: string, market: string }>) =>
 *     Array<{ symbol, market, price, currency, delayedMin, asOf }>
 */

let provider = null;

export function setQuoteProvider(fn) {
  provider = typeof fn === "function" ? fn : null;
}

export function hasQuoteProvider() {
  return !!provider;
}

/**
 * @param {Array<{symbol:string, market:string}>} requests
 * @returns {Promise<Array<{symbol:string, market:string, price:number, currency:string, delayedMin:number, asOf:number}>>}
 */
export async function fetchDelayedQuotes(requests) {
  if (!provider || !Array.isArray(requests) || !requests.length) return [];
  try {
    const out = await provider(requests.filter((r) => r && r.symbol));
    return Array.isArray(out) ? out.filter((q) => q && Number.isFinite(q.price) && q.price > 0) : [];
  } catch {
    return [];
  }
}

/** Pure helper: which holdings would change if the quotes were applied (for a confirm sheet). */
export function diffQuotes(account, quotes) {
  const bySym = new Map(quotes.filter((q) => q.market === account.market).map((q) => [q.symbol, q]));
  return account.holdings
    .filter((h) => bySym.has(h.symbol) && bySym.get(h.symbol).price !== h.price)
    .map((h) => ({ id: h.id, symbol: h.symbol, from: h.price, to: bySym.get(h.symbol).price }));
}
