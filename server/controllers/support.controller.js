// server/controllers/support.controller.js
const { SupportTicket, User } = require('../models');

// Get all support tickets
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'fullName email username')
      .populate('resolvedBy', 'fullName')
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get open tickets only
exports.getOpenTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ status: 'OPEN' })
      .populate('userId', 'fullName email username')
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId')
      .populate('resolvedBy');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create support ticket
exports.createTicket = async (req, res) => {
  try {
    const { subject, message, category, attachmentUrl } = req.body;
    const userId = req.user._id; // Get from authenticated JWT token
    
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const ticket = new SupportTicket({
      userId,
      subject,
      message,
      category: category || 'GENERAL_INQUIRY',
      priority: 'MEDIUM',
      status: 'OPEN',
      attachmentUrl
    });
    
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update ticket status
exports.updateTicket = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    ticket.status = status;
    
    if (status === 'RESOLVED') {
      ticket.resolution = resolution || null;
      ticket.resolvedBy = req.user?._id || null;
      ticket.resolvedAt = new Date();
    }
    
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Escalate ticket
exports.escalateTicket = async (req, res) => {
  try {
    const { escalatedTo } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    ticket.status = 'ESCALATED';
    ticket.escalatedTo = escalatedTo || 'LEVEL_01';
    
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get tickets by user
exports.getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;
    const tickets = await SupportTicket.find({ userId })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ticket statistics
exports.getTicketStats = async (req, res) => {
  try {
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const categoryStats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({ statusStats: stats, categoryStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json({ message: 'Ticket deleted', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
