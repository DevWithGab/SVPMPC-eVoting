const checkRole = (roles) => {
    return (req, res, next) => {
      console.log('=== Role Check Middleware ===');
      console.log('Required roles:', roles);
      console.log('req.user exists:', !!req.user);
      
      if (!req.user) {
        console.log('✗ No req.user - Authentication required');
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      console.log('User ID:', req.user._id || req.user.id);
      console.log('User role:', req.user.role);
      console.log('User role type:', typeof req.user.role);
      console.log('Role check result:', roles.includes(req.user.role));
      
      if (!roles.includes(req.user.role)) {
        console.log('✗ Permission denied - role not in allowed list');
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      console.log('✓ Permission granted');
      next();
    };
  };
  
  module.exports = { checkRole };