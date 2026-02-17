/**
 * Import Access Control Middleware
 * Enforces role-based access control for bulk member import operations
 * Ensures only authorized admins can access member data and import operations
 */

const { User, ImportOperation } = require('../models');

/**
 * Middleware to verify admin role for import operations
 * All import endpoints require admin role
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const requireAdminForImport = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required',
      error: {
        code: 'UNAUTHORIZED',
        message: 'No user found in request',
      },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Insufficient permissions',
      error: {
        code: 'FORBIDDEN',
        message: 'Only admins can perform import operations',
      },
    });
  }

  next();
};

/**
 * Middleware to verify admin can access specific member data
 * Ensures only admins can view imported member details
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const requireAdminForMemberAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required',
      error: {
        code: 'UNAUTHORIZED',
        message: 'No user found in request',
      },
    });
  }

  // Only admins can access member data
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Insufficient permissions',
      error: {
        code: 'FORBIDDEN',
        message: 'Only admins can access member data',
      },
    });
  }

  next();
};

/**
 * Middleware to verify admin can access specific import operation
 * Validates that the import operation exists and user is admin
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const requireAdminForImportAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        error: {
          code: 'UNAUTHORIZED',
          message: 'No user found in request',
        },
      });
    }

    // Only admins can access import operations
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Insufficient permissions',
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can access import operations',
        },
      });
    }

    // Verify import operation exists
    const { importId } = req.params;
    if (importId) {
      const importOp = await ImportOperation.findById(importId);
      if (!importOp) {
        return res.status(404).json({
          message: 'Import operation not found',
          error: {
            code: 'NOT_FOUND',
            message: `Import operation with ID ${importId} does not exist`,
          },
        });
      }
      // Attach import operation to request for use in controller
      req.importOperation = importOp;
    }

    next();
  } catch (error) {
    console.error('Error in import access middleware:', error);
    return res.status(500).json({
      message: 'Error verifying access',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
};

/**
 * Middleware to verify admin can access specific member
 * Validates that the member exists and is an imported member
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const requireAdminForMemberDetail = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        error: {
          code: 'UNAUTHORIZED',
          message: 'No user found in request',
        },
      });
    }

    // Only admins can access member details
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Insufficient permissions',
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can access member details',
        },
      });
    }

    // Verify member exists and is imported
    const { memberId, userId } = req.params;
    const targetId = memberId || userId;

    if (targetId) {
      const member = await User.findOne({
        $or: [
          { _id: targetId },
          { member_id: targetId },
        ],
        import_id: { $exists: true, $ne: null },
      });

      if (!member) {
        return res.status(404).json({
          message: 'Member not found',
          error: {
            code: 'NOT_FOUND',
            message: `Imported member with ID ${targetId} does not exist`,
          },
        });
      }

      // Attach member to request for use in controller
      req.targetMember = member;
    }

    next();
  } catch (error) {
    console.error('Error in member access middleware:', error);
    return res.status(500).json({
      message: 'Error verifying access',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
};

/**
 * Middleware to mask sensitive member data in responses
 * Ensures sensitive information is not exposed in list views
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const maskSensitiveData = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  // Override json method to mask sensitive data
  res.json = function (data) {
    if (data && data.data) {
      // Mask data in list responses
      if (Array.isArray(data.data)) {
        data.data = data.data.map(item => maskItem(item));
      } else if (data.data.members && Array.isArray(data.data.members)) {
        data.data.members = data.data.members.map(item => maskItem(item));
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Helper function to mask sensitive fields in a member object
 * Masks email and member_id in list views
 * 
 * @param {object} item - Member object to mask
 * @returns {object} Masked member object
 */
function maskItem(item) {
  if (!item) return item;

  const masked = { ...item };

  // Mask email - show only first character and domain
  if (masked.email) {
    const [localPart, domain] = masked.email.split('@');
    masked.email = `${localPart.charAt(0)}***@${domain}`;
  }

  // Mask member_id - show only first and last 2 characters
  if (masked.member_id && masked.member_id.length > 4) {
    const id = masked.member_id;
    masked.member_id = `${id.substring(0, 2)}***${id.substring(id.length - 2)}`;
  }

  return masked;
}

module.exports = {
  requireAdminForImport,
  requireAdminForMemberAccess,
  requireAdminForImportAccess,
  requireAdminForMemberDetail,
  maskSensitiveData,
};
