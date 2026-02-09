const { Candidate, Election, Position } = require('../models');
const mongoose = require('mongoose');

const createCandidate = async (req, res) => {
  try {
    const { name, description, photoUrl, electionId, positionId } = req.body;

    // Validate electionId and positionId are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(positionId)) {
      return res.status(400).json({ message: 'Invalid position ID format' });
    }

    const election = await Election.findById(electionId);
    const position = await Position.findById(positionId);

    if (!election) {
      return res.status(400).json({ message: 'Invalid election' });
    }
    if (!position) {
      return res.status(400).json({ message: 'Invalid position' });
    }

    const userId = req.user?._id;

    const candidate = await Candidate.create({
      name,
      description,
      photoUrl,
      electionId,
      positionId,
      createdBy: userId,
    });

    res.status(201).json({
      message: 'Candidate created successfully',
      candidate,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCandidates = async (req, res) => {
  try {
    const { electionId } = req.query;

    const filter = {};
    if (electionId) {
      filter.electionId = electionId;
    }

    const candidates = await Candidate.find(filter)
      .populate('electionId', 'title status')
      .populate('positionId', 'title order type')
      .sort({ createdAt: 1 });

    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ message: error.message });
  }
};

const getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate(
      'electionId',
      'title status'
    );

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    res.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateCandidate = async (req, res) => {
  try {
    const { name, description, photoUrl } = req.body;

    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(photoUrl !== undefined && { photoUrl }),
      },
      { new: true }
    );

    if (!candidate) {
      return res
        .status(404)
        .json({ message: 'Candidate not found or unauthorized' });
    }

    res.json({
      message: 'Candidate updated successfully',
      candidate,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!candidate) {
      return res
        .status(404)
        .json({ message: 'Candidate not found or unauthorized' });
    }

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadCandidatePhoto = async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate candidateId
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate ID format' });
    }

    // Convert file buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Check authorization - user must be the creator
    const candidate = await Candidate.findOne({
      _id: candidateId,
      createdBy: req.user.id
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found or unauthorized' });
    }

    // Update candidate with new photo
    candidate.photoUrl = imageDataUrl;
    await candidate.save();

    res.json({
      message: 'Candidate photo uploaded successfully',
      candidate,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  uploadCandidatePhoto
};