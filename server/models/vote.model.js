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

// Allow multiple votes per user per election (one per position)
// Remove the old unique constraint and add a compound index for performance
voteSchema.index({ electionId: 1, userId: 1, candidateId: 1 });

const Vote = mongoose.model('Vote', voteSchema);
module.exports = Vote;