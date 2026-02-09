// server/models/activity.model.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'VOTE', 'PROFILE_UPDATE', 'PASSWORD_CHANGE', 'ROLE_CHANGE', 'REPORT_GENERATED', 'DATA_DOWNLOAD', 'CYCLE_RESET'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
