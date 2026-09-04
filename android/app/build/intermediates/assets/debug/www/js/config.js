/**
 * Sahaay Bank Application Configuration
 * Cross-Platform Web & Mobile synchronization engine
 */
(function() {
  'use strict';

  function resolveApiBaseUrl() {
    // 1. Native Android App Bridge
    if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.getServerUrl === 'function') {
      try {
        const bridgeUrl = window.AndroidBridge.getServerUrl();
        if (bridgeUrl && bridgeUrl.trim()) {
          return bridgeUrl.trim().replace(/\/+$/, '') + '/api';
        }
      } catch (e) {}
    }

    // 2. Custom User-Configured Backend URL in LocalStorage
    try {
      const stored = localStorage.getItem('sahaay_backend_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '') + '/api';
      }
    } catch (e) {}

    // 3. Localhost Development Server (Port 5050)
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname;
      const port = window.location.port;
      if ((host === 'localhost' || host === '127.0.0.1') && port === '5050') {
        return 'http://localhost:5050/api';
      }
      // If served via HTTP / HTTPS on cloud (e.g. Render), use current domain
      if (window.location.protocol.startsWith('http')) {
        return window.location.origin.replace(/\/+$/, '') + '/api';
      }
    }

    // 4. Default Cloud Render Backend
    return 'https://sahaay-bank.onrender.com/api';
  }

  window.SahaayConfig = {
    apiBaseUrl: resolveApiBaseUrl(),
    accountNumber: '4417',
    accountHolder: 'Asha Patel',
    defaultUpiId: 'asha.patel@sahaay',
    defaultUpiPin: '1234',
    initialBalance: 39404.50,
    defaultLang: 'en-IN',
    sessionTimeoutMinutes: 5,
    soundFxEnabled: true,
    isAndroid: () => typeof window !== 'undefined' && !!(window.AndroidBridge && window.AndroidBridge.isAndroidApp && window.AndroidBridge.isAndroidApp()),
    setBackendUrl: (url) => {
      if (!url) return;
      const clean = url.trim().replace(/\/+$/, '');
      try { localStorage.setItem('sahaay_backend_url', clean); } catch(e){}
      if (window.AndroidBridge && window.AndroidBridge.setServerUrl) {
        window.AndroidBridge.setServerUrl(clean);
      }
      window.SahaayConfig.apiBaseUrl = clean + '/api';
    }
  };
})();
