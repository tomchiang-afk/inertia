package app.inertia.wealth.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;

/**
 * Static bitmaps for RemoteViews (no animation): the month rhythm beat bar
 * and the goal progress bar. Drawn at the exact pixel size of the target view
 * so dots/bars are not distorted.
 */
public final class WidgetBitmaps {

    private WidgetBitmaps() {}

    /**
     * Month rhythm: one beat per day of the month; elapsed beats in accent,
     * today at full height, remaining beats as a quiet track.
     *
     * @param style bars | bars-sharp | dots | ink | scan
     */
    public static Bitmap rhythm(int w, int h, String style, int day, int daysInMonth, WidgetTheme th, float density) {
        w = Math.max(w, 8);
        h = Math.max(h, 4);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        int n = Math.max(daysInMonth, 1);
        if (style == null) style = "bars";

        if ("scan".equals(style)) {
            // Matrix: exactly 4 chunky blocks (weeks); current one lit.
            int blocks = 4;
            float gap = h * 0.6f;
            float bw = (w - gap * (blocks - 1)) / blocks;
            int current = Math.min(blocks - 1, (int) ((day - 1) * blocks / (float) n));
            for (int i = 0; i < blocks; i++) {
                p.setColor(i == current ? th.accent : (i < current ? th.faint : th.track));
                float x = i * (bw + gap);
                c.drawRect(x, 0, x + bw, h, p);
            }
            return bmp;
        }

        float slot = w / (float) n;
        for (int i = 0; i < n; i++) {
            int d = i + 1;
            boolean past = d < day;
            boolean today = d == day;
            float cx = i * slot + slot / 2f;
            // Deterministic "breathing" beat heights — equalizer, not data.
            float beat = 0.45f + 0.55f * (float) Math.abs(Math.sin(d * 0.9));
            if ("dots".equals(style) || "ink".equals(style)) {
                boolean ink = "ink".equals(style);
                float r = Math.min(Math.min(slot * (ink ? 0.30f : 0.38f), 3.2f * density), h / 2f);
                // LED column: as many rows as fit; lit rows follow the beat.
                float pitch = r * 2f + Math.max(1f, r * (ink ? 1.0f : 0.6f));
                int rows = Math.max(1, (int) ((h + (pitch - 2 * r)) / pitch));
                int lit = today ? rows : past ? Math.max(1, Math.round(rows * beat)) : 0;
                float top = (h - (rows * pitch - (pitch - 2 * r))) / 2f;
                for (int row = 0; row < rows; row++) {
                    boolean on = row >= rows - lit;
                    if (today && on) p.setColor(th.accent);
                    else if (on) p.setColor(withAlpha(th.accent, ink ? (int) (110 + 120 * beat) : 200));
                    else p.setColor(th.track);
                    if (!on && rows > 1 && row < rows - 1 && !past && !today) continue; // future: baseline dot only
                    float cy = rows == 1 ? h / 2f : top + r + row * pitch;
                    c.drawCircle(cx, cy, r, p);
                }
            } else {
                float bw = Math.max(1f, Math.min(slot * 0.58f, 3f * density));
                float bh = today ? h : h * beat;
                if (!past && !today) bh = Math.min(h * 0.35f, 3f * density);
                p.setColor(today || past ? th.accent : th.track);
                RectF rect = new RectF(cx - bw / 2f, h - bh, cx + bw / 2f, h);
                if ("bars-sharp".equals(style) || th.sharp) c.drawRect(rect, p);
                else c.drawRoundRect(rect, bw / 2f, bw / 2f, p);
            }
        }
        return bmp;
    }

    /** Goal bar. {@code pct < 0} → track only (masked hides the ratio). */
    public static Bitmap goalBar(int w, int h, double pct, WidgetTheme th) {
        w = Math.max(w, 8);
        h = Math.max(h, 2);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        float r = th.sharp ? 0 : h / 2f;
        p.setColor(th.track);
        c.drawRoundRect(new RectF(0, 0, w, h), r, r, p);
        if (pct >= 0) {
            float fw = (float) (w * Math.min(Math.max(pct, 0), 100) / 100.0);
            if (fw > 0) {
                p.setColor(th.accent);
                c.drawRoundRect(new RectF(0, 0, Math.max(fw, h), h), r, r, p);
            }
        }
        return bmp;
    }

    /**
     * Month beat. {@code cols == 10 && rows == 3} is the small rhythm grid (one dot per day).
     * A single row is the wide rhythm line. Otherwise each column is a day and rows fill upward.
     */
    public static Bitmap monthMatrix(int w, int h, int cols, int rows, int day, int dim,
                                     float dayFraction, int accent, int track, boolean square) {
        w = Math.max(w, 8);
        h = Math.max(h, 8);
        cols = Math.max(cols, 1);
        rows = Math.max(rows, 1);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        float gapX = Math.max(1f, w * 0.015f);
        float gapY = rows == 1 ? 0f : Math.max(1f, h * 0.08f);
        float cw = (w - gapX * (cols - 1)) / cols;
        float rh = (h - gapY * (rows - 1)) / Math.max(rows, 1);
        float rad = Math.min(cw, rh) * 0.42f;
        int limit = Math.max(dim, 1);
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                boolean on;
                boolean today;
                if (cols == 10 && rows > 1) {
                    int n = row * cols + col + 1;
                    if (n > Math.min(limit, 30)) continue;
                    on = n < day;
                    today = n == day;
                } else if (rows == 1) {
                    int n = col + 1;
                    if (n > limit) continue;
                    on = n < day;
                    today = n == day;
                } else {
                    int n = col + 1;
                    if (n > limit) continue;
                    int filled = n < day ? rows : n == day ? Math.max(1, (int) Math.ceil(dayFraction * rows)) : 0;
                    int fromBottom = rows - 1 - row;
                    on = fromBottom < filled;
                    today = n == day && fromBottom == filled - 1;
                }
                p.setColor(on || today ? accent : track);
                if (today) p.setAlpha(160 + (int) (95 * Math.max(0f, Math.min(1f, dayFraction))));
                float cx = col * (cw + gapX) + cw / 2f;
                float cy = row * (rh + gapY) + rh / 2f;
                if (square) {
                    float s = rad * 0.85f;
                    c.drawRect(cx - s, cy - s, cx + s, cy + s, p);
                } else {
                    c.drawCircle(cx, cy, rad, p);
                }
                p.setAlpha(255);
            }
        }
        return bmp;
    }

    /**
     * Quiet rise. {@code reach} is 1 when the line is the pace itself.
     * Below 1, the line is the path to a widget goal: accent up to the current
     * point, a quiet track for what is left, a ring at the target.
     */
    public static Bitmap trend(int w, int h, int accent, int track, float reach) {
        w = Math.max(w, 8);
        h = Math.max(h, 8);
        reach = Math.max(0f, Math.min(1f, reach));
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(Math.max(2f, h * 0.045f));
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        int n = 12;
        float[] xs = new float[n];
        float[] ys = new float[n];
        // Same rise as the in-app preview SVG (viewBox 120×56, y = 42 → 8).
        for (int i = 0; i < n; i++) {
            float t = i / (float) (n - 1);
            xs[i] = 3f + t * (w - 6f);
            ys[i] = 2f + (h - 4f) * (42f - 34f * t) / 56f;
        }
        if (reach < 0.999f) {
            p.setColor(track);
            c.drawPath(slopePath(xs, ys, n - 1, 1f), p);
        }
        float pos = reach * (n - 1);
        int i = Math.min(n - 2, (int) Math.floor(pos));
        float f = pos - i;
        float nx = xs[i] + (xs[i + 1] - xs[i]) * f;
        float ny = ys[i] + (ys[i + 1] - ys[i]) * f;
        p.setColor(accent);
        c.drawPath(slopePath(xs, ys, i, f), p);
        p.setStyle(Paint.Style.FILL);
        c.drawCircle(nx, ny, Math.max(3f, h * 0.055f), p);
        if (reach < 0.999f) {
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.5f, h * 0.025f));
            c.drawCircle(xs[n - 1], ys[n - 1], Math.max(3.5f, h * 0.06f), p);
        }
        return bmp;
    }

    private static Path slopePath(float[] xs, float[] ys, int fullSteps, float frac) {
        Path path = new Path();
        path.moveTo(xs[0], ys[0]);
        int last = Math.max(0, Math.min(xs.length - 1, fullSteps));
        for (int i = 1; i <= last; i++) path.lineTo(xs[i], ys[i]);
        if (frac > 0f && last < xs.length - 1) {
            path.lineTo(xs[last] + (xs[last + 1] - xs[last]) * frac, ys[last] + (ys[last + 1] - ys[last]) * frac);
        }
        return path;
    }

    /** Quiet paper grain. Capped so a 4×2 widget stays well under the RemoteViews bitmap budget. */
    public static Bitmap grain(int w, int h, int seed) {
        int maxW = 480;
        if (w > maxW) {
            h = Math.max(1, h * maxW / w);
            w = maxW;
        }
        w = Math.max(w, 4);
        h = Math.max(h, 4);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        int[] px = new int[w * h];
        int s = seed == 0 ? 1 : seed;
        for (int i = 0; i < px.length; i += 2) {
            s = s * 1664525 + 1013904223;
            int a = 10 + ((s >>> 28) & 15);
            int v = (s >>> 16) & 0xFF;
            px[i] = (a << 24) | (v << 16) | (v << 8) | v;
        }
        bmp.setPixels(px, 0, w, 0, 0, w, h);
        return bmp;
    }

    /**
     * Large figure. Latin runs use the bundled face (Inter or Newsreader).
     * A glyph that face lacks — 萬, a CJK phrase — is drawn with the system
     * sans, which is Noto CJK on current Android.
     *
     * @param maxTextPx starting size in pixels; shrunk until the line fits
     */
    public static Bitmap heroText(String text, int w, int h, int color, Typeface face,
                                  float letterSpacingEm, float maxTextPx) {
        w = Math.max(w, 8);
        h = Math.max(h, 8);
        if (text == null) text = "";
        if (face == null) face = Typeface.SANS_SERIF;
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint latin = figurePaint(color, face, letterSpacingEm);
        Paint cjk = figurePaint(color, cjkFallback(), letterSpacingEm);
        boolean anyFallback = needsFallback(latin, text);
        float size = maxTextPx > 0f ? maxTextPx : h * 0.62f;
        float pad = 2f;
        float limit = Math.max(8f, w - pad * 2f);
        applySize(latin, cjk, size);
        while (size > 8f && (measureRuns(latin, cjk, text) > limit || lineBox(latin, cjk, anyFallback) > h * 0.96f)) {
            size *= 0.92f;
            applySize(latin, cjk, size);
        }
        Paint.FontMetrics fm = latin.getFontMetrics();
        float y = (h - (fm.ascent + fm.descent)) / 2f;
        float x = pad;
        int i = 0;
        while (i < text.length()) {
            int cp = text.codePointAt(i);
            boolean fallback = !glyphCovered(latin, cp);
            int j = i + Character.charCount(cp);
            while (j < text.length()) {
                int next = text.codePointAt(j);
                if ((!glyphCovered(latin, next)) != fallback) break;
                j += Character.charCount(next);
            }
            Paint paint = fallback ? cjk : latin;
            c.drawText(text, i, j, x, y, paint);
            x += paint.measureText(text, i, j);
            i = j;
        }
        return bmp;
    }

    private static Paint figurePaint(int color, Typeface face, float letterSpacingEm) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setColor(color);
        p.setTypeface(face);
        p.setLetterSpacing(letterSpacingEm);
        p.setFontFeatureSettings("tnum, lnum");
        return p;
    }

    private static void applySize(Paint latin, Paint cjk, float size) {
        latin.setTextSize(size);
        cjk.setTextSize(size);
    }

    private static float lineBox(Paint latin, Paint cjk, boolean anyFallback) {
        Paint.FontMetrics a = latin.getFontMetrics();
        float box = a.descent - a.ascent;
        if (!anyFallback) return box;
        Paint.FontMetrics b = cjk.getFontMetrics();
        return Math.max(box, b.descent - b.ascent);
    }

    private static boolean needsFallback(Paint latin, String text) {
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            if (!glyphCovered(latin, cp)) return true;
            i += Character.charCount(cp);
        }
        return false;
    }

    private static float measureRuns(Paint latin, Paint cjk, String text) {
        float width = 0f;
        int i = 0;
        while (i < text.length()) {
            int cp = text.codePointAt(i);
            boolean fallback = !glyphCovered(latin, cp);
            int j = i + Character.charCount(cp);
            while (j < text.length()) {
                int next = text.codePointAt(j);
                if ((!glyphCovered(latin, next)) != fallback) break;
                j += Character.charCount(next);
            }
            width += (fallback ? cjk : latin).measureText(text, i, j);
            i = j;
        }
        return width;
    }

    private static boolean glyphCovered(Paint paint, int cp) {
        if (Build.VERSION.SDK_INT >= 23) {
            return paint.hasGlyph(new String(Character.toChars(cp)));
        }
        return cp <= 0x024F || cp == 0x2212 || cp == 0x2022 || cp == 0x00B7;
    }

    private static Typeface cjkFallback() {
        if (Build.VERSION.SDK_INT >= 28) return Typeface.create(Typeface.SANS_SERIF, 500, false);
        return Typeface.SANS_SERIF;
    }

    private static int withAlpha(int color, int alpha) {
        return (Math.max(0, Math.min(255, alpha)) << 24) | (color & 0x00FFFFFF);
    }
}
