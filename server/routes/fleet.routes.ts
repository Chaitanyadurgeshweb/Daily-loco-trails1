import express from 'express';
import multer from 'multer';
import { Database } from '../db.js';
import { requireAuth, requireMasterAdmin } from '../auth.js';
import { LocoTrailsEngine } from '../loco-engine.js';

export const fleetRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * List all locomotive OEM mappings
 */
fleetRouter.get('/locos', requireAuth, (req, res) => {
  const makes = Database.getLocoMakesList();
  res.json({ makes });
});

/**
 * Add or update single locomotive OEM mapping
 */
fleetRouter.post('/locos', requireAuth, (req, res) => {
  const { locoId, make, notes } = req.body;
  if (!locoId || !make) {
    return res.status(400).json({ error: 'Locomotive ID and Make are required' });
  }

  const saved = Database.setLocoMake(locoId, make, notes);

  Database.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'LOCO_MAKE_UPDATED',
    details: `Updated locomotive ${saved.locoId} OEM to ${saved.make}`,
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.json({ make: saved });
});

/**
 * Delete a locomotive OEM mapping
 */
fleetRouter.delete('/locos/:id', requireAuth, requireMasterAdmin, (req, res) => {
  const { id } = req.params;
  const deleted = Database.deleteLocoMake(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Locomotive entry not found' });
  }

  Database.logAudit({
    userId: req.user!.id,
    username: req.user!.username,
    action: 'LOCO_MAKE_DELETED',
    details: `Removed locomotive ${id} from fleet registry`,
    ip: req.ip,
    status: 'SUCCESS',
  });

  res.json({ message: `Locomotive ${id} removed` });
});

/**
 * Bulk upload Make Details Excel/CSV file
 */
fleetRouter.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Spreadsheet file is required' });
  }

  try {
    const makeMap = LocoTrailsEngine.parseMakeWorkbook(req.file.buffer);
    const entries = Object.entries(makeMap).map(([locoId, make]) => ({
      locoId,
      make,
      notes: `Imported from ${req.file?.originalname}`,
    }));

    if (entries.length === 0) {
      return res.status(400).json({
        error: 'No valid locomotive and make columns detected. Required: Loco ID and Make/Company headers.',
      });
    }

    Database.bulkSetLocoMakes(entries);

    Database.logAudit({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'FLEET_CATALOGUE_BULK_UPLOAD',
      details: `Bulk imported ${entries.length} locomotive OEM records from ${req.file.originalname}`,
      ip: req.ip,
      status: 'SUCCESS',
    });

    res.json({
      message: `Successfully updated ${entries.length} locomotive OEM mappings`,
      totalImported: entries.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});
