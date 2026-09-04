/**
 * Sahaay Bank Multilingual Internationalization (i18n) Engine
 */
window.SahaayI18n = (function(){
  'use strict';

  const translations = {
    'en-IN': {
      skipLink: 'Skip to main content',
      assistiveToolsLabel: 'Assistive Tools:',
      toolContrast: 'High contrast',
      toolPlain: 'Plain language',
      toolClickRead: 'Select to speech',
      toolExplore: 'Two-click safe mode',
      toolHover: 'Hover select',
      toolOsk: 'Virtual keyboard',
      toolTags: 'Highlight key info',
      toolVoiceAlerts: 'Voice alerts',
      toolMotion: 'Reduce motion',
      voiceMicBtn: 'Start Voice Action',
      voiceLiveHint: '💡 Say: "Raju ko paise bhejiye", "Mera QR dikhao", "Scan QR", "Help", or "Freeze account"',
      brandName: 'Sahaay Bank',
      brandTag: 'Universal Multilingual & Accessible Digital Banking',
      btnScanQrHeader: 'Scan QR',
      btnMyQrHeader: 'My QR',
      btnScanQr: 'Scan UPI QR',
      btnShowMyQr: 'My UPI QR',
      themeBtnText: 'Dark Theme',
      auditPassingBadge: 'Live a11y: 100% Passing',
      demoBadge: 'UPI & QR READY',
      loginHeading: 'Sign in to your account',
      loginPlainNote: 'Demo mode: You can enter any details or use the 1-click fill button below.',
      pwSolutionTitle: '♿ Accessible Password Support:',
      pwSolutionDesc: 'Pasting is strictly allowed. You can use password managers or assisted filling.',
      autoFillBtn: '1-Tap Fill Demo Credentials',
      tabPassword: 'Standard Password',
      tabOtp: 'One-Time Code (SMS)',
      lblUsername: 'Username or Customer ID',
      hintUsername: 'Screen-reader friendly input with auto-fill support.',
      lblPassword: 'Password',
      pwToggle: 'Show',
      hintPassword: 'Pasting is fully permitted. No arbitrary character limits.',
      lblCaptcha: 'Choose Verification Test (Adaptive CAPTCHA):',
      optCapCheck: '1. One-Tap Verification (Motor & Cognitive Friendly)',
      optCapAudio: '2. Audio Code (Low Vision / Screen Reader Friendly)',
      optCapMath: '3. Simple Math (Cognitive Friendly, No Jumbled Letters)',
      lblHumanConfirm: 'I confirm I am human (No puzzle required)',
      lblAudioPrompt: 'Listen to the spoken 4 digits and type them:',
      btnPlayAudioCap: '🔊 Play Spoken Numbers',
      lblAudioStatus: 'Click to listen',
      lblMathCap: 'What is 4 + 3?',
      btnSignIn: 'Sign in to Dashboard',
      lblPhone: 'Registered Mobile Number',
      btnSendOtp: 'Send Code via SMS',
      lblEnterOtp: 'Enter 6-Digit Code',
      btnSignInOtp: 'Sign in with Code',
      freezeActiveStatus: 'Your account is active',
      freezeSubText: 'One tap stops all card and transfer activity immediately. No complex forms.',
      btnFreezeNow: 'Freeze my account now',
      timeoutHeading: '⏳ Need more time?',
      timeoutDesc: 'Your session has been extended to ensure you have ample time to read and verify.',
      btnExtSession: 'Add 15 Minutes',
      btnDisableTimeout: 'Turn Off Timeouts',
      navOverview: 'Overview',
      navTransactions: 'Transactions',
      navTransfer: 'Send & UPI',
      navHelp: 'Help & Commands',
      navSettings: 'Settings',
      navSignOut: 'Sign Out',
      welcomeHeading: 'Welcome back, Asha',
      balanceHeading: 'Available Balance',
      btnHideBalance: 'Hide Balance',
      balanceSubText: 'As of today, Savings Account ending in 4417 • UPI ID: asha.patel@sahaay',
      btnQuickSend: 'Send Money Now',
      btnQuickStatement: 'View Statement',
      weeklyHeading: 'Weekly Activity Summary',
      weeklySummaryText: 'In the last 7 days: +₹15,000.00 was received and −₹6,240.00 was paid. All payments are verified.',
      transHeading: 'Recent Transactions',
      tableCaption: 'Table of past transactions. Amounts are marked with text and arrows.',
      thDate: 'Date',
      thPayee: 'Description / Payee',
      thType: 'Payment Type',
      thAmount: 'Amount',
      transferHeading: 'Send Money & UPI',
      upiPinCalloutTitle: '🔒 Protected with 4-Digit UPI PIN & QR Code:',
      upiPinCalloutDesc: 'All voice or manual payments require your secure UPI PIN before money is deducted. Default demo PIN is 1234.',
      lblSendTo: 'Send To (Name, Phone, or UPI ID)',
      lblAmount: 'Amount in Rupees (₹)',
      errAmount: 'Please enter an amount greater than ₹0.',
      lblNote: 'Payment Note (Optional)',
      lblReviewTimeout: 'Transaction Review Timeout:',
      optTimeout15: 'Extended (15 minutes)',
      optTimeout30: 'Extra Extended (30 minutes)',
      optTimeout0: 'No Timeout (Unlimited time)',
      btnReviewTransfer: 'Proceed to UPI PIN Verification',
      helpHeading: '❓ Help & Banking Guide',
      helpSub: 'Learn how to command the app with your voice, and understand everyday banking terms in plain, easy language.',
      cmdGuideHeading: '🎙️ Voice Commands Cheatsheet',
      cmdGuideDesc: 'You can speak in English, Hindi, Tamil, etc. The app understands natural speech:',
      cmdCardSendTitle: 'Send Money & Transfers',
      cmdCardSendDesc: 'Speaks the recipient and amount; the system will fill the form and ask for your UPI PIN:',
      cmdCardQrTitle: 'QR Codes & Payments',
      cmdCardQrDesc: 'Show your receiving QR or scan any merchant QR code:',
      cmdCardFreezeTitle: 'Emergency Security',
      cmdCardFreezeDesc: 'Instantly locks down your bank account if you suspect fraud:',
      cmdCardLangTitle: 'Change Language',
      cmdCardLangDesc: 'Change all screen text and voice instantly:',
      glossaryHeading: '📖 Simple Banking Glossary',
      glossaryDesc: 'Banking terms can be confusing. Here is what they actually mean in plain, everyday words:',
      termUpiPinTitle: 'UPI PIN (यूपीआई पिन)',
      termUpiPinDesc: 'A personal 4 or 6 digit secret password created by you. It is required every time money is transferred. Never share your UPI PIN with anyone.',
      termQrCodeTitle: 'QR Code (क्यूआर कोड)',
      termQrCodeDesc: 'A square barcode representing a bank account or shop. Scanning it fills the payment details automatically.',
      termBalTitle: 'Available Balance',
      termBalDesc: 'The actual money you can spend right now.',
      termFreezeTitle: 'Account Freeze',
      termFreezeDesc: 'An emergency digital padlock that blocks all transactions immediately.',
      btnListenExplain: 'Listen Explanation',
      settingsHeading: 'Settings & Preferences',
      themeHeader: 'Theme & Visual Appearance',
      themeSub: 'Choose your preferred visual presentation:',
      themeLight: 'Light Theme',
      themeLightSub: 'Clean & Clear',
      themeDark: 'Dark Theme',
      themeDarkSub: 'Modern Night Mode',
      themeContrast: 'High Contrast',
      themeContrastSub: 'WCAG AAA Yellow/Black',
      customizerHeader: 'Accessibility Toolbar Customizer',
      customizerSub: 'Customize which assistive tools appear in your top toolbar:',
      btnResetToolbar: 'Reset Toolbar to Default',
      secHeader: 'Security & Privacy Preferences',
      secBioTitle: 'Biometric Authentication',
      secBioDesc: 'Use Fingerprint or Face ID for signing in and transfers',
      secHideBalTitle: 'Hide Account Balance by Default',
      secHideBalDesc: 'Mask account balance on launch for privacy',
      sec2faTitle: 'Two-Factor Authentication (2FA) Method',
      sec2faDesc: 'Preferred verification channel for payments',
      secSoundTitle: 'Audio Tap Sound Effects',
      secSoundDesc: 'Play a subtle accessible chime when buttons are activated',
      btnChangePin: 'Change UPI PIN',
      vcModalTitle: 'Confirm Voice Action',
      vcRequestedPrefix: 'You requested:',
      btnVcYes: 'Yes, Proceed (Say "Yes")',
      btnVcNo: 'Cancel (Say "No")',
      tmTitle: 'Confirm Your Payment',
      tmAboutToTransfer: 'You are about to transfer',
      tmTo: 'to',
      tmSafetyText: '🔒 Safety Check: Account active. Next step: UPI PIN entry.',
      btnTmConfirm: 'Proceed to Enter UPI PIN',
      btnTmCancel: 'Cancel & Edit',
      footerText: 'Sahaay Bank Universal Accessible Digital Banking Prototype. Built with automatic multilingual speech detection, UPI PIN protection, personal QR code sharing, conversational form filling, and dynamic page translation.'
    },

    'hi-IN': {
      skipLink: 'मुख्य सामग्री पर जाएँ',
      assistiveToolsLabel: 'सहायक उपकरण:',
      toolContrast: 'उच्च कंट्रास्ट (High Contrast)',
      toolPlain: 'सरल भाषा (Plain Language)',
      toolClickRead: 'बोलकर सुनाएं (Select to Speak)',
      toolExplore: 'दो-क्लिक सुरक्षित मोड',
      toolHover: 'होवर चयन (Hover Select)',
      toolOsk: 'वर्चुअल कीबोर्ड',
      toolTags: 'मुख्य जानकारी हाइलाइट',
      toolVoiceAlerts: 'वॉइस अलर्ट',
      toolMotion: 'गति कम करें',
      voiceMicBtn: 'वॉइस एक्शन शुरू करें',
      voiceLiveHint: '💡 बोलें: "राजू को पैसे भेजिए", "मेरा QR कोड दिखाओ", "QR स्कैन करो", "सहायता", या "खाता फ्रीज करो"',
      brandName: 'सहाय बैंक',
      brandTag: 'सार्वभौमिक बहुभाषी और सुलभ डिजिटल बैंकिंग',
      btnScanQrHeader: 'QR स्कैन करें',
      btnMyQrHeader: 'मेरा QR',
      btnScanQr: 'UPI QR स्कैन करें',
      btnShowMyQr: 'मेरा UPI QR कोड',
      themeBtnText: 'डार्क थीम',
      auditPassingBadge: 'लाइव सुलभता: 100% पास',
      demoBadge: 'UPI और QR तैयार',
      loginHeading: 'अपने खाते में साइन इन करें',
      navOverview: 'मुख्य पृष्ठ (Overview)',
      navTransactions: 'लेनदेन (Transactions)',
      navTransfer: 'पैसे भेजें व UPI',
      navHelp: 'सहायता और गाइड (Help)',
      navSettings: 'सेटिंग्स (Settings)',
      navSignOut: 'साइन आउट (Sign Out)',
      welcomeHeading: 'स्वागत है, आशा जी',
      balanceHeading: 'उपलब्ध बैलेंस (Available Balance)',
      btnHideBalance: 'बैलेंस छिपाएँ',
      balanceSubText: 'आज तक, बचत खाता संख्या 4417 • UPI ID: asha.patel@sahaay',
      btnQuickSend: 'अभी पैसे भेजें',
      btnQuickStatement: 'स्टेटमेंट देखें',
      weeklyHeading: 'साप्ताहिक गतिविधि सारांश',
      weeklySummaryText: 'पिछले 7 दिनों में: +₹15,000.00 प्राप्त हुए और −₹6,240.00 का भुगतान हुआ। सभी लेनदेन सत्यापित हैं।',
      transHeading: 'हाल के लेनदेन (Recent Transactions)',
      transferHeading: 'पैसे भेजें व UPI',
      upiPinCalloutTitle: '🔒 4-अंकों के UPI PIN व QR कोड से सुरक्षित:',
      upiPinCalloutDesc: 'पैसे कटने से पहले आपके गुप्त UPI PIN की पुष्टि ज़रूरी है। डेमो पिन 1234 है।',
      lblSendTo: 'किसे भेजें (नाम, फ़ोन नंबर, या UPI ID)',
      lblAmount: 'राशि रुपये में (₹)',
      errAmount: 'कृपया ₹0 से अधिक की राशि दर्ज करें।',
      lblNote: 'भुगतान नोट (वैकल्पिक)',
      btnReviewTransfer: 'UPI PIN सत्यापन के लिए आगे बढ़ें',
      helpHeading: '❓ सहायता और बैंकिंग गाइड (Help Guide)',
      cmdCardSendTitle: 'पैसे भेजना और ट्रांसफर',
      cmdCardQrTitle: 'QR कोड और भुगतान',
      cmdCardFreezeTitle: 'आपातकालीन सुरक्षा (Freeze)',
      cmdCardLangTitle: 'भाषा बदलें (Change Language)',
      glossaryHeading: '📖 सरल बैंकिंग शब्दकोश (Glossary)',
      termUpiPinTitle: 'यूपीआई पिन (UPI PIN)',
      termUpiPinDesc: 'आपका व्यक्तिगत 4 या 6 अंकों का गुप्त पासवर्ड। यह हर ट्रांसफर के समय अनिवार्य है। अपना UPI PIN कभी किसी को न बताएँ।',
      termQrCodeTitle: 'क्यूआर कोड (QR Code)',
      termQrCodeDesc: 'बैंक खाते या दुकान का डिजिटल बारकोड। इसे स्कैन करने से खाता नंबर टाइप किए बिना अपने आप पैसे भर जाते हैं।',
      btnListenExplain: 'व्याख्या सुनें',
      settingsHeading: 'सेटिंग्स और प्राथमिकताएं',
      btnVcYes: 'हाँ, जारी रखें ("हाँ" कहें)',
      btnVcNo: 'रद्द करें ("ना" कहें)',
      tmTitle: 'भुगतान की पुष्टि करें',
      btnTmConfirm: 'UPI PIN दर्ज करने के लिए आगे बढ़ें',
      btnTmCancel: 'रद्द करें और सुधारें'
    }
  };

  let currentLang = 'en-IN';

  function applyLanguageToUI(lang) {
    currentLang = lang;
    const dict = translations[lang] || translations['en-IN'];

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    const payeeEl = document.getElementById('payee');
    const noteEl = document.getElementById('note');
    const aiInputEl = document.getElementById('aiTextInput');

    if (lang === 'hi-IN') {
      if (payeeEl) payeeEl.placeholder = 'उदा. राजू, 9876543210, या rahul@upi';
      if (noteEl) noteEl.placeholder = 'उदा. किराया, किराना, या चाय';
      if (aiInputEl) aiInputEl.placeholder = 'हिन्दी या अंग्रेजी में लिखें... उदा. "मेरा QR कोड दिखाओ"';
    } else {
      if (payeeEl) payeeEl.placeholder = 'e.g. Raju, 9876543210, or rahul@upi';
      if (noteEl) noteEl.placeholder = 'e.g. Rent, Groceries, or Tea';
      if (aiInputEl) aiInputEl.placeholder = 'Type or speak in Hindi, Tamil, English...';
    }

    const voiceHint = document.getElementById('voiceLiveStatusBox');
    if (voiceHint && dict.voiceLiveHint) {
      voiceHint.innerHTML = `<span>${dict.voiceLiveHint}</span>`;
    }
  }

  return {
    translations,
    applyLanguageToUI,
    getCurrentLang: () => currentLang
  };
})();
