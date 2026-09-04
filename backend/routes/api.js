const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const accountCtrl = require('../controllers/accountController');
const transactionCtrl = require('../controllers/transactionController');
const userCtrl = require('../controllers/userController');
const upiCtrl = require('../controllers/upiController');
const qrCtrl = require('../controllers/qrController');

// 1. Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    backend: 'sahaay',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Authentication
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.post('/auth/enroll-face', authMiddleware, authCtrl.enrollFace);
router.get('/auth/face-profiles', authCtrl.getFaceProfiles);
router.post('/auth/face-login', authCtrl.faceLogin);

// 3. User Directory & Search
router.get('/users/search', authMiddleware, userCtrl.searchUsers);
router.get('/users/lookup', authMiddleware, userCtrl.lookupUser);
router.get('/users/:identifier', authMiddleware, userCtrl.getUserByIdentifier);

// 4. Account Operations
router.get('/account', authMiddleware, accountCtrl.getAccount);
router.post('/account/deposit', authMiddleware, accountCtrl.deposit);
router.post('/account/freeze', authMiddleware, accountCtrl.toggleFreeze);

// 5. Transactions & Transfers
router.get('/transactions', authMiddleware, transactionCtrl.getTransactions);
router.post('/transfer', authMiddleware, transactionCtrl.executeTransfer);

// 6. UPI PIN Security
router.post('/upi/verify-pin', authMiddleware, upiCtrl.verifyPin);
router.post('/upi/change-pin', authMiddleware, upiCtrl.changePin);

// 7. QR Code Services
router.get('/qr/my-qr', authMiddleware, qrCtrl.getMyQr);
router.get('/qr/generate', qrCtrl.generateQr);
router.post('/qr/generate', qrCtrl.generateQr);
router.post('/qr/scan', qrCtrl.scanQr);

module.exports = router;
