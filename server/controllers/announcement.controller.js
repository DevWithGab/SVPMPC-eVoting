const { Announcement } = require('../models');

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, date, author, targetAudience, expiresAt, isAutomatic } = req.body;

    let expireDate = expiresAt || null;
    // If automatic announcement, set to expire in 2 days
    if (isAutomatic) {
      expireDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'LOW',
      date: date || new Date(),
      author: author || req.user.fullName,
      createdBy: req.user._id,
      targetAudience: targetAudience && targetAudience.length > 0 ? targetAudience : ['all'],
      expiresAt: expireDate,
    });

  
    res.status(201).json({
      message: 'Announcement created successfully',
      announcement,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const { Election, Vote } = require('../models');
    
    // Get active election
    const activeElection = await Election.findOne({ status: 'active' });
  
    
    // Check if user has voted in the active election
    let userHasVotedInActiveElection = false;
    if (req.user) {
      if (activeElection) {
        const vote = await Vote.findOne({ 
          userId: req.user._id, 
          electionId: activeElection._id 
        });
        userHasVotedInActiveElection = !!vote;
      } else {
        // If no active election, check global hasVoted flag
        userHasVotedInActiveElection = req.user?.hasVoted || false;
      }
    }
    
    // Filter announcements: exclude expired ones
    const now = new Date();
    const announcements = await Announcement.find({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    }).sort({ createdAt: -1 });

    // Filter announcements based on user's voting status in current election
    const filteredAnnouncements = announcements.filter(ann => {
      const targetAudience = ann.targetAudience || ['all'];
      
      // Always show 'all' audience announcements
      if (targetAudience.includes('all')) return true;
      
      // Show status-specific announcements based on current election voting status
      if (userHasVotedInActiveElection && targetAudience.includes('hasVoted')) return true;
      if (!userHasVotedInActiveElection && targetAudience.includes('hasNotVoted')) return true;
      
      return false;
    });

    res.json(filteredAnnouncements);
  } catch (error) {
    res.status(500).json({ message: error.message, error: error.toString() });
  }
};

const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, expiresAt } = req.body;

    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(priority !== undefined && { priority }),
        ...(expiresAt !== undefined && { expiresAt }),
      },
      { new: true }
    );

    if (!announcement) {
      return res
        .status(404)
        .json({ message: 'Announcement not found or unauthorized' });
    }

    res.json({
      message: 'Announcement updated successfully',
      announcement,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!announcement) {
      return res
        .status(404)
        .json({ message: 'Announcement not found or unauthorized' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnnouncementCount = async (req, res) => {
  try {
    const count = await Announcement.countDocuments();
    console.log('Announcement count:', count);
    res.json({ count });
  } catch (error) {
    console.error('Error counting announcements:', error);
    res.status(500).json({ message: error.message, error: error.toString() });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementCount
};
