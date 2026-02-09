// server/models/position.model.js
const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    type: {
      type: String,
      enum: ['OFFICER', 'PROPOSAL'],
      default: 'OFFICER',
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Position = mongoose.model('Position', positionSchema);
module.exports = Position;
