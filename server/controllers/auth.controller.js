const { User } = require('../models');
const { logActivity } = require('./activity.controller');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

const register = async (req, res) => {
  try {
    const { username, email, password, fullName, address, role } = req.body;

    const user = await User.create({
      username,
      email,
      password,
      fullName,
      address: address || null,
      role: role || 'member',
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, member_id, password } = req.body;

    let user;

    // Support both email-based login and member_id-based login
    if (member_id) {
      // Member login with member_id and password (temporary or permanent)
      user = await User.findOne({ member_id });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if using temporary password
      if (user.temporary_password_hash && !user.isTemporaryPasswordExpired()) {
        // Try temporary password first (only if not expired)
        const isTempPasswordValid = await user.compareTemporaryPassword(password);
        if (isTempPasswordValid) {
          // Temporary password is valid, allow login
          user.lastLogin = new Date();
          await user.save();

          const token = generateToken(user);

          // Log login activity
          await logActivity(
            user.id || user._id,
            'LOGIN',
            `Member ${user.member_id} logged in with temporary password`,
            { member_id: user.member_id, activation_status: user.activation_status },
            req
          );

          return res.json({
            message: 'Login successful',
            token,
            user: {
              id: user.id || user._id,
              member_id: user.member_id,
              username: user.username,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              activation_status: user.activation_status,
              has_temporary_password: true,
            },
          });
        }
      } else if (user.temporary_password_hash && user.isTemporaryPasswordExpired()) {
        // Temporary password is expired, check if trying to use it
        const isTempPasswordValid = await user.compareTemporaryPassword(password);
        if (isTempPasswordValid) {
          // They're trying to use the expired temporary password
          return res.status(401).json({
            message: 'Your temporary password has expired. Request a new one.',
            code: 'TEMP_PASSWORD_EXPIRED',
          });
        }
        // Fall through to try permanent password
      }

      // Try permanent password
      const isPermanentPasswordValid = await user.comparePassword(password);
      if (!isPermanentPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else if (email) {
      // Traditional email-based login
      user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      return res.status(400).json({ message: 'Either email or member_id is required' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    // Log login activity
    await logActivity(
      user.id || user._id,
      'LOGIN',
      `User ${user.username || user.member_id} logged in`,
      { email: user.email, member_id: user.member_id },
      req
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        member_id: user.member_id,
        fullName: user.fullName,
        role: user.role,
        activation_status: user.activation_status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getProfile };

