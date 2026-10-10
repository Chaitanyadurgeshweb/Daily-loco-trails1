import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { Database, TrialRunRecord, DATA_DIR, REPORTS_DIR } from '../db.js';
import { requireAuth } from '../auth.js';
import { LocoTrailsEngine } from '../loco-engine.js';

export const trialsRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * Download the sample Indian Railways trial dataset zip
 */
trialsRouter.get('/sample-dataset.zip', (req, res) => {
  const zipBuffer = LocoTrailsEngine.generateSampleRailwayDataset();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="Indian_Railways_Loco_Trials_Sample.zip"');
  res.send(zipBuffer);
});

/**
 * Process a sample trial run instantly
 */
trialsRouter.post('/process-sample', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const sampleZipBuffer = LocoTrailsEngine.generateSampleRailwayDataset();
    const zip = new AdmZip(sampleZipBuffer);
    const zipEntries = zip.getEntries();

    const filesToProcess: Array<{ filename: string; buffer: Buffer; section?: string; folderPath?: string }> = [];
    let customMakeMap: Record<string, string> | null = null;

    for (const entry of zipEntries) {
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || path.basename(entry.entryName).startsWith('~$')) {
        continue;
      }
      const ext = path.extname(entry.entryName).toLowerCase();
      if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
        const buffer = entry.getData();
        if (entry.entryName.toLowerCase().includes('make')) {
          customMakeMap = LocoTrailsEngine.parseMakeWorkbook(buffer);
        } else {
          const dir = path.dirname(entry.entryName);
          const parts = dir.split(/[/\\]/).filter(Boolean);
          const sectionName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'General';
          filesToProcess.push({
            filename: path.basename(entry.entryName),
            buffer,
            section: sectionName,
            folderPath: dir,
          });
        }
      }
    }

    const effectiveMakeMap = customMakeMap || Database.getLocoMakeMap();
    const result = LocoTrailsEngine.processTrials(filesToProcess, effectiveMakeMap);
    const excelBuffer = await LocoTrailsEngine.generateExcelWorkbook(result);

    const runId = crypto.randomUUID();
    const reportFilename = `Loco_Trails_${new Date().toISOString().slice(0, 10)}_${runId.slice(0, 8)}.xlsx`;
    const reportPath = path.join(REPORTS_DIR, reportFilename);
    fs.writeFileSync(reportPath, excelBuffer);

    const record: TrialRunRecord = {
      id: runId,
      userId: user.id,
      username: user.username,
      title: 'Sample Indian Railways Multi-Section Trial Run',
      runDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      status: 'COMPLETED',
      totalFiles: filesToProcess.length,
      totalSections: result.stats.sections.length,
      totalRowsProcessed: result.allRows.length,
      zeroStartRemovedCount: result.stats.zeroStartRemovedCount,
      notFoundLocosCount: result.notFoundLocos.length,
      totalTrips: result.stats.totalTrips,
      medhaTrips: result.stats.medhaTrips,
      otherFirmsTrips: result.stats.otherFirmsTrips,
      summary: {
        sections: result.stats.sections,
        dates: result.stats.dates,
        uniqueLocosCount: result.stats.uniqueLocosCount,
        removedZeroStartKeys: result.removedKeys.map((k) => `${k.loco} (${k.direction})`),
        dateWiseSummary: result.dateWiseSummary,
        notFoundLocos: result.notFoundLocos,
        tripDetailsPreview: result.groupedTrips.slice(0, 100).map((t) => ({
          date: t.date,
          locoId: t.loco,
          trips: t.trips,
          make: t.make,
          isMedha: t.isMedha,
        })),
      },
      reportFilename,
    };

    Database.addTrialRun(record);

    Database.logAudit({
      userId: user.id,
      username: user.username,
      action: 'SAMPLE_TRIAL_PROCESSED',
      details: `Processed sample dataset with ${filesToProcess.length} files across ${result.stats.sections.length} sections`,
      ip: req.ip,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      record,
      downloadUrl: `/api/trials/download/${runId}`,
    });
  } catch (err: any) {
    console.error('Error processing sample trial run:', err);
    res.status(500).json({ error: `Trial processing failed: ${err.message}` });
  }
});

/**
 * Process uploaded files (ZIP or multiple spreadsheet files)
 */
trialsRouter.post(
  '/process',
  requireAuth,
  upload.fields([
    { name: 'files', maxCount: 50 },
    { name: 'zipFile', maxCount: 1 },
    { name: 'makeFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = req.user!;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const runTitle = (req.body.title as string) || `Loco Trial Run ${new Date().toLocaleDateString()}`;

      const filesToProcess: Array<{ filename: string; buffer: Buffer; section?: string; folderPath?: string }> = [];
      let customMakeMap: Record<string, string> | null = null;

      // Handle custom make details file if supplied
      if (files?.makeFile && files.makeFile.length > 0) {
        customMakeMap = LocoTrailsEngine.parseMakeWorkbook(files.makeFile[0].buffer);
      }

      // Handle ZIP file
      if (files?.zipFile && files.zipFile.length > 0) {
        const zip = new AdmZip(files.zipFile[0].buffer);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
          if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || path.basename(entry.entryName).startsWith('~$')) {
            continue;
          }
          const ext = path.extname(entry.entryName).toLowerCase();
          if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
            const buf = entry.getData();
            if (!customMakeMap && entry.entryName.toLowerCase().includes('make')) {
              customMakeMap = LocoTrailsEngine.parseMakeWorkbook(buf);
            } else {
              const dir = path.dirname(entry.entryName);
              const parts = dir.split(/[/\\]/).filter(Boolean);
              const sectionName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'General';
              filesToProcess.push({
                filename: path.basename(entry.entryName),
                buffer: buf,
                section: sectionName,
                folderPath: dir,
              });
            }
          }
        }
      }

      // Handle direct individual uploaded files
      if (files?.files && files.files.length > 0) {
        for (const f of files.files) {
          if (f.originalname.startsWith('~$')) continue;
          const ext = path.extname(f.originalname).toLowerCase();
          if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
            if (!customMakeMap && f.originalname.toLowerCase().includes('make')) {
              customMakeMap = LocoTrailsEngine.parseMakeWorkbook(f.buffer);
            } else {
              filesToProcess.push({
                filename: f.originalname,
                buffer: f.buffer,
                section: path.basename(f.originalname, ext),
              });
            }
          }
        }
      }

      if (filesToProcess.length === 0) {
        return res.status(400).json({
          error: 'No valid trial spreadsheet files (.xlsx, .xls, .xlsm, .csv) found to process.',
        });
      }

      const effectiveMakeMap = customMakeMap || Database.getLocoMakeMap();
      const result = LocoTrailsEngine.processTrials(filesToProcess, effectiveMakeMap);
      const excelBuffer = await LocoTrailsEngine.generateExcelWorkbook(result);

      const runId = crypto.randomUUID();
      const reportFilename = `Loco_Trails_${new Date().toISOString().slice(0, 10)}_${runId.slice(0, 8)}.xlsx`;
      const reportPath = path.join(REPORTS_DIR, reportFilename);
      fs.writeFileSync(reportPath, excelBuffer);

      const record: TrialRunRecord = {
        id: runId,
        userId: user.id,
        username: user.username,
        title: runTitle,
        runDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        status: 'COMPLETED',
        totalFiles: filesToProcess.length,
        totalSections: result.stats.sections.length,
        totalRowsProcessed: result.allRows.length,
        zeroStartRemovedCount: result.stats.zeroStartRemovedCount,
        notFoundLocosCount: result.notFoundLocos.length,
        totalTrips: result.stats.totalTrips,
        medhaTrips: result.stats.medhaTrips,
        otherFirmsTrips: result.stats.otherFirmsTrips,
        summary: {
          sections: result.stats.sections,
          dates: result.stats.dates,
          uniqueLocosCount: result.stats.uniqueLocosCount,
          removedZeroStartKeys: result.removedKeys.map((k) => `${k.loco} (${k.direction})`),
          dateWiseSummary: result.dateWiseSummary,
          notFoundLocos: result.notFoundLocos,
          tripDetailsPreview: result.groupedTrips.slice(0, 150).map((t) => ({
            date: t.date,
            locoId: t.loco,
            trips: t.trips,
            make: t.make,
            isMedha: t.isMedha,
          })),
        },
        reportFilename,
      };

      Database.addTrialRun(record);

      Database.logAudit({
        userId: user.id,
        username: user.username,
        action: 'TRIAL_RUN_PROCESSED',
        details: `Processed ${filesToProcess.length} files across ${result.stats.sections.length} sections (${record.totalTrips} total trips)`,
        ip: req.ip,
        status: 'SUCCESS',
      });

      res.json({
        success: true,
        record,
        downloadUrl: `/api/trials/download/${runId}`,
      });
    } catch (err: any) {
      console.error('Error processing uploaded trials:', err);
      res.status(500).json({ error: `Trial processing failed: ${err.message}` });
    }
  }
);

/**
 * List trial runs (user sees their own; Master Admin sees all)
 */
trialsRouter.get('/runs', requireAuth, (req, res) => {
  const user = req.user!;
  const allRuns = Database.getTrialRuns();

  if (user.role === 'MASTER_ADMIN') {
    res.json({ runs: allRuns });
  } else {
    const userRuns = allRuns.filter((r) => r.userId === user.id);
    res.json({ runs: userRuns });
  }
});

/**
 * Get detailed run data
 */
trialsRouter.get('/runs/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const user = req.user!;
  const run = Database.getTrialRunById(id);

  if (!run) {
    return res.status(404).json({ error: 'Trial run record not found' });
  }

  // Authorization check
  if (user.role !== 'MASTER_ADMIN' && run.userId !== user.id) {
    return res.status(403).json({ error: 'You are not authorized to view this trial record' });
  }

  res.json({ run });
});

/**
 * Download generated Excel report file
 */
trialsRouter.get('/download/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const user = req.user!;
  const run = Database.getTrialRunById(id);

  if (!run || !run.reportFilename) {
    return res.status(404).json({ error: 'Report file not found' });
  }

  // Ownership / RBAC check
  if (user.role !== 'MASTER_ADMIN' && run.userId !== user.id) {
    return res.status(403).json({ error: 'Access denied to this report file' });
  }

  const filePath = path.join(REPORTS_DIR, run.reportFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Report file has expired or was removed from disk' });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${run.reportFilename}"`);
  res.sendFile(filePath);
});
