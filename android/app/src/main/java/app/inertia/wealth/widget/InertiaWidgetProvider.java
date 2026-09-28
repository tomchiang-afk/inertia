package app.inertia.wealth.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;

/**
 * Inertia home-screen widget, 2x2 default (resizable). The 4x2 variant
 * ({@link InertiaWidgetMediumProvider}) shares everything but its default size.
 * Always ad-free.
 */
public class InertiaWidgetProvider extends AppWidgetProvider {

    /** Width (dp) at which the medium layout (with bucket column) is used. */
    static final int MEDIUM_MIN_WIDTH_DP = 220;

    /** Fallback size when the launcher reports no options. */
    protected int[] defaultSizeDp() {
        return new int[] {176, 222};
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        JSONObject snap = WidgetStore.load(context);
        for (int id : ids) {
            mgr.updateAppWidget(id, buildViews(context, mgr, id, snap, defaultSizeDp()));
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager mgr, int id, Bundle newOptions) {
        JSONObject snap = WidgetStore.load(context);
        mgr.updateAppWidget(id, buildViews(context, mgr, id, snap, defaultSizeDp()));
    }

    /** Redraw every placed Inertia widget (both sizes). @return widget count */
    public static int refreshAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        JSONObject snap = WidgetStore.load(context);
        int count = 0;
        count += refresh(context, mgr, snap, InertiaWidgetProvider.class, new int[] {176, 222});
        count += refresh(context, mgr, snap, InertiaWidgetMediumProvider.class, new int[] {368, 222});
        return count;
    }

    private static int refresh(Context ctx, AppWidgetManager mgr, JSONObject snap, Class<?> cls, int[] def) {
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, cls));
        if (ids == null) return 0;
        for (int id : ids) {
            mgr.updateAppWidget(id, buildViews(ctx, mgr, id, snap, def));
        }
        return ids.length;
    }

    @SuppressWarnings("deprecation")
    private static ArrayList<SizeF> sizesOf(Bundle opts) {
        if (Build.VERSION.SDK_INT >= 33) {
            return opts.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES, SizeF.class);
        }
        return opts.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
    }

    static RemoteViews buildViews(Context ctx, AppWidgetManager mgr, int id, JSONObject snap, int[] def) {
        Bundle opts = mgr.getAppWidgetOptions(id);
        long now = System.currentTimeMillis();

        // Android 12+: exact sizes → responsive RemoteViews map.
        if (Build.VERSION.SDK_INT >= 31 && opts != null) {
            ArrayList<SizeF> sizes = sizesOf(opts);
            if (sizes != null && !sizes.isEmpty()) {
                Map<SizeF, RemoteViews> map = new HashMap<>();
                for (SizeF s : sizes) {
                    if (map.size() >= 16) break;
                    int w = Math.round(s.getWidth());
                    int h = Math.round(s.getHeight());
                    map.put(s, WidgetRenderer.render(ctx, snap, w, h, w >= MEDIUM_MIN_WIDTH_DP, now));
                }
                return new RemoteViews(map);
            }
        }

        // Pre-12: portrait uses min width / max height.
        int w = opts != null ? opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) : 0;
        int h = opts != null ? opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) : 0;
        if (w <= 0) w = def[0];
        if (h <= 0) h = def[1];
        return WidgetRenderer.render(ctx, snap, w, h, w >= MEDIUM_MIN_WIDTH_DP, now);
    }
}
