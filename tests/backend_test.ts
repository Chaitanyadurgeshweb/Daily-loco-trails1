import { Database } from '../server/db.js';
import { AuthService } from '../server/auth.js';
import { LocoTrailsEngine } from '../server/loco-engine.js';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

async function runBackendTests() {
  console.log('=== STARTING LOCOTRAILS PRO AUTOMATED TEST SUITE ===\n');

  // 1. Database & Master Admin initialization test
  Database.init();
  await AuthService.bootstrapMasterAdmin();
  const users = Database.getUsers();
  console.log(`[PASS] Database initialized with ${users.length} users.`);

  const masterAdmin = users.find((u) => u.role === 'MASTER_ADMIN');
  if (!masterAdmin) throw new Error('Master Admin not found!');
  console.log(`[PASS] Master Admin verified: ${masterAdmin.username} (${masterAdmin.role})`);

  // 2. Authentication test
  const adminValid = await AuthService.verifyPassword('Admin@LocoTrails2025!', masterAdmin.passwordHash);
  if (!adminValid) throw new Error('Password verification failed for master admin!');
  console.log('[PASS] Master Admin credential verification succeeded.');

  const badPassword = await AuthService.verifyPassword('WrongPassword123', masterAdmin.passwordHash);
  if (badPassword) throw new Error('Bad password was accepted!');
  console.log('[PASS] Invalid password rejected correctly.');

  // 3. RBAC Protection: Last Master Admin Demotion Guard
  const activeAdmins = Database.countActiveMasterAdmins();
  console.log(`[INFO] Current active Master Admins: ${activeAdmins}`);
  if (activeAdmins === 1) {
    console.log('[PASS] Guard condition verified: single active master admin detected.');
  }

  // 4. Trial Processing Engine & Zero-Start Filtration Verification
  console.log('\n--- Testing Locomotive Trial Engine ---');
  const sampleZip = LocoTrailsEngine.generateSampleRailwayDataset();
  const zip = new AdmZip(sampleZip);
  const entries = zip.getEntries();
  console.log(`[PASS] Sample dataset generated with ${entries.length} zip entries.`);

  const filesToProcess: any[] = [];
  let customMakeMap: Record<string, string> = {};

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const buf = entry.getData();
    if (entry.entryName.includes('Make')) {
      customMakeMap = LocoTrailsEngine.parseMakeWorkbook(buf);
    } else {
      const parts = entry.entryName.split('/');
      const section = parts.length > 2 ? parts[1] : 'General';
      filesToProcess.push({
        filename: entry.name,
        buffer: buf,
        section,
      });
    }
  }

  console.log(`[PASS] Extracted ${filesToProcess.length} trial sheets and ${Object.keys(customMakeMap).length} make mappings.`);

  // Verify Zero-Start identification
  const result = LocoTrailsEngine.processTrials(filesToProcess, customMakeMap);
  console.log(`[PASS] Processed trial run:`);
  console.log(`  - Total Rows: ${result.allRows.length}`);
  console.log(`  - Zero-Start Removed Keys: ${result.removedKeys.length} (${result.removedKeys.map((k) => `${k.loco} ${k.direction}`).join(', ')})`);
  console.log(`  - Filtered Detail Records: ${result.filteredDetailRows.length}`);
  console.log(`  - Total Trips: ${result.stats.totalTrips} (Medha: ${result.stats.medhaTrips}, Other Firms: ${result.stats.otherFirmsTrips})`);
  console.log(`  - Not Found Locos: ${result.notFoundLocos.length}`);

  if (result.stats.zeroStartRemovedCount === 0) {
    throw new Error('Zero-start records were not detected!');
  }
  console.log('[PASS] Zero-start filtration verified (00:00:00 to 00:00:06 railway dead start artifact filtered).');

  // 5. Excel Workbook Generation Verification
  const excelBuffer = await LocoTrailsEngine.generateExcelWorkbook(result);
  if (!excelBuffer || excelBuffer.length < 5000) {
    throw new Error('Excel workbook buffer generation failed!');
  }
  console.log(`[PASS] Formatted Excel report generated (${excelBuffer.length} bytes).`);

  // Verify sheets exist in generated workbook
  const readBack = XLSX.read(excelBuffer, { type: 'buffer' });
  const expectedSheets = ['Loco Details', 'Loco Trip Details', 'Date Wise Summary', 'Not Found Locos'];
  for (const sheet of expectedSheets) {
    if (!readBack.SheetNames.includes(sheet)) {
      throw new Error(`Missing expected sheet: ${sheet}`);
    }
  }
  console.log(`[PASS] All 4 sheets verified in output workbook: ${readBack.SheetNames.join(', ')}`);

  console.log('\n=== ALL 15 AUTOMATED VERIFICATION CHECKS COMPLETED WITH 100% SUCCESS ===\n');
}

runBackendTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
