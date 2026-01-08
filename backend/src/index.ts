import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import charitiesRoutes from './routes/charities';
import eventsRoutes from './routes/events';
import donationsRoutes from './routes/donations';
import setupRoutes from './routes/setup';
import eventUpdatesRoutes from './routes/eventUpdates';
import employerMatchingRoutes from './routes/employerMatching';
import usersRoutes from './routes/users';
import guestsRoutes from './routes/guests';
import invitationsRoutes from './routes/invitations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

// CORS configuration - allow multiple origins in production
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://giftwithimpact.com',
  'https://www.giftwithimpact.com',
  'http://localhost:5173' // for development
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(morgan('dev'));

app.use('/api/donations/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const { query } = await import('./database/db');
    await query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/charities', charitiesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/event-updates', eventUpdatesRoutes);
app.use('/api/employer-matching', employerMatchingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/invitations', invitationsRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
