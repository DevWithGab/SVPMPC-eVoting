const { Rule } = require('../models');

const createRule = async (req, res) => {
  try {
    const { title, content, order } = req.body;

    const rule = await Rule.create({
      title,
      content,
      order: order ?? 0,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'Rule created successfully',
      rule,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ order: 1, createdAt: 1 });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRuleById = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRule = async (req, res) => {
  try {
    const { title, content, order } = req.body;

    const rule = await Rule.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(order !== undefined && { order }),
      },
      { new: true }
    );

    if (!rule) {
      return res
        .status(404)
        .json({ message: 'Rule not found or unauthorized' });
    }

    res.json({
      message: 'Rule updated successfully',
      rule,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!rule) {
      return res
        .status(404)
        .json({ message: 'Rule not found or unauthorized' });
    }

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule,
};

