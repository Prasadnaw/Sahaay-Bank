package com.sahaay.bank;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * Main Native Shell for Sahaay Bank on Android.
 * Integrates hardware camera permissions, file uploads for QR decoding, and Render cross-connection.
 */
public class MainActivity extends AppCompatActivity {

    public static final String PREFS_NAME = "SahaayBankPrefs";
    public static final String KEY_SERVER_URL = "server_url";
    public static final String DEFAULT_SERVER_URL = "https://sahaay-bank.onrender.com";

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefresh;
    private WebAppInterface webAppInterface;

    private ValueCallback<Uri[]> fileUploadCallback;
    private PermissionRequest pendingWebPermission;

    private final ActivityResultLauncher<String[]> requestPermissionsLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean cameraGranted = Boolean.TRUE.equals(result.get(Manifest.permission.CAMERA));
                boolean audioGranted = Boolean.TRUE.equals(result.get(Manifest.permission.RECORD_AUDIO));

                if (pendingWebPermission != null) {
                    if (cameraGranted || audioGranted) {
                        pendingWebPermission.grant(pendingWebPermission.getResources());
                    } else {
                        pendingWebPermission.deny();
                    }
                    pendingWebPermission = null;
                }
            });

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileUploadCallback != null) {
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        if (result.getData().getClipData() != null) {
                            int count = result.getData().getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = result.getData().getClipData().getItemAt(i).getUri();
                            }
                        } else if (result.getData().getData() != null) {
                            results = new Uri[]{result.getData().getData()};
                        }
                    }
                    fileUploadCallback.onReceiveValue(results);
                    fileUploadCallback = null;
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.mainWebView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefresh = findViewById(R.id.swipeRefreshLayout);
        ImageButton btnSettings = findViewById(R.id.btnServerSettings);

        btnSettings.setOnClickListener(v -> showServerConfigDialog());

        setupWebView();
        setupBackPressed();

        swipeRefresh.setColorSchemeResources(R.color.gold_accent, R.color.navy_primary);
        swipeRefresh.setOnRefreshListener(() -> {
            webView.reload();
            swipeRefresh.setRefreshing(false);
        });

        // Request initial hardware permissions
        requestDevicePermissions();

        // Load local bundle or Render URL
        loadApp();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Native Bridge
        webAppInterface = new WebAppInterface(this);
        webView.addJavascriptInterface(webAppInterface, "AndroidBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            // HTML5 Camera / Microphone permission request (for QR scan & Face auth)
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                pendingWebPermission = request;
                requestDevicePermissions();
            }

            // File chooser for uploading saved QR code images
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "Cannot open file picker: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Handle external links or UPI payment intents
                if (url.startsWith("upi:") || url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "No app available to handle this request", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                swipeRefresh.setRefreshing(false);
                // Inject current backend configuration to ensure cross-platform synchronization
                String serverUrl = webAppInterface.getServerUrl();
                String js = "if (window.SahaayConfig) { " +
                        "window.SahaayConfig.apiBaseUrl = '" + serverUrl + "/api'; " +
                        "console.log('[Android Bridge] Active API base:', window.SahaayConfig.apiBaseUrl); " +
                        "}";
                webView.evaluateJavascript(js, null);
            }
        });
    }

    private void requestDevicePermissions() {
        String[] permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO
        };
        requestPermissionsLauncher.launch(permissions);
    }

    private void setupBackPressed() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }

    public void loadApp() {
        // Load bundled offline-capable web application from assets
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    public void reloadApp() {
        loadApp();
    }

    public void showServerConfigDialog() {
        ServerConfigDialog.show(this);
    }
}
