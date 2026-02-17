const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { createHTTPSServer, enforceHTTPS, setSecurityHeaders } = require('./config/https');

// Routes
const authRoutes = require('./routes/auth.routes.js');
const electionRoutes = require('./routes/election.routes.js');
const positionRoutes = require('./routes/position.routes.js');
const candidateRoutes = require('./routes/candidate.routes.js');
const voteRoutes = require('./routes/vote.routes.js');
const userRoutes = require('./routes/user.routes.js');
const reportRoutes = require('./routes/report.routes.js');
const announcementRoutes = require('./routes/announcement.routes.js');
const ruleRoutes = require('./routes/rule.routes.js');
const activityRoutes = require('./routes/activity.routes.js');
const verificationRoutes = require('./routes/verification.routes.js');
const supportRoutes = require('./routes/support.routes.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security middleware
app.use(enforceHTTPS);
app.use(setSecurityHeaders);

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/support', supportRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection and server start
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Database connection established successfully.');
    
    // Try to create HTTPS server
    const httpsServer = createHTTPSServer(app);
    
    if (httpsServer) {
      // Start HTTPS server
      httpsServer.listen(PORT, () => {
        console.log(`HTTPS Server is running on port ${PORT}`);
      });
    } else {
      // Fall back to HTTP server
      app.listen(PORT, () => {
        console.log(`HTTP Server is running on port ${PORT}`);
        if (process.env.NODE_ENV === 'production') {
          console.warn('WARNING: Running in production without HTTPS. This is not recommended.');
          console.warn('Set SSL_CERT_PATH and SSL_KEY_PATH environment variables to enable HTTPS.');
        }
      });
    }
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();