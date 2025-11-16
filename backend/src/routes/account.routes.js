const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const cacheService = require('../services/cacheService');

router.get('/my-accounts', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT account_id, account_number, account_type, balance, currency, status, created_at
       FROM accounts WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/balance/:accountId', authMiddleware, async (req, res, next) => {
  try {
    const { accountId } = req.params;

    let balance = await cacheService.get(`balance:${accountId}`);

    if (!balance) {
      const result = await pool.query(
        'SELECT balance FROM accounts WHERE account_id = $1 AND user_id = $2',
        [accountId, req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }

      balance = result.rows[0].balance;
      await cacheService.set(`balance:${accountId}`, balance, 30);
    }

    res.json({ success: true, data: { balance } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;