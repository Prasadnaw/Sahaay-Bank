/**
 * Sahaay Bank UPI PIN Security & Transfer Service
 */
window.SahaayUpi = (function () {
  'use strict';

  let enteredPin = '';
  let pendingPayee = '';
  let pendingAmount = 0;
  let pendingReason = '';
  let pendingPaymentMethod = 'UPI';
  let pendingReasonCategory = null;
  let pendingReasonText = null;

  function playTapSound(freq = 560, duration = 0.07) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playSuccessChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  function playErrorBuzzer() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById(`dot-${i}`);
      if (!d) continue;
      d.classList.remove('filled', 'error');
      if (i < enteredPin.length) d.classList.add('filled');
    }
  }

  function showReceipt(data, payee, amount) {
    const modal = document.getElementById('transferReceiptModal');
    if (!modal) return;
    const amtEl = document.getElementById('receiptAmountDisplay');
    const toNameEl = document.getElementById('receiptToName');
    const toUpiEl = document.getElementById('receiptToUpi');
    const fromNameEl = document.getElementById('receiptFromName');
    const refIdEl = document.getElementById('receiptRefId');
    const badgeEl = document.getElementById('receiptMethodBadge');
    const reasonRow = document.getElementById('receiptReasonRow');
    const reasonVal = document.getElementById('receiptReasonVal');
    const currUser = window.SahaayAPI.getCurrentUser();

    const isQr = (data.paymentMethod === 'QR' || pendingPaymentMethod === 'QR');
    if (badgeEl) {
      badgeEl.textContent = isQr ? '📱 QR PAYMENT SUCCESSFUL' : '✓ TRANSFER SUCCESSFUL';
      badgeEl.style.background = isQr ? 'var(--gold-dark)' : 'var(--success)';
    }

    if (amtEl) amtEl.textContent = '₹ ' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    if (toNameEl) toNameEl.textContent = data.recipient?.name || payee;
    if (toUpiEl) toUpiEl.textContent = data.recipient?.upiId || payee;
    if (fromNameEl) fromNameEl.textContent = currUser?.name || 'Asha Patel';
    if (refIdEl) refIdEl.textContent = data.referenceId || 'SAH-DEMO-TXN';

    const fullReason = data.reasonCategory
      ? `${data.reasonCategory}${data.reasonText ? ' — ' + data.reasonText : ''}`
      : pendingReason;

    if (reasonRow && reasonVal) {
      if (fullReason && fullReason.trim()) {
        reasonRow.style.display = 'flex';
        reasonVal.textContent = fullReason.trim();
      } else {
        reasonRow.style.display = 'none';
      }
    }

    modal.classList.add('open');
    const doneBtn = document.getElementById('doneReceiptBtn');
    const closeBtn = document.getElementById('closeReceiptBtn');
    const closeFn = () => {
      modal.classList.remove('open');
      if (window.SahaayApp && window.SahaayApp.switchMobileView && (document.body.classList.contains('is-mobile-app') || window.innerWidth <= 820)) {
        window.SahaayApp.switchMobileView('transactions');
      }
    };
    if (doneBtn) doneBtn.onclick = closeFn;
    if (closeBtn) closeBtn.onclick = closeFn;
  }

  function handleTransferSuccess(res, payee, amount, reason) {
    playSuccessChime();

    // 1. Immediately refresh balance in UI
    const newBal = (res.data?.newBalance !== undefined) ? res.data.newBalance : (res.newBalance !== undefined ? res.newBalance : null);
    if (newBal !== null && window.SahaayApp && window.SahaayApp.refreshAccountBalance) {
      window.SahaayApp.refreshAccountBalance(newBal);
    } else if (newBal !== null && newBal !== undefined) {
      const balEl = document.getElementById('mainBalanceText');
      if (balEl) {
        balEl.textContent = '₹ ' + Number(newBal).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
    }

    // 2. Reload statement table and mobile passbook
    if (window.SahaayApp && window.SahaayApp.loadTransactions) {
      window.SahaayApp.loadTransactions();
    }

    // 3. Reset transfer forms (both desktop and mobile)
    if (document.getElementById('payee')) document.getElementById('payee').value = '';
    if (document.getElementById('payeeSearchInput')) document.getElementById('payeeSearchInput').value = '';
    if (document.getElementById('amount')) document.getElementById('amount').value = '';
    if (document.getElementById('transferReason')) document.getElementById('transferReason').value = '';
    const preview = document.getElementById('recipientPreviewCard');
    if (preview) preview.style.display = 'none';

    // Mobile inputs reset
    if (document.getElementById('mobilePayeeInput')) document.getElementById('mobilePayeeInput').value = '';
    if (document.getElementById('mobileAmountInput')) document.getElementById('mobileAmountInput').value = '';
    if (document.getElementById('mobileNoteInput')) document.getElementById('mobileNoteInput').value = '';
    const mobVerifiedCard = document.getElementById('mobileVerifiedPayeeCard');
    if (mobVerifiedCard) mobVerifiedCard.hidden = true;

    // 4. Show toast & receipt modal
    const recipientName = res.data?.recipient?.name || payee;
    const isQr = (res.data?.paymentMethod === 'QR' || pendingPaymentMethod === 'QR');
    const methodLabel = isQr ? 'QR Payment' : 'Transfer';
    window.SahaayApp?.showToast(`✓ ₹${amount} ${methodLabel} Sent to ${recipientName}!`);
    window.SahaayVoice?.announce(
      `${methodLabel} of ₹${amount} to ${recipientName} was successful. Reference ID ${res.data?.referenceId}.`,
      true
    );
    showReceipt(res.data, payee, amount);
  }

  function openKeypad(payee, amount, reason = '', paymentMethod = 'UPI', reasonCategory = null, reasonText = null) {
    pendingPayee = payee;
    pendingAmount = Number(amount);
    pendingReason = reason;
    pendingPaymentMethod = paymentMethod || 'UPI';
    pendingReasonCategory = reasonCategory;
    pendingReasonText = reasonText;
    enteredPin = '';

    const modal = document.getElementById('upiPinModal');
    const payeeEl = document.getElementById('upiPayeeName');
    const amtEl = document.getElementById('upiPayAmount');
    if (payeeEl) payeeEl.textContent = payee + (reason ? ` [${reason}]` : '');
    if (amtEl) amtEl.textContent = '₹' + pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    updateDots();
    if (modal) {
      modal.classList.add('open');
      window.SahaayVoice?.announce(`UPI PIN required. Paying ₹${pendingAmount} to ${payee}. Enter 4-digit PIN.`, true);
    }
  }

  function closeKeypad() {
    const modal = document.getElementById('upiPinModal');
    if (modal) modal.classList.remove('open');
    enteredPin = '';
    updateDots();
  }

  function appendDigit(d) {
    if (enteredPin.length < 4) {
      enteredPin += d;
      playTapSound();
      updateDots();
      if (enteredPin.length === 4) {
        setTimeout(submitPin, 200);
      }
    }
  }

  function clearPin() {
    enteredPin = '';
    playTapSound(320);
    updateDots();
  }

  async function submitPin() {
    const res = await window.SahaayAPI.executeTransfer(
      pendingPayee,
      pendingAmount,
      enteredPin,
      'pin',
      false,
      pendingPaymentMethod,
      pendingReasonCategory,
      pendingReasonText
    );

    if (res.success) {
      closeKeypad();
      handleTransferSuccess(res, pendingPayee, pendingAmount, pendingReason);
    } else {
      playErrorBuzzer();
      const dots = [document.getElementById('dot-0'), document.getElementById('dot-1'), document.getElementById('dot-2'), document.getElementById('dot-3')];
      dots.forEach(d => d && d.classList.add('error'));
      window.SahaayApp?.showToast(res.error || 'Wrong UPI PIN');
      window.SahaayVoice?.announce(res.error || 'Wrong UPI PIN. Demo PIN is 1234. Please try again.', true);
      setTimeout(() => {
        enteredPin = '';
        updateDots();
      }, 700);
    }
  }

  /**
   * Main dispatch entry point for initiating a transfer.
   * Dispatches to Face Verification or UPI PIN Keypad based on selected method.
   */
  async function initiateTransfer(payee, amount, reason = '', authMethod = 'pin', paymentMethod = 'UPI', reasonCategory = null, reasonText = null) {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      window.SahaayApp?.showToast('⚠️ Please enter an amount greater than ₹0');
      return;
    }

    pendingPayee = payee;
    pendingAmount = amt;
    pendingReason = reason;
    pendingPaymentMethod = paymentMethod || 'UPI';
    pendingReasonCategory = reasonCategory;
    pendingReasonText = reasonText;

    if (authMethod === 'face') {
      // 1. Prompt Camera Biometric Face Verification
      const faceVerified = await window.SahaayFace?.verifyFacePrompt(payee, amt);
      if (faceVerified) {
        // Execute transfer with biometric authorization
        const res = await window.SahaayAPI.executeTransfer(
          payee,
          amt,
          null,
          'face',
          true,
          paymentMethod,
          reasonCategory,
          reasonText
        );
        if (res.success) {
          handleTransferSuccess(res, payee, amt, reason);
        } else {
          window.SahaayApp?.showToast(res.error || 'Transfer failed');
          window.SahaayVoice?.announce(res.error || 'Transfer failed', true);
        }
      } else {
        // Face verification cancelled or failed -> fallback to UPI PIN keypad
        openKeypad(payee, amt, reason, paymentMethod, reasonCategory, reasonText);
      }
    } else {
      // Default: UPI PIN Keypad
      openKeypad(payee, amt, reason, paymentMethod, reasonCategory, reasonText);
    }
  }

  function init() {
    document.querySelectorAll('.upi-key[data-digit]').forEach(btn => {
      btn.addEventListener('click', () => appendDigit(btn.dataset.digit));
    });
    document.getElementById('upiClearKey')?.addEventListener('click', clearPin);
    document.getElementById('upiSubmitKey')?.addEventListener('click', submitPin);
    document.getElementById('closeUpiModalBtn')?.addEventListener('click', closeKeypad);

    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('upiPinModal');
      if (modal && modal.classList.contains('open')) {
        if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
        else if (e.key === 'Backspace') {
          enteredPin = enteredPin.slice(0, -1);
          updateDots();
        } else if (e.key === 'Enter' && enteredPin.length === 4) submitPin();
        else if (e.key === 'Escape') closeKeypad();
      }
    });
  }

  return {
    init,
    initiateTransfer,
    openKeypad,
    closeKeypad,
    showReceipt
  };
})();
