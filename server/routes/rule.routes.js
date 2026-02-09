const express = require('express');
const router = express.Router();
const {
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule
} = require('../controllers/rule.controller');
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

// Public routes
router.get('/', getRules);
router.get('/:id', getRuleById);

// Protected routes
router.post(
  '/',
  authenticate,
  checkRole(['admin', 'officer']),
  createRule
);

router.put(
  '/:id',
  authenticate,
  checkRole(['admin', 'officer']),
  updateRule
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin', 'officer']),
  deleteRule
);

module.exports = router;
