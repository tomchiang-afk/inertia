/**
 * Thin delayed-quotes client stub.
 * Future: GET /api/quotes?symbols=2330,0050 → delayed TWSE prices.
 * Mock: returns canned delayed data offline; does not hit network.
 */

const MOCK = {
  "0050": { symbol: "0050", name: "元大台灣50", price: 178.5, delayedMin: 15 },
  "2330": { symbol: "2330", name: "台積電", price: 980, delayedMin: 15 },
  "006208": { symbol: "006208", name: "富邦台50", price: 92.3, delayedMin: 15 },
};

/**
 * @param {string[]} symbols
 * @returns {Promise<Array<{symbol:string,name:string,price:number,delayedMin:number}>>}
 */
export function fetchDelayedQuotes(symbols) {
  return new Promise((resolve) => {
    const list = (symbols && symbols.length ? symbols : Object.keys(MOCK)).map(
      (s) => {
        const hit = MOCK[s] || {
          symbol: s,
          name: s,
          price: 100,
          delayedMin: 15,
        };
        // Slight canned jitter so “update” feels like a refresh
        const jitter = Math.round((Math.random() - 0.5) * 4 * 10) / 10;
        return { ...hit, price: Math.round((hit.price + jitter) * 10) / 10 };
      }
    );
    setTimeout(() => resolve(list), 280);
  });
}

/** Suggest a mock portfolio market value from delayed quotes (demo only). */
export function mockPortfolioFromQuotes(quotes, baseValue) {
  if (!quotes.length) return baseValue;
  const avg =
    quotes.reduce((s, q) => s + q.price, 0) / quotes.length;
  // Map average quote move into a small % nudge on portfolio MV
  const factor = 1 + ((avg % 5) - 2.5) / 1000;
  return Math.round(baseValue * factor);
}
