const express = require('express');
const router = express.Router();
const { register, login, getProfile, changePassword, activate } = require('../controllers/auth.controller');
const { validate, schemas } = require('../middleware/validation.middleware');
const authenticate = require('../middleware/auth.middleware');

router.post('/register', validate(schemas.register), register);
router.post('/login', validate(schemas.login), login);
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/activate', activate);

module.exports = router;