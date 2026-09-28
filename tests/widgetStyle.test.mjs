import { test } from "node:test";
import assert from "node:assert/strict";
import { hydrateState } from "../src/store.js";
import { normalizeWidgetStyle, styleFromLegacyTemplate } from "../src/widgetStyle.js";

test("legacy templates map to the three styles", () => {
  assert.equal(styleFromLegacyTemplate("paper"), "rhythm");
  assert.equal(styleFromLegacyTemplate("swiss"), "rhythm");
  assert.equal(styleFromLegacyTemplate("glass"), "rhythm");
  assert.equal(styleFromLegacyTemplate("sumi"), "sediment");
  assert.equal(styleFromLegacyTemplate("noir"), "editorial");
  assert.equal(styleFromLegacyTemplate("matrix"), "editorial");
  assert.equal(styleFromLegacyTemplate("bogus"), "rhythm");
  assert.equal(normalizeWidgetStyle("sediment", "noir"), "sediment");
  assert.equal(normalizeWidgetStyle(undefined, "sumi"), "sediment");
  assert.equal(normalizeWidgetStyle("nope", "nope"), "rhythm");
});

test("hydrate drops widgetTemplate and writes widgetStyle", () => {
  const s = hydrateState({
    schemaVersion: 2,
    assets: { properties: [], brokerAccounts: [], cashAccounts: [], passiveItems: [] },
    settings: { widgetTemplate: "noir", buyout: true },
  });
  assert.equal(s.settings.widgetStyle, "editorial");
  assert.equal(s.settings.widgetTemplate, undefined);
  assert.equal(s.settings.buyout, true);
  assert.equal(s.needsSave, true);
});

test("hydrate keeps an explicit style and still drops a leftover template", () => {
  const s = hydrateState({
    schemaVersion: 2,
    assets: { properties: [], brokerAccounts: [], cashAccounts: [], passiveItems: [] },
    settings: { widgetStyle: "sediment", widgetTemplate: "paper" },
  });
  assert.equal(s.settings.widgetStyle, "sediment");
  assert.equal(s.settings.widgetTemplate, undefined);
});
