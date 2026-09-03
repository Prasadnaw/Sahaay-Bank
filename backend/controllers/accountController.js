const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

function getDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

exports.getAccount = (req, res) => {
  try {
    const db = getDb();
    const { upiPin, ...safeAccount } = db.account;
    res.json({ success: true, data: safeAccount });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database read failure' });
  }
};

exports.toggleFreeze = (req, res) => {
  try {
    const db = getDb();
    const { frozen } = req.body;
    db.account.isFrozen = (frozen !== undefined) ? frozen : !db.account.isFrozen;
    saveDb(db);
    res.json({ success: true, isFrozen: db.account.isFrozen });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update account freeze state' });
  }
};
