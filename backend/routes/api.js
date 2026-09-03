const express = require('express');
const router = express.Router();

const accountCtrl = require('../controllers/accountController');
const transactionCtrl = require('../controllers/transactionController');
const upiCtrl = require('../controllers/upiController');
const qrCtrl = require('../controllers/qrController');

// Health Check
router.get('/health', (req, res) => res.json({ status: 'UP', timestamp: new Date().toISOString() }));

// Account Endpoints
router.get('/account', accountCtrl.getAccount);
router.post('/account/freeze', accountCtrl.toggleFreeze);

// Transactions & Transfers
router.get('/transactions', transactionCtrl.getTransactions);
router.post('/transfer', transactionCtrl.executeTransfer);

// UPI PIN Security
router.post('/upi/verify-pin', upiCtrl.verifyPin);
router.post('/upi/change-pin', upiCtrl.changePin);

// QR Code Services
router.get('/qr/my-qr', qrCtrl.getMyQr);
router.post('/qr/scan', qrCtrl.scanQr);

module.exports = router;
