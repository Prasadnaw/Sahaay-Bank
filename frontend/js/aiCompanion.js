/**
 * Sahaay Bank AI Companion & Speaking Avatar
 */
window.SahaayAi = (function(){
  'use strict';

  let isAiMouthMoving = false;
  let botSpeechRecognition = null;
  let isBotListening = false;

  function animateAiMouth(start = true){
    const aiMouth = document.getElementById('aiMouth');
    if(!aiMouth) return;

    if(start){
      isAiMouthMoving = true;
      let count = 0;
      const mouthAnim = setInterval(()=>{
        if(!isAiMouthMoving) {
          clearInterval(mouthAnim);
          aiMouth.setAttribute('d', 'M 34 62 Q 50 74 66 62');
          return;
        }
        count++;
        aiMouth.setAttribute('d', count % 2 === 0 ? 'M 34 60 Q 50 82 66 60' : 'M 34 62 Q 50 66 66 62');
      }, 200);
    } else {
      isAiMouthMoving = false;
    }
  }

  function askAi(query){
    const replyBox = document.getElementById('aiReplyBox');
    if(!replyBox) return;

    replyBox.innerHTML = `<div style="font-size:0.85rem; color:var(--ink-soft); margin-bottom:4px;">You: "${query}"</div><div>⏳ <em>Sahaay AI is thinking...</em></div>`;
    const lang = window.SahaayVoice.detectLanguage(query);

    setTimeout(()=>{
      let response = '';
      const q = query.toLowerCase().trim();

      // 1. Transactions & Passbook Statement
      if(/\b(transaction|transactions|statement|history|passbook|len den|lenden|khata|recent|pass book|pichle)\b/i.test(q)){
        window.SahaayApp.navigateTo('transactions');
        response = lang === 'hi-IN'
          ? 'मैंने आपके हाल के सभी लेन-देन और पासबुक स्क्रीन पर खोल दिए हैं। आपका वेतन ₹15,000 जमा हुआ है, BESCOM बिजली बिल ₹1,240 भरा गया है, और चाय प्वाइंट को ₹180 का भुगतान हुआ है।'
          : 'I have opened your Transactions & Statement. You have 3 recent transactions: ₹15,000 Salary credited, ₹1,240 BESCOM Electricity debited, and ₹180 Chai Point debited.';
      }
      // 2. Balance & Financial Inquiry
      else if(/\b(balance|बैलेंस|kitna|kitne|rupaye|rupees|amount|paisa|paise|money|available)\b/i.test(q) && !/\b(bhejo|bhejiye|send|transfer|pay|bhugtan)\b/i.test(q)){
        window.SahaayApp.navigateTo('overview');
        window.SahaayApp.revealBalance();
        const realBal = document.getElementById('mainBalanceText')?.dataset.real || '₹ 42,180.50';
        response = lang === 'hi-IN'
          ? `आपका उपलब्ध बैलेंस ${realBal} है। आपका बचत खाता संख्या 4417 सक्रिय और सुरक्षित है।`
          : `Your available balance is ${realBal} in your primary Savings Account (ending in 4417).`;
      }
      // 3. Send Money & Transfers
      else if(/\b(transfer|send|bhejo|bhejiye|pay|bhugtan|paise)\b/i.test(q)){
        window.SahaayApp.navigateTo('transfer');
        response = lang === 'hi-IN'
          ? 'पैसे भेजने का फॉर्म खोल दिया गया है। आप UPI ID (जैसे rahul@sahaay) या 10 अंकों का फोन नंबर डालकर सुरक्षित पैसे भेज सकते हैं।'
          : 'Opening Send Money screen. You can enter a recipient UPI ID (e.g. rahul@sahaay), 10-digit mobile number, or select a saved beneficiary.';
      }
      // 4. Scanner
      else if(/\b(scan|scanner|camera|स्कैन)\b/i.test(q)){
        window.SahaayQr.openScanner();
        response = lang === 'hi-IN'
          ? 'मैंने UPI QR कोड स्कैनर कैमरा चालू कर दिया है। किसी भी मर्चेंट QR को स्कैन करें।'
          : 'I have launched the camera QR code scanner. Point your camera at any merchant QR code to pay.';
      }
      // 5. My Personal QR
      else if(/\b(qr|क्यूआर|my qr|mera qr|apna qr|receive|code)\b/i.test(q)){
        window.SahaayQr.showMyQr();
        response = lang === 'hi-IN'
          ? 'यह आपका व्यक्तिगत UPI QR कोड है। कोई भी व्यक्ति इसे स्कैन करके सीधे आपके खाते में पैसे भेज सकता है।'
          : 'Here is your personal UPI QR code. Anyone can scan this code to transfer money directly to you.';
      }
      // 6. Freeze / Emergency Lockdown
      else if(/\b(freeze|फ्रीज|रोक|lock|band|emergency)\b/i.test(q)){
        document.getElementById('freezeBtn')?.click();
        response = lang === 'hi-IN'
          ? 'मैंने आपके खाते की सुरक्षा स्थिति को तुरंत अपडेट कर दिया है।'
          : 'I have toggled your emergency account security lock to prevent unauthorized withdrawals.';
      }
      // 7. Settings & Preferences
      else if(/\b(setting|settings|preference|preferences|theme|contrast|options)\b/i.test(q)){
        window.SahaayApp.navigateTo('settings');
        response = lang === 'hi-IN'
          ? 'सेटिंग्स और सुलभता विकल्प स्क्रीन पर खोल दिए गए हैं।'
          : 'Opening Settings & Accessibility Preferences.';
      }
      // 8. Help & Guides
      else if(/\b(help|madad|sahayata|guide|command|commands|faq|support)\b/i.test(q)){
        window.SahaayApp.navigateTo('help');
        response = lang === 'hi-IN'
          ? 'सहायता और वॉइस कमांड गाइड पेज खोल दिया गया है। यहाँ सभी कमांड और बैंकिंग शब्दावली उपलब्ध है।'
          : 'Here is the Help & Voice Commands guide with the full banking glossary and commands cheatsheet.';
      }
      // 9. Banking Terminology - UPI PIN
      else if(/\b(upi pin|pin|पिन)\b/i.test(q)){
        response = lang === 'hi-IN'
          ? 'UPI PIN 4 अंकों का गोपनीय पासवर्ड होता है जिसे आप पैसे भेजने की पुष्टि के लिए डालते हैं। हमारा डेमो पिन 1234 है। इसे किसी को न बताएं।'
          : 'UPI PIN is a secret 4-digit code entered on your secure keypad to approve money transfers. Demo PIN is 1234. Never share your PIN.';
      }
      // 10. Banking Terminology - OTP
      else if(/\b(otp|ओटीपी)\b/i.test(q)){
        response = lang === 'hi-IN'
          ? 'OTP (One-Time Password) आपके मोबाइल पर SMS द्वारा भेजा जाने वाला सुरक्षा कोड है। बैंक कभी आपसे OTP नहीं मांगता।'
          : 'OTP (One-Time Password) is a temporary code sent via SMS to verify your identity. Never share your OTP with anyone.';
      }
      // 11. Conversational Fallback
      else {
        response = lang === 'hi-IN'
          ? `नमस्ते! मैं आपका सहाय AI साथी हूँ। आप मुझसे कह सकते हैं: "लेनदेन दिखाओ", "बैलेंस बताओ", "पैसे भेजो", या "मेरा QR कोड दिखाओ"।`
          : `Hello! I am Sahaay AI, your 24/7 banking assistant. You can ask me to: "show transactions", "check balance", "send money", or "show my QR code".`;
      }

      replyBox.innerHTML = `
        <div style="font-size:0.85rem; color:var(--ink-soft); margin-bottom:4px;">You: "${query}"</div>
        <div style="color:var(--ink); font-weight:500; line-height:1.4;">🤖 <strong>Sahaay AI:</strong> ${response}</div>
      `;
      window.SahaayVoice.speakText(response, lang);
      animateAiMouth(true);
      setTimeout(() => animateAiMouth(false), 4500);
    }, 350);
  }

  function startBotVoiceInput(){
    const textInp = document.getElementById('aiTextInput');
    const voiceBtn = document.getElementById('aiVoiceBtn');
    const hint = document.getElementById('aiVoiceListeningHint');

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        botSpeechRecognition = new SpeechAPI();
        botSpeechRecognition.continuous = false;
        botSpeechRecognition.interimResults = false;
        botSpeechRecognition.lang = window.SahaayVoice.getLang() || 'en-IN';

        botSpeechRecognition.onstart = () => {
          isBotListening = true;
          voiceBtn?.classList.add('listening');
          if(hint) {
            hint.style.display = 'block';
            hint.textContent = '🎙️ Listening... Speak your question now!';
          }
        };

        botSpeechRecognition.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          if(textInp) textInp.value = transcript;
          if(hint) hint.textContent = `👂 Heard: "${transcript}"`;
          setTimeout(() => {
            if(hint) hint.style.display = 'none';
            askAi(transcript);
          }, 400);
        };

        botSpeechRecognition.onerror = (err) => {
          console.warn('Bot mic error:', err);
          isBotListening = false;
          voiceBtn?.classList.remove('listening');
          if(hint) hint.style.display = 'none';
          promptBotFallback();
        };

        botSpeechRecognition.onend = () => {
          isBotListening = false;
          voiceBtn?.classList.remove('listening');
          setTimeout(() => { if(hint) hint.style.display = 'none'; }, 1000);
        };

        botSpeechRecognition.start();
        return;
      } catch(err){
        console.warn('Could not start bot mic:', err);
      }
    }

    promptBotFallback();
  }

  function promptBotFallback(){
    const simulated = prompt('Speak / Type question for Sahaay Bot (e.g. "Mera QR code dikhao", "Balance batao"):', 'Mera QR code dikhao');
    if(simulated){
      const textInp = document.getElementById('aiTextInput');
      if(textInp) textInp.value = simulated;
      askAi(simulated);
    }
  }

  function init(){
    const bubble = document.getElementById('aiBubble');
    const toggleBtn = document.getElementById('aiToggleBtn');
    const closeBtn = document.getElementById('closeAiBtn');
    const sendBtn = document.getElementById('aiSendBtn');
    const voiceBtn = document.getElementById('aiVoiceBtn');
    const textInp = document.getElementById('aiTextInput');

    toggleBtn?.addEventListener('click', ()=>{
      const isOpen = bubble.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', isOpen);
      if(isOpen) textInp?.focus();
    });

    closeBtn?.addEventListener('click', ()=>{
      bubble.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });

    sendBtn?.addEventListener('click', ()=>{
      const text = textInp?.value.trim();
      if(text){
        askAi(text);
        textInp.value = '';
      }
    });

    textInp?.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter') sendBtn?.click();
    });

    voiceBtn?.addEventListener('click', ()=>{
      if(isBotListening && botSpeechRecognition) {
        try { botSpeechRecognition.stop(); } catch(e){}
        isBotListening = false;
      } else {
        startBotVoiceInput();
      }
    });

    document.querySelectorAll('.ai-chip').forEach(c => {
      c.addEventListener('click', () => askAi(c.dataset.query));
    });
  }

  return { init, askAi };
})();
