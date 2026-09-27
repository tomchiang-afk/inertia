package app.inertia.wealth.widget;

import java.util.Calendar;
import java.util.Locale;

/**
 * Tiny display helpers mirroring src/math.js fmtNT and
 * src/widgetPrivacy.js formatRoundedWan, used only to extrapolate an already
 * visible net-worth value by quiet growth since the snapshot was taken.
 */
public final class WidgetFormat {

    /** Extrapolation is capped so a long-unopened app does not drift far. */
    static final double MAX_EXTRAPOLATE_DAYS = 45.0;
    private static final String MINUS = "\u2212";

    private WidgetFormat() {}

    public static double extrapolate(double base, double perDay, long at, long now) {
        double days = Math.max(0, now - at) / 86_400_000.0;
        if (days > MAX_EXTRAPOLATE_DAYS) days = MAX_EXTRAPOLATE_DAYS;
        return base + perDay * days;
    }

    public static String exact(double n) {
        long abs = Math.round(Math.abs(n));
        return (n < 0 ? MINUS : "") + "NT$" + String.format(Locale.US, "%,d", abs);
    }

    public static String compact(double n) {
        double abs = Math.abs(n);
        String sign = n < 0 ? MINUS : "";
        if (abs >= 1_000_000) {
            double m = abs / 1_000_000;
            String s = m >= 10 ? Long.toString(Math.round(m)) : trim1(Math.round(m * 10) / 10.0);
            return sign + "NT$" + s + "M";
        }
        if (abs >= 10_000) {
            double k = abs / 1_000;
            String s = k >= 100 ? Long.toString(Math.round(k)) : trim1(Math.round(k * 10) / 10.0);
            return sign + "NT$" + s + "k";
        }
        return sign + "NT$" + String.format(Locale.US, "%,d", Math.round(abs));
    }

    public static String wan(double n, String unit) {
        long wan = Math.round(Math.round(Math.abs(n)) / 10_000.0);
        return (n < 0 ? MINUS : "") + "NT$" + String.format(Locale.US, "%,d", wan) + " " + unit;
    }

    private static String trim1(double v) {
        String s = String.format(Locale.US, "%.1f", v);
        return s.endsWith(".0") ? s.substring(0, s.length() - 2) : s;
    }

    /** Same as widgetPrivacy.monthProgressPct: round(day / daysInMonth * 100). */
    public static int monthProgressPct(Calendar c) {
        int day = c.get(Calendar.DAY_OF_MONTH);
        int dim = Math.max(1, c.getActualMaximum(Calendar.DAY_OF_MONTH));
        return Math.round(day * 100f / dim);
    }
}
