const { app } = require('../backend/server');
const { connectDB } = require('../backend/config/db');
const Category = require('../backend/models/Category');
const seedData = require('../backend/config/seed');

let seeded = false;

module.exports = async (req, res) => {
  // 1. Establish/reuse cached MongoDB connection
  try {
    await connectDB();

    // 2. Auto-seed once on fresh MongoDB Atlas database if empty
    if (!seeded) {
      try {
        const count = await Category.countDocuments();
        if (count === 0) {
          console.log('Fresh database detected on Vercel invocation. Initializing seed data...');
          await seedData();
        }
        seeded = true;
      } catch (seedErr) {
        console.warn('Auto-seed check notice:', seedErr.message);
      }
    }
  } catch (dbErr) {
    console.error('Database connection error in Vercel function:', dbErr);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGO_URI is configured in Vercel project environment variables.',
      error: process.env.NODE_ENV === 'development' ? dbErr.message : undefined
    });
  }

  // 3. Delegate request execution to Express application
  return app(req, res);
};
