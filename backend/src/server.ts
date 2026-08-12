import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import commentRoutes from './routes/commentRoutes';
import notificationRoutes from './routes/notificationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

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

// Expose static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
