import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import charitiesRoutes from './routes/charities';
import eventsRoutes from './routes/events';
import donationsRoutes from './routes/donations';
import setupRoutes from './routes/setup';
import eventUpdatesRoutes from './routes/eventUpdates';
import usersRoutes from './routes/users';
import guestsRoutes from './routes/guests';
import invitationsRoutes from './routes/invitations';
import favoriteCharitiesRoutes from './routes/favoriteCharities';
import coHostsRoutes from './routes/coHosts';
import potluckRoutes from './routes/potluck';
import publicCharityPageRoutes from './routes/publicCharityPage';
import charityCommitmentsRoutes from './routes/charityCommitments';
import eventTemplatesRoutes from './routes/eventTemplates';
import eventThemesRoutes from './routes/eventThemes';
import emailTestRoutes from './routes/emailTest';
import eventImagesRoutes from './routes/eventImages';
import eventPhotosRoutes from './routes/eventPhotos';
import calendarRoutes from './routes/calendar';
import targetedEmailsRoutes from './routes/targetedEmails';
import scheduledTasksRoutes from './routes/scheduledTasks';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // CSP not needed for an API server
}));
app.use(compression()); // Enable gzip compression for responses

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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/charities', charitiesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/event-updates', eventUpdatesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/favorite-charities', favoriteCharitiesRoutes);
app.use('/api/co-hosts', coHostsRoutes);
app.use('/api/potluck', potluckRoutes);
app.use('/api/charity-page', publicCharityPageRoutes);
app.use('/api/charity-commitments', charityCommitmentsRoutes);
app.use('/api/event-templates', eventTemplatesRoutes);
app.use('/api/event-themes', eventThemesRoutes);
app.use('/api/email-test', emailTestRoutes);
app.use('/api/event-images', eventImagesRoutes);
app.use('/api/event-photos', eventPhotosRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/targeted-emails', targetedEmailsRoutes);
app.use('/api/scheduled-tasks', scheduledTasksRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Run migrations on startup in production
async function startServer() {
  try {
    // Run migrations before starting server
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Running database migrations on startup...');
      const runMigrations = (await import('./database/run-migrations')).default;
      await runMigrations();
      console.log('✅ Migrations completed');
    }

    // Start scheduled tasks (donation reminders, etc.)
    const { startScheduledTasks } = await import('./services/scheduler');
    startScheduledTasks();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
