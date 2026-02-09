// server/routes/activity.routes.js
const express = require('express');
const router = express.Router();
const {
  getActivities,
  getUserActivities,
  getActivitiesByAction,
} = require('../controllers/activity.controller');
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');

router.get('/', authenticate, checkRole(['admin', 'officer']), getActivities);
router.get('/user/:userId', authenticate, getUserActivities);
router.get('/by-action', authenticate, getActivitiesByAction);

module.exports = router;
