const {
  readDatabase,
  writeDatabase,
  generateTransactionId,
  generateReferenceId,
  sanitizeUser
} = require('../utils/dbHelper');

exports.getAccount = (req, res) => {
  try {
    const db = readDatabase();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        accountHolder: user.name,
        name: user.name,
        username: user.username,
        accountNumber: user.accountNumber,
        upiId: user.upiId,
        balance: user.balance,
        isFrozen: !!user.isFrozen,
        accessibilityProfile: user.accessibilityProfile || 'standard',
        faceEnrolled: !!(user.faceVerification && user.faceVerification.enrolled)
      }
    });
  } catch (err) {
    console.error('getAccount error:', err);
    res.status(500).json({ success: false, error: 'Database read failure' });
  }
};

exports.toggleFreeze = (req, res) => {
  try {
    const { frozen } = req.body;
    const db = readDatabase();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.isFrozen = (frozen !== undefined) ? !!frozen : !user.isFrozen;
    
    // Also sync top-level account if this is current user
    if (db.account && db.account.accountNumber === user.accountNumber) {
      db.account.isFrozen = user.isFrozen;
    }

    writeDatabase(db);
    res.json({ success: true, isFrozen: user.isFrozen });
  } catch (err) {
    console.error('toggleFreeze error:', err);
    res.status(500).json({ success: false, error: 'Failed to update account freeze state' });
  }
};

exports.deposit = (req, res) => {
  try {
    const { amount } = req.body;
    const amt = Number(amount);

    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'Deposit amount must be a positive number greater than 0.' });
    }

    if (amt > 100000) {
      return res.status(400).json({ success: false, error: 'Maximum demo deposit allowed per transaction is ₹1,00,000.' });
    }

    const db = readDatabase();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    if (user.isFrozen) {
      return res.status(403).json({ success: false, error: 'Account is currently frozen. Unfreeze to deposit funds.' });
    }

    user.balance = Number((user.balance + amt).toFixed(2));

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const displayDate = `${formattedDate}, ${formattedTime}`;

    const newTx = {
      id: generateTransactionId(),
      userId: user.id,
      referenceId: generateReferenceId('SAH-DEP'),
      type: 'DEPOSIT',
      direction: 'CREDIT',
      paymentMethod: 'DIRECT',
      amount: amt,
      balanceAfter: user.balance,
      counterpartyName: 'Demo Cash Deposit',
      counterpartyUserId: user.id,
      counterpartyUpiId: user.upiId,
      reasonCategory: 'Self Deposit',
      reasonText: null,
      description: 'Demo Deposit / Added Funds',
      tag: 'DEPOSIT',
      status: 'SUCCESS',
      date: displayDate,
      timestamp: now.toISOString()
    };

    if (!user.transactions) user.transactions = [];
    user.transactions.unshift(newTx);

    // Sync legacy top-level account
    if (db.account && db.account.accountNumber === user.accountNumber) {
      db.account.balance = user.balance;
    }

    writeDatabase(db);

    res.json({
      success: true,
      message: `Successfully deposited ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} into your demo account.`,
      data: {
        newBalance: user.balance,
        transaction: newTx
      }
    });
  } catch (err) {
    console.error('deposit error:', err);
    res.status(500).json({ success: false, error: 'Demo deposit failed: ' + err.message });
  }
};
