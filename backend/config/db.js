const mongoose = require('mongoose');

// Global cache for serverless environments (Vercel / AWS Lambda)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let memServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/freelancehub';

  // 1. Return cached active connection if ready
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 2. If a connection is in-flight, await it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    const isServerlessOrProd =
      process.env.NODE_ENV === 'production' ||
      !!process.env.VERCEL ||
      !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    // Connect to MongoDB Atlas in production or when an external URI is provided
    if (isServerlessOrProd || (process.env.MONGO_URI && !uri.includes('127.0.0.1') && !uri.includes('localhost'))) {
      console.log('Connecting to MongoDB Atlas / Remote Instance...');
      cached.promise = mongoose.connect(uri, opts).then((m) => {
        console.log('MongoDB Atlas Connected successfully.');
        return m;
      });
    } else {
      // Local development with graceful in-memory fallback
      console.log(`Connecting to local MongoDB at: ${uri}`);
      cached.promise = mongoose
        .connect(uri, { ...opts, serverSelectionTimeoutMS: 2500 })
        .then((m) => {
          console.log('MongoDB Connected successfully (Local).');
          return m;
        })
        .catch(async (err) => {
          console.warn(`Local MongoDB connection failed (${err.message}). Starting MongoMemoryServer fallback...`);
          try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            memServer = await MongoMemoryServer.create();
            const memUri = memServer.getUri();
            console.log(`MongoMemoryServer running at: ${memUri}`);
            return await mongoose.connect(memUri, opts);
          } catch (memErr) {
            console.error('Fatal: Could not start in-memory MongoDB fallback:', memErr.message);
            throw memErr;
          }
        });
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

const closeDB = async () => {
  await mongoose.disconnect();
  if (memServer) {
    await memServer.stop();
  }
  cached.conn = null;
  cached.promise = null;
};

module.exports = { connectDB, closeDB };
