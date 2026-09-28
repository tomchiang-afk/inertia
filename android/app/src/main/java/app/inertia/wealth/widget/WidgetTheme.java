package app.inertia.wealth.widget;

import app.inertia.wealth.R;

/**
 * Native palette for the three v0.4 styles (rhythm / editorial / sediment).
 * Legacy template ids still resolve through {@link #normalizeStyle}.
 */
public final class WidgetTheme {

    public final String id;
    public final int background; // drawable res
    public final int ink;
    public final int muted;
    public final int faint;
    public final int track;
    public final int accent;
    public final boolean sharp; // square corners on bars
    public final boolean accentRule; // swiss left accent rule

    private WidgetTheme(String id, int background, int ink, int muted, int faint, int track,
                        int accent, boolean sharp, boolean accentRule) {
        this.id = id;
        this.background = background;
        this.ink = ink;
        this.muted = muted;
        this.faint = faint;
        this.track = track;
        this.accent = accent;
        this.sharp = sharp;
        this.accentRule = accentRule;
    }

    /** paper/swiss/glass → rhythm, sumi → sediment, noir/matrix → editorial. */
    public static String normalizeStyle(String style, String template) {
        if ("rhythm".equals(style) || "editorial".equals(style) || "sediment".equals(style)) return style;
        if ("sumi".equals(template)) return "sediment";
        if ("noir".equals(template) || "matrix".equals(template)) return "editorial";
        return "rhythm";
    }

    public static WidgetTheme forStyle(String style) {
        if ("editorial".equals(style)) {
            return new WidgetTheme("editorial", R.drawable.widget_bg_editorial,
                    0xFF1D1B18, 0xFF8B857A, 0xFFB9B2A6, 0xFFE6E0D6, 0xFFC3402A, false, false);
        }
        if ("sediment".equals(style)) {
            return new WidgetTheme("sediment", R.drawable.widget_bg_sediment,
                    0xFF1C1C1E, 0xFF6A645B, 0xFFA39B90, 0xFFE8E1D4, 0xFF9A5B22, false, false);
        }
        return new WidgetTheme("rhythm", R.drawable.widget_bg_rhythm,
                0xFF1C1C1E, 0xFF5C5C5C, 0xFF8A8A8A, 0xFFE4E4E6, 0xFF2E7D5B, false, false);
    }

    public static WidgetTheme forTemplate(String template) {
        return forStyle(normalizeStyle(null, template));
    }
}
