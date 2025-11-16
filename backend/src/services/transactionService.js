const pool = require('../config/database');
const crypto = require('crypto');
const { redisPub } = require('../config/redis');
const cacheService = require('./cacheService');

class TransactionService {
  generateReferenceNumber() {
    return `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async createTransaction(fromAccountId, toAccountNumber, amount, description, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const recipientResult = await client.query(
        'SELECT account_id FROM accounts WHERE account_number = $1 AND status = $2',
        [toAccountNumber, 'active']
      );

      if (recipientResult.rows.length === 0) {
        throw new Error('Recipient account not found');
      }

      const toAccountId = recipientResult.rows[0].account_id;

      const senderResult = await client.query(
        'SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE',
        [fromAccountId]
      );

      if (senderResult.rows[0].balance < amount) {
        throw new Error('Insufficient balance');
      }

      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
        [amount, fromAccountId]
      );

      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2',
        [amount, toAccountId]
      );

      const referenceNumber = this.generateReferenceNumber();
      const transactionResult = await client.query(
        `INSERT INTO transactions 
         (from_account_id, to_account_id, transaction_type, amount, status, description, reference_number, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING *`,
        [fromAccountId, toAccountId, 'transfer', amount, 'completed', description, referenceNumber]
      );

      await client.query('COMMIT');

      const transaction = transactionResult.rows[0];

      await Promise.all([
        cacheService.del(`balance:${fromAccountId}`),
        cacheService.del(`balance:${toAccountId}`)
      ]);

      await redisPub.publish('transactions', JSON.stringify({
        type: 'new_transaction',
        fromAccountId,
        toAccountId,
        transaction
      }));

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTransactionHistory(accountId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT t.*, 
              fa.account_number as from_account_number,
              ta.account_number as to_account_number
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account_id = fa.account_id
       LEFT JOIN accounts ta ON t.to_account_id = ta.account_id
       WHERE t.from_account_id = $1 OR t.to_account_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    return result.rows;
  }
}

module.exports = new TransactionService();