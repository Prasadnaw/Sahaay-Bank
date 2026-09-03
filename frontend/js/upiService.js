/**
 * Sahaay Bank UPI PIN Security Service
 */
window.SahaayUpi = (function(){
  'use strict';

  let enteredPin = '';
  let pendingPayee = '';
  let pendingAmount = 0;
  let pendingReason = '';

  function playTapSound(freq = 560, duration = 0.07){
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext) return;
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
    } catch(e){}
  }

  function playSuccessChime(){
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext) return;
      const ctx = new AudioContext();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i)=>{
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
    } catch(e){}
  }

  function playErrorBuzzer(){
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext) return;
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
    } catch(e){}
  }

  function updateDots(){
    for(let i=0; i<4; i++){
      const d = document.getElementById(`dot-${i}`);
      if(!d) continue;
      d.classList.remove('filled', 'error');
      if(i < enteredPin.length) d.classList.add('filled');
    }
  }

  function openKeypad(payee, amount, reason = ''){
    pendingPayee = payee;
    pendingAmount = Number(amount);
    pendingReason = reason;
    enteredPin = '';
    const modal = document.getElementById('upiPinModal');
    const payeeEl = document.getElementById('upiPayeeName');
    const amtEl = document.getElementById('upiPayAmount');
    if(payeeEl) payeeEl.textContent = payee + (reason ? ` [${reason}]` : '');
    if(amtEl) amtEl.textContent = '₹' + pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    updateDots();
    if(modal) {
      modal.classList.add('open');
      window.SahaayVoice.announce(`UPI PIN required. Paying ₹${pendingAmount} to ${payee}. Enter 4-digit PIN.`, true);
    }
  }

  function closeKeypad(){
    const modal = document.getElementById('upiPinModal');
    if(modal) modal.classList.remove('open');
    enteredPin = '';
    updateDots();
  }

  function appendDigit(d){
    if(enteredPin.length < 4){
      enteredPin += d;
      playTapSound();
      updateDots();
      if(enteredPin.length === 4){
        setTimeout(submitPin, 200);
      }
    }
  }

  function clearPin(){
    enteredPin = '';
    playTapSound(320);
    updateDots();
  }

  async function submitPin(){
    const res = await window.SahaayAPI.executeTransfer(pendingPayee, pendingAmount, enteredPin);
    if(res.success){
      playSuccessChime();
      closeKeypad();

      // Update balance & statement in UI
      const balEl = document.getElementById('mainBalanceText');
      if(balEl) {
        balEl.textContent = '₹ ' + res.data.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }

      const tbody = document.getElementById('transactionTbody');
      if(tbody && res.data.transaction){
        const tx = res.data.transaction;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${tx.date}</td>
          <td>${tx.description} ${pendingReason ? `[${pendingReason}]` : ''} <span class="smart-tag">[UPI]</span></td>
          <td><strong style="color:var(--danger);">${tx.type}</strong></td>
          <td class="amt debit">− ₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        `;
        tbody.prepend(row);
      }

      // Reset form
      if(document.getElementById('payee')) document.getElementById('payee').value = '';
      if(document.getElementById('amount')) document.getElementById('amount').value = '';
      if(document.getElementById('transferReason')) document.getElementById('transferReason').value = '';

      window.SahaayApp.showToast(`✓ ₹${pendingAmount} Sent to ${pendingPayee}!`);
      window.SahaayVoice.announce(`UPI Payment of ₹${pendingAmount} to ${pendingPayee} was successful!`, true);
    } else {
      playErrorBuzzer();
      const dots = [document.getElementById('dot-0'), document.getElementById('dot-1'), document.getElementById('dot-2'), document.getElementById('dot-3')];
      dots.forEach(d => d && d.classList.add('error'));
      window.SahaayApp.showToast(res.error || 'Wrong UPI PIN');
      window.SahaayVoice.announce(res.error || 'Wrong UPI PIN. Demo PIN is 1234. Please try again.', true);
      setTimeout(()=>{
        enteredPin = '';
        updateDots();
      }, 700);
    }
  }

  function init(){
    document.querySelectorAll('.upi-key[data-digit]').forEach(btn => {
      btn.addEventListener('click', () => appendDigit(btn.dataset.digit));
    });
    document.getElementById('upiClearKey')?.addEventListener('click', clearPin);
    document.getElementById('upiSubmitKey')?.addEventListener('click', submitPin);
    document.getElementById('closeUpiModalBtn')?.addEventListener('click', closeKeypad);

    window.addEventListener('keydown', (e)=>{
      const modal = document.getElementById('upiPinModal');
      if(modal && modal.classList.contains('open')){
        if(e.key >= '0' && e.key <= '9') appendDigit(e.key);
        else if(e.key === 'Backspace') {
          enteredPin = enteredPin.slice(0, -1);
          updateDots();
        } else if(e.key === 'Enter' && enteredPin.length === 4) submitPin();
        else if(e.key === 'Escape') closeKeypad();
      }
    });
  }

  return {
    init,
    openKeypad,
    closeKeypad
  };
})();
