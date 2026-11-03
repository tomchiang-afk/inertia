package app.inertia.wealth.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import app.inertia.wealth.MainActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Local Capacitor plugin: the web app pushes a precomputed, privacy-formatted
 * snapshot (see src/widgetSnapshot.js). Native stores it and redraws widgets.
 * No finance logic here.
 */
@CapacitorPlugin(name = "InertiaWidget")
public class InertiaWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        JSObject snapshot = call.getObject("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }
        WidgetStore.save(getContext(), snapshot.toString());
        int count = InertiaWidgetProvider.refreshAll(getContext());
        JSObject ret = new JSObject();
        ret.put("widgets", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        WidgetStore.clear(getContext());
        InertiaWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    /** Ask the launcher to place the 2x2 or 4x2 widget. */
    @PluginMethod
    public void requestPin(PluginCall call) {
        String size = call.getString("size", "small");
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT < 26) {
            ret.put("ok", false);
            ret.put("supported", false);
            call.resolve(ret);
            return;
        }
        AppWidgetManager mgr = AppWidgetManager.getInstance(getContext());
        if (!mgr.isRequestPinAppWidgetSupported()) {
            ret.put("ok", false);
            ret.put("supported", false);
            call.resolve(ret);
            return;
        }
        Class<?> provider = "wide".equals(size)
                ? InertiaWidgetMediumProvider.class
                : InertiaWidgetProvider.class;
        Intent callback = new Intent(getContext(), MainActivity.class);
        PendingIntent success = PendingIntent.getActivity(
                getContext(),
                size.hashCode(),
                callback,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean requested = mgr.requestPinAppWidget(new ComponentName(getContext(), provider), null, success);
        ret.put("ok", requested);
        ret.put("supported", true);
        call.resolve(ret);
    }

    /** Whether at least one Inertia widget is on the home screen. */
    @PluginMethod
    public void getStatus(PluginCall call) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(getContext());
        int small = mgr.getAppWidgetIds(new ComponentName(getContext(), InertiaWidgetProvider.class)).length;
        int wide = mgr.getAppWidgetIds(new ComponentName(getContext(), InertiaWidgetMediumProvider.class)).length;
        JSObject ret = new JSObject();
        ret.put("pinned", small + wide > 0);
        ret.put("small", small > 0);
        ret.put("wide", wide > 0);
        call.resolve(ret);
    }
}
