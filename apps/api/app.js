import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/auth.js';
import classroomRoutes from './src/routes/classrooms.js';
import contentRoutes from './src/routes/content.js';
import runRoutes from './src/routes/runs.js';
import tipsRoutes from './src/routes/tips.js';
import { pool } from './src/db/pool.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN || true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'mariadb', service: 'goal-api' });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Datenbank nicht erreichbar.', detail: String(err.message) });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/tips', tipsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler.' });
});

app.listen(port, () => {
  console.log(`GOAL API listening on port ${port} (MariaDB)`);
});

export default app;
