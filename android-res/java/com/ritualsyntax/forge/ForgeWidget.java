package com.ritualsyntax.forge;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

// rings + kcal left on the home screen
public class ForgeWidget extends AppWidgetProvider {
    static final String PREFS = "forge_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) draw(ctx, mgr, id);
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, ForgeWidget.class));
        for (int id : ids) draw(ctx, mgr, id);
    }

    static void draw(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.forge_widget);
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", null);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.UK).format(new Date());
        JSONArray rings = null;
        String big = "—", label = "OPEN FORGE";
        boolean over = false;
        try {
            if (raw != null) {
                JSONObject d = new JSONObject(raw);
                rings = d.optJSONArray("rings");
                if (today.equals(d.optString("date"))) {
                    if (d.optBoolean("set")) {
                        big = d.optString("left", "—");
                        over = d.optBoolean("over");
                        label = over ? "KCAL OVER" : "KCAL LEFT";
                    }
                } else {
                    // new day, nothing logged yet - empty rings, full target
                    big = d.optString("fresh", "—");
                    label = "KCAL LEFT";
                    if (rings != null) for (int i = 0; i < rings.length(); i++) rings.getJSONObject(i).put("v", 0);
                }
            }
        } catch (Exception e) { rings = null; }
        v.setImageViewBitmap(R.id.rings, ringsBitmap(rings));
        v.setTextViewText(R.id.left, big);
        v.setTextColor(R.id.left, over ? Color.parseColor("#F2F2F2") : Color.parseColor("#FF1A1A"));
        v.setTextViewText(R.id.label, label);
        Intent open = new Intent(ctx, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.root, pi);
        mgr.updateAppWidget(id, v);
    }

    static Bitmap ringsBitmap(JSONArray rings) {
        int S = 360;
        Bitmap b = Bitmap.createBitmap(S, S, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        int n = rings == null ? 5 : rings.length();
        float sw = S * 0.065f, gap = S * 0.018f, r = S / 2f - sw / 2f - 6;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(sw);
        for (int i = 0; i < n; i++) {
            int col = Color.parseColor("#FF1A1A");
            double val = 0;
            try {
                JSONObject o = rings.getJSONObject(i);
                col = Color.parseColor(o.optString("c", "#FF1A1A"));
                val = Math.max(0, Math.min(1, o.optDouble("v", 0)));
            } catch (Exception e) { }
            RectF box = new RectF(S / 2f - r, S / 2f - r, S / 2f + r, S / 2f + r);
            p.setColor(col);
            p.setAlpha(36);
            c.drawArc(box, 0, 360, false, p);
            if (val > 0) {
                p.setAlpha(255);
                c.drawArc(box, -90, (float) (val * 360), false, p);
            }
            r -= sw + gap;
        }
        return b;
    }
}
