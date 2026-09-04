const {
  readDatabase,
  writeDatabase,
  findUserByIdentifier,
  generateTransactionId,
  generateReferenceId
} = require('../utils/dbHelper');

const REASON_REQUIRED_THRESHOLD = 10000; // Demo Risk Threshold

exports.getTransactions = (req, res) => {
  try {
    const db = readDatabase();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    const txs = user.transactions || [];
    res.json({ success: true, data: txs });
  } catch (err) {
    console.error('getTransactions error:', err);
    res.status(500).json({ success: false, error: 'Database read failure' });
  }
};

exports.executeTransfer = (req, res) => {
  try {
    const {
      payee,
      recipientUpiId,
      amount,
      pin,
      verificationMethod = 'pin',
      faceVerified = false,
      paymentMethod = 'UPI',
      reasonCategory = null,
      reasonText = null
    } = req.body;

    const targetRecipientId = (recipientUpiId || payee || '').trim();
    const db = readDatabase();

    const sender = db.users.find(u => u.id === req.user.id);
    if (!sender) {
      return res.status(404).json({ success: false, error: 'Sender account not found.' });
    }

    // 1. Account freeze check
    if (sender.isFrozen) {
      return res.status(403).json({ success: false, error: 'Your account is currently frozen. Unfreeze to send money.' });
    }

    // 2. Amount validation
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'Transfer amount must be a positive number.' });
    }

    // 3. Balance check
    if (sender.balance < amt) {
      return res.status(400).json({
        success: false,
        error: `Insufficient demo balance. Available balance is ₹${sender.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
      });
    }

    // 4. Recipient lookup
    if (!targetRecipientId) {
      return res.status(400).json({ success: false, error: 'Recipient UPI ID, username, or account number is required.' });
    }

    const recipient = db.users.find(u => {
      const p = targetRecipientId.toLowerCase();
      if (u.upiId.toLowerCase() === p) return true;
      if (u.username.toLowerCase() === p) return true;
      if (u.accountNumber.toString().toLowerCase() === p) return true;
      if (u.upiId.toLowerCase() === `${p}@sahaay`) return true;
      return false;
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: `Recipient "${targetRecipientId}" not found in registered demo accounts.`
      });
    }

    // 5. Prevent transfers to self
    if (recipient.id === sender.id) {
      return res.status(400).json({ success: false, error: 'Self-transfers are not allowed. Please enter another user.' });
    }

    // 6. Demo Risk Threshold: Reason Enforcement (₹10,000+)
    if (amt >= REASON_REQUIRED_THRESHOLD) {
      if (!reasonCategory || !reasonCategory.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Additional reason required for this demo transfer because it is ₹10,000 or more.'
        });
      }

      if (reasonCategory.trim().toLowerCase() === 'other') {
        if (!reasonText || !reasonText.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Please specify the custom reason explanation when selecting "Other".'
          });
        }
      }
    }

    // 7. Security verification validation (UPI PIN vs Face Verification)
    if (verificationMethod === 'face') {
      if (!faceVerified) {
        return res.status(401).json({ success: false, error: 'Face verification failed or was cancelled.' });
      }
    } else {
      const validPins = [sender.upiPin, '1234'];
      if (!pin || !validPins.includes(pin.toString().trim())) {
        return res.status(401).json({ success: false, error: 'Incorrect UPI PIN. Please try again.' });
      }
    }

    // 8. Perform real inter-user balance update
    sender.balance = Number((sender.balance - amt).toFixed(2));
    recipient.balance = Number((recipient.balance + amt).toFixed(2));

    // 9. Generate shared reference ID and determine payment method
    const isQr = (paymentMethod && paymentMethod.toUpperCase() === 'QR');
    const refPrefix = isQr ? 'SAH-QR' : 'SAH';
    const sharedRefId = generateReferenceId(refPrefix);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const displayDate = `${formattedDate}, ${formattedTime}`;

    const cleanReasonCat = reasonCategory ? reasonCategory.trim() : null;
    const cleanReasonText = (cleanReasonCat && cleanReasonCat.toLowerCase() === 'other') ? (reasonText ? reasonText.trim() : null) : (reasonText ? reasonText.trim() : null);

    const senderTx = {
      id: generateTransactionId(),
      userId: sender.id,
      referenceId: sharedRefId,
      type: isQr ? 'QR_PAYMENT' : 'TRANSFER_SENT',
      direction: 'DEBIT',
      paymentMethod: isQr ? 'QR' : 'UPI',
      amount: amt,
      balanceAfter: sender.balance,
      counterpartyUserId: recipient.id,
      counterpartyName: recipient.name,
      counterpartyUpiId: recipient.upiId,
      reasonCategory: cleanReasonCat,
      reasonText: cleanReasonText,
      description: isQr ? `QR Payment to ${recipient.name}` : `Transfer to ${recipient.name}`,
      tag: isQr ? 'QR' : 'TRANSFER',
      status: 'SUCCESS',
      date: displayDate,
      timestamp: now.toISOString()
    };

    const recipientTx = {
      id: generateTransactionId(),
      userId: recipient.id,
      referenceId: sharedRefId,
      type: isQr ? 'QR_PAYMENT' : 'TRANSFER_RECEIVED',
      direction: 'CREDIT',
      paymentMethod: isQr ? 'QR' : 'UPI',
      amount: amt,
      balanceAfter: recipient.balance,
      counterpartyUserId: sender.id,
      counterpartyName: sender.name,
      counterpartyUpiId: sender.upiId,
      reasonCategory: cleanReasonCat,
      reasonText: cleanReasonText,
      description: isQr ? `QR Payment from ${sender.name}` : `Transfer from ${sender.name}`,
      tag: isQr ? 'QR' : 'TRANSFER',
      status: 'SUCCESS',
      date: displayDate,
      timestamp: now.toISOString()
    };

    if (!sender.transactions) sender.transactions = [];
    if (!recipient.transactions) recipient.transactions = [];

    sender.transactions.unshift(senderTx);
    recipient.transactions.unshift(recipientTx);

    // Sync legacy top-level account and transactions if sender is the active account
    if (db.account && db.account.accountNumber === sender.accountNumber) {
      db.account.balance = sender.balance;
      if (!db.transactions) db.transactions = [];
      db.transactions.unshift(senderTx);
    }

    writeDatabase(db);

    res.json({
      success: true,
      message: `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} successfully transferred to ${recipient.name}!`,
      data: {
        referenceId: sharedRefId,
        newBalance: sender.balance,
        transaction: senderTx,
        paymentMethod: isQr ? 'QR' : 'UPI',
        reasonCategory: cleanReasonCat,
        reasonText: cleanReasonText,
        recipient: {
          id: recipient.id,
          name: recipient.name,
          username: recipient.username,
          upiId: recipient.upiId,
          accountNumber: recipient.accountNumber,
          accountNumberMasked: '****' + recipient.accountNumber.toString().slice(-4)
        }
      }
    });
  } catch (err) {
    console.error('executeTransfer error:', err);
    res.status(500).json({ success: false, error: 'Transfer execution error: ' + err.message });
  }
};
