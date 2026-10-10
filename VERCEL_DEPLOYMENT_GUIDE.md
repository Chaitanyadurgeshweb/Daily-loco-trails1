# LocoTrails Pro — Vercel Deployment Guide

This project is pre-configured and 100% **Vercel Deploy Ready**.

---

## What makes this project Vercel-Ready?

1. **`vercel.json`**:
   - Routes `/api/(.*)` requests to the Serverless Function at `/api/index.ts`.
   - Routes frontend SPA routes `/(.*)` to the static Vite build output at `dist/index.html`.
2. **Serverless Function (`/api/index.ts`)**:
   - Lightweight Express adapter with cold-start initialization and session parsing.
3. **Writable Storage Fallback (`/tmp`)**:
   - Vercel's serverless environment uses a read-only root filesystem. The database and reports pipeline automatically detect `process.env.VERCEL` and use `/tmp/locotrails_data` to ensure zero filesystem permission crashes.
4. **`.vercelignore`**:
   - Excludes extraneous build artifacts, `node_modules`, and local reports.

---

## Method 1: Deploy with Vercel CLI (Fastest)

1. Unzip the project folder if using the zip archive.
2. In the project directory, run:
   ```bash
   npm install -g vercel
   vercel
   ```
3. Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? **[Your Vercel Account]**
   - Link to existing project? **No**
   - What's your project's name? **locotrails-pro**
   - In which directory is your code located? **./**
   - Want to modify settings? **No**
4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## Method 2: Deploy via GitHub & Vercel Dashboard

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial LocoTrails Pro Vercel release"
   git remote add origin https://github.com/YOUR_USERNAME/locotrails-pro.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. Set the Framework Preset to **Vite** (or leave default; `vercel.json` handles the build).
5. (Optional) Add Environment Variables:
   - `INITIAL_ADMIN_PASSWORD`: Your custom master admin password (default: `Admin@LocoTrails2025!`)
   - `NODE_ENV`: `production`
6. Click **Deploy**.

---

## Method 3: Deploy by Uploading the ZIP Archive

1. Download the pre-packaged `locotrails-pro-vercel.zip` from this application using the button in the header or at `/api/download/vercel-zip`.
2. Extract the ZIP locally.
3. Run `vercel deploy` inside the unzipped directory.

---

## Post-Deployment Verification

Once deployed, test:
1. **Health Check**: Visit `https://your-app.vercel.app/api/health`
2. **Sign In**:
   - **Master Admin**: `masteradmin` / `Admin@LocoTrails2025!`
   - **Regular User**: `trialtester` / `Engineer@2025!`
3. **1-Click Sample Run**: Execute a trial analysis on the dashboard to verify the end-to-end zero-start filtration and Excel generation in the cloud!
