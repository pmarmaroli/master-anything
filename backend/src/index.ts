import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import masteryRoutes from './routes/mastery.routes';
import sessionRoutes from './routes/session.routes';
import { SessionService } from './services/session.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use('/api', masteryRoutes);
app.use('/api', sessionRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend static files in production
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Clean up sessions older than 7 days every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const sessionService = new SessionService();

function scheduleCleanup() {
  setInterval(async () => {
    try {
      const deleted = await sessionService.deleteOldData(7);
      if (deleted > 0) {
        console.log(`Cleanup: deleted ${deleted} sessions older than 7 days`);
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  }, CLEANUP_INTERVAL_MS);
}

app.listen(PORT, () => {
  console.log(`UMA backend running on port ${PORT}`);
  scheduleCleanup();
});

export default app;
