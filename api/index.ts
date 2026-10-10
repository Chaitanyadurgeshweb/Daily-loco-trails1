import express from 'express';
import cookieParser from 'cookie-parser';
import { Database } from '../server/db.js';
import { AuthService } from '../server/auth.js';
import { authRouter } from '../server/routes/auth.routes.js';
import { adminRouter } from '../server/routes/admin.routes.js';
import { trialsRouter } from '../server/routes/trials.routes.js';
import { fleetRouter } from '../server/routes/fleet.routes.js';

const app = express();

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));
app.use(cookieParser());

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    Database.init();
    await AuthService.bootstrapMasterAdmin();
    initialized = true;
  }
}

app.use(async (req, res, next) => {
  await ensureInit();
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LocoTrails Pro Enterprise Backend (Vercel Serverless)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/download/vercel-zip', async (req, res) => {
  try {
    const { createVercelZipBuffer } = await import('../server/vercel-packager.js');
    const zipBuffer = createVercelZipBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="locotrails-pro-vercel.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create Vercel zip: ${err.message}` });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/trials', trialsRouter);
app.use('/api/fleet', fleetRouter);

export default app;
