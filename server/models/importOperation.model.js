// server/models/importOperation.model.js
const mongoose = require('mongoose');

const importOperationSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admin_name: {
      type: String,
      required: true,
    },
    csv_file_name: {
      type: String,
      required: true,
    },
    total_rows: {
      type: Number,
      required: true,
      min: 0,
    },
    successful_imports: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    failed_imports: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    skipped_rows: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    import_errors: [
      {
        row_number: {
          type: Number,
          required: true,
        },
        member_id: {
          type: String,
          default: null,
        },
        error_message: {
          type: String,
          required: true,
        },
      },
    ],
    sms_sent_count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sms_failed_count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    email_sent_count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    email_failed_count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Add indexes for efficient queries
importOperationSchema.index({ admin_id: 1 });
importOperationSchema.index({ created_at: 1 });
importOperationSchema.index({ status: 1 });

const ImportOperation = mongoose.model('ImportOperation', importOperationSchema);
module.exports = ImportOperation;
