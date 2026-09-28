package app.inertia.wealth;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Bundle;
import app.inertia.wealth.widget.InertiaWidgetMediumProvider;
import app.inertia.wealth.widget.InertiaWidgetPlugin;
import app.inertia.wealth.widget.InertiaWidgetProvider;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge is created.
        registerPlugin(InertiaWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        maybePinWidget(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        maybePinWidget(intent);
    }

    /**
     * Debug-only: {@code adb shell am start -n app.inertia.wealth/.MainActivity --es pin small|wide}
     * asks the launcher to place that widget. Release builds ignore the extra.
     */
    private void maybePinWidget(Intent intent) {
        if (intent == null) return;
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) return;
        String which = intent.getStringExtra("pin");
        if (which == null) return;
        if (Build.VERSION.SDK_INT < 26) return;
        AppWidgetManager mgr = AppWidgetManager.getInstance(this);
        if (!mgr.isRequestPinAppWidgetSupported()) return;
        Class<?> provider = "wide".equals(which) ? InertiaWidgetMediumProvider.class : InertiaWidgetProvider.class;
        Intent callback = new Intent(this, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent success = PendingIntent.getActivity(this, which.hashCode(), callback, flags);
        mgr.requestPinAppWidget(new ComponentName(this, provider), null, success);
    }
}
