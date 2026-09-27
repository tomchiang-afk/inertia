package app.inertia.wealth.widget;

import java.util.Calendar;
import java.util.Locale;

/**
 * Tiny display helpers mirroring src/format.js (fmtMoney / fmtCompact / fmtRounded), used only
 * to extrapolate an already visible net-worth value by quiet growth since the snapshot was taken.
 * The currency prefix (e.g. "NT$", "US$", "JP¥") comes from the snapshot; "NT$" when absent
 * (v1 snapshots).
 */
public final class WidgetFormat {

    /** Extrapolation is capped so a long-unopened app does not drift far. */
    static final double MAX_EXTRAPOLATE_DAYS = 45.0;
    private static final String MINUS = "\u2212";
    static final String DEFAULT_PREFIX = "NT$";

    private WidgetFormat() {}

    public static double extrapolate(double base, double perDay, long at, long now) {
        double days = Math.max(0, now - at) / 86_400_000.0;
        if (days > MAX_EXTRAPOLATE_DAYS) days = MAX_EXTRAPOLATE_DAYS;
        return base + perDay * days;
    }

    public static String exact(double n) {
        return exact(n, DEFAULT_PREFIX);
    }

    public static String exact(double n, String prefix) {
        long abs = Math.round(Math.abs(n));
        return (n < 0 && abs != 0 ? MINUS : "") + prefix + String.format(Locale.US, "%,d", abs);
    }

    public static String compact(double n) {
        return compact(n, DEFAULT_PREFIX);
    }

    /** fmtCompact: B ≥ 1e9, M ≥ 1e6, k ≥ 1e4, else grouped. */
    public static String compact(double n, String prefix) {
        double abs = Math.abs(n);
        String sign = n < 0 ? MINUS : "";
        if (abs >= 1_000_000_000) {
            double b = abs / 1_000_000_000;
            return sign + prefix + (b >= 10 ? Long.toString(Math.round(b)) : trim1(b)) + "B";
        }
        if (abs >= 1_000_000) {
            double m = abs / 1_000_000;
            String s = m >= 10 ? Long.toString(Math.round(m)) : trim1(m);
            return sign + prefix + s + "M";
        }
        if (abs >= 10_000) {
            double k = abs / 1_000;
            String s = k >= 100 ? Long.toString(Math.round(k)) : trim1(k);
            return sign + prefix + s + "k";
        }
        return sign + prefix + String.format(Locale.US, "%,d", Math.round(abs));
    }

    public static String wan(double n, String unit) {
        return wan(n, unit, DEFAULT_PREFIX);
    }

    /** fmtRounded for TWD: 萬. */
    public static String wan(double n, String unit, String prefix) {
        long wan = Math.round(Math.round(Math.abs(n)) / 10_000.0);
        return (n < 0 ? MINUS : "") + prefix + String.format(Locale.US, "%,d", wan) + " " + unit;
    }

    /** fmtRounded for non-TWD bases: B / M (1 decimal below 100), k (integer), else nearest 10. */
    public static String round(double n, String prefix) {
        long abs = Math.round(Math.abs(n));
        String body;
        if (abs >= 1_000_000_000L) {
            double b = abs / 1_000_000_000.0;
            body = (b >= 100 ? Long.toString(Math.round(b)) : trim1(b)) + "B";
        } else if (abs >= 1_000_000L) {
            double m = abs / 1_000_000.0;
            body = (m >= 100 ? Long.toString(Math.round(m)) : trim1(m)) + "M";
        } else if (abs >= 1_000L) {
            body = Math.round(abs / 1_000.0) + "k";
        } else {
            body = Long.toString(Math.round(abs / 10.0) * 10);
        }
        return (n < 0 ? MINUS : "") + prefix + body;
    }

    private static String trim1(double v) {
        String s = String.format(Locale.US, "%.1f", Math.round(v * 10) / 10.0);
        return s.endsWith(".0") ? s.substring(0, s.length() - 2) : s;
    }

    /** Same as widgetPrivacy.monthProgressPct: round(day / daysInMonth * 100). */
    public static int monthProgressPct(Calendar c) {
        int day = c.get(Calendar.DAY_OF_MONTH);
        int dim = Math.max(1, c.getActualMaximum(Calendar.DAY_OF_MONTH));
        return Math.round(day * 100f / dim);
    }
}
