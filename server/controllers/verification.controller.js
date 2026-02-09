// server/controllers/verification.controller.js
const { Verification, User } = require('../models');

// Get all verification requests
exports.getVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find()
      .populate('userId', 'fullName email')
      .populate('verifiedBy', 'fullName')
      .sort({ createdAt: -1 });
    
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending verifications only
exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({ status: 'PENDING' })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get verification by ID
exports.getVerificationById = async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id)
      .populate('userId')
      .populate('verifiedBy');
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    
    res.json(verification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create verification request
exports.createVerification = async (req, res) => {
  try {
    const { userId, documentUrl, documentType } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const verification = new Verification({
      userId,
      userName: user.fullName,
      documentUrl,
      documentType,
      status: 'PENDING'
    });
    
    await verification.save();
    res.status(201).json(verification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update verification status
exports.updateVerification = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const verification = await Verification.findById(req.params.id);
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    
    verification.status = status;
    verification.verifiedBy = req.user?.id || null;
    verification.verifiedAt = new Date();
    
    if (status === 'REJECTED') {
      verification.rejectionReason = rejectionReason || null;
    }
    
    // If verified, activate the user's voting rights
    if (status === 'VERIFIED') {
      await User.findByIdAndUpdate(verification.userId, { isVerified: true });
    }
    
    await verification.save();
    res.json(verification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete verification
exports.deleteVerification = async (req, res) => {
  try {
    const verification = await Verification.findByIdAndDelete(req.params.id);
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    
    res.json({ message: 'Verification deleted', verification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get verification count by status
exports.getVerificationStats = async (req, res) => {
  try {
    const stats = await Verification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
