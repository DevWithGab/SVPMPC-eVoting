const express = require('express');
const router = express.Router();
const {
  castVote,
  getUserVotes,
  getAllVotes,
  getElectionVotes,
  getElectionResults
} = require('../controllers/vote.controller');
const { validate, schemas } = require('../middleware/validation.middleware');
const authenticate = require('../middleware/auth.middleware');

// Public routes
router.get('/election/:electionId/results', getElectionResults);
router.get('/election/:electionId', authenticate, getElectionVotes);

// Protected routes
router.post(
  '/',
  authenticate,
  validate(schemas.vote),
  castVote
);

router.get('/user', authenticate, getUserVotes);
router.get('/', authenticate, getAllVotes);

module.exports = router;