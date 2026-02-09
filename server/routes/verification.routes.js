// server/routes/verification.routes.js
const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get pending verifications (must come before /:id)
router.get('/pending', authMiddleware, verificationController.getPendingVerifications);

// Get verification stats (must come before /:id)
router.get('/stats', authMiddleware, verificationController.getVerificationStats);

// Get all verifications
router.get('/', authMiddleware, verificationController.getVerifications);

// Get verification by ID
router.get('/:id', authMiddleware, verificationController.getVerificationById);

// Create verification
router.post('/', authMiddleware, verificationController.createVerification);

// Update verification
router.put('/:id', authMiddleware, verificationController.updateVerification);

// Delete verification
router.delete('/:id', authMiddleware, verificationController.deleteVerification);

module.exports = router;
