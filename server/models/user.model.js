// server/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../services/encryptionService');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      // simple email validation
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      // Note: This field is encrypted at rest via pre-save hook
    },
    email_encrypted: {
      type: String,
      default: null,
      // Stores the encrypted version of email for at-rest encryption
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 100,
    },
    fullName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'officer', 'member'],
      default: 'member',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    highContrast: {
      type: Boolean,
      default: false,
    },
    fontSize: {
      type: String,
      enum: ['normal', 'large'],
      default: 'normal',
    },
    profilePicture: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    // Import-related fields
    member_id: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
      // Note: This field is encrypted at rest via pre-save hook
    },
    member_id_encrypted: {
      type: String,
      default: null,
      // Stores the encrypted version of member_id for at-rest encryption
    },
    phone_number: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    temporary_password_hash: {
      type: String,
      default: null,
    },
    temporary_password_expires: {
      type: Date,
      default: null,
    },
    activation_status: {
      type: String,
      enum: ['pending_activation', 'activated', 'sms_failed', 'email_failed', 'token_expired'],
      default: 'activated',
    },
    activation_method: {
      type: String,
      enum: ['sms', 'email'],
      default: null,
    },
    import_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportOperation',
      default: null,
    },
    sms_sent_at: {
      type: Date,
      default: null,
    },
    email_sent_at: {
      type: Date,
      default: null,
    },
    last_password_change: {
      type: Date,
      default: null,
    },
    activated_at: {
      type: Date,
      default: null,
    },
    sms_retry_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    sms_last_retry_at: {
      type: Date,
      default: null,
    },
    email_retry_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    email_last_retry_at: {
      type: Date,
      default: null,
    },
    activation_token: {
      type: String,
      default: null,
      // Stores the activation token for email-based activation
    },
    activation_token_expires: {
      type: Date,
      default: null,
      // Expiration time for the activation token (24 hours)
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;       // keep `id` in JSON like before
        delete ret._id;
        delete ret.__v;
        delete ret.password;    // don't expose password hashes
        delete ret.temporary_password_hash; // don't expose temporary password hashes
      },
    },
  }
);

// Add indexes for efficient queries
userSchema.index({ member_id: 1 });
userSchema.index({ phone_number: 1 });
userSchema.index({ import_id: 1 });
userSchema.index({ activation_status: 1 });
userSchema.index({ temporary_password_expires: 1 });

// hash password before save if modified
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Encrypt sensitive fields at rest
  try {
    if (this.isModified('email') && this.email) {
      this.email_encrypted = encrypt(this.email);
    }
    if (this.isModified('member_id') && this.member_id) {
      this.member_id_encrypted = encrypt(this.member_id);
    }
  } catch (error) {
    console.error('Encryption error in pre-save hook:', error.message);
    // Don't fail the save, but log the error
    // In production, you might want to handle this differently
  }
});

// instance method for comparing passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// instance method for comparing temporary passwords
userSchema.methods.compareTemporaryPassword = async function (candidatePassword) {
  if (!this.temporary_password_hash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.temporary_password_hash);
};

// instance method for setting temporary password
userSchema.methods.setTemporaryPassword = async function (hashedPassword, expirationHours = 24) {
  this.temporary_password_hash = hashedPassword;
  this.temporary_password_expires = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
};

// instance method to check if temporary password is expired
userSchema.methods.isTemporaryPasswordExpired = function () {
  if (!this.temporary_password_expires) {
    return true;
  }
  return new Date() > this.temporary_password_expires;
};

// instance method to invalidate temporary password
userSchema.methods.invalidateTemporaryPassword = function () {
  this.temporary_password_hash = null;
  this.temporary_password_expires = null;
};

// Post-find hooks to decrypt sensitive fields
userSchema.post('findOne', decryptSensitiveFields);
userSchema.post('find', decryptSensitiveFields);
userSchema.post('findOneAndUpdate', decryptSensitiveFields);

/**
 * Decrypts sensitive fields after retrieval from database
 * Handles both single documents and arrays of documents
 */
function decryptSensitiveFields(doc) {
  if (!doc) return;

  const docs = Array.isArray(doc) ? doc : [doc];

  docs.forEach(d => {
    try {
      if (d.email_encrypted && !d.email) {
        d.email = decrypt(d.email_encrypted);
      }
      if (d.member_id_encrypted && !d.member_id) {
        d.member_id = decrypt(d.member_id_encrypted);
      }
    } catch (error) {
      console.error('Decryption error in post-find hook:', error.message);
      // Don't fail the retrieval, but log the error
    }
  });
}

const User = mongoose.model('User', userSchema);
module.exports = User;
