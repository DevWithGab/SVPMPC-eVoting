// server/controllers/activity.controller.js
const { Activity } = require('../models');

const logActivity = async (userId, action, description, metadata = {}, req = null) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
    const userAgent = req ? req.get('user-agent') : null;

    await Activity.create({
      userId,
      action,
      description,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
};

const getActivities = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('userId', 'username fullName email role')
      .sort({ createdAt: -1 })
      .limit(500); // Last 500 activities

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserActivities = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const activities = await Activity.find({ userId })
      .populate('userId', 'username fullName email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActivitiesByAction = async (req, res) => {
  try {
    const { action } = req.query;
    const activities = await Activity.find({ action })
      .populate('userId', 'username fullName email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  logActivity,
  getActivities,
  getUserActivities,
  getActivitiesByAction,
};
