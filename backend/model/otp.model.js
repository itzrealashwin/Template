import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index — auto-delete when expiresAt is reached
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['verify', 'reset'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Hash the OTP before saving.
 */
otpSchema.pre('save', async function () {
  if (!this.isModified('otp')) return;
  this.otp = await bcrypt.hash(this.otp, 10);
});

/**
 * Compare a candidate OTP against the stored hash.
 * @param {string} candidateOtp
 * @returns {Promise<boolean>}
 */
otpSchema.methods.compareOTP = async function (candidateOtp) {
  return bcrypt.compare(candidateOtp, this.otp);
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
