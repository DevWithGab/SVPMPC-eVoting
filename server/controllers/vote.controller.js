const { Vote, Election, Candidate, User } = require('../models');
const { logActivity } = require('./activity.controller');

const castVote = async (req, res) => {
  try {
    const { candidateId, electionId } = req.body;

    const user = await User.findById(req.user._id);
    const candidate = await Candidate.findById(candidateId).populate('positionId');
    const election = await Election.findById(electionId);

    if (!user || !candidate || !election) {
      throw new Error('Invalid vote data');
    }

    if (election.status !== 'active') {
      throw new Error('Election is not active');
    }

    // Get the position ID from the candidate
    const positionId = candidate.positionId?._id || candidate.positionId;

    // Application-level check (fast, user-friendly error message)
    const existingVoteForPosition = await Vote.findOne({
      userId: user._id,
      electionId,
      positionId,
      isAbstain: false,
    });

    if (existingVoteForPosition) {
      throw new Error('You have already voted for this position');
    }

    // Vote.create will also throw a duplicate-key error (E11000) from the
    // unique DB index if two concurrent requests slip past the check above.
    const vote = await Vote.create({
      userId: user._id,
      candidateId,
      positionId,   // ← required for the unique-per-position DB index
      electionId,
      isAbstain: false,
    });

    // Log voting activity
    await logActivity(
      user._id,
      'VOTE',
      `User ${user.username} voted for ${candidate.name} in ${election.title}`,
      { electionId, candidateId, candidateName: candidate.name, electionTitle: election.title },
      req
    );

    res.status(201).json({
      message: 'Vote cast successfully',
      vote,
    });
  } catch (error) {
    // Surface MongoDB duplicate-key errors in a user-friendly way
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already voted for this position' });
    }
    res.status(400).json({ message: error.message });
  }
};

const castAbstainVote = async (req, res) => {
  try {
    const { electionId, positionId } = req.body;

    const user = await User.findById(req.user._id);
    const election = await Election.findById(electionId);

    if (!user || !election) {
      throw new Error('Invalid vote data');
    }

    if (election.status !== 'active') {
      throw new Error('Election is not active');
    }

    // Application-level check: prevent double-voting or double-abstaining for same position
    const existingVoteForPosition = await Vote.findOne({
      userId: user._id,
      electionId,
      positionId,
    });

    if (existingVoteForPosition) {
      const msg = existingVoteForPosition.isAbstain
        ? 'You have already abstained for this position'
        : 'You have already voted for this position';
      throw new Error(msg);
    }

    const vote = await Vote.create({
      userId: user._id,
      candidateId: null,
      positionId,
      electionId,
      isAbstain: true,
    });

    // Log abstain activity
    await logActivity(
      user._id,
      'ABSTAIN',
      `User ${user.username} abstained from voting in ${election.title}`,
      { electionId, positionId, electionTitle: election.title },
      req
    );

    res.status(201).json({
      message: 'Abstain vote recorded successfully',
      vote,
    });
  } catch (error) {
    // Surface MongoDB duplicate-key errors in a user-friendly way
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already voted or abstained for this position' });
    }
    res.status(400).json({ message: error.message });
  }
};

const getUserVotes = async (req, res) => {
  try {
    const votes = await Vote.find({ userId: req.user._id })
      .populate('electionId', 'title status startDate endDate')
      .populate('candidateId', 'name description')
      .sort({ createdAt: -1 });

    res.json(votes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllVotes = async (req, res) => {
  try {
    const votes = await Vote.find()
      .populate('userId', 'username fullName email address')
      .populate('electionId', 'title')
      .populate('candidateId', 'name')
      .sort({ createdAt: -1 });

    res.json(votes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getElectionVotes = async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const votes = await Vote.find({ electionId })
      .populate('candidateId', 'name description')
      .populate('userId', 'username fullName email address')
      .sort({ createdAt: -1 })
      .select('userId candidateId electionId timestamp createdAt updatedAt');

    res.json(votes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getElectionResults = async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const votes = await Vote.find({ electionId }).populate(
      'candidateId',
      'name description'
    );

    const voteCounts = {};

    votes.forEach((vote) => {
      const cand = vote.candidateId;
      if (!cand) return;

      const candidateId = String(cand._id);
      if (!voteCounts[candidateId]) {
        voteCounts[candidateId] = {
          candidateId,
          candidateName: cand.name,
          voteCount: 0,
        };
      }
      voteCounts[candidateId].voteCount += 1;
    });

    const totalVotes = votes.length || 1;

    const results = Object.values(voteCounts)
      .map((entry) => ({
        ...entry,
        percentage: Math.round((entry.voteCount / totalVotes) * 100),
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    res.json({
      electionId,
      totalVotes: votes.length,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  castVote,
  castAbstainVote,
  getUserVotes,
  getAllVotes,
  getElectionVotes,
  getElectionResults,
};

