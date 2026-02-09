module.exports = {
    secret: process.env.JWT_SECRET || 'saint-vincent-voting-system-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  };