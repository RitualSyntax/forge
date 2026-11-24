package com.ritualsyntax.forge;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// js sends today's rings + kcal left, we stash it and redraw the widget
@CapacitorPlugin(name = "ForgeWidget")
public class WidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        ctx.getSharedPreferences(ForgeWidget.PREFS, Context.MODE_PRIVATE)
            .edit().putString("data", call.getData().toString()).apply();
        ForgeWidget.refreshAll(ctx);
        call.resolve();
    }
}
