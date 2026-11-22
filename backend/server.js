const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const seedData = require('./config/seed');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const freelancerRoutes = require('./routes/freelancerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const projectRoutes = require('./routes/projectRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const smartMatchRoutes = require('./routes/smartMatchRoutes');

const Category = require('./models/Category');

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ==========================================
// API ROUTER (All /api endpoints)
// ==========================================
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/freelancers', freelancerRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/services', serviceRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/proposals', proposalRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/', smartMatchRoutes);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'FreelanceHub',
    version: '1.0.0',
    database: 'connected',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date()
  });
});

// Manual seed trigger endpoint (useful for demo/reset on MongoDB Atlas)
apiRouter.post('/seed', async (req, res) => {
  try {
    await seedData();
    res.json({ success: true, message: 'Sample database seeded successfully on MongoDB Atlas!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Catch-all 404 for any unmatched /api requests (Returns clean JSON, never index.html)
apiRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} not found`
  });
});

// Mount API router at both /api (standard) and root (if URL was rewritten in serverless)
app.use('/api', apiRouter);

// ==========================================
// STATIC ASSETS & SPA FALLBACK (Standalone Mode)
// ==========================================
const uploadsPath = path.join(__dirname, 'uploads');
try {
  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
  }
} catch (e) {
  // Read-only filesystem in serverless
}

const vendorPath = path.join(__dirname, '../node_modules');
try {
  if (fs.existsSync(vendorPath)) {
    app.use('/vendor', express.static(vendorPath));
  }
} catch (e) {
  // Ignore in serverless
}

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Central Error Handler
app.use(errorHandler);

// SPA fallback for AngularJS routing (non-API paths only)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

// Initialize Database & Start Server (for local standalone node runs)
const startServer = async () => {
  try {
    await connectDB();

    // Check if seeding is needed on fresh database
    try {
      const count = await Category.countDocuments();
      if (count === 0) {
        console.log('No categories detected. Auto-seeding initial marketplace data...');
        await seedData();
      }
    } catch (seedErr) {
      console.warn('Auto-seed check note:', seedErr.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  FreelanceHub Server Running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
