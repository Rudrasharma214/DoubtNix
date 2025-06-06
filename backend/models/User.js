const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: function() {
      // Only require for new documents, not for existing ones
      return this.isNew;
    },
    trim: true,
    maxlength: 50,
    default: ''
  },
  lastName: {
    type: String,
    required: function() {
      // Only require for new documents, not for existing ones
      return this.isNew;
    },
    trim: true,
    maxlength: 50,
    default: ''
  },
  // Email verification removed - users are auto-verified on signup
  // Password reset token removed - using OTP-based reset instead
  // Email OTP for login verification
  emailOTP: {
    type: String,
    default: null
  },
  emailOTPExpires: {
    type: Date,
    default: null
  },
  emailOTPAttempts: {
    type: Number,
    default: 0
  },
  // Password reset OTP
  passwordResetOTP: {
    type: String,
    default: null
  },
  passwordResetOTPExpires: {
    type: Date,
    default: null
  },
  passwordResetOTPAttempts: {
    type: Number,
    default: 0
  },
  // 2FA Settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorBackupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    }
  }],
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  // Profile
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1,
      },
      $set: {
        loginAttempts: 1,
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Instance method to generate email OTP
userSchema.methods.generateEmailOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.emailOTP = otp;
  this.emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.emailOTPAttempts = 0;

  return otp;
};

// Instance method to verify email OTP
userSchema.methods.verifyEmailOTP = function(otp) {
  // Check if OTP exists and hasn't expired
  if (!this.emailOTP || !this.emailOTPExpires || this.emailOTPExpires < Date.now()) {
    return { success: false, message: 'OTP has expired' };
  }

  // Check if too many attempts
  if (this.emailOTPAttempts >= 3) {
    return { success: false, message: 'Too many OTP attempts. Please request a new OTP.' };
  }

  // Verify OTP
  if (this.emailOTP === otp) {
    // Clear OTP data on successful verification
    this.emailOTP = null;
    this.emailOTPExpires = null;
    this.emailOTPAttempts = 0;
    return { success: true, message: 'OTP verified successfully' };
  } else {
    // Increment attempts on failure
    this.emailOTPAttempts += 1;
    return { success: false, message: 'Invalid OTP' };
  }
};

// Instance method to clear email OTP
userSchema.methods.clearEmailOTP = function() {
  this.emailOTP = null;
  this.emailOTPExpires = null;
  this.emailOTPAttempts = 0;
};

// Instance method to generate password reset OTP
userSchema.methods.generatePasswordResetOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.passwordResetOTP = otp;
  this.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.passwordResetOTPAttempts = 0;

  return otp;
};

// Instance method to verify password reset OTP
userSchema.methods.verifyPasswordResetOTP = function(otp) {
  // Check if OTP exists and hasn't expired
  if (!this.passwordResetOTP || !this.passwordResetOTPExpires || this.passwordResetOTPExpires < Date.now()) {
    return { success: false, message: 'OTP has expired' };
  }

  // Check if too many attempts
  if (this.passwordResetOTPAttempts >= 3) {
    return { success: false, message: 'Too many OTP attempts. Please request a new OTP.' };
  }

  // Verify OTP
  if (this.passwordResetOTP === otp) {
    // Clear OTP data on successful verification
    this.passwordResetOTP = null;
    this.passwordResetOTPExpires = null;
    this.passwordResetOTPAttempts = 0;
    return { success: true, message: 'OTP verified successfully' };
  } else {
    // Increment attempts on failure
    this.passwordResetOTPAttempts += 1;
    return { success: false, message: 'Invalid OTP' };
  }
};

// Instance method to clear password reset OTP
userSchema.methods.clearPasswordResetOTP = function() {
  this.passwordResetOTP = null;
  this.passwordResetOTPExpires = null;
  this.passwordResetOTPAttempts = 0;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.twoFactorSecret;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
