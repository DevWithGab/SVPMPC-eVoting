const { Election, Candidate, Announcement, Vote, Activity, User, Position } = require('../models');

// Helper function to update election status based on dates
const updateElectionStatusIfNeeded = async (election) => {
  const now = new Date();
  const startDate = new Date(election.startDate);
  const endDate = new Date(election.endDate);
  
  let statusChanged = false;
  let newStatus = election.status;
  
  // If election should be active (current time >= startDate and status is 'upcoming')
  if (election.status === 'upcoming' && now >= startDate) {
    await Election.findByIdAndUpdate(election._id, { status: 'active' });
    election.status = 'active';
    newStatus = 'active';
    statusChanged = true;
  }
  
  // If election should be completed (current time > endDate and status is 'active')
  if (election.status === 'active' && now > endDate) {
    await Election.findByIdAndUpdate(election._id, { status: 'completed' });
    election.status = 'completed';
    newStatus = 'completed';
    statusChanged = true;
  }
  
  // Create announcement if status changed - but only if it doesn't already exist
  if (statusChanged) {
    try {
      if (newStatus === 'active') {
        // Check if announcement for this election status change already exists
        const existingAnnouncement = await Announcement.findOne({
          title: `Election Started: ${election.title}`,
          content: { $regex: `The election "${election.title}" has started` }
        });
        
        if (!existingAnnouncement) {
          await Announcement.create({
            title: `Election Started: ${election.title}`,
            content: `The election "${election.title}" has started. ${election.description ? 'Description: ' + election.description : ''} Click here to cast your vote!`,
            priority: 'HIGH',
            date: new Date(),
            author: 'System',
            createdBy: election.createdBy || 'system',
          });
        }
      } else if (newStatus === 'completed') {
        // Check if announcement for this election status change already exists
        const existingAnnouncement = await Announcement.findOne({
          title: `Election Completed: ${election.title}`,
          content: { $regex: `The election "${election.title}" has ended` }
        });
        
        if (!existingAnnouncement) {
          await Announcement.create({
            title: `Election Completed: ${election.title}`,
            content: `The election "${election.title}" has ended. ${election.description ? 'Description: ' + election.description : ''} The results are now available for review.`,
            priority: 'HIGH',
            date: new Date(),
            author: 'System',
            createdBy: election.createdBy || 'system',
          });
        }
      }
    } catch (announcementError) {
      console.error('Failed to create announcement for election status change:', announcementError);
      // Don't fail the election update if announcement creation fails
    }
  }
  
  return election;
};

const createElection = async (req, res) => {
  try {
    const { title, description, startDate, endDate, maxVotesPerMember, status, timeline } =
      req.body;

    const userId = req.user?.id;

    // Extract times from startDate and endDate
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US');
    };

    // Determine the initial status based on dates
    const now = new Date();
    let initialStatus = 'upcoming'; // Default
    if (status && ['active', 'upcoming', 'completed'].includes(status.toLowerCase())) {
      initialStatus = status.toLowerCase();
    } else if (now >= startDateObj && now <= endDateObj) {
      initialStatus = 'active';
    } else if (now > endDateObj) {
      initialStatus = 'completed';
    }

    // Generate default timeline if not provided
    const defaultTimeline = timeline || [
      {
        title: 'PRE-ELECTION PHASE',
        start: formatDate(new Date()),
        time: formatTime(new Date()),
        end: formatDate(startDateObj),
        endTime: formatTime(startDateObj),
        status: initialStatus === 'upcoming' ? 'active' : 'completed',
      },
      {
        title: 'VOTING PERIOD',
        start: formatDate(startDateObj),
        time: formatTime(startDateObj),
        end: formatDate(endDateObj),
        endTime: formatTime(endDateObj),
        status: initialStatus,
      },
      {
        title: 'APPEAL PERIOD',
        start: formatDate(new Date(endDateObj.getTime() + 60000)),
        time: formatTime(new Date(endDateObj.getTime() + 60000)), // Starts 1 minute after voting ends
        end: formatDate(new Date(endDateObj.getTime() + 5 * 60000)), // 5 minutes later
        endTime: formatTime(new Date(endDateObj.getTime() + 5 * 60000)),
        status: 'upcoming',
      },
    ];

    // Handle background image
    let backgroundImage = null;
    if (req.file) {
      backgroundImage = `/uploads/elections/${req.file.filename}`;
    }

    const election = await Election.create({
      title,
      description,
      startDate,
      endDate,
      maxVotesPerMember: maxVotesPerMember || 1,
      status: initialStatus,
      timeline: defaultTimeline,
      backgroundImage,
      createdBy: userId,
    });

    console.log('Election created:', election);

    res.status(201).json({
      message: 'Election created successfully',
      election,
    });
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(400).json({ message: error.message });
  }
};

const getElections = async (req, res) => {
  try {
    const elections = await Election.find().sort({ createdAt: -1 });

    // Add candidate and position counts to each election
    const electionsWithCounts = await Promise.all(
      elections.map(async (election) => {
        // Update status if needed (upcoming -> active, active -> completed)
        await updateElectionStatusIfNeeded(election);
        
        const candidateCount = await Candidate.countDocuments({ electionId: election._id });
        const positionCount = await Position.countDocuments({ electionId: election._id });
        
        return {
          ...election.toObject(),
          candidateCount,
          positionCount,
          partylistCount: 0,
        };
      })
    );

    res.json(electionsWithCounts);
  } catch (error) {
    console.error('getElections error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getElectionById = async (req, res) => {
  try {
    const { id } = req.params;

    let election = await Election.findById(id);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Update status if needed (upcoming -> active, active -> completed)
    await updateElectionStatusIfNeeded(election);

    const candidates = await Candidate.find({ electionId: id }).sort({
      createdAt: 1,
    });

    res.json({ ...election.toObject(), candidates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, maxVotesPerMember, resultsPublic, status } =
      req.body;

    const election = await Election.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(maxVotesPerMember !== undefined && { maxVotesPerMember }),
        ...(resultsPublic !== undefined && { resultsPublic }),
        ...(status && { status }),
      },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    res.json({
      message: 'Election updated successfully',
      election,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findByIdAndDelete(id);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Find all candidates for this election first
    const candidates = await Candidate.find({ electionId: id });
    const candidateIds = candidates.map(c => c._id);

    // Delete all votes for these candidates AND for this election directly
    await Vote.deleteMany({ 
      $or: [
        { candidateId: { $in: candidateIds } },
        { electionId: id }
      ]
    });

    // Cascade delete all candidates associated with this election
    await Candidate.deleteMany({ electionId: id });

    res.json({ message: 'Election deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findByIdAndUpdate(
      id,
      { status: 'active', startedAt: new Date() },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    res.json({
      message: 'Election started successfully',
      election,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const completeElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findByIdAndUpdate(
      id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Automatically create an announcement when election ends
    try {
      await Announcement.create({
        title: `Election Completed: ${election.title}`,
        content: `The election "${election.title}" has ended. ${election.description ? 'Description: ' + election.description : ''} The results are now available for review.`,
        priority: 'HIGH',
        date: new Date(),
        author: 'System',
        createdBy: election.createdBy,
      });
    } catch (announcementError) {
      console.error('Failed to create announcement for election completion:', announcementError);
      // Don't fail the election completion if announcement creation fails
    }

    res.json({
      message: 'Election completed successfully',
      election,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetElectionCycle = async (req, res) => {
  try {
    const { electionId, newEndDate, wipeEntities, title } = req.body;
    const userId = req.user?.id;

    console.log('=== resetElectionCycle called ===');
    console.log('Request body:', JSON.stringify(req.body));
    console.log('wipeEntities:', wipeEntities, 'Type:', typeof wipeEntities);
    console.log('title:', title);

    // Convert wipeEntities to boolean explicitly
    const shouldWipe = wipeEntities === true || wipeEntities === 'true';
    
    console.log('wipeEntities boolean check:', shouldWipe);

    let election = null;
    // Only find election if doing soft reset and electionId is valid
    if (!shouldWipe && electionId && electionId !== 'null') {
      election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ message: 'Election not found' });
      }
    }

    let deletedVotes = { deletedCount: 0 };
    let deletedCandidates = { deletedCount: 0 };
    let deletedElections = { deletedCount: 0 };
    
    if (shouldWipe) {
      // Deep reset: Delete ALL candidates, ALL votes, and ALL elections (including all categories)
      console.log('Starting hard wipe...');
      deletedCandidates = await Candidate.deleteMany({});
      console.log(`Deleted ${deletedCandidates.deletedCount} candidates`);
      
      deletedVotes = await Vote.deleteMany({});
      console.log(`Deleted ${deletedVotes.deletedCount} votes`);
      
      // Delete ALL elections (all categories/positions)
      deletedElections = await Election.deleteMany({});
      console.log(`Deleted ${deletedElections.deletedCount} elections`);
      
      // Verify deletion
      const remainingElections = await Election.countDocuments({});
      console.log(`Remaining elections after deletion: ${remainingElections}`);
    } else {
      // Soft reset: Clear votes and reset candidate counts for the specific election
      deletedVotes = await Vote.deleteMany({ electionId });
      await Candidate.updateMany(
        { electionId },
        { votes: 0 }
      );
      // Update election end date and status if provided
      if (newEndDate) {
        election.endDate = newEndDate;
      }
      // Always set to active during reset
      election.status = 'active';
      await election.save();
      
      // Mark all OTHER elections as completed
      await Election.updateMany(
        { _id: { $ne: electionId }, status: 'active' },
        { status: 'completed' }
      );
    }

    // Reset hasVoted flag for all users
    await User.updateMany({}, { hasVoted: false });

    // Log the cycle reset action
    try {
      await Activity.create({
        userId,
        action: 'CYCLE_RESET',
        description: `Election cycle reset: Cleared ${deletedVotes.deletedCount} votes${shouldWipe ? `, deleted ${deletedCandidates.deletedCount} candidates, and deleted ${deletedElections.deletedCount} elections` : ''}. New end date: ${newEndDate || 'unchanged'}`,
        metadata: {
          electionId: shouldWipe ? 'ALL' : electionId,
          votesCleared: deletedVotes.deletedCount,
          candidatesCleared: deletedCandidates.deletedCount,
          electionsDeleted: deletedElections.deletedCount,
          newEndDate: newEndDate || election?.endDate,
          timestamp: new Date(),
        },
      });
    } catch (logError) {
      console.error('Failed to log cycle reset:', logError);
      // Continue even if logging fails
    }

    res.json({
      message: 'Election cycle reset successfully',
      data: {
        votesCleared: deletedVotes.deletedCount,
        candidatesCleared: deletedCandidates.deletedCount,
        electionsDeleted: shouldWipe ? deletedElections.deletedCount : 0,
        usersReset: (await User.countDocuments({})),
        newEndDate: newEndDate,
        election: shouldWipe ? await Election.findOne({ status: 'active' }) : election,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createElection,
  getElections,
  getElectionById,
  updateElection,
  deleteElection,
  startElection,
  completeElection,
  resetElectionCycle,
};

