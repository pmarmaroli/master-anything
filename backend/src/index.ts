import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import masteryRoutes from './routes/mastery.routes';
import sessionRoutes from './routes/session.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', masteryRoutes);
app.use('/api', sessionRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`UMA backend running on port ${PORT}`);
});

export default app;
