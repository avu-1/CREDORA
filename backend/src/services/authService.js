const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS } = require('../config/constants');

class AuthService {
  async hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  async createUser(userData) {
    const { email, password, fullName, phone, dateOfBirth, address } = userData;
    const passwordHash = await this.hashPassword(password);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, date_of_birth, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, email, full_name, phone, created_at`,
      [email, passwordHash, fullName, phone, dateOfBirth, address]
    );

    return result.rows[0];
  }

  async createDefaultAccount(userId) {
    const accountNumber = `CRED${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    
    const result = await pool.query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance)
       VALUES ($1, $2, $3, $4)
       RETURNING account_id, account_number, account_type, balance`,
      [userId, accountNumber, 'savings', 1000.00]
    );

    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async updateLastLogin(userId) {
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [userId]);
  }
}

module.exports = new AuthService();