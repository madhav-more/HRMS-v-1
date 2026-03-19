import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import announcementRoutes from './routes/announcement.routes.js';

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── BODY PARSERS ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── LOGGING ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'HRMS API v2' });
});

// ─── API ROUTES ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/announcements', announcementRoutes);

// ─── ERROR HANDLING ────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── START SERVER ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 HRMS API Server running on http://localhost:${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

export default app;
