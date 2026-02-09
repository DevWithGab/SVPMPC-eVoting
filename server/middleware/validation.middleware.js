const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
};

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().min(2).max(100).required(),
    address: Joi.string().optional(),
    role: Joi.string().valid('admin', 'officer', 'member').optional()
  }),
  election: Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    description: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    maxVotesPerMember: Joi.number().integer().min(1).optional(),
    status: Joi.string().valid('active', 'upcoming', 'completed').optional(),
    resultsPublic: Joi.boolean().optional(),
    role: Joi.string().valid('admin', 'officer').optional()
  }),
  position: Joi.object({
    title: Joi.string().min(2).max(100).required(),
    description: Joi.string().optional(),
    electionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid election ID format. Election ID must be a valid MongoDB ID.',
      'any.required': 'Election ID is required.'
    }),
    type: Joi.string().valid('OFFICER', 'PROPOSAL').optional(),
    order: Joi.number().integer().optional()
  }),
  candidate: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().optional(),
    photoUrl: Joi.string().uri().optional(),
    electionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid election ID format. Election ID must be a valid MongoDB ID.',
      'any.required': 'Election ID is required.'
    }),
    positionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid position ID format. Position ID must be a valid MongoDB ID.',
      'any.required': 'Position ID is required.'
    })
  }),
  vote: Joi.object({
    candidateId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    electionId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
};

module.exports = { validate, schemas };