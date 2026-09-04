const { readDatabase, findUserByIdentifier } = require('../utils/dbHelper');

exports.searchUsers = (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const db = readDatabase();
    const currentUserId = req.user ? req.user.id : null;

    let matches = db.users;

    if (q) {
      matches = db.users.filter(u => {
        return (
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.upiId.toLowerCase().includes(q) ||
          u.accountNumber.toString().includes(q)
        );
      });
    }

    // Return safe public details (never passwords, pins, balances, or face templates)
    const results = matches
      .filter(u => u.id !== currentUserId) // Exclude current user from search recipients
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        upiId: u.upiId,
        accountNumber: u.accountNumber,
        accessibilityProfile: u.accessibilityProfile
      }));

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ success: false, error: 'User search failure' });
  }
};

exports.lookupUser = (req, res) => {
  try {
    const q = req.query.upiId || req.query.identifier || req.query.userId || req.query.q || '';
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'Recipient UPI ID or identifier is required.' });
    }

    const user = findUserByIdentifier(q.trim());
    if (!user) {
      return res.status(404).json({ success: false, error: `Recipient "${q}" not found in registered accounts.` });
    }

    const accStr = user.accountNumber ? user.accountNumber.toString() : '';
    const maskedAcc = accStr.length > 4 ? '****' + accStr.slice(-4) : '****' + accStr;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        upiId: user.upiId,
        accountNumberMasked: maskedAcc
      },
      data: {
        id: user.id,
        name: user.name,
        upiId: user.upiId,
        accountNumberMasked: maskedAcc,
        accountNumber: user.accountNumber
      }
    });
  } catch (err) {
    console.error('Lookup user error:', err);
    res.status(500).json({ success: false, error: 'Recipient lookup failure' });
  }
};

exports.getUserByIdentifier = (req, res) => {
  try {
    const { identifier } = req.params;
    const user = findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Recipient not found in Sahaay Bank directory.' });
    }

    const accStr = user.accountNumber ? user.accountNumber.toString() : '';
    const maskedAcc = accStr.length > 4 ? '****' + accStr.slice(-4) : '****' + accStr;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        upiId: user.upiId,
        accountNumberMasked: maskedAcc
      },
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        upiId: user.upiId,
        accountNumber: user.accountNumber,
        accountNumberMasked: maskedAcc
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, error: 'Recipient lookup failure' });
  }
};
