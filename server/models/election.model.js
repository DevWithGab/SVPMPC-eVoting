// server/models/election.model.js
const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value instanceof Date && !isNaN(value);
        },
        message: 'startDate must be a valid date',
      },
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value instanceof Date && !isNaN(value);
        },
        message: 'endDate must be a valid date',
      },
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    maxVotesPerMember: {
      type: Number,
      default: 1,
      min: 1,
    },
    resultsPublic: {
      type: Boolean,
      default: true,
    },
    backgroundImage: {
      type: String,
      default: null,
    },
    timeline: [
      {
        title: String,
        start: String,
        time: String,
        end: String,
        endTime: String,
        status: {
          type: String,
          enum: ['completed', 'active', 'upcoming'],
          default: 'upcoming',
        },
      },
    ],
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

// custom validator for date range
electionSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    throw new Error('Start date must be before end date');
  }
});

const Election = mongoose.model('Election', electionSchema);
module.exports = Election;