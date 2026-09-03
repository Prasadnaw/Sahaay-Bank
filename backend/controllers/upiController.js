const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

function getDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

exports.verifyPin = (req, res) => {
  try {
    const { pin } = req.body;
    const db = getDb();
    const isValid = (pin === db.account.upiPin);
    res.json({ success: isValid, error: isValid ? null : 'Invalid UPI PIN' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'PIN verification service error' });
  }
};

exports.changePin = (req, res) => {
  try {
    const { newPin } = req.body;
    if (!newPin || newPin.length !== 4) {
      return res.status(400).json({ success: false, error: 'UPI PIN must be exactly 4 digits' });
    }
    const db = getDb();
    db.account.upiPin = newPin;
    saveDb(db);
    res.json({ success: true, message: 'UPI PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update UPI PIN' });
  }
};
