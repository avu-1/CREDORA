const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const signupValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('fullName').trim().isLength({ min: 2 }),
  body('phone').isMobilePhone(),
  body('dateOfBirth').isISO8601()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const transactionValidation = [
  body('toAccountNumber').notEmpty(),
  body('amount').isFloat({ min: 0.01 })
];

module.exports = {
  validateRequest,
  signupValidation,
  loginValidation,
  transactionValidation
};