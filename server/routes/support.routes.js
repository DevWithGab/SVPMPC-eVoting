// server/routes/support.routes.js
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get open tickets (must come before /:id)
router.get('/open', authMiddleware, supportController.getOpenTickets);

// Get ticket statistics (must come before /:id)
router.get('/stats', authMiddleware, supportController.getTicketStats);

// Get tickets by user (must come before /:id)
router.get('/user/:userId', authMiddleware, supportController.getUserTickets);

// Get all tickets
router.get('/', authMiddleware, supportController.getAllTickets);

// Get ticket by ID
router.get('/:id', authMiddleware, supportController.getTicketById);

// Create ticket
router.post('/', authMiddleware, supportController.createTicket);

// Update ticket
router.put('/:id', authMiddleware, supportController.updateTicket);

// Escalate ticket (must come before DELETE /:id)
router.post('/:id/escalate', authMiddleware, supportController.escalateTicket);

// Delete ticket
router.delete('/:id', authMiddleware, supportController.deleteTicket);

module.exports = router;
