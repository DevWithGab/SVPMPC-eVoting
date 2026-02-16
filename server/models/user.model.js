// server/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

const User = mongoose.model('User', userSchema);
module.exports = User;
