const bcrypt = require('bcryptjs');
const {
  readDatabase,
  writeDatabase,
  findUserByUsername,
  findUserByUpiId,
  generateUserId,
  generateAccountNumber,
  sanitizeUser
} = require('../utils/dbHelper');
const { createSession } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      confirmPassword,
      phone,
      accessibilityProfile = 'standard',
      faceTemplate = null,
      photo = null,
      profilePhoto = null,
      upiPin = '1234'
    } = req.body;

    // 1. Required field validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // 2. Username format validation
    if (!/^[a-z0-9._]{3,24}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-24 characters long and contain only letters, numbers, periods, or underscores.'
      });
    }

    // 3. Username uniqueness
    if (findUserByUsername(cleanUsername)) {
      return res.status(409).json({ success: false, error: 'This username is already registered. Please choose another.' });
    }

    // 4. Password validation
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Password and Confirm Password do not match.' });
    }

    // 5. Phone validation
    const cleanPhone = (phone || '').toString().replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
    }

    // 6. UPI ID generation & uniqueness
    const upiId = `${cleanUsername}@sahaay`;
    if (findUserByUpiId(upiId)) {
      return res.status(409).json({ success: false, error: 'UPI ID generated from this username is already taken.' });
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Construct new user
    const db = readDatabase();
    const newUser = {
      id: generateUserId(),
      username: cleanUsername,
      password: hashedPassword,
      name: name.trim(),
      phone: cleanPhone || '9800000000',
      accountNumber: generateAccountNumber(),
      upiId: upiId,
      balance: 0.00,
      upiPin: (upiPin && upiPin.length === 4) ? upiPin : '1234',
      accessibilityProfile: accessibilityProfile || 'standard',
      isFrozen: false,
      profilePhoto: photo || profilePhoto || null,
      faceVerification: {
        enrolled: !!faceTemplate,
        template: faceTemplate || null
      },
      transactions: []
    };

    db.users.push(newUser);
    writeDatabase(db);

    const token = createSession(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Sahaay Bank.',
      user: sanitizeUser(newUser),
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Account registration failed: ' + err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = readDatabase();
    const user = db.users.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Account not found. Please check username or register.' });
    }

    // Support both bcrypt hashes and plain text passwords (for legacy demo accounts)
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (user.password === password);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    // Update top-level account for legacy backwards compatibility
    db.account = {
      accountHolder: user.name,
      accountNumber: user.accountNumber,
      upiId: user.upiId,
      balance: user.balance,
      isFrozen: !!user.isFrozen,
      upiPin: user.upiPin
    };
    writeDatabase(db);

    const token = createSession(user);

    res.json({
      success: true,
      message: 'Authentication successful.',
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login service failed: ' + err.message });
  }
};

exports.enrollFace = async (req, res) => {
  try {
    const { template, photo } = req.body;
    if (!template || typeof template !== 'string' || template.length < 10) {
      return res.status(400).json({ success: false, error: 'Valid face template descriptor is required.' });
    }

    const db = readDatabase();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.faceVerification = {
      enrolled: true,
      template: template
    };
    if (photo) {
      user.profilePhoto = photo;
    }
    writeDatabase(db);

    res.json({
      success: true,
      message: 'Face biometric verification and profile photo enrolled successfully.',
      faceVerification: { enrolled: true },
      profilePhoto: user.profilePhoto || null,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('Enroll face error:', err);
    res.status(500).json({ success: false, error: 'Face enrollment failed: ' + err.message });
  }
};

exports.getFaceProfiles = (req, res) => {
  try {
    const db = readDatabase();
    const profiles = db.users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      accessibilityProfile: u.accessibilityProfile,
      profilePhoto: u.profilePhoto || null,
      hasTemplate: !!(u.faceVerification && u.faceVerification.template),
      template: (u.faceVerification && u.faceVerification.template) || null
    }));
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch face profiles: ' + err.message });
  }
};

exports.faceLogin = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required for face sign-in.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const db = readDatabase();
    const user = db.users.find(u => u.username.toLowerCase() === cleanUser);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found for biometric profile.' });
    }

    const token = createSession(user);

    res.json({
      success: true,
      message: `Welcome, ${user.name}! Authenticated via biometric face verification.`,
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('Face login error:', err);
    res.status(500).json({ success: false, error: 'Biometric sign-in error: ' + err.message });
  }
};
