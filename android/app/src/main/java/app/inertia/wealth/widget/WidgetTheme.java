package app.inertia.wealth.widget;

import app.inertia.wealth.R;

/**
 * Native palette per in-app widget template (tokens from src/styles.css).
 * Light by default, one accent each; noir is the single dark option.
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

    public static WidgetTheme forTemplate(String template) {
        if (template == null) template = "paper";
        switch (template) {
            case "swiss":
                return new WidgetTheme("swiss", R.drawable.widget_bg_swiss,
                        0xFF0A0A0A, 0xFF4A4A4E, 0xFF7A7A80, 0xFFD8D8DE, 0xFF9B1B2E, true, true);
            case "sumi":
                return new WidgetTheme("sumi", R.drawable.widget_bg_sumi,
                        0xFF1C1C1A, 0xFF555850, 0xFF7E8378, 0xFFD0D6CC, 0xFF3F4F42, false, false);
            case "glass":
                return new WidgetTheme("glass", R.drawable.widget_bg_glass,
                        0xFF1B1D21, 0xFF5A5E66, 0xFF8B9099, 0x1F000000, 0xFF2C5F6E, false, false);
            case "noir":
                return new WidgetTheme("noir", R.drawable.widget_bg_noir,
                        0xFFF2F2F0, 0xFFA1A19C, 0xFF6E6E6A, 0xFF3A3A3C, 0xFF8FA896, false, false);
            case "matrix":
                return new WidgetTheme("matrix", R.drawable.widget_bg_matrix,
                        0xFF111111, 0xFF5A5A5A, 0xFF8A8A8A, 0xFFC8C8C8, 0xFF0B7A4B, true, false);
            case "paper":
            default:
                return new WidgetTheme("paper", R.drawable.widget_bg_paper,
                        0xFF1A1A1A, 0xFF5C5C5C, 0xFF8A8A8A, 0xFFE8E8E8, 0xFF2F5D4A, false, false);
        }
    }
}
