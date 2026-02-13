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

// unique constraint: one vote per (election, user)
voteSchema.index({ electionId: 1, userId: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);
module.exports = Vote;