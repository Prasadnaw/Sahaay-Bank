package com.sahaay.bank;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;

/**
 * JavaScript Interface Bridge connecting WebView with Native Android APIs.
 * Injected as window.AndroidBridge in web context.
 */
public class WebAppInterface {
    private final MainActivity activity;
    private final SharedPreferences prefs;

    public WebAppInterface(MainActivity activity) {
        this.activity = activity;
        this.prefs = activity.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public boolean isAndroidApp() {
        return true;
    }

    @JavascriptInterface
    public String getServerUrl() {
        return prefs.getString(MainActivity.KEY_SERVER_URL, MainActivity.DEFAULT_SERVER_URL);
    }

    @JavascriptInterface
    public void setServerUrl(String url) {
        if (url != null && !url.trim().isEmpty()) {
            prefs.edit().putString(MainActivity.KEY_SERVER_URL, url.trim()).apply();
            activity.runOnUiThread(() -> {
                Toast.makeText(activity, "Server updated to: " + url, Toast.LENGTH_SHORT).show();
                activity.reloadApp();
            });
        }
    }

    @JavascriptInterface
    public void showToast(String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_SHORT).show());
    }

    @JavascriptInterface
    public void vibrate(long milliseconds) {
        Vibrator v = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null && v.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                v.vibrate(milliseconds);
            }
        }
    }

    @JavascriptInterface
    public boolean saveQrToGallery(String base64Data, String filename) {
        try {
            String cleanBase64 = base64Data;
            if (cleanBase64.contains(",")) {
                cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
            }
            byte[] decoded = Base64.decode(cleanBase64, Base64.DEFAULT);

            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) downloadsDir.mkdirs();

            String name = (filename != null && !filename.trim().isEmpty()) ? filename : "Sahaay_QR_" + System.currentTimeMillis() + ".png";
            File outputFile = new File(downloadsDir, name);

            FileOutputStream fos = new FileOutputStream(outputFile);
            fos.write(decoded);
            fos.flush();
            fos.close();

            // Notify Android Media Scanner
            Intent scanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
            scanIntent.setData(Uri.fromFile(outputFile));
            activity.sendBroadcast(scanIntent);

            activity.runOnUiThread(() -> Toast.makeText(activity, "✓ QR saved to Downloads: " + outputFile.getName(), Toast.LENGTH_LONG).show());
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            activity.runOnUiThread(() -> Toast.makeText(activity, "Error saving QR: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            return false;
        }
    }

    @JavascriptInterface
    public void openServerSettings() {
        activity.runOnUiThread(activity::showServerConfigDialog);
    }
}
