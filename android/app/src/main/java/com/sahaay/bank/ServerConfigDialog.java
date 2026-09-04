package com.sahaay.bank;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;

import com.google.android.material.textfield.TextInputEditText;

/**
 * Dialog allowing user to switch backend between Render Cloud and Local Development.
 */
public class ServerConfigDialog {

    public static void show(MainActivity activity) {
        SharedPreferences prefs = activity.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE);
        String currentUrl = prefs.getString(MainActivity.KEY_SERVER_URL, MainActivity.DEFAULT_SERVER_URL);

        View view = LayoutInflater.from(activity).inflate(R.layout.dialog_server_config, null);
        TextInputEditText editUrl = view.findViewById(R.id.editServerUrl);
        Button btnRender = view.findViewById(R.id.btnPresetRender);
        Button btnEmulator = view.findViewById(R.id.btnPresetEmulator);
        Button btnLocal = view.findViewById(R.id.btnPresetLocal);

        editUrl.setText(currentUrl);

        btnRender.setOnClickListener(v -> editUrl.setText("https://sahaay-bank.onrender.com"));
        btnEmulator.setOnClickListener(v -> editUrl.setText("http://10.0.2.2:5050"));
        btnLocal.setOnClickListener(v -> editUrl.setText("http://localhost:5050"));

        new AlertDialog.Builder(activity)
                .setView(view)
                .setPositiveButton(R.string.btn_save_reload, (dialog, which) -> {
                    String newUrl = editUrl.getText() != null ? editUrl.getText().toString().trim() : "";
                    if (!newUrl.isEmpty()) {
                        // Strip trailing slash
                        if (newUrl.endsWith("/")) newUrl = newUrl.substring(0, newUrl.length() - 1);
                        prefs.edit().putString(MainActivity.KEY_SERVER_URL, newUrl).apply();
                        Toast.makeText(activity, "Server connected: " + newUrl, Toast.LENGTH_SHORT).show();
                        activity.reloadApp();
                    }
                })
                .setNegativeButton(R.string.btn_cancel, null)
                .show();
    }
}
