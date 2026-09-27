package app.inertia.wealth.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;

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

    private static int withAlpha(int color, int alpha) {
        return (Math.max(0, Math.min(255, alpha)) << 24) | (color & 0x00FFFFFF);
    }
}
