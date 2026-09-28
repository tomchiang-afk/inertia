package app.inertia.wealth.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;
import app.inertia.wealth.MainActivity;
import app.inertia.wealth.R;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Snapshot JSON → RemoteViews. Renders strings exactly as precomputed by the
 * web app (privacy already applied); only extrapolates a visible net worth by
 * quiet growth and refreshes calendar-based month progress.
 */
public final class WidgetRenderer {

    private static final int[] BUCKET_ROW = {R.id.bucket_row_1, R.id.bucket_row_2, R.id.bucket_row_3, R.id.bucket_row_4};
    private static final int[] BUCKET_LABEL = {R.id.bucket_label_1, R.id.bucket_label_2, R.id.bucket_label_3, R.id.bucket_label_4};
    private static final int[] BUCKET_VALUE = {R.id.bucket_value_1, R.id.bucket_value_2, R.id.bucket_value_3, R.id.bucket_value_4};

    private static final int PAD_H_DP = 28; // 14dp left + right
    private static final int COL_GAP_DP = 21; // divider + margins

    private WidgetRenderer() {}

    public static RemoteViews render(Context ctx, JSONObject snap, int wDp, int hDp, boolean medium, long now) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), medium ? R.layout.widget_medium : R.layout.widget_small);
        String style = WidgetTheme.normalizeStyle(
                snap != null ? snap.optString("style", "") : "rhythm",
                snap != null ? snap.optString("template", "") : "");
        WidgetTheme th = WidgetTheme.forStyle(style);
        float density = ctx.getResources().getDisplayMetrics().density;

        applyTheme(v, th, medium);
        v.setViewVisibility(R.id.brand, View.GONE);
        v.setViewVisibility(R.id.updated, View.GONE);
        v.setViewVisibility(R.id.accent_rule, View.GONE);
        v.setOnClickPendingIntent(android.R.id.background, openAppIntent(ctx));

        if (snap == null) {
            renderPlaceholder(v, medium);
            v.setContentDescription(android.R.id.background, "Inertia. " + ctx.getString(R.string.widget_placeholder));
            return v;
        }

        v.setViewVisibility(R.id.placeholder, View.GONE);
        v.setTextViewText(R.id.brand, snap.optString("brand", "Inertia"));
        if ("editorial".equals(style) || "sediment".equals(style)) {
            v.setViewVisibility(R.id.grain_img, View.VISIBLE);
            v.setImageViewBitmap(R.id.grain_img, WidgetBitmaps.grain(px(Math.max(wDp, 40), density), px(Math.max(hDp, 40), density), (int) (now / 86_400_000L)));
        } else {
            v.setViewVisibility(R.id.grain_img, View.GONE);
        }

        String mode = snap.optString("mode", "exact");
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        StringBuilder a11y = new StringBuilder("Inertia");

        // Net worth and month pace. The large figure is a bitmap (Inter, or
        // Newsreader on editorial) because RemoteViews cannot load a bundled face.
        JSONObject nw = snap.optJSONObject("netWorth");
        JSONObject rhythm = snap.optJSONObject("rhythm");
        JSONObject pace = snap.optJSONObject("pace");
        int contentWDp = Math.max(wDp - PAD_H_DP, 40);
        boolean nwShow = nw != null && nw.optBoolean("show", false);
        String nwText = "";
        if (nwShow) nwText = netWorthText(nw, snap.optJSONObject("live"), medium, now, cal);
        boolean paceShow = pace != null && pace.optBoolean("show", false) && !pace.optString("text", "").isEmpty();
        String paceText = paceShow ? pace.optString("text", "") : "";
        // Rhythm style: month pace is the hero, net worth stays on the secondary line.
        boolean rhythmHero = "rhythm".equals(style) && paceShow && nwShow && !nwText.isEmpty();

        if (nwShow && !nwText.isEmpty()) {
            v.setViewVisibility(R.id.nw_label, View.VISIBLE);
            v.setTextViewText(R.id.nw_label, nw.optString("label", ""));
            a11y.append(". ").append(nw.optString("label", "")).append(" ").append(nwText);
        } else if ("rhythm".equals(mode) && rhythm != null && rhythm.optBoolean("show", false)) {
            v.setViewVisibility(R.id.nw_label, View.VISIBLE);
            v.setTextViewText(R.id.nw_label, rhythm.optString("label", ""));
            v.setViewVisibility(R.id.nw_value, View.GONE);
            v.setViewVisibility(R.id.hero_img, View.GONE);
        } else {
            v.setViewVisibility(R.id.nw_label, View.GONE);
            v.setViewVisibility(R.id.nw_value, View.GONE);
            v.setViewVisibility(R.id.hero_img, View.GONE);
        }

        if (paceShow) {
            v.setViewVisibility(R.id.pace_row, View.VISIBLE);
            v.setTextViewText(R.id.pace_label, pace.optString("label", ""));
            v.setTextViewText(R.id.pace_value, paceText);
            v.setTextColor(R.id.pace_value, th.accent);
            a11y.append(". ").append(pace.optString("label", "")).append(" ").append(paceText);
            if (rhythmHero) {
                v.setTextViewText(R.id.nw_label, pace.optString("label", ""));
                v.setTextViewText(R.id.pace_label, nw.optString("label", ""));
                v.setTextViewText(R.id.pace_value, nwText);
                v.setTextColor(R.id.pace_value, th.ink);
            }
        } else {
            v.setViewVisibility(R.id.pace_row, View.GONE);
        }

        String figure = "";
        int figureColor = th.ink;
        boolean editorialFace = false;
        if (rhythmHero) {
            figure = paceText;
            figureColor = th.accent;
        } else if (nwShow && !nwText.isEmpty()) {
            figure = nwText;
            figureColor = "rhythm".equals(style) ? th.accent : th.ink;
            editorialFace = "editorial".equals(style);
        }
        if (!figure.isEmpty()) {
            int heroHDp = medium ? 40 : 46;
            int heroWDp = medium
                    ? Math.max(96, Math.round((Math.max(wDp, 220) - 36) * 0.50f))
                    : contentWDp;
            float textSp = editorialFace ? (medium ? 22f : 26f) : (medium ? 20f : 24f);
            float scaled = ctx.getResources().getDisplayMetrics().scaledDensity;
            showFigure(ctx, v, figure, px(heroWDp, density), px(heroHDp, density),
                    figureColor, editorialFace, textSp * scaled);
        }

        // Month beat, anchored under the numbers.
        if (rhythm != null && rhythm.optBoolean("show", false)) {
            int day = cal.get(Calendar.DAY_OF_MONTH);
            int dim = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
            float frac = (cal.get(Calendar.HOUR_OF_DAY) * 60f + cal.get(Calendar.MINUTE)) / (24f * 60f);
            String beat = rhythm.optString("style", "month-dots");
            int cols;
            int rows;
            if ("month-dots".equals(beat) && !medium) {
                cols = 10;
                rows = 3;
            } else if ("month-dots".equals(beat)) {
                cols = dim;
                rows = 1;
            } else {
                cols = dim;
                rows = 4;
            }
            int rhythmHDp = rows == 1 ? 22 : (rows == 3 ? 56 : (medium ? 36 : 44));
            v.setViewVisibility(R.id.rhythm_img, View.VISIBLE);
            v.setImageViewBitmap(R.id.rhythm_img, WidgetBitmaps.monthMatrix(
                    px(contentWDp, density), px(rhythmHDp, density), cols, rows, day, dim, frac,
                    th.accent, th.track, "grain-4".equals(beat)));
        } else {
            v.setViewVisibility(R.id.rhythm_img, View.GONE);
        }

        // Buckets (medium only).
        boolean hasBuckets = false;
        if (medium) {
            JSONArray buckets = snap.optJSONArray("buckets");
            int n = buckets != null ? Math.min(buckets.length(), 4) : 0;
            for (int i = 0; i < 4; i++) {
                JSONObject b = i < n ? buckets.optJSONObject(i) : null;
                if (b == null) {
                    v.setViewVisibility(BUCKET_ROW[i], View.GONE);
                    continue;
                }
                v.setViewVisibility(BUCKET_ROW[i], View.VISIBLE);
                v.setTextViewText(BUCKET_LABEL[i], b.optString("label", ""));
                v.setTextViewText(BUCKET_VALUE[i], b.optString("text", ""));
                hasBuckets = true;
            }
            boolean showBuckets = "sediment".equals(style) && hasBuckets;
            v.setViewVisibility(R.id.buckets, showBuckets ? View.VISIBLE : View.GONE);
            v.setViewVisibility(R.id.divider, View.GONE);
            v.setViewVisibility(R.id.trend_img, showBuckets ? View.GONE : View.VISIBLE);
            if (!showBuckets) {
                int trendW = Math.max(40, Math.round(contentWDp * 0.42f));
                v.setImageViewBitmap(R.id.trend_img, WidgetBitmaps.trend(
                        px(trendW, density), px(Math.max(hDp - 80, 48), density), th.accent, goalReach(snap)));
            }
            v.setViewVisibility(R.id.columns, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.body, View.VISIBLE);
        }

        // Goal strip (hidden when the widget is too short to fit it).
        JSONObject goal = snap.optJSONObject("goal");
        boolean roomForGoal = hDp <= 0 || hDp >= (medium ? 128 : 132);
        if (goal != null && goal.optBoolean("show", false) && roomForGoal) {
            String name = goal.optString("name", "");
            String text = goal.optString("text", "");
            v.setViewVisibility(R.id.goal_row, View.VISIBLE);
            v.setTextViewText(R.id.goal_text, text.isEmpty() ? name : name + " · " + text);
            double pct = goal.isNull("barPct") ? -1 : goal.optDouble("barPct", -1);
            int goalWDp = medium && hasBuckets
                    ? Math.round((contentWDp - COL_GAP_DP) * 1.15f / 2.15f)
                    : contentWDp;
            v.setImageViewBitmap(R.id.goal_bar, WidgetBitmaps.goalBar(px(goalWDp, density), px(3, density), pct, th));
            a11y.append(". ").append(name).append(text.isEmpty() ? "" : " " + text);
        } else {
            v.setViewVisibility(R.id.goal_row, View.GONE);
        }

        v.setContentDescription(android.R.id.background, a11y.toString());
        return v;
    }

    /** 1 = the pace line itself. A shown goal walks that far along the path; a hidden ratio is the track only. */
    private static float goalReach(JSONObject snap) {
        JSONObject goal = snap != null ? snap.optJSONObject("goal") : null;
        if (goal == null || !goal.optBoolean("show", false)) return 1f;
        if (goal.isNull("barPct")) return 0f;
        double pct = goal.optDouble("barPct", 0) / 100.0;
        if (pct < 0) return 0f;
        if (pct > 1) return 1f;
        return (float) pct;
    }

    private static String netWorthText(JSONObject nw, JSONObject live, boolean medium, long now, Calendar cal) {
        String tpl = nw.optString("monthProgressTemplate", "");
        if (!nw.isNull("monthProgressTemplate") && !tpl.isEmpty()) {
            return tpl.replace("{pct}", Integer.toString(WidgetFormat.monthProgressPct(cal)));
        }
        // Full string wherever it can shrink to fit (autoSizeTextType, API 26+); compact otherwise.
        boolean full = medium || Build.VERSION.SDK_INT >= 26;
        String fallback = full ? nw.optString("text", "") : nw.optString("short", nw.optString("text", ""));
        if (live == null) return fallback;
        double base = live.optDouble("base", Double.NaN);
        double perDay = live.optDouble("perDay", 0);
        long at = live.optLong("at", 0);
        if (Double.isNaN(base) || at <= 0) return fallback;
        double value = WidgetFormat.extrapolate(base, perDay, at, now);
        String format = live.optString("format", "");
        String prefix = live.optString("prefix", WidgetFormat.DEFAULT_PREFIX);
        if ("exact".equals(format)) return full ? WidgetFormat.exact(value, prefix) : WidgetFormat.compact(value, prefix);
        if ("wan".equals(format)) return WidgetFormat.wan(value, live.optString("unit", "萬"), prefix);
        if ("round".equals(format)) return WidgetFormat.round(value, prefix);
        return fallback;
    }

    private static void showFigure(Context ctx, RemoteViews v, String text, int wPx, int hPx,
                                   int color, boolean editorial, float maxTextPx) {
        Typeface face = editorial ? WidgetFonts.newsreader(ctx) : WidgetFonts.inter(ctx);
        float tracking = editorial ? -0.02f : -0.03f;
        try {
            v.setImageViewBitmap(R.id.hero_img, WidgetBitmaps.heroText(text, wPx, hPx, color, face, tracking, maxTextPx));
            v.setViewVisibility(R.id.hero_img, View.VISIBLE);
            v.setViewVisibility(R.id.nw_value, View.GONE);
            return;
        } catch (RuntimeException ignored) {
            // Bitmap budget or a broken face: the system text view is still readable.
        }
        v.setViewVisibility(R.id.hero_img, View.GONE);
        v.setViewVisibility(R.id.nw_value, View.VISIBLE);
        v.setTextViewText(R.id.nw_value, text);
        v.setTextColor(R.id.nw_value, color);
    }

    private static void renderPlaceholder(RemoteViews v, boolean medium) {
        v.setTextViewText(R.id.brand, "Inertia");
        v.setTextViewText(R.id.updated, "");
        v.setViewVisibility(R.id.placeholder, View.VISIBLE);
        v.setViewVisibility(R.id.rhythm_img, View.GONE);
        v.setViewVisibility(R.id.grain_img, View.GONE);
        v.setViewVisibility(R.id.hero_img, View.GONE);
        if (medium) {
            v.setViewVisibility(R.id.columns, View.GONE);
        } else {
            v.setViewVisibility(R.id.body, View.GONE);
            v.setViewVisibility(R.id.goal_row, View.GONE);
        }
    }

    private static void applyTheme(RemoteViews v, WidgetTheme th, boolean medium) {
        v.setInt(android.R.id.background, "setBackgroundResource", th.background);
        v.setViewVisibility(R.id.accent_rule, th.accentRule ? View.VISIBLE : View.GONE);
        v.setInt(R.id.accent_rule, "setBackgroundColor", th.accent);
        v.setTextColor(R.id.brand, th.ink);
        v.setTextColor(R.id.updated, th.faint);
        v.setTextColor(R.id.placeholder, th.muted);
        v.setTextColor(R.id.nw_label, th.muted);
        v.setTextColor(R.id.nw_value, th.ink);
        v.setTextColor(R.id.pace_label, th.muted);
        v.setTextColor(R.id.pace_value, th.accent);
        v.setTextColor(R.id.goal_text, th.muted);
        if (medium) {
            v.setInt(R.id.divider, "setBackgroundColor", th.track);
            for (int i = 0; i < 4; i++) {
                v.setTextColor(BUCKET_LABEL[i], th.muted);
                v.setTextColor(BUCKET_VALUE[i], th.ink);
            }
        }
    }

    private static PendingIntent openAppIntent(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, 0, intent, flags);
    }

    static String formatTime(long at, long now) {
        Calendar a = Calendar.getInstance();
        a.setTimeInMillis(at);
        Calendar n = Calendar.getInstance();
        n.setTimeInMillis(now);
        boolean sameDay = a.get(Calendar.YEAR) == n.get(Calendar.YEAR)
                && a.get(Calendar.DAY_OF_YEAR) == n.get(Calendar.DAY_OF_YEAR);
        String pattern = sameDay ? "HH:mm" : "M/d HH:mm";
        return new SimpleDateFormat(pattern, Locale.US).format(new Date(at));
    }

    private static int px(int dp, float density) {
        return Math.max(1, Math.round(dp * density));
    }
}
