const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

function getDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

exports.getTransactions = (req, res) => {
  try {
    const db = getDb();
    res.json({ success: true, data: db.transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database read failure' });
  }
};

exports.executeTransfer = (req, res) => {
  try {
    const { payee, amount, pin } = req.body;
    const db = getDb();

    if (db.account.isFrozen) {
      return res.status(403).json({ success: false, error: 'Account is currently frozen' });
    }

    if (!pin || pin !== db.account.upiPin) {
      return res.status(401).json({ success: false, error: 'Invalid UPI PIN' });
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid transfer amount' });
    }

    if (db.account.balance < amt) {
      return res.status(400).json({ success: false, error: 'Insufficient funds' });
    }

    db.account.balance -= amt;
    const newTx = {
      id: Date.now(),
      date: 'Today',
      description: `UPI Payment to ${payee || 'Merchant'}`,
      type: 'Debit',
      amount: amt,
      tag: 'UPI'
    };
    db.transactions.unshift(newTx);
    saveDb(db);

    res.json({
      success: true,
      data: {
        newBalance: db.account.balance,
        transaction: newTx
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Transfer execution error' });
  }
};
