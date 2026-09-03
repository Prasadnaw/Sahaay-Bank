const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');

function getDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

exports.getMyQr = (req, res) => {
  try {
    const db = getDb();
    const { amount } = req.query;
    let upiPayload = `upi://pay?pa=${db.account.upiId}&pn=${encodeURIComponent(db.account.accountHolder)}`;
    if (amount) upiPayload += `&am=${amount}`;

    res.json({
      success: true,
      data: {
        upiId: db.account.upiId,
        accountHolder: db.account.accountHolder,
        accountNumber: db.account.accountNumber,
        amount: amount || null,
        payload: upiPayload
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR retrieval error' });
  }
};

exports.scanQr = (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload || !payload.startsWith('upi://pay')) {
      return res.status(400).json({ success: false, error: 'Invalid UPI QR format' });
    }

    const url = new URL(payload.replace('upi://pay', 'http://upi.dummy'));
    const pa = url.searchParams.get('pa');
    const pn = url.searchParams.get('pn');
    const am = url.searchParams.get('am');

    res.json({
      success: true,
      data: {
        payeeId: pa,
        payeeName: pn || 'Merchant',
        amount: am ? Number(am) : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to decode QR code' });
  }
};
