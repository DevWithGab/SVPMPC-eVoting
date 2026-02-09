// server/controllers/position.controller.js
const { Position, Election, Candidate } = require('../models');
const mongoose = require('mongoose');

const createPosition = async (req, res) => {
  try {
    const { title, description, electionId, order, type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(400).json({ message: 'Invalid election' });
    }

    const userId = req.user?._id;

    const position = await Position.create({
      title,
      description,
      electionId,
      type: type || 'OFFICER',
      order: order || 0,
      createdBy: userId,
    });

    // If type is "PROPOSAL", automatically create voting option candidates
    if (type === 'PROPOSAL') {
      const votingOptions = ['Abstain', 'Approve', 'Reject'];
      
      for (const option of votingOptions) {
        await Candidate.create({
          name: option,
          description: `${option} this proposal`,
          electionId,
          positionId: position._id,
          createdBy: userId,
        });
      }
    }

    res.status(201).json({
      message: 'Position created successfully',
      position,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getPositions = async (req, res) => {
  try {
    const { electionId } = req.query;
    const filter = electionId ? { electionId } : {};
    const positions = await Position.find(filter).sort({ order: 1 });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPositionById = async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }
    res.json(position);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePosition = async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const position = await Position.findByIdAndUpdate(
      req.params.id,
      { title, description, order },
      { new: true, runValidators: true }
    );
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }
    res.json(position);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deletePosition = async (req, res) => {
  try {
    const position = await Position.findByIdAndDelete(req.params.id);
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }
    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPosition,
  getPositions,
  getPositionById,
  updatePosition,
  deletePosition,
};
