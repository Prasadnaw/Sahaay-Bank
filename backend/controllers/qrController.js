const QRCode = require('qrcode');
const { readDatabase, findUserByIdentifier } = require('../utils/dbHelper');

exports.getMyQr = async (req, res) => {
  try {
    const db = readDatabase();
    const user = req.user ? db.users.find(u => u.id === req.user.id) : null;
    const account = user || db.account || (db.users && db.users[0]);
    const { amount } = req.query;

    const upiId = account.upiId || 'asha.patel@sahaay';
    const name = account.name || account.accountHolder || 'Asha Patel';
    const userId = account.id || 'USR-1001';
    const accNum = account.accountNumber ? account.accountNumber.toString() : '4417';
    const maskedAcc = accNum.length > 4 ? '****' + accNum.slice(-4) : '****' + accNum;

    // Structured non-sensitive demo payment identity
    const paymentIdentity = {
      type: 'SAHAAY_PAYMENT',
      version: 1,
      upiId: upiId,
      userId: userId,
      name: name
    };

    if (amount && Number(amount) > 0) {
      paymentIdentity.amount = Number(amount);
    }

    const payloadString = JSON.stringify(paymentIdentity);

    // Generate real, standards-compliant QR SVG and Data URL
    const svg = await QRCode.toString(payloadString, {
      type: 'svg',
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    });

    const dataUrl = await QRCode.toDataURL(payloadString, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        ...paymentIdentity,
        accountNumberMasked: maskedAcc,
        accountHolder: name,
        payload: payloadString,
        svg: svg,
        dataUrl: dataUrl
      }
    });
  } catch (err) {
    console.error('getMyQr error:', err);
    res.status(500).json({ success: false, error: 'QR retrieval error: ' + err.message });
  }
};

exports.generateQr = async (req, res) => {
  try {
    const text = req.query.text || req.body?.text;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text/payload is required' });
    }

    const svg = await QRCode.toString(text, {
      type: 'svg',
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    });

    const dataUrl = await QRCode.toDataURL(text, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M'
    });

    res.json({
      success: true,
      data: {
        payload: text,
        svg: svg,
        dataUrl: dataUrl
      }
    });
  } catch (err) {
    console.error('generateQr error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate QR: ' + err.message });
  }
};

exports.scanQr = (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, error: 'Empty QR payload' });
    }

    let upiId = null;
    let userId = null;
    let name = null;
    let amount = null;

    // Check if JSON SAHAAY_PAYMENT format
    if (typeof payload === 'string' && payload.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(payload);
        upiId = parsed.upiId;
        userId = parsed.userId;
        name = parsed.name;
        amount = parsed.amount || null;
      } catch (e) {}
    }

    // Check if standard upi://pay format
    if (!upiId && typeof payload === 'string' && payload.startsWith('upi://pay')) {
      try {
        const url = new URL(payload.replace('upi://pay', 'http://upi.dummy'));
        upiId = url.searchParams.get('pa');
        name = url.searchParams.get('pn');
        amount = url.searchParams.get('am') ? Number(url.searchParams.get('am')) : null;
      } catch (e) {}
    }

    // Fallback: raw upi ID string
    if (!upiId && typeof payload === 'string') {
      upiId = payload.trim();
    }

    if (!upiId && !userId) {
      return res.status(400).json({ success: false, error: 'Unrecognized QR code format' });
    }

    // Authoritative lookup in database
    const identifier = upiId || userId;
    const user = findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Scanned recipient (${identifier}) is not a registered Sahaay Bank user.`
      });
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
        payeeId: user.upiId,
        payeeName: user.name,
        accountNumberMasked: maskedAcc,
        amount: amount || null
      }
    });
  } catch (err) {
    console.error('scanQr error:', err);
    res.status(500).json({ success: false, error: 'Failed to decode QR code: ' + err.message });
  }
};
