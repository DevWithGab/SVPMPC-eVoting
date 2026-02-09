const { Report, Election, Vote, Candidate, User } = require('../models');

const generateElectionReport = async (req, res) => {
  try {
    const { electionId } = req.body;

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const totalVotes = await Vote.countDocuments({ electionId });

    const candidates = await Candidate.find({ electionId });

    const candidateVotes = {};
    for (const candidate of candidates) {
      const votesForCandidate = await Vote.countDocuments({
        candidateId: candidate._id,
      });
      candidateVotes[String(candidate._id)] = {
        name: candidate.name,
        votes: votesForCandidate,
        percentage:
          totalVotes > 0
            ? Math.round((votesForCandidate / totalVotes) * 100)
            : 0,
      };
    }

    const report = await Report.create({
      title: `Election Report - ${election.title}`,
      type: 'election_summary',
      data: {
        electionId: String(election._id),
        electionTitle: election.title,
        electionStatus: election.status,
        totalVotes,
        candidates: candidateVotes,
        generatedAt: new Date(),
      },
      generatedBy: req.user._id,
      electionId: election._id,
    });

    res.status(201).json({
      message: 'Report generated successfully',
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateVoteCountReport = async (req, res) => {
  try {
    const { electionId } = req.body;

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const votes = await Vote.find({ electionId })
      .populate('candidateId', 'name')
      .populate('userId', 'username fullName');

    const voteCountData = {
      electionId: String(election._id),
      electionTitle: election.title,
      totalVotes: votes.length,
      votesByCandidate: {},
      votesByUser: {},
    };

    votes.forEach((vote) => {
      const cand = vote.candidateId;
      const user = vote.userId;
      if (!cand || !user) return;

      const candidateId = String(cand._id);
      const userId = String(user._id);

      if (!voteCountData.votesByCandidate[candidateId]) {
        voteCountData.votesByCandidate[candidateId] = {
          candidateName: cand.name,
          count: 0,
          voters: [],
        };
      }

      voteCountData.votesByCandidate[candidateId].count += 1;
      voteCountData.votesByCandidate[candidateId].voters.push({
        userId,
        username: user.username,
        fullName: user.fullName,
      });

      if (!voteCountData.votesByUser[userId]) {
        voteCountData.votesByUser[userId] = {
          username: user.username,
          fullName: user.fullName,
          votes: 0,
        };
      }

      voteCountData.votesByUser[userId].votes += 1;
    });

    const report = await Report.create({
      title: `Vote Count Report - ${election.title}`,
      type: 'vote_count',
      data: voteCountData,
      generatedBy: req.user._id,
      electionId: election._id,
    });

    res.status(201).json({
      message: 'Report generated successfully',
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('generatedBy', 'username fullName')
      .populate('electionId', 'title')
      .sort({ createdAt: -1 });

    const shaped = reports.map((r) => {
      const obj = r.toObject();
      obj.generator = obj.generatedBy;
      return obj;
    });

    res.json(shaped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'username fullName')
      .populate('electionId', 'title');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const obj = report.toObject();
    obj.generator = obj.generatedBy;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateElectionReport,
  generateVoteCountReport,
  getReports,
  getReportById,
  deleteReport,
};

