const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const transactionService = require('../services/transactionService');
const { transactionValidation, validateRequest } = require('../middleware/validator');
const { transactionLimiter } = require('../middleware/rateLimiter');

router.post('/', authMiddleware, transactionLimiter, transactionValidation, validateRequest, async (req, res, next) => {
  try {
    const { fromAccountId, toAccountNumber, amount, description } = req.body;

    const accountCheck = await pool.query(
      'SELECT account_id FROM accounts WHERE account_id = $1 AND user_id = $2',
      [fromAccountId, req.user.userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Account access denied' });
    }

    const transaction = await transactionService.createTransaction(
      fromAccountId,
      toAccountNumber,
      parseFloat(amount),
      description,
      req.user.userId
    );

    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history/:accountId', authMiddleware, async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const accountCheck = await pool.query(
      'SELECT account_id FROM accounts WHERE account_id = $1 AND user_id = $2',
      [accountId, req.user.userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Account access denied' });
    }

    const transactions = await transactionService.getTransactionHistory(
      accountId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;