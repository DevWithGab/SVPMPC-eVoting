// server/routes/position.routes.js
const express = require('express');
const router = express.Router();
const positionController = require('../controllers/position.controller');
const authenticate = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validation.middleware');

router.post(
  '/',
  authenticate,
  validate(schemas.position),
  positionController.createPosition
);

router.get('/', positionController.getPositions);
router.get('/:id', positionController.getPositionById);

router.put(
  '/:id',
  authenticate,
  validate(schemas.position),
  positionController.updatePosition
);

router.delete('/:id', authenticate, positionController.deletePosition);

module.exports = router;
