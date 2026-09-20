import mongoose from 'mongoose';
import dns from 'dns';

// Fix for querySrv ENOTFOUND on serverless / cloud environments:
// Node's default resolver can fail resolving DNS SRV records in some container/network environments.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore if custom DNS servers are not permitted in current environment
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache to persist connection across serverless function invocations
declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export const connectDB = async (): Promise<typeof mongoose> => {
  // Return cached connection if already open
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGO_URI;

  // On Vercel, catch missing or localhost MONGO_URI early
  if (process.env.VERCEL && (!mongoUri || mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1'))) {
    const errorMsg = 'MONGO_URI is not set in Vercel Environment Variables or is pointing to localhost.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const uri = mongoUri || 'mongodb://localhost:27017/planora';

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    throw error;
  }

  return cached.conn;
};

