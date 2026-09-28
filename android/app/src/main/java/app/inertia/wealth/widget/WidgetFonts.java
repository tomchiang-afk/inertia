package app.inertia.wealth.widget;

import android.content.Context;
import android.content.res.AssetManager;
import android.graphics.Typeface;
import android.os.Build;

/**
 * Bundled OFL faces for widget bitmaps. RemoteViews text cannot take a custom
 * typeface, so the large figure is drawn with these and uploaded as a bitmap.
 * Inter for rhythm and sediment; Newsreader for editorial numerals.
 */
public final class WidgetFonts {

    private static Typeface inter;
    private static Typeface newsreader;

    private WidgetFonts() {}

    public static Typeface inter(Context ctx) {
        if (inter == null) inter = load(ctx.getAssets(), "fonts/Inter-Variable.ttf", "'opsz' 28, 'wght' 580");
        return inter;
    }

    /** Display optical size, a little lighter than the UI sans — the editorial numeral. */
    public static Typeface newsreader(Context ctx) {
        if (newsreader == null) {
            newsreader = load(ctx.getAssets(), "fonts/Newsreader.ttf", "'opsz' 72, 'wght' 400");
        }
        return newsreader;
    }

    private static Typeface load(AssetManager assets, String path, String variation) {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                Typeface built = new Typeface.Builder(assets, path)
                        .setFontVariationSettings(variation)
                        .build();
                if (built != null) return built;
            } catch (RuntimeException ignored) {
                // Fall through to the default instance of the same file.
            }
        }
        try {
            Typeface plain = Typeface.createFromAsset(assets, path);
            if (plain != null) return plain;
        } catch (RuntimeException ignored) {
            // Missing asset: system sans is still readable.
        }
        return Typeface.SANS_SERIF;
    }
}
