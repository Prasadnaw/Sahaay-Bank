const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

/**
 * Safely reads the database file with UTF-8 BOM handling.
 */
function readDatabase() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    throw new Error('Database read failure: ' + err.message);
  }
}

/**
 * Safely writes to the database file atomically.
 */
function writeDatabase(data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    // Write atomically via temporary file to prevent corruption
    const tempPath = `${dbPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    fs.renameSync(tempPath, dbPath);
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    throw new Error('Database write failure: ' + err.message);
  }
}

function findUserById(id) {
  if (!id) return null;
  const db = readDatabase();
  return db.users.find(u => u.id === id) || null;
}

function findUserByUsername(username) {
  if (!username) return null;
  const db = readDatabase();
  const clean = username.trim().toLowerCase();
  return db.users.find(u => u.username.toLowerCase() === clean) || null;
}

function findUserByUpiId(upiId) {
  if (!upiId) return null;
  const db = readDatabase();
  const clean = upiId.trim().toLowerCase();
  return db.users.find(u => u.upiId.toLowerCase() === clean) || null;
}

function findUserByAccountNumber(accNum) {
  if (!accNum) return null;
  const db = readDatabase();
  const clean = accNum.toString().trim();
  return db.users.find(u => u.accountNumber.toString().trim() === clean) || null;
}

/**
 * Resolves a user by UPI ID, username, or account number.
 */
function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const str = identifier.toString().trim().toLowerCase();
  const db = readDatabase();

  return db.users.find(u => {
    if (u.id && u.id.toLowerCase() === str) return true;
    if (u.upiId && u.upiId.toLowerCase() === str) return true;
    if (u.username && u.username.toLowerCase() === str) return true;
    if (u.accountNumber && u.accountNumber.toString().toLowerCase() === str) return true;
    // Also support username without @sahaay or with @sahaay
    if (str.includes('@') && u.upiId && u.upiId.toLowerCase() === str) return true;
    if (!str.includes('@') && u.upiId && u.upiId.toLowerCase() === `${str}@sahaay`) return true;
    return false;
  }) || null;
}

function generateUserId() {
  const db = readDatabase();
  let maxId = 1003;
  if (db.users) {
    db.users.forEach(u => {
      const match = u.id && u.id.match(/USR-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
  }
  return `USR-${maxId + 1}`;
}

function generateAccountNumber() {
  const db = readDatabase();
  const existing = new Set(db.users.map(u => u.accountNumber.toString()));
  for (let i = 0; i < 1000; i++) {
    const num = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existing.has(num)) return num;
  }
  return Date.now().toString().slice(-4);
}

function generateTransactionId() {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
}

function generateReferenceId(prefix = 'SAH') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
}

/**
 * Strips sensitive credentials from user object for API responses.
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password, upiPin, ...safe } = user;
  // Never expose raw face template in normal public APIs
  const faceVerif = safe.faceVerification ? {
    enrolled: !!safe.faceVerification.enrolled
  } : { enrolled: false };

  return {
    ...safe,
    faceVerification: faceVerif
  };
}

module.exports = {
  readDatabase,
  writeDatabase,
  findUserById,
  findUserByUsername,
  findUserByUpiId,
  findUserByAccountNumber,
  findUserByIdentifier,
  generateUserId,
  generateAccountNumber,
  generateTransactionId,
  generateReferenceId,
  sanitizeUser
};
