const express = require('express');
const router = express.Router();
const {
  castVote,
  castAbstainVote,
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

router.post(
  '/abstain',
  authenticate,
  castAbstainVote
);

router.get('/user', authenticate, getUserVotes);
router.get('/', authenticate, getAllVotes);

module.exports = router;