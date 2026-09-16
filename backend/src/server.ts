import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import commentRoutes from './routes/commentRoutes';
import notificationRoutes from './routes/notificationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Eagerly connect for traditional server mode
if (!process.env.VERCEL) {
  connectDB().catch((err) => {
    console.error('Initial database connection error:', (err as Error).message);
  });
}

// Global Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows cross-origin requests for static images/videos
}));
app.use(cors({
  origin: '*', // Allow all origins for development/testing, can restrict later
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Ensure DB connection for all API routes (critical for Vercel serverless cold starts)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/' || req.path === '/api/health') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error in request:', (error as Error).message);
    res.status(503).json({
      message: 'Database connection failed',
      error: (error as Error).message,
      hint: process.env.VERCEL
        ? 'Please ensure MONGO_URI is configured in your Vercel Project Settings > Environment Variables, and that MongoDB Atlas Network Access has 0.0.0.0/0 whitelisted.'
        : 'Please ensure your local MongoDB instance is running.',
    });
  }
});

// Expose static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health and Diagnostics Endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let dbHost: string | null = null;
  let connectionError: string | null = null;

  try {
    await connectDB();
    dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'connecting';
    dbHost = mongoose.connection.host;
  } catch (err) {
    dbStatus = 'error';
    connectionError = (err as Error).message;
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      host: dbHost,
      isConfigured: Boolean(process.env.MONGO_URI),
      isLocalhost: process.env.MONGO_URI ? process.env.MONGO_URI.includes('localhost') : true,
      error: connectionError,
    },
    environment: process.env.NODE_ENV || 'development',
    serverless: Boolean(process.env.VERCEL),
  });
});

// Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Base Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Planora API (v1.0.0)' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Planora server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

export default app;
