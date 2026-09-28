/** Three widget styles (v0.4.0). Legacy 6 templates migrate on load. */

export const WIDGET_STYLES = ["rhythm", "editorial", "sediment"];

/** paper / swiss / glass → rhythm; sumi → sediment; noir / matrix → editorial. */
const LEGACY_TEMPLATE = {
  paper: "rhythm",
  swiss: "rhythm",
  glass: "rhythm",
  sumi: "sediment",
  noir: "editorial",
  matrix: "editorial",
};

export function styleFromLegacyTemplate(id) {
  return LEGACY_TEMPLATE[id] || "rhythm";
}

/**
 * @param {string} [style] saved widgetStyle
 * @param {string} [legacyTemplate] saved widgetTemplate, if the style is missing or unknown
 */
export function normalizeWidgetStyle(style, legacyTemplate) {
  if (WIDGET_STYLES.includes(style)) return style;
  if (legacyTemplate && Object.prototype.hasOwnProperty.call(LEGACY_TEMPLATE, legacyTemplate)) {
    return LEGACY_TEMPLATE[legacyTemplate];
  }
  return "rhythm";
}
