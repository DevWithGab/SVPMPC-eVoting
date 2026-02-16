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
      enum: [
        'LOGIN',
        'LOGOUT',
        'VOTE',
        'PROFILE_UPDATE',
        'PASSWORD_CHANGE',
        'ROLE_CHANGE',
        'REPORT_GENERATED',
        'DATA_DOWNLOAD',
        'CYCLE_RESET',
        'BULK_IMPORT',
        'SMS_SENT',
        'EMAIL_SENT',
        'ACTIVATION',
        'RESEND_INVITATION',
      ],
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

// Add indexes for efficient queries
activitySchema.index({ userId: 1 });
activitySchema.index({ action: 1 });
activitySchema.index({ createdAt: 1 });

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
