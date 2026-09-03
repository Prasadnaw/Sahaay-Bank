/**
 * Sahaay Bank REST API Client
 * Connects to live backend when available with transparent local fallback.
 */
window.SahaayAPI = (function(){
  'use strict';

  const BASE_URL = window.SahaayConfig.apiBaseUrl;
  let isBackendOnline = false;

  // Local fallback storage state
  const localState = {
    balance: window.SahaayConfig.initialBalance,
    isFrozen: false,
    upiPin: window.SahaayConfig.defaultUpiPin,
    transactions: [
      { id: 1, date: '2 Sep 2026', description: 'Salary Credit — TechCorp', type: 'Credit', amount: 15000.00, tag: 'SALARY' },
      { id: 2, date: '1 Sep 2026', description: 'Electricity Bill — BESCOM', type: 'Debit', amount: 1240.00, tag: 'UTILITY' },
      { id: 3, date: '30 Aug 2026', description: 'Grocery Store — Big Bazaar', type: 'Debit', amount: 2300.00, tag: 'GROCERY' },
      { id: 4, date: '28 Aug 2026', description: 'Personal Transfer — Rahul Sharma', type: 'Debit', amount: 500.00, tag: 'TRANSFER' },
      { id: 5, date: '25 Aug 2026', description: 'Pharmacy Medicine — Apollo', type: 'Debit', amount: 2200.00, tag: 'HEALTH' }
    ]
  };

  async function checkBackendHealth(){
    try {
      const res = await fetch(`${BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(1200) });
      isBackendOnline = res.ok;
    } catch(e) {
      isBackendOnline = false;
    }
    return isBackendOnline;
  }

  async function getAccount(){
    if(await checkBackendHealth()){
      try {
        const res = await fetch(`${BASE_URL}/account`);
        if(res.ok) return await res.json();
      } catch(e){}
    }
    return {
      success: true,
      data: {
        accountHolder: window.SahaayConfig.accountHolder,
        accountNumber: window.SahaayConfig.accountNumber,
        upiId: window.SahaayConfig.defaultUpiId,
        balance: localState.balance,
        isFrozen: localState.isFrozen
      }
    };
  }

  async function getTransactions(){
    if(await checkBackendHealth()){
      try {
        const res = await fetch(`${BASE_URL}/transactions`);
        if(res.ok) return await res.json();
      } catch(e){}
    }
    return { success: true, data: localState.transactions };
  }

  async function verifyUpiPin(pin){
    if(await checkBackendHealth()){
      try {
        const res = await fetch(`${BASE_URL}/upi/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        if(res.ok) return await res.json();
      } catch(e){}
    }
    const isValid = (pin === localState.upiPin);
    return { success: isValid, error: isValid ? null : 'Invalid UPI PIN' };
  }

  async function executeTransfer(payee, amount, pin){
    const amt = Number(amount);
    if(await checkBackendHealth()){
      try {
        const res = await fetch(`${BASE_URL}/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payee, amount: amt, pin })
        });
        if(res.ok) return await res.json();
      } catch(e){}
    }

    if(pin !== localState.upiPin){
      return { success: false, error: 'Invalid UPI PIN (Demo PIN is 1234)' };
    }
    if(localState.isFrozen){
      return { success: false, error: 'Account is currently frozen' };
    }

    localState.balance -= amt;
    const newTx = {
      id: Date.now(),
      date: 'Today',
      description: `UPI Payment to ${payee}`,
      type: 'Debit',
      amount: amt,
      tag: 'UPI'
    };
    localState.transactions.unshift(newTx);

    return {
      success: true,
      data: {
        newBalance: localState.balance,
        transaction: newTx
      }
    };
  }

  async function toggleFreeze(freezeState){
    if(await checkBackendHealth()){
      try {
        const res = await fetch(`${BASE_URL}/account/freeze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frozen: freezeState })
        });
        if(res.ok) return await res.json();
      } catch(e){}
    }
    localState.isFrozen = freezeState;
    return { success: true, isFrozen: localState.isFrozen };
  }

  return {
    getAccount,
    getTransactions,
    verifyUpiPin,
    executeTransfer,
    toggleFreeze,
    checkBackendHealth,
    isOnline: () => isBackendOnline
  };
})();
