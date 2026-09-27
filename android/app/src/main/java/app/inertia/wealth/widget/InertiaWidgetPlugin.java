package app.inertia.wealth.widget;

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
}
