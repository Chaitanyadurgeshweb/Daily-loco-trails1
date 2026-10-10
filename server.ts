import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './server/db.js';
import { AuthService } from './server/auth.js';
import { authRouter } from './server/routes/auth.routes.js';
import { adminRouter } from './server/routes/admin.routes.js';
import { trialsRouter } from './server/routes/trials.routes.js';
import { fleetRouter } from './server/routes/fleet.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Security and body parsers
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));
  app.use(cookieParser());

  // Initialize persistent database & bootstrap default Master Admin and demo user
  Database.init();
  await AuthService.bootstrapMasterAdmin();

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'LocoTrails Pro Enterprise Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Vercel Ready ZIP package download
  app.get('/api/download/vercel-zip', async (req, res) => {
    try {
      const { createVercelZipBuffer } = await import('./server/vercel-packager.js');
      const zipBuffer = createVercelZipBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="locotrails-pro-vercel.zip"');
      res.send(zipBuffer);
    } catch (err: any) {
      res.status(500).json({ error: `Failed to create Vercel zip: ${err.message}` });
    }
  });

  // API Route registrations
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/trials', trialsRouter);
  app.use('/api/fleet', fleetRouter);

  // Vite integration
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LocoTrails Pro server operational at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
