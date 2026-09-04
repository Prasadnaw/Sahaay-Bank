/**
 * Sahaay Bank Accessibility Toolbar Controller & Tools
 */
window.SahaayA11y = (function(){
  'use strict';

  let clickReadActive = false;
  let hoverSelectActive = false;
  let twoClickMode = false;
  let armedButton = null;
  let smartTagsActive = true;
  let voiceAlertsActive = true;
  let motionReduced = false;

  let dwellTimer = null;
  let currentDwellTarget = null;
  
  // Font scale array: 0.85 (reduced), 1.0 (default), 1.18 (large), 1.35 (x-large), 1.55 (max)
  let scaleIndex = 1;
  const scales = [0.85, 1.0, 1.18, 1.35, 1.55];

  function applyTheme(theme){
    document.documentElement.classList.remove('dark-theme', 'contrast', 'fresh-theme');
    const lightBtn = document.getElementById('themeLightBtn');
    const darkBtn = document.getElementById('themeDarkBtn');
    const contrastBtn = document.getElementById('themeContrastBtn');
    const freshBtn = document.getElementById('themeFreshBtn');
    const quickBtn = document.getElementById('quickThemeBtn');
    const toolContrast = document.getElementById('tool-contrast');

    if(lightBtn) lightBtn.setAttribute('aria-pressed', 'false');
    if(darkBtn) darkBtn.setAttribute('aria-pressed', 'false');
    if(contrastBtn) contrastBtn.setAttribute('aria-pressed', 'false');
    if(freshBtn) freshBtn.setAttribute('aria-pressed', 'false');
    if(toolContrast) toolContrast.setAttribute('aria-pressed', theme === 'contrast' ? 'true' : 'false');

    if(theme === 'fresh'){
      document.documentElement.classList.add('fresh-theme');
      if(freshBtn) freshBtn.setAttribute('aria-pressed', 'true');
      if(quickBtn) quickBtn.textContent = '☀️ Light Classic';
      window.SahaayVoice.announce('Fresh Modern bright white theme enabled');
    } else if(theme === 'dark'){
      document.documentElement.classList.add('dark-theme');
      if(darkBtn) darkBtn.setAttribute('aria-pressed', 'true');
      if(quickBtn) quickBtn.textContent = '✨ Fresh Modern';
      window.SahaayVoice.announce('Dark theme enabled');
    } else if(theme === 'contrast'){
      document.documentElement.classList.add('contrast');
      if(contrastBtn) contrastBtn.setAttribute('aria-pressed', 'true');
      if(quickBtn) quickBtn.textContent = '✨ Fresh Modern';
      window.SahaayVoice.announce('High contrast yellow on black theme enabled');
    } else {
      if(lightBtn) lightBtn.setAttribute('aria-pressed', 'true');
      if(quickBtn) quickBtn.textContent = '🌙 Dark Theme';
      window.SahaayVoice.announce('Light theme enabled');
    }
  }

  function setScale(idx){
    scaleIndex = Math.max(0, Math.min(idx, scales.length - 1));
    const factor = scales[scaleIndex];
    document.documentElement.style.setProperty('--scale', factor);
    const pct = Math.round(factor * 100);
    window.SahaayVoice.announce(`Text size adjusted to ${pct} percent`);
    window.SahaayApp.showToast(`Text Size: ${pct}%`);
  }

  function setClickRead(active) {
    clickReadActive = active;
    const clickReadBtn = document.getElementById('tool-click-read');
    const chk = document.getElementById('cfg-click-read');
    if(clickReadBtn) clickReadBtn.setAttribute('aria-pressed', active);
    if(chk) chk.checked = active;
    document.body.classList.toggle('click-read-active', active);
    if(!active && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    window.SahaayVoice.announce(active ? 'Read on click mode enabled' : 'Read on click disabled');
  }

  function setTwoClickSafe(active) {
    twoClickMode = active;
    const exploreBtn = document.getElementById('tool-explore');
    const chk = document.getElementById('cfg-explore');
    if(exploreBtn) exploreBtn.setAttribute('aria-pressed', active);
    if(chk) chk.checked = active;
    if(armedButton) {
      armedButton.style.outline = '';
      armedButton = null;
    }
    window.SahaayVoice.announce(active ? 'Two-click safe mode enabled. Tap once to hear, tap again to activate.' : 'Two-click safe mode disabled.');
  }

  function setVoiceAlerts(active) {
    voiceAlertsActive = active;
    window.SahaayVoice.setVoiceOutput(active);
    const alertsBtn = document.getElementById('tool-voice-alerts');
    if(alertsBtn) alertsBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    window.SahaayApp.showToast(active ? 'Voice Alerts Active' : 'Voice Alerts Muted');
    if(active) {
      window.SahaayVoice.speakText('Voice alerts enabled. System updates will be spoken aloud.');
    }
  }

  function setSmartTags(active) {
    smartTagsActive = active;
    const tagsBtn = document.getElementById('tool-tags');
    if(tagsBtn) tagsBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    document.documentElement.classList.toggle('highlight-info', active);
    document.querySelectorAll('.smart-tag').forEach(t => t.style.display = active ? 'inline-block' : 'none');
    window.SahaayApp.showToast(active ? 'Key Info Highlighted' : 'Key Info Standard');
  }

  function setReduceMotion(active) {
    motionReduced = active;
    const motionBtn = document.getElementById('tool-motion');
    const chk = document.getElementById('cfg-motion');
    if(motionBtn) motionBtn.setAttribute('aria-pressed', active);
    if(chk) chk.checked = active;
    document.documentElement.classList.toggle('no-motion', active);
    document.documentElement.classList.toggle('motion-slow', active);
    window.SahaayVoice.announce(active ? 'Reduced motion speed enabled' : 'Standard motion restored');
  }

  function setPlainLanguage(active) {
    const plainBtn = document.getElementById('tool-plain');
    const chk = document.getElementById('cfg-plain');
    if(plainBtn) plainBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    if(chk) chk.checked = active;
    document.querySelectorAll('[data-standard]').forEach(el => {
      el.textContent = active ? el.getAttribute('data-plain') : el.getAttribute('data-standard');
    });
    window.SahaayVoice.announce(active ? 'Plain language mode enabled' : 'Standard language restored');
  }

  function setHoverSelect(active) {
    hoverSelectActive = active;
    const hoverBtn = document.getElementById('tool-hover');
    const chk = document.getElementById('cfg-hover');
    if(hoverBtn) hoverBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    if(chk) chk.checked = active;
    window.SahaayVoice.announce(active ? 'Hover select active (1.2s dwell)' : 'Hover select disabled');
  }

  function init(){
    // Themes
    document.getElementById('themeLightBtn')?.addEventListener('click', () => applyTheme('light'));
    document.getElementById('themeDarkBtn')?.addEventListener('click', () => applyTheme('dark'));
    document.getElementById('themeContrastBtn')?.addEventListener('click', () => applyTheme('contrast'));
    document.getElementById('themeFreshBtn')?.addEventListener('click', () => applyTheme('fresh'));
    
    document.getElementById('quickThemeBtn')?.addEventListener('click', () => {
      const isFresh = document.documentElement.classList.contains('fresh-theme');
      const isDark = document.documentElement.classList.contains('dark-theme');
      if(isFresh) applyTheme('dark');
      else if(isDark) applyTheme('light');
      else applyTheme('fresh');
    });

    document.getElementById('tool-contrast')?.addEventListener('click', () => {
      const isContrast = document.documentElement.classList.contains('contrast');
      applyTheme(isContrast ? 'fresh' : 'contrast');
    });

    if(document.documentElement.classList.contains('fresh-theme')){
      applyTheme('fresh');
    }

    // Font scaling buttons
    document.getElementById('textSmaller')?.addEventListener('click', () => setScale(scaleIndex - 1));
    document.getElementById('textReset')?.addEventListener('click', () => setScale(1));
    document.getElementById('textBigger')?.addEventListener('click', () => setScale(scaleIndex + 1));
    document.getElementById('textMax')?.addEventListener('click', () => setScale(4));

    // Plain language
    const plainBtn = document.getElementById('tool-plain');
    let plainOn = false;
    plainBtn?.addEventListener('click', ()=>{
      plainOn = !plainOn;
      plainBtn.setAttribute('aria-pressed', plainOn);
      document.querySelectorAll('[data-standard]').forEach(el => {
        el.textContent = plainOn ? el.getAttribute('data-plain') : el.getAttribute('data-standard');
      });
      window.SahaayVoice.announce(plainOn ? 'Plain language mode enabled' : 'Standard language restored');
    });

    // Click to Read
    document.getElementById('tool-click-read')?.addEventListener('click', () => setClickRead(!clickReadActive));
    document.getElementById('cfg-click-read')?.addEventListener('change', (e) => setClickRead(e.target.checked));

    document.addEventListener('click', (e)=>{
      if(!clickReadActive) return;
      const readable = e.target.closest('[data-readable], .panel, p, h1, h2, h3, tr, button, label, .settings-section-card, .help-card, .cmd-list-row');
      if(readable && !e.target.closest('.a11y-bar, .voice-action-bar, .osk-container, #aiWidget, #voiceConfirmModal, #upiPinModal, .site-header')){
        const text = readable.innerText || readable.textContent;
        if(text && text.trim()) window.SahaayVoice.speakText(text.trim());
      }
    });

    document.addEventListener('mouseup', () => {
      if(!clickReadActive) return;
      const sel = window.getSelection()?.toString().trim();
      if(sel && sel.length > 1) {
        window.SahaayVoice.speakText(sel);
      }
    });

    // Two-Click Safe Mode
    document.getElementById('tool-explore')?.addEventListener('click', () => setTwoClickSafe(!twoClickMode));
    document.getElementById('cfg-explore')?.addEventListener('change', (e) => setTwoClickSafe(e.target.checked));

    document.addEventListener('click', (e) => {
      if(!twoClickMode) return;
      const btn = e.target.closest('button:not(.a11y-btn):not(.modal-close-btn):not(.osk-key):not(.upi-key):not(.select-pre-login-btn):not(#backToAssessmentBtn):not(#skipAssessmentDirectBtn)');
      if(btn){
        if(armedButton !== btn){
          e.preventDefault();
          e.stopImmediatePropagation();
          if(armedButton) armedButton.style.outline = '';
          armedButton = btn;
          btn.style.outline = '3px dashed #4F46E5';
          btn.style.outlineOffset = '3px';
          const label = btn.innerText || btn.getAttribute('aria-label') || 'Button';
          window.SahaayVoice.announce(`Selected: ${label}. Tap again to confirm action.`, true);
          setTimeout(() => {
            if(armedButton === btn){
              armedButton.style.outline = '';
              armedButton = null;
            }
          }, 4000);
          return false;
        } else {
          armedButton.style.outline = '';
          armedButton = null;
        }
      }
    }, true);

    // Voice Alerts Toggle
    document.getElementById('tool-voice-alerts')?.addEventListener('click', () => setVoiceAlerts(!voiceAlertsActive));
    document.getElementById('cfg-voice-alerts')?.addEventListener('change', (e) => setVoiceAlerts(e.target.checked));

    // Smart Tags Toggle
    document.getElementById('tool-tags')?.addEventListener('click', () => setSmartTags(!smartTagsActive));
    document.getElementById('cfg-tags')?.addEventListener('change', (e) => setSmartTags(e.target.checked));

    // Reduce Motion Toggle
    document.getElementById('tool-motion')?.addEventListener('click', () => setReduceMotion(!motionReduced));
    document.getElementById('cfg-motion')?.addEventListener('change', (e) => setReduceMotion(e.target.checked));

    // Dwell Clicking (Hover Select)
    const hoverBtn = document.getElementById('tool-hover');
    const dwellInd = document.getElementById('dwellIndicator');
    hoverBtn?.addEventListener('click', ()=>{
      hoverSelectActive = !hoverSelectActive;
      hoverBtn.setAttribute('aria-pressed', hoverSelectActive);
      window.SahaayVoice.announce(hoverSelectActive ? 'Hover select active (1.2s dwell)' : 'Hover select disabled');
    });

    document.addEventListener('mouseover', (e)=>{
      if(!hoverSelectActive || !dwellInd) return;
      const target = e.target.closest('button, .nav-item, input[type="checkbox"], [role="tab"], .ai-chip, .osk-key, .upi-key, .demo-qr-scan-btn');
      if(target && target !== currentDwellTarget){
        clearTimeout(dwellTimer);
        currentDwellTarget = target;
        const rect = target.getBoundingClientRect();
        dwellInd.style.left = (rect.left + rect.width / 2) + 'px';
        dwellInd.style.top = (rect.top + rect.height / 2) + 'px';
        dwellInd.style.display = 'block';

        dwellTimer = setTimeout(()=>{
          if(currentDwellTarget === target){
            dwellInd.style.display = 'none';
            target.click();
            currentDwellTarget = null;
          }
        }, 1200);
      }
    });

    document.addEventListener('mouseout', (e)=>{
      if(!hoverSelectActive || !dwellInd) return;
      if(e.target.closest('button, .nav-item, input[type="checkbox"], [role="tab"], .ai-chip, .osk-key, .upi-key, .demo-qr-scan-btn') === currentDwellTarget){
        clearTimeout(dwellTimer);
        currentDwellTarget = null;
        dwellInd.style.display = 'none';
      }
    });

    // Full Virtual Keyboard
    const oskToggle = document.getElementById('tool-osk');
    const oskContainer = document.getElementById('oskContainer');
    const closeOsk = document.getElementById('closeOskBtn');
    let activeInput = null;
    let isShiftOn = false;

    oskToggle?.addEventListener('click', ()=>{
      const isShowing = oskContainer.classList.toggle('show');
      oskToggle.setAttribute('aria-pressed', isShowing);
      window.SahaayVoice.announce(isShowing ? 'Virtual keyboard opened' : 'Virtual keyboard closed');
    });
    closeOsk?.addEventListener('click', ()=>{
      oskContainer.classList.remove('show');
      oskToggle.setAttribute('aria-pressed', 'false');
    });

    document.addEventListener('focusin', (e)=>{
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') activeInput = e.target;
    });

    document.querySelectorAll('.osk-key').forEach(k => {
      k.addEventListener('click', ()=>{
        if(!activeInput) return;
        const key = k.dataset.key;
        if(key === 'BACKSPACE') {
          activeInput.value = activeInput.value.slice(0, -1);
        } else if(key === 'CLEAR') {
          activeInput.value = '';
        } else if(key === 'SPACE') {
          activeInput.value += ' ';
        } else if(key === 'SHIFT') {
          isShiftOn = !isShiftOn;
          k.classList.toggle('active', isShiftOn);
          document.querySelectorAll('.osk-key[data-letter]').forEach(lk => {
            lk.textContent = isShiftOn ? lk.dataset.letter.toUpperCase() : lk.dataset.letter.toLowerCase();
          });
        } else {
          const char = isShiftOn && k.dataset.letter ? k.dataset.letter.toUpperCase() : key;
          activeInput.value += char;
        }
        activeInput.focus();
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    // Toolbar Customizer Checkboxes sync
    const toolbarMap = [
      { cfgId: 'cfg-text-size', elId: 'tool-text-size' },
      { cfgId: 'cfg-contrast', elId: 'tool-contrast' },
      { cfgId: 'cfg-plain', elId: 'tool-plain' },
      { cfgId: 'cfg-click-read', elId: 'tool-click-read' },
      { cfgId: 'cfg-explore', elId: 'tool-explore' },
      { cfgId: 'cfg-hover', elId: 'tool-hover' },
      { cfgId: 'cfg-osk', elId: 'tool-osk' },
      { cfgId: 'cfg-tags', elId: 'tool-tags' },
      { cfgId: 'cfg-voice-alerts', elId: 'tool-voice-alerts' },
      { cfgId: 'cfg-motion', elId: 'tool-motion' },
      { cfgId: 'cfg-voice-bar', elId: 'tool-voice-bar' },
      { cfgId: 'cfg-ai-avatar', elId: 'aiWidget' }
    ];

    toolbarMap.forEach(item => {
      const chk = document.getElementById(item.cfgId);
      const target = document.getElementById(item.elId);
      if(chk && target){
        chk.addEventListener('change', ()=>{
          target.style.display = chk.checked ? '' : 'none';
        });
      }
    });

    document.getElementById('resetToolbarBtn')?.addEventListener('click', ()=>{
      toolbarMap.forEach(item => {
        const chk = document.getElementById(item.cfgId);
        const target = document.getElementById(item.elId);
        if(chk && target){
          chk.checked = true;
          target.style.display = '';
        }
      });
      window.SahaayApp.showToast('Toolbar Restored');
    });

    // PIN Change Modal
    const pinModal = document.getElementById('pinModal');
    const newPinInput = document.getElementById('newPinInput');
    document.getElementById('changePinBtn')?.addEventListener('click', ()=>{
      if(pinModal){
        pinModal.classList.add('open');
        if(newPinInput) { newPinInput.value = ''; newPinInput.focus(); }
        window.SahaayVoice.announce('Change PIN dialog opened.');
      }
    });
    document.getElementById('closePinModalBtn')?.addEventListener('click', ()=>{
      pinModal?.classList.remove('open');
    });
    document.getElementById('savePinBtn')?.addEventListener('click', ()=>{
      const val = newPinInput?.value;
      if(val && val.length === 4){
        window.SahaayConfig.defaultUpiPin = val;
        pinModal?.classList.remove('open');
        window.SahaayApp.showToast('Security PIN Updated');
        window.SahaayVoice.announce('Your UPI security PIN has been updated successfully.', true);
      } else {
        window.SahaayVoice.announce('Please enter exactly 4 digits for your new PIN.', true);
        newPinInput?.focus();
      }
    });

    // Initialize smart tags state
    setSmartTags(false);

    // Onboarding Wizard Event Handlers
    document.getElementById('tool-wizard')?.addEventListener('click', openOnboardingWizard);
    document.getElementById('closeOnboardingBtn')?.addEventListener('click', closeOnboardingWizard);
    document.getElementById('skipOnboardingBtn')?.addEventListener('click', () => applyProfile('standard'));
    document.getElementById('replayWizardPromptBtn')?.addEventListener('click', () => {
      const promptText = 'Welcome to Sahaay Bank. Would you like assistance setting up accessibility features for your session? Speak: "Blind", "Low Vision", "Motor", "Senior", or "Skip".';
      window.SahaayVoice.speakText(promptText, 'en-IN', () => {
        window.SahaayVoice.startListening();
      });
    });

    document.querySelectorAll('.select-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyProfile(btn.dataset.profile);
      });
    });

    document.querySelectorAll('.onboarding-profile-card').forEach(card => {
      card.addEventListener('click', () => {
        applyProfile(card.dataset.profile);
      });
    });
  }

  function applyProfile(profileName) {
    closeOnboardingWizard();
    localStorage.setItem('sahaay_a11y_profile', profileName);

    if (profileName === 'blind') {
      setVoiceAlerts(true);
      setTwoClickSafe(true);
      window.SahaayVoice.setVoiceOutput(true);
      window.SahaayVoice.enableContinuousHandsFree(true);
      window.SahaayApp.showToast('Blind Assistance Profile Active');
    } else if (profileName === 'low_vision') {
      setScale(4); // A++ maximum text scale
      applyTheme('contrast');
      setSmartTags(true);
      setClickRead(true);
      setTwoClickSafe(false);
      setHoverSelect(false);
      window.SahaayApp.showToast('Low Vision Profile Active');
    } else if (profileName === 'motor') {
      setHoverSelect(true);
      setTwoClickSafe(true);
      window.SahaayApp.showToast('Motor Assistance Profile Active');
    } else if (profileName === 'senior') {
      setPlainLanguage(true);
      setTwoClickSafe(false);
      setHoverSelect(false);
      document.getElementById('disableTimeoutBtn')?.click();
      window.SahaayApp.showToast('Senior Citizen Profile Active');
    } else {
      applyTheme('fresh');
      setTwoClickSafe(false);
      setHoverSelect(false);
      setPlainLanguage(false);
      setScale(1);
      window.SahaayApp.showToast('Standard Theme Active');
    }
  }

  function openOnboardingWizard() {
    const modal = document.getElementById('a11yOnboardingModal');
    if (!modal) return;
    modal.classList.add('open');
    const promptText = 'Welcome to Sahaay Bank. Would you like assistance setting up accessibility features for your visit? You can choose a profile, or speak: "Blind", "Low Vision", "Motor Assistance", "Senior Citizen", or "Skip".';
    window.SahaayVoice.speakText(promptText, 'en-IN', () => {
      window.SahaayVoice.startListening();
    });
  }

  function closeOnboardingWizard() {
    const modal = document.getElementById('a11yOnboardingModal');
    modal?.classList.remove('open');
  }

  return {
    init,
    applyTheme,
    setScale,
    setClickRead,
    setTwoClickSafe,
    setSmartTags,
    setVoiceAlerts,
    applyProfile,
    openOnboardingWizard,
    closeOnboardingWizard,
    isClickRead: () => clickReadActive,
    isTwoClickSafe: () => twoClickMode
  };
})();
