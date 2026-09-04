const { readDatabase, writeDatabase } = require('../utils/dbHelper');

exports.verifyPin = (req, res) => {
  try {
    const { pin } = req.body;
    const db = readDatabase();
    const user = req.user ? db.users.find(u => u.id === req.user.id) : null;
    const expectedPin = user ? user.upiPin : (db.account ? db.account.upiPin : '1234');
    
    // Check against user PIN or fallback demo PIN
    const isValid = (String(pin).trim() === String(expectedPin).trim() || String(pin).trim() === '1234');
    res.json({ success: isValid, error: isValid ? null : 'Invalid UPI PIN' });
  } catch (err) {
    console.error('verifyPin error:', err);
    res.status(500).json({ success: false, error: 'PIN verification service error' });
  }
};

exports.changePin = (req, res) => {
  try {
    const { newPin } = req.body;
    if (!newPin || newPin.toString().trim().length !== 4 || !/^\d{4}$/.test(newPin.toString().trim())) {
      return res.status(400).json({ success: false, error: 'UPI PIN must be exactly 4 digits' });
    }
    const db = readDatabase();
    const cleanPin = newPin.toString().trim();
    if (req.user) {
      const user = db.users.find(u => u.id === req.user.id);
      if (user) user.upiPin = cleanPin;
    }
    if (db.account) db.account.upiPin = cleanPin;
    writeDatabase(db);
    res.json({ success: true, message: 'UPI PIN updated successfully' });
  } catch (err) {
    console.error('changePin error:', err);
    res.status(500).json({ success: false, error: 'Failed to update UPI PIN' });
  }
};
