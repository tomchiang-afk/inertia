package app.inertia.wealth.widget;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

/** SharedPreferences-backed storage for the latest widget snapshot JSON. */
public final class WidgetStore {

    private static final String PREFS = "inertia_widget";
    private static final String KEY_SNAPSHOT = "snapshot";

    private WidgetStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void save(Context ctx, String json) {
        prefs(ctx).edit().putString(KEY_SNAPSHOT, json).apply();
    }

    public static void clear(Context ctx) {
        prefs(ctx).edit().remove(KEY_SNAPSHOT).apply();
    }

    /** @return parsed snapshot or null when none / unreadable. */
    public static JSONObject load(Context ctx) {
        String raw = prefs(ctx).getString(KEY_SNAPSHOT, null);
        if (raw == null || raw.isEmpty()) return null;
        try {
            return new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }
}
