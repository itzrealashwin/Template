import User from '../model/user.model.js';
import OTP from '../model/otp.model.js';
import AppError from '../utils/AppError.js';
import { generateOTP } from '../utils/otp.js';
import { sendOTPEmail } from '../utils/email.js';
import { verifyGoogleCode } from '../config/google.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
  verifyResetToken,
} from '../utils/token.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;

// ────────────────────────────────────────────────────────────
// 1. REGISTER
// ────────────────────────────────────────────────────────────
const register = async ({ name, email, password }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  }

  // Create user (password is hashed via pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
    provider: 'local',
    isEmailVerified: false,
  });

  // Generate and save OTP
  await _createAndSendOTP(user._id, email, 'verify');

  return {
    message: 'Registration successful. Please check your email for the verification code.',
  };
};

// ────────────────────────────────────────────────────────────
// 2. VERIFY OTP
// ────────────────────────────────────────────────────────────
const verifyOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account found with this email.', 404, 'USER_NOT_FOUND');
  }

  // Find latest valid OTP for this user of type 'verify'
  const otpRecord = await OTP.findOne({
    userId: user._id,
    type: 'verify',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new AppError('OTP has expired or does not exist. Please request a new one.', 400, 'OTP_EXPIRED');
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    // Invalidate the OTP after too many wrong attempts
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError('Too many incorrect attempts. Please request a new OTP.', 400, 'OTP_MAX_ATTEMPTS');
  }

  // Compare OTP
  const isMatch = await otpRecord.compareOTP(otp);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;
    throw new AppError(
      `Invalid OTP. ${remaining} attempt(s) remaining.`,
      400,
      'INVALID_OTP'
    );
  }

  // Mark email as verified and clean up OTP
  user.isEmailVerified = true;
  await user.save();
  await OTP.deleteOne({ _id: otpRecord._id });

  return { message: 'Email verified successfully.' };
};

// ────────────────────────────────────────────────────────────
// 2a. RESEND OTP
// ────────────────────────────────────────────────────────────
const resendOtp = async ({ email }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account found with this email.', 404, 'USER_NOT_FOUND');
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified.', 400, 'EMAIL_ALREADY_VERIFIED');
  }

  await _createAndSendOTP(user._id, email, 'verify');

  return { message: 'A new verification code has been sent to your email.' };
};

// ────────────────────────────────────────────────────────────
// 3. LOGIN (email/password)
// ────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  // Need password field for comparison
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user) {
    throw new AppError('Invalid email.', 401, 'INVALID_CREDENTIALS');
  }

  // Prevent Google users from using password login
  if (user.provider === 'google') {
    throw new AppError(
      'This email is registered via Google. Please log in with Google.',
      409,
      'PROVIDER_MISMATCH'
    );
  }

  // Check email verification
  if (!user.isEmailVerified) {
    throw new AppError(
      'Email not verified. Please verify your email first.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  // Check account lock
  if (user.isLocked()) {
    throw new AppError(
      'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      423,
      'ACCOUNT_LOCKED'
    );
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  // Reset failed attempts on successful login
  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = generateRefreshToken({ userId: user._id });

  // Save refresh token (max 5)
  user.addRefreshToken(refreshToken);
  await user.save();

  return { accessToken, refreshToken, user: _sanitizeUser(user) };
};

// ────────────────────────────────────────────────────────────
// 4. GOOGLE LOGIN
// ────────────────────────────────────────────────────────────
const googleLogin = async ({ code }) => {
  // Verify Google token
  let googlePayload;
  try {
    googlePayload = await verifyGoogleCode(code);
  
  } catch (err) {
    throw new AppError('Invalid Google token.', 401, 'INVALID_GOOGLE_TOKEN');
  }

  const { email, name, googleId } = googlePayload;

  let user = await User.findOne({ email }).select('+refreshTokens');

  if (user) {
    // Existing user with local provider — reject cross-provider login
    if (user.provider === 'local') {
      throw new AppError(
        'Email already registered with password. Please log in with email/password.',
        409,
        'PROVIDER_MISMATCH'
      );
    }
    // Existing Google user — proceed
  } else {
    // Create new Google user
    user = await User.create({
      name,
      email,
      password: null,
      provider: 'google',
      googleId,
      isEmailVerified: true,
    });
    // Re-fetch to get refreshTokens field
    user = await User.findById(user._id).select('+refreshTokens');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = generateRefreshToken({ userId: user._id });

  user.addRefreshToken(refreshToken);
  await user.save();

  return { accessToken, refreshToken, user: _sanitizeUser(user) };
};

// ────────────────────────────────────────────────────────────
// 5. REFRESH TOKEN ROTATION
// ────────────────────────────────────────────────────────────
const refreshTokens = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new AppError('Refresh token is required.', 401, 'REFRESH_TOKEN_MISSING');
  }

  // Verify JWT
  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens');
  if (!user) {
    throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
  }

  // Check token exists in DB (detect reuse attacks)
  if (!user.refreshTokens.includes(oldRefreshToken)) {
    // Possible token reuse attack — clear all refresh tokens
    user.refreshTokens = [];
    await user.save();
    throw new AppError(
      'Refresh token reuse detected. All sessions have been revoked.',
      401,
      'TOKEN_REUSE_DETECTED'
    );
  }

  // Rotate: remove old, generate new
  user.removeRefreshToken(oldRefreshToken);

  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const newRefreshToken = generateRefreshToken({ userId: user._id });

  user.addRefreshToken(newRefreshToken);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

// ────────────────────────────────────────────────────────────
// 6. LOGOUT
// ────────────────────────────────────────────────────────────
const logout = async (userId, refreshToken) => {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  if (refreshToken) {
    user.removeRefreshToken(refreshToken);
    await user.save();
  }

  return { message: 'Logged out successfully.' };
};

// ────────────────────────────────────────────────────────────
// 7. FORGOT PASSWORD — request OTP
// ────────────────────────────────────────────────────────────
const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether the email exists
    return { message: 'If an account exists with this email, a password reset OTP has been sent.' };
  }

  if (user.provider === 'google') {
    throw new AppError(
      'This account uses Google sign-in. Password reset is not applicable.',
      400,
      'GOOGLE_PROVIDER_NO_RESET'
    );
  }

  await _createAndSendOTP(user._id, email, 'reset');

  return { message: 'If an account exists with this email, a password reset OTP has been sent.' };
};

// ────────────────────────────────────────────────────────────
// 7b. FORGOT PASSWORD — verify OTP and return reset token
// ────────────────────────────────────────────────────────────
const verifyResetOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account found with this email.', 404, 'USER_NOT_FOUND');
  }

  const otpRecord = await OTP.findOne({
    userId: user._id,
    type: 'reset',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new AppError('OTP has expired or does not exist. Please request a new one.', 400, 'OTP_EXPIRED');
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError('Too many incorrect attempts. Please request a new OTP.', 400, 'OTP_MAX_ATTEMPTS');
  }

  const isMatch = await otpRecord.compareOTP(otp);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = MAX_OTP_ATTEMPTS - otpRecord.attempts;
    throw new AppError(
      `Invalid OTP. ${remaining} attempt(s) remaining.`,
      400,
      'INVALID_OTP'
    );
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Generate short-lived reset token
  const resetToken = generateResetToken({ userId: user._id });

  return { resetToken, message: 'OTP verified. Use the reset token to set a new password.' };
};

// ────────────────────────────────────────────────────────────
// 7c. RESET PASSWORD
// ────────────────────────────────────────────────────────────
const resetPassword = async ({ resetToken, newPassword }) => {
  // Verify reset token
  let decoded;
  try {
    decoded = verifyResetToken(resetToken);
  } catch (err) {
    throw new AppError('Invalid or expired reset token.', 401, 'INVALID_RESET_TOKEN');
  }

  const user = await User.findById(decoded.userId).select('+password +refreshTokens');
  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  // Set new password (hashed via pre-save hook)
  user.password = newPassword;
  // Invalidate all sessions
  user.refreshTokens = [];
  user.tokenVersion += 1;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  return { message: 'Password reset successfully. Please log in with your new password.' };
};

// ────────────────────────────────────────────────────────────
// 8. GET CURRENT USER
// ────────────────────────────────────────────────────────────
const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }
  return { user: _sanitizeUser(user) };
};

// ────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ────────────────────────────────────────────────────────────

/**
 * Create an OTP, save to DB, and send via email.
 */
const _createAndSendOTP = async (userId, email, type) => {
  // Invalidate any existing OTPs for this user and type
  await OTP.deleteMany({ userId, type });

  const otpCode = generateOTP();

  await OTP.create({
    userId,
    otp: otpCode, // hashed via pre-save hook
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    type,
  });

  // Send email with plaintext OTP
  await sendOTPEmail(email, otpCode, type);
};

/**
 * Return a user object safe for client consumption.
 */
const _sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

export default {
  register,
  verifyOtp,
  resendOtp,
  login,
  googleLogin,
  refreshTokens,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
};
