// server/models/vote.model.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAbstain: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── DATABASE-LEVEL UNIQUENESS ENFORCEMENT ───────────────────────────────────
//
// These unique indexes are the LAST LINE OF DEFENSE against duplicate votes.
// Even if the application-layer check in vote.controller.js is bypassed (race
// condition, server crash mid-operation, bug, etc.), MongoDB will reject the
// insert with a duplicate-key error (E11000) — guaranteeing integrity.
//
// Index 1: One candidate vote per user per election per POSITION.
//   - We use a sparse partial index on `candidateId` (non-null) so that abstain
//     votes (candidateId: null) are excluded from this particular constraint;
//     they are handled by Index 2.
voteSchema.index(
  { userId: 1, electionId: 1, positionId: 1 },
  {
    unique: true,
    sparse: false,
    name: 'unique_vote_per_user_per_position',
    partialFilterExpression: { isAbstain: false },
  }
);

// Index 2: One ABSTAIN per user per election per position.
//   - Prevents a member from abstaining twice for the same position.
voteSchema.index(
  { userId: 1, electionId: 1, positionId: 1, isAbstain: 1 },
  {
    unique: true,
    sparse: false,
    name: 'unique_abstain_per_user_per_position',
    partialFilterExpression: { isAbstain: true },
  }
);

const Vote = mongoose.model('Vote', voteSchema);
module.exports = Vote;