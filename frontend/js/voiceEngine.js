/**
 * Sahaay Bank Multilingual Voice Action & Conversational Form Engine
 * Robust, fully functional voice-guided banking assistant
 */
window.SahaayVoice = (function(){
  'use strict';

  let currentVoiceLang = 'en-IN';
  let isListening = false;
  let awaitingConfirmation = false;
  let pendingVoiceAction = null;
  let voiceRecognition = null;
  let voiceOutputEnabled = false; // Muted by default, enabled on voice actions

  // Registered Saved Beneficiaries for strict UPI banking safety
  const savedBeneficiaries = [
    { name: 'Rahul Sharma', handle: 'rahul@sahaay', phone: '9876543210' },
    { name: 'Pooja Verma', handle: 'pooja@upi', phone: '9812345678' },
    { name: 'BESCOM Electricity', handle: 'bescom@kbl', phone: '18004251912' },
    { name: 'Chai Point', handle: 'chaipoint@upi', phone: '9900112233' }
  ];

  // Conversational Form Filling State
  let convTransfer = {
    active: false,
    step: null, // 'awaiting_payee' | 'awaiting_amount' | 'awaiting_submit'
    payee: '',
    amount: '',
    reason: ''
  };

  let continuousHandsFree = false;
  let continuousHandsFreeTimer = null;

  function resetMicButton() {
    isListening = false;
    const voiceMicBtn = document.getElementById('voiceActionMicBtn');
    const voiceMicBtnText = document.getElementById('voiceMicBtnText');
    voiceMicBtn?.classList.remove('listening');
    if (voiceMicBtnText) {
      voiceMicBtnText.textContent = continuousHandsFree ? '🎙️ Hands-Free Listening...' : 'Start Voice Action';
    }
    // If continuous hands-free mode is on (Blind Profile), automatically re-arm mic after speech finishes
    if (continuousHandsFree && !awaitingConfirmation) {
      clearTimeout(continuousHandsFreeTimer);
      continuousHandsFreeTimer = setTimeout(() => {
        if (!isListening && continuousHandsFree) {
          startListening();
        }
      }, 3500);
    }
  }

  function detectLanguage(text) {
    if(!text) return 'en-IN';
    const str = text.trim().toLowerCase();

    if (/[\u0B80-\u0BFF]/.test(str)) return 'ta-IN';
    if (/[\u0C00-\u0C7F]/.test(str)) return 'te-IN';
    if (/[\u0980-\u09FF]/.test(str)) return 'bn-IN';
    if (/[\u0C80-\u0CFF]/.test(str)) return 'kn-IN';
    if (/[\u0900-\u097F]/.test(str)) {
      if (/\b(व्यवहार|शिल्लक|पाठवा|गोठवा|करा|नाही|नको|खाते)\b/.test(str)) return 'mr-IN';
      return 'hi-IN';
    }
    if (/[áéíóúñ¿¡]/.test(str) || /\b(hola|por favor|transacciones|enviar|dinero|cuenta|saldo|ajustes|congelar|cerrar|sesion|sesión|sí|adelante|cancelar|gracias|ayuda)\b/i.test(str)) {
      return 'es-ES';
    }
    if (/\b(paise|paisa|bhejo|bhej|bhejiye|bhejna|khata|roko|rok|lenden|len den|dikhao|batao|kholo|band|karo|bahar|niklo|haan|ha|nahi|nahin|shukriya|namaste|madad|sahayata|kitna|kitne|hai|bataiye|chahiye|raju|sharma|rupaye|bhasha|badlo|mera|apna)\b/i.test(str)) {
      return 'hi-IN';
    }
    if (/\b(panam|anuppu|kanakku|mudakku|veliyeru|aam|aama|illai|nandri|vanakkam|eppadi|udhavi)\b/i.test(str)) {
      return 'ta-IN';
    }
    if (/\b(dabbu|pampu|aapu|avunu|vaddu|namaskaram|ela|sahayam)\b/i.test(str)) {
      return 'te-IN';
    }

    return 'en-IN';
  }

  function announce(msg, urgent = false) {
    const liveRegion = document.getElementById('liveRegion');
    const liveRegionAssertive = document.getElementById('liveRegionAssertive');
    const target = urgent ? liveRegionAssertive : liveRegion;
    if(target) {
      target.textContent = '';
      setTimeout(() => { target.textContent = msg; }, 40);
    }
    if (voiceOutputEnabled) {
      speakText(msg, currentVoiceLang);
    }
  }

  let isSpeaking = false;

  function speakText(text, lang = currentVoiceLang, onEndCallback = null) {
    if ('speechSynthesis' in window) {
      isSpeaking = true;
      if (voiceRecognition && isListening) {
        try { voiceRecognition.stop(); } catch(e){}
        resetMicButton();
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.96;

      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang.split('-')[0];
      const match = voices.find(v => v.lang === lang || v.lang.startsWith(langPrefix));
      if (match) u.voice = match;

      let called = false;
      function done() {
        if (!called) {
          called = true;
          isSpeaking = false;
          // Re-arm continuous listening after a brief cooldown so echo does not trigger voice recognition
          if (continuousHandsFree && !awaitingConfirmation) {
            clearTimeout(continuousHandsFreeTimer);
            continuousHandsFreeTimer = setTimeout(() => {
              if (!isListening && continuousHandsFree && !isSpeaking) {
                startListening();
              }
            }, 750);
          }
          if (onEndCallback) onEndCallback();
        }
      }

      u.onend = done;
      u.onerror = done;

      // Fallback timeout in case onend doesn't fire
      const safetyTime = Math.max(2200, text.length * 90);
      setTimeout(done, safetyTime);

      window.speechSynthesis.speak(u);
    } else {
      isSpeaking = false;
      if (onEndCallback) setTimeout(onEndCallback, 100);
    }
  }

  const yesTerms = ['yes', 'confirm', 'proceed', 'ok', 'okay', 'sure', 'do it', 'correct', 'submit', 'send', 'हाँ', 'जी हाँ', 'करो', 'हाँ करो', 'ठीक है', 'सही', 'भेजो', 'भेज दो', 'ஆமாம்', 'சரி', 'sí', 'si', 'confirmar'];
  const noTerms = ['no', 'cancel', 'stop', "don't", 'abort', 'wrong', 'नहीं', 'मत करो', 'रद्द करो', 'रोकें', 'गलत', 'मत भेजो', 'இல்லை', 'ரத்து', 'no', 'cancelar'];

  function detectConfirmation(text) {
    const lower = text.toLowerCase().trim();
    for (const y of yesTerms) {
      if (lower.includes(y.toLowerCase())) return true;
    }
    for (const n of noTerms) {
      if (lower.includes(n.toLowerCase())) return false;
    }
    return null;
  }

  function normalizeSpokenUpi(text) {
    if(!text) return '';
    let str = text.trim();
    // Replace "at the rate of", "at the rate", "at rate", " at " with "@"
    str = str.replace(/\b(at the rate of|at the rate|at rate|\bat\b)\b/gi, '@');
    // Replace "dot" with "."
    str = str.replace(/\bdot\b/gi, '.');
    // Remove spaces around @ and .
    str = str.replace(/\s*@\s*/g, '@');
    str = str.replace(/\s*\.\s*/g, '.');
    // Normalize spaced digits (e.g. "9 8 7 6 5 4 3 2 1 0" -> "9876543210")
    str = str.replace(/(\d)\s+(\d)/g, '$1$2').replace(/(\d)\s+(\d)/g, '$1$2').replace(/(\d)\s+(\d)/g, '$1$2');
    return str;
  }

  function resolvePayee(rawPayee) {
    if(!rawPayee) return null;
    const clean = normalizeSpokenUpi(rawPayee.trim());

    // 1. Check for explicit UPI ID format: username@bank
    const upiMatch = clean.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+/);
    if(upiMatch) {
      return upiMatch[0].toLowerCase();
    }

    // 2. Check for 10-digit Indian phone number
    const phoneMatch = clean.match(/(?:(?:\+|0{0,2})91[\s-]*)?([6-9]\d{9})/);
    if(phoneMatch) {
      return phoneMatch[1];
    }
    const any10 = clean.replace(/\D/g, '');
    if(any10.length === 10) {
      return any10;
    }

    // 3. Match against saved beneficiaries (Rahul, Pooja, BESCOM, Chai Point)
    const lower = clean.toLowerCase();
    for (const b of savedBeneficiaries) {
      const firstName = b.name.toLowerCase().split(' ')[0];
      if (lower.includes(firstName) || 
          lower.includes(b.name.toLowerCase()) || 
          b.name.toLowerCase().includes(lower) || 
          lower.includes(b.handle.toLowerCase())) {
        return `${b.name} (${b.handle})`;
      }
    }

    return null;
  }

  function extractPayeeAndAmount(rawText) {
    const text = normalizeSpokenUpi(rawText);
    let payee = null;
    let amount = null;
    let remainingText = text;

    // 1. Extract UPI ID
    const upiMatch = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+/);
    if (upiMatch) {
      payee = upiMatch[0].toLowerCase();
      remainingText = remainingText.replace(upiMatch[0], ' ');
    } else {
      // 2. Extract 10-digit phone number
      const phoneMatch = text.match(/(?:(?:\+|0{0,2})91[\s-]*)?([6-9]\d{9})/);
      if (phoneMatch) {
        payee = phoneMatch[1];
        remainingText = remainingText.replace(phoneMatch[0], ' ');
      } else {
        // 3. Check for saved beneficiary names
        const lower = text.toLowerCase();
        for (const b of savedBeneficiaries) {
          const firstName = b.name.toLowerCase().split(' ')[0];
          if (lower.includes(firstName)) {
            payee = `${b.name} (${b.handle})`;
            remainingText = remainingText.replace(new RegExp(firstName, 'i'), ' ');
            break;
          }
        }
        // 4. Fallback pattern: "... ko" or "to ..."
        if (!payee) {
          const koMatch = remainingText.match(/([a-zA-Z0-9._@\u0900-\u097F]+)\s+(ko|को)\b/i);
          const toMatch = remainingText.match(/\bto\s+([a-zA-Z0-9._@\u0900-\u097F]+)/i);
          if (koMatch && !['paise', 'rupaye', 'transfer', 'kisi', '500', '1000'].includes(koMatch[1].toLowerCase())) {
            payee = koMatch[1];
            remainingText = remainingText.replace(koMatch[0], ' ');
          } else if (toMatch && !['transfer', 'send', 'bank', '500', '1000'].includes(toMatch[1].toLowerCase())) {
            payee = toMatch[1];
            remainingText = remainingText.replace(toMatch[0], ' ');
          }
        }
      }
    }

    // Extract amount from remaining text
    const remainingLower = remainingText.toLowerCase();
    const digitMatch = remainingLower.match(/\b\d{1,6}\b/);
    if (digitMatch) {
      amount = digitMatch[0];
    } else {
      if (remainingLower.includes('paanch sau') || remainingLower.includes('five hundred')) amount = '500';
      else if (remainingLower.includes('ek hazaar') || remainingLower.includes('hazaar') || remainingLower.includes('one thousand') || remainingLower.includes('thousand')) amount = '1000';
      else if (remainingLower.includes('do hazaar') || remainingLower.includes('two thousand')) amount = '2000';
      else if (remainingLower.includes('ek sau') || remainingLower.includes('sau') || remainingLower.includes('one hundred')) amount = '100';
      else if (remainingLower.includes('do sau') || remainingLower.includes('two hundred')) amount = '200';
      else if (remainingLower.includes('pachas') || remainingLower.includes('fifty')) amount = '50';
    }

    return { payee, amount };
  }

  function init() {
    const voiceMicBtn = document.getElementById('voiceActionMicBtn');
    const voiceMicBtnText = document.getElementById('voiceMicBtnText');
    const voiceLiveStatusBox = document.getElementById('voiceLiveStatusBox');
    const langSelect = document.getElementById('voiceLangSelect');

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechAPI();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;

        voiceRecognition.onstart = () => {
          isListening = true;
          voiceMicBtn?.classList.add('listening');
          if(voiceMicBtnText) {
            voiceMicBtnText.textContent = 'Listening...';
          }
          if(voiceLiveStatusBox) {
            const contextHint = convTransfer.active 
              ? (convTransfer.step === 'awaiting_amount' ? '💰 Listening for Amount (e.g. 500, 1000)...' : '👤 Listening for Payee (UPI ID or Phone)...')
              : `🎙️ Listening (${currentVoiceLang})... Speak now`;
            voiceLiveStatusBox.innerHTML = `<span><strong>${contextHint}</strong></span>`;
          }
          clearTimeout(voiceRecognition._safetyTimer);
          voiceRecognition._safetyTimer = setTimeout(resetMicButton, 8000);
        };

        voiceRecognition.onresult = (e) => {
          clearTimeout(voiceRecognition._safetyTimer);
          const transcript = e.results[0][0].transcript;
          if(voiceLiveStatusBox) {
            voiceLiveStatusBox.innerHTML = `<span>👂 Heard: "<strong>${transcript}</strong>"</span>`;
          }
          resetMicButton();
          handleVoiceInput(transcript);
        };

        voiceRecognition.onerror = (err) => {
          console.warn('Speech recognition error:', err.error);
          if (err.error === 'no-speech') {
            if (continuousHandsFree) {
              clearTimeout(continuousHandsFreeTimer);
              continuousHandsFreeTimer = setTimeout(() => {
                if (!isListening && continuousHandsFree) {
                  startListening();
                }
              }, 800);
            }
            return;
          }
          resetMicButton();
          if(voiceLiveStatusBox) {
            voiceLiveStatusBox.innerHTML = `<span>💡 Tap Start Voice Action or say a command.</span>`;
          }
        };

        voiceRecognition.onend = () => {
          resetMicButton();
        };
      } catch (err) {
        console.warn('Could not initialize speech recognition:', err);
      }
    }

    voiceMicBtn?.addEventListener('click', () => {
      if(isListening) {
        if(voiceRecognition) {
          try { voiceRecognition.stop(); } catch(e){}
        }
        resetMicButton();
      } else {
        startListening();
      }
    });

    langSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val !== 'auto') {
        currentVoiceLang = val;
        window.SahaayI18n.applyLanguageToUI(val);
      }
    });

    document.getElementById('vcConfirmBtn')?.addEventListener('click', executeConfirmedAction);
    document.getElementById('vcCancelBtn')?.addEventListener('click', cancelVoiceAction);
  }

  function startListening() {
    if (isListening) return;
    if (!voiceRecognition) {
      const simulatedSpeech = prompt(
        `Voice Command Input (${currentVoiceLang}):\nSay or type a command:`,
        'Sign in'
      );
      if (simulatedSpeech) handleVoiceInput(simulatedSpeech);
      resetMicButton();
      return;
    }
    try {
      voiceRecognition.lang = currentVoiceLang || 'en-IN';
      voiceRecognition.start();
    } catch (err) {
      console.warn('Voice recognition state:', err.name);
      if (err.name !== 'InvalidStateError') {
        resetMicButton();
      }
    }
  }

  function handleVoiceInput(transcript) {
    resetMicButton();
    if(!transcript || isSpeaking) return;

    const normalized = normalizeSpokenUpi(transcript);
    const lower = normalized.toLowerCase().trim();

    const liveBox = document.getElementById('voiceLiveStatusBox');
    if (liveBox) {
      liveBox.innerHTML = `<span>🗣️ Heard: "<strong>${transcript}</strong>"</span>`;
    }

    const detected = detectLanguage(transcript);
    if (detected !== currentVoiceLang) {
      currentVoiceLang = detected;
      showDetectedBadge(detected);
    }

    // 1. Language switch command
    if (lower.includes('change language') || lower.includes('भाषा बदलो') || lower.includes('bhasha badlo') || lower.includes('hindi') || lower.includes('हिन्दी') || lower.includes('tamil') || lower.includes('தமிழ்')) {
      let targetLang = 'en-IN';
      if (lower.includes('hindi') || lower.includes('हिन्दी')) targetLang = 'hi-IN';
      else if (lower.includes('tamil') || lower.includes('தமிழ்')) targetLang = 'ta-IN';

      currentVoiceLang = targetLang;
      window.SahaayI18n.applyLanguageToUI(targetLang);
      const switchedMsg = targetLang === 'hi-IN' ? 'पूरी स्क्रीन की भाषा हिन्दी में बदल दी गई है।' : 'All page text changed to English.';
      speakText(switchedMsg, targetLang);
      return;
    }

    // 2. Pre-Login Disability Setup & Onboarding Triggers
    if (/\b(blind|andha|drishtihin|दृष्टिहीन|non visual|non-visual|blind profile)\b/i.test(lower)) {
      if (window.SahaayApp && window.SahaayApp.selectDisabilityAndProceed) {
        window.SahaayApp.selectDisabilityAndProceed('blind');
      } else {
        window.SahaayA11y.applyProfile('blind');
      }
      return;
    }
    if (/\b(low vision|low-vision|partial sight|kam dikhta|कम दिखना|chashma|zoom|contrast|high contrast)\b/i.test(lower)) {
      if (window.SahaayApp && window.SahaayApp.selectDisabilityAndProceed) {
        window.SahaayApp.selectDisabilityAndProceed('low_vision');
      } else {
        window.SahaayA11y.applyProfile('low_vision');
      }
      return;
    }
    if (/\b(motor|tremor|physical|hands|dwell|hover select|trembling)\b/i.test(lower)) {
      if (window.SahaayApp && window.SahaayApp.selectDisabilityAndProceed) {
        window.SahaayApp.selectDisabilityAndProceed('motor');
      } else {
        window.SahaayA11y.applyProfile('motor');
      }
      return;
    }
    if (/\b(senior|senior citizen|old|buzurg|बुजुर्ग|elderly)\b/i.test(lower)) {
      if (window.SahaayApp && window.SahaayApp.selectDisabilityAndProceed) {
        window.SahaayApp.selectDisabilityAndProceed('senior');
      } else {
        window.SahaayA11y.applyProfile('senior');
      }
      return;
    }
    if (/\b(standard|skip|default|skip setup|continue)\b/i.test(lower)) {
      const preLoginView = document.getElementById('accessibilityAssessmentView');
      if (preLoginView && preLoginView.style.display !== 'none') {
        window.SahaayApp.selectDisabilityAndProceed('standard');
        return;
      }
    }
    if (/\b(accessibility setup|setup wizard|onboarding|a11y setup)\b/i.test(lower)) {
      window.SahaayA11y.openOnboardingWizard();
      return;
    }

    // 3. SIGN IN / LOGIN VOICE COMMAND (ACCESSIBLE VOICE LOGIN)
    if (/\b(sign in|signin|log in|login|sign-in|log-in|enter dashboard|dakhil|aage badho|aage chalo|submit login|open account|sign in to dashboard|signin to dashboard|login to dashboard|log in to dashboard|login karo|sign in karo|dashboard kholo|dashboard)\b/i.test(lower) ||
        (/\b(proceed|submit|enter)\b/i.test(lower) && !convTransfer.active && !awaitingConfirmation)) {
      const loginView = document.getElementById('loginView');
      const preLoginView = document.getElementById('accessibilityAssessmentView');

      if (preLoginView && preLoginView.style.display !== 'none') {
        speakText('Proceeding to dashboard...', currentVoiceLang);
        window.SahaayApp.selectDisabilityAndProceed('blind');
        setTimeout(() => {
          window.SahaayApp.attemptLogin(true);
        }, 600);
        return;
      }

      speakText(currentVoiceLang === 'hi-IN' ? 'डैशबोर्ड में साइन इन किया जा रहा है...' : 'Signing in to your dashboard...', currentVoiceLang);
      window.SahaayApp?.showToast('Voice Command: Signing in...');
      setTimeout(() => {
        window.SahaayApp?.attemptLogin(true);
      }, 350);
      return;
    }

    // 4. FILL DEMO CREDENTIALS VOICE COMMAND
    if (/\b(fill demo|demo credentials|auto fill|autofill|demo bharo|demo|credentials)\b/i.test(lower)) {
      document.getElementById('autoFillDemoBtn')?.click();
      const chk = document.getElementById('captchaCheckbox');
      if (chk && chk.offsetParent !== null) chk.checked = true;
      speakText('Demo credentials and verification prepared. Say "Sign in" to log in.', currentVoiceLang);
      return;
    }

    // 5. CHECK HUMAN VERIFICATION BOX COMMAND
    if (/\b(check box|checkbox|verify human|i am human|human verify|tick box|tik karo)\b/i.test(lower)) {
      const chk = document.getElementById('captchaCheckbox');
      if (chk) {
        chk.checked = true;
        const err = document.getElementById('captchaError');
        if (err) err.hidden = true;
        speakText('Human verification confirmed. Say "Sign in" to proceed.', currentVoiceLang);
        window.SahaayApp.showToast('Human verification checked');
      }
      return;
    }

    // 6. PLAY / ENTER AUDIO CAPTCHA CODE
    if (/\b(play audio|listen audio|audio code|code sunao|play code)\b/i.test(lower)) {
      document.getElementById('playAudioCodeBtn')?.click();
      return;
    }
    const codeMatch = lower.match(/\b(code is|audio code is|digits are)\s*(\d{4})\b/i);
    if (codeMatch) {
      const audioInp = document.getElementById('captchaAudioInput');
      if (audioInp) {
        audioInp.value = codeMatch[2];
        speakText(`Audio code ${codeMatch[2]} entered. Say "Sign in" to submit.`, currentVoiceLang);
        window.SahaayApp.showToast(`Audio code: ${codeMatch[2]}`);
      }
      return;
    }

    // 7. ENTER MATH CAPTCHA ANSWER
    const mathMatch = lower.match(/\b(answer is|answer|sum is|total is|uttar)\s*(\d+)\b/i);
    if (mathMatch) {
      const mathInp = document.getElementById('captchaInput');
      if (mathInp) {
        mathInp.value = mathMatch[2];
        speakText(`Math answer ${mathMatch[2]} entered. Say "Sign in" to submit.`, currentVoiceLang);
        window.SahaayApp.showToast(`Math answer: ${mathMatch[2]}`);
      }
      return;
    }

    // 2. Active Confirmation handling
    if (awaitingConfirmation) {
      const confirmed = detectConfirmation(transcript);
      if (confirmed === true) {
        executeConfirmedAction();
        return;
      } else if (confirmed === false) {
        cancelVoiceAction();
        return;
      }
    }

    // 3. Conversational step: Amount input
    if (convTransfer.active && convTransfer.step === 'awaiting_amount') {
      const { amount: extractedAmt } = extractPayeeAndAmount(transcript);
      let amt = extractedAmt;
      if (!amt) {
        const digitMatch = lower.match(/\b\d+\b/);
        if (digitMatch) amt = digitMatch[0];
      }

      if (amt && Number(amt) > 0) {
        convTransfer.amount = amt;
        const amountField = document.getElementById('amount');
        if (amountField) {
          amountField.value = amt;
          amountField.classList.remove('voice-highlight', 'has-error');
        }
        document.getElementById('amountError').hidden = true;
        convTransfer.step = 'awaiting_submit';
        promptTransferConfirmation();
      } else {
        const reprompt = currentVoiceLang === 'hi-IN'
          ? 'कृपया रुपये की सही संख्या बताएं, जैसे 500 या 1000.'
          : 'Please speak the amount in rupees, for example 500 or 1000.';
        speakText(reprompt, currentVoiceLang, () => {
          if (convTransfer.active) startListening();
        });
      }
      return;
    }

    // 4. Conversational step: Payee input (PROCEEDS DIRECTLY TO AMOUNT!)
    if (convTransfer.active && convTransfer.step === 'awaiting_payee') {
      const { payee: extractedPayee, amount: extractedAmt } = extractPayeeAndAmount(transcript);
      const resolved = resolvePayee(extractedPayee || normalized);
      const payeeField = document.getElementById('payee');
      const amountField = document.getElementById('amount');
      const payeeError = document.getElementById('payeeError');

      if (resolved) {
        convTransfer.payee = resolved;
        if (payeeField) {
          payeeField.value = resolved;
          payeeField.classList.remove('voice-highlight', 'has-error');
        }
        if (payeeError) payeeError.hidden = true;

        if (extractedAmt) {
          convTransfer.amount = extractedAmt;
          if (amountField) amountField.value = extractedAmt;
        }

        if (!convTransfer.amount) {
          // PROCEED DIRECTLY TO NEXT FIELD: AMOUNT
          promptForAmount();
        } else {
          // PROCEED DIRECTLY TO CONFIRMATION
          promptTransferConfirmation();
        }
      } else {
        if (payeeField) payeeField.value = normalized;
        const errorMsg = currentVoiceLang === 'hi-IN'
          ? 'कृपया सही UPI ID (जैसे rahul@sahaay) या 10 अंकों का फोन नंबर बोलें।'
          : 'Please speak a valid UPI ID (e.g. rahul@sahaay) or 10-digit mobile number.';
        speakText(errorMsg, currentVoiceLang, () => {
          if (convTransfer.active) startListening();
        });
        window.SahaayApp.showToast(errorMsg);
      }
      return;
    }

    // 5. INTENT: BALANCE INQUIRY
    if (/\b(balance|बैलेंस|kitna|kitne|paisa|paise|shillak|shilak|rupaye|rupees|amount|check balance|show balance)\b/i.test(lower) && 
        !/\b(bhejo|bhejiye|send|transfer|pay|bhugtan)\b/i.test(lower)) {
      window.SahaayApp.navigateTo('overview');
      window.SahaayApp.revealBalance();
      const realBal = document.getElementById('mainBalanceText')?.dataset.real || '₹ 42,180.50';
      const balMsg = currentVoiceLang === 'hi-IN'
        ? `आपका उपलब्ध बैलेंस ${realBal} है।`
        : `Your available balance is ${realBal}.`;
      speakText(balMsg, currentVoiceLang);
      window.SahaayApp.showToast(balMsg);
      return;
    }

    // 6. INTENT: SEND MONEY & TRANSFER
    if (/\b(bhejo|bhejiye|send|transfer|pay|paise|paisa|rupaye|payment|bhugtan)\b/i.test(lower)) {
      window.SahaayApp.navigateTo('transfer');
      const { payee, amount } = extractPayeeAndAmount(transcript);

      convTransfer.active = true;
      convTransfer.amount = amount || '';

      const payeeField = document.getElementById('payee');
      const amountField = document.getElementById('amount');

      if (amount && amountField) amountField.value = amount;

      const resolved = resolvePayee(payee);
      if (resolved) {
        convTransfer.payee = resolved;
        if (payeeField) {
          payeeField.value = resolved;
          payeeField.classList.remove('voice-highlight', 'has-error');
        }
      } else if (payee) {
        if (payeeField) payeeField.value = payee;
      }

      if (!convTransfer.payee) {
        promptForPayee();
      } else if (!convTransfer.amount) {
        // PROCEED TO NEXT FIELD: AMOUNT
        promptForAmount();
      } else {
        // PROCEED TO CONFIRMATION
        promptTransferConfirmation();
      }
      return;
    }

    // 7. INTENT: QR SCANNER
    if (/\b(scan|scanner|स्कैन|camera|scan qr)\b/i.test(lower)) {
      window.SahaayQr.openScanner();
      const scanMsg = currentVoiceLang === 'hi-IN' ? 'QR कोड स्कैनर चालू हो गया है।' : 'Opening QR code scanner.';
      speakText(scanMsg, currentVoiceLang);
      return;
    }

    // 8. INTENT: SHOW MY PERSONAL QR
    if (/\b(qr|क्यूआर|my qr|mera qr|apna qr|receive|code)\b/i.test(lower)) {
      window.SahaayQr.showMyQr();
      const qrMsg = currentVoiceLang === 'hi-IN' ? 'आपका UPI QR कोड स्क्रीन पर खोल दिया गया है।' : 'Here is your personal UPI QR code.';
      speakText(qrMsg, currentVoiceLang);
      return;
    }

    // 9. INTENT: TRANSACTIONS / STATEMENT
    if (/\b(transaction|transactions|statement|history|passbook|len den|lenden|khata|pichle)\b/i.test(lower)) {
      window.SahaayApp.navigateTo('transactions');
      const txMsg = currentVoiceLang === 'hi-IN' ? 'आपके पिछले लेन-देन स्क्रीन पर दिखा दिए गए हैं।' : 'Opening your recent transactions statement.';
      speakText(txMsg, currentVoiceLang);
      return;
    }

    // 10. INTENT: FREEZE / EMERGENCY
    if (/\b(freeze|रोक|roko|rok|band|lock|emergency)\b/i.test(lower)) {
      document.getElementById('freezeBtn')?.click();
      return;
    }

    // 11. INTENT: HELP & GUIDE (Only opens when explicitly requested!)
    if (/\b(help|madad|sahayata|guide|command|commands|kya bolu|kaise)\b/i.test(lower)) {
      window.SahaayApp.navigateTo('help');
      const helpMsg = currentVoiceLang === 'hi-IN' ? 'सहायता और वॉइस कमांड की पूरी सूची खोल दी गई है।' : 'Here is the Help and Voice Commands guide.';
      speakText(helpMsg, currentVoiceLang);
      return;
    }

    // 12. INTENT: SETTINGS
    if (/\b(setting|settings|preference|preferences|theme|options)\b/i.test(lower)) {
      window.SahaayApp.navigateTo('settings');
      speakText('Opening Settings and Preferences.', currentVoiceLang);
      return;
    }

    // 13. INTENT: OVERVIEW / HOME
    if (/\b(overview|home|dashboard|mukhya|main)\b/i.test(lower)) {
      window.SahaayApp.navigateTo('overview');
      speakText('Navigated to main overview dashboard.', currentVoiceLang);
      return;
    }

    // 14. INTENT: SIGN OUT
    if (/\b(sign out|signout|log out|logout|exit|bahar)\b/i.test(lower)) {
      document.getElementById('signOutBtn')?.click();
      return;
    }

    // 15. SAFE FALLBACK: DO NOT NAVIGATE TO HELP! Stay on current screen!
    const confused = currentVoiceLang === 'hi-IN'
      ? `मैंने "${transcript}" सुना। कृपया 'पैसे भेजें', 'बैलेंस', या 'सहायता' बोलें।`
      : `I heard "${transcript}". Say "Send money", "Check balance", or say "Help" for options.`;
    speakText(confused, currentVoiceLang);
    window.SahaayApp?.showToast(confused);
    const fallbackLiveBox = document.getElementById('voiceLiveStatusBox');
    if (fallbackLiveBox) {
      fallbackLiveBox.innerHTML = `<span>💡 Heard: "<strong>${transcript}</strong>". Say "Send money", "Balance", or "Help".</span>`;
    }
  }

  function promptForPayee() {
    convTransfer.step = 'awaiting_payee';
    const payeeField = document.getElementById('payee');
    const amountField = document.getElementById('amount');
    if (amountField) amountField.classList.remove('voice-highlight');
    if (payeeField) {
      payeeField.classList.add('voice-highlight');
      payeeField.focus();
    }
    const msg = currentVoiceLang === 'hi-IN'
      ? 'आप किसे पैसे भेजना चाहते हैं? कृपया उनका 10 अंकों का फोन नंबर, UPI ID, या राहुल / पूजा बोलें।'
      : 'Who would you like to send money to? Please speak their 10-digit phone number, UPI ID, or say Rahul or Pooja.';
    const liveBox = document.getElementById('voiceLiveStatusBox');
    if (liveBox) {
      liveBox.innerHTML = '<span>👤 <strong>Listening for Payee... (e.g. rahul@sahaay, 9876543210)</strong></span>';
    }
    speakText(msg, currentVoiceLang, () => {
      if (convTransfer.active) startListening();
    });
  }

  function promptForAmount() {
    convTransfer.step = 'awaiting_amount';
    const payeeField = document.getElementById('payee');
    const amountField = document.getElementById('amount');
    if (payeeField) payeeField.classList.remove('voice-highlight');
    if (amountField) {
      amountField.classList.add('voice-highlight');
      amountField.focus();
    }
    const msg = currentVoiceLang === 'hi-IN'
      ? `प्राप्तकर्ता ${convTransfer.payee} दर्ज हो गया। आप कितने रुपये भेजना चाहते हैं?`
      : `Recipient set to ${convTransfer.payee}. How much money in rupees do you want to send?`;
    window.SahaayApp.showToast(`Payee set: ${convTransfer.payee}`);
    const liveBox = document.getElementById('voiceLiveStatusBox');
    if (liveBox) {
      liveBox.innerHTML = `<span>💰 <strong>Payee Set! Listening for Amount (e.g. 500, 1000)...</strong></span>`;
    }
    speakText(msg, currentVoiceLang, () => {
      if (convTransfer.active) startListening();
    });
  }

  function promptTransferConfirmation() {
    convTransfer.step = 'awaiting_submit';
    awaitingConfirmation = true;
    pendingVoiceAction = 'transfer_submit';

    const payeeField = document.getElementById('payee');
    const amountField = document.getElementById('amount');
    if (payeeField) payeeField.classList.remove('voice-highlight');
    if (amountField) amountField.classList.remove('voice-highlight');

    const modal = document.getElementById('voiceConfirmModal');
    document.getElementById('vcActionName').textContent = `Send ₹${convTransfer.amount} to ${convTransfer.payee}`;
    modal.classList.add('open');

    const msg = currentVoiceLang === 'hi-IN'
      ? `क्या आप ${convTransfer.payee} को ₹${convTransfer.amount} भेजना चाहते हैं? कृपया 'हाँ' या 'ना' बोलें।`
      : `Send ₹${convTransfer.amount} to ${convTransfer.payee}? Please speak Yes or No to confirm.`;

    document.getElementById('vcSpokenPrompt').innerHTML = `🎙️ ${msg}`;
    speakText(msg, currentVoiceLang, () => {
      if (awaitingConfirmation) startListening();
    });
  }

  function executeConfirmedAction() {
    awaitingConfirmation = false;
    resetMicButton();
    document.getElementById('voiceConfirmModal')?.classList.remove('open');
    const act = pendingVoiceAction;
    pendingVoiceAction = null;

    if (act === 'transfer_submit') {
      const p = convTransfer.payee;
      const a = convTransfer.amount;
      convTransfer.active = false;
      convTransfer.step = null;
      window.SahaayUpi.openKeypad(p, a);
    }
  }

  function cancelVoiceAction() {
    convTransfer.active = false;
    convTransfer.step = null;
    awaitingConfirmation = false;
    pendingVoiceAction = null;
    resetMicButton();
    document.getElementById('voiceConfirmModal')?.classList.remove('open');
    document.getElementById('payee')?.classList.remove('voice-highlight');
    document.getElementById('amount')?.classList.remove('voice-highlight');
    if (voiceOutputEnabled) speakText('Action cancelled.', currentVoiceLang);
  }

  function showDetectedBadge(lang) {
    const badge = document.getElementById('detectedLangBadge');
    if(!badge) return;
    const labels = {
      'en-IN': '🇬🇧 Auto: English',
      'hi-IN': '🇮🇳 Auto: हिन्दी',
      'ta-IN': '🇮🇳 Auto: தமிழ்',
      'te-IN': '🇮🇳 Auto: తెలుగు',
      'mr-IN': '🇮🇳 Auto: मराठी',
      'es-ES': '🇪🇸 Auto: Español'
    };
    badge.textContent = labels[lang] || lang;
    badge.className = 'detected-badge show';
    clearTimeout(badge._timer);
    badge._timer = setTimeout(() => badge.classList.remove('show'), 4000);
  }

  return {
    init,
    startListening,
    announce,
    speakText,
    detectLanguage,
    cancelVoiceAction,
    executeConfirmedAction,
    handleVoiceInput,
    resolvePayee,
    normalizeSpokenUpi,
    resetMicButton,
    savedBeneficiaries,
    isVoiceOutputEnabled: () => voiceOutputEnabled,
    setVoiceOutput: (val) => { voiceOutputEnabled = !!val; },
    enableContinuousHandsFree: (val) => {
      continuousHandsFree = !!val;
      const voiceMicBtnText = document.getElementById('voiceMicBtnText');
      if (voiceMicBtnText) {
        voiceMicBtnText.textContent = continuousHandsFree ? '🎙️ Hands-Free Listening...' : 'Start Voice Action';
      }
      if (val) startListening();
    },
    isContinuousHandsFree: () => continuousHandsFree,
    getLang: () => currentVoiceLang,
    setLang: (l) => { currentVoiceLang = l; }
  };
})();
