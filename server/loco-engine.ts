import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import path from 'path';

export interface RawTrialRow {
  loco: string;
  station: string;
  direction: string;
  direction_short: string;
  from: string;
  to: string;
  section: string;
  source: string;
  date?: string;
}

export interface DetailRecord {
  loco: string;
  direction: string;
  date: string;
  section: string;
}

export interface ProcessedTrialResult {
  detailRows: DetailRecord[];
  allRows: RawTrialRow[];
  filteredDetailRows: DetailRecord[];
  removedKeys: Array<{ loco: string; direction: string }>;
  removedExamples: Record<string, RawTrialRow>;
  makeMap: Record<string, string>;
  groupedTrips: Array<{
    date: string;
    loco: string;
    trips: number;
    make: string;
    isMedha: boolean;
  }>;
  dateWiseSummary: Array<{
    date: string;
    totalTrips: number;
    medhaTrips: number;
    otherFirmsTrips: number;
  }>;
  notFoundLocos: Array<{
    locoId: string;
    count: number;
  }>;
  stats: {
    totalFiles: number;
    sections: string[];
    dates: string[];
    uniqueLocosCount: number;
    zeroStartRemovedCount: number;
    totalTrips: number;
    medhaTrips: number;
    otherFirmsTrips: number;
    skippedFiles: string[];
  };
}

export class LocoTrailsEngine {
  // Color palette constants matching original Python openpyxl styles
  public static readonly COLOR_YELLOW = 'FFFFFF00';
  public static readonly COLOR_MAKE_ORANGE = 'FFFFBF00';
  public static readonly COLOR_PURPLE = 'FF800080';
  public static readonly COLOR_SEPARATOR = 'FFB2B2B2';
  public static readonly COLOR_BORDER = 'FFBFBFBF';

  public static cleanText(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }

  public static normalizeHeader(val: any): string {
    return this.cleanText(val).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  public static normalizeLoco(val: any): string {
    let text = this.cleanText(val);
    if (text.endsWith('.0')) {
      text = text.slice(0, -2);
    }
    return text;
  }

  public static normalizeDirection(val: any, short = false): string {
    const text = this.cleanText(val).toUpperCase();
    if (text === 'NOM' || text === 'NOMINAL') {
      return short ? 'NOM' : 'Nominal';
    }
    if (text === 'REV' || text === 'REVERSE') {
      return short ? 'REV' : 'Reverse';
    }
    return short ? this.cleanText(val) : this.cleanText(val);
  }

  public static locoSortKey(val: any): number {
    const digits = this.cleanText(val).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  public static parseDateTime(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val;
    }
    const text = this.cleanText(val);
    if (!text) return null;

    // Check common formats
    // YYYY-MM-DD HH:mm:ss
    const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (isoMatch) {
      return new Date(
        parseInt(isoMatch[1]),
        parseInt(isoMatch[2]) - 1,
        parseInt(isoMatch[3]),
        parseInt(isoMatch[4]),
        parseInt(isoMatch[5]),
        parseInt(isoMatch[6])
      );
    }

    // DD/MM/YY HH:mm:ss or DD/MM/YYYY HH:mm:ss
    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (slashMatch) {
      let year = parseInt(slashMatch[3]);
      if (year < 100) year += 2000;
      return new Date(
        year,
        parseInt(slashMatch[2]) - 1,
        parseInt(slashMatch[1]),
        parseInt(slashMatch[4]),
        parseInt(slashMatch[5]),
        parseInt(slashMatch[6])
      );
    }

    const d = new Date(text);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Railway trial zero-start check:
   * Returns true if time is between 00:00:00 and 00:00:06 inclusive.
   */
  public static isZeroStart(val: any): boolean {
    const dt = this.parseDateTime(val);
    if (!dt) return false;
    const hours = dt.getHours();
    const minutes = dt.getMinutes();
    const seconds = dt.getSeconds();
    return hours === 0 && minutes === 0 && seconds >= 0 && seconds <= 6;
  }

  public static formatDateString(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const yr = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${yr}`;
  }

  public static dateFromRow(row: any[], dateCol: number | null, fromCol: number | null): string {
    if (dateCol !== null && dateCol < row.length) {
      const val = row[dateCol];
      if (val !== null && val !== undefined && val !== '') {
        if (val instanceof Date) {
          return this.formatDateString(val);
        }
        return this.cleanText(val);
      }
    }
    if (fromCol !== null && fromCol < row.length) {
      const dt = this.parseDateTime(row[fromCol]);
      if (dt) {
        return this.formatDateString(dt);
      }
    }
    return '';
  }

  public static sortDate(val: string): number {
    const clean = this.cleanText(val);
    if (!clean) return Number.MAX_SAFE_INTEGER;
    const parts = clean.split('/');
    if (parts.length === 3) {
      let yr = parseInt(parts[2], 10);
      if (yr < 100) yr += 2000;
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[0], 10);
      return new Date(yr, month, day).getTime();
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  public static findColumn(headers: any[], options: string[]): number | null {
    const normalized = headers.map((h) => this.normalizeHeader(h));
    for (const opt of options) {
      const target = this.normalizeHeader(opt);
      for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] === target || normalized[i].includes(target)) {
          return i;
        }
      }
    }
    return null;
  }

  /**
   * Parses an Excel or CSV file buffer (XLSX, XLS, XLSM, CSV)
   */
  public static parseSheetBuffer(buffer: Buffer, filename: string, sectionName: string): {
    detailRows: DetailRecord[];
    allRows: RawTrialRow[];
  } {
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      dense: false,
    });

    const detailMap = new Map<string, DetailRecord>();
    const finalRows: RawTrialRow[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd hh:mm:ss',
      });

      if (!data || data.length === 0) continue;

      let headerRowIndex = -1;
      let locoCol: number | null = null;
      let dirCol: number | null = null;
      let dateCol: number | null = null;
      let stationCol: number | null = null;
      let fromCol: number | null = null;
      let toCol: number | null = null;

      // Check first 20 rows for headers
      const maxHeaderCheck = Math.min(data.length, 20);
      for (let r = 0; r < maxHeaderCheck; r++) {
        const row = data[r];
        if (!row || !Array.isArray(row)) continue;

        const possibleLoco = this.findColumn(row, ['locoid', 'locono', 'loconumber', 'loco']);
        const possibleDir = this.findColumn(row, ['direction', 'dir']);

        if (possibleLoco !== null && possibleDir !== null) {
          headerRowIndex = r;
          locoCol = possibleLoco;
          dirCol = possibleDir;
          dateCol = this.findColumn(row, ['date', 'trialdate']);
          stationCol = this.findColumn(row, ['stationid', 'stationcode', 'station']);
          fromCol = this.findColumn(row, ['from', 'start', 'fromtime', 'departure']);
          toCol = this.findColumn(row, ['to', 'arrival', 'totime']);
          break;
        }
      }

      if (headerRowIndex === -1 || locoCol === null || dirCol === null) {
        continue;
      }

      let currentLoco = '';
      let currentDirectionFull = '';
      let currentDirectionShort = '';

      for (let r = headerRowIndex + 1; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;

        let loco = this.normalizeLoco(row[locoCol]);
        let dirFull = this.normalizeDirection(row[dirCol], false);
        let dirShort = this.normalizeDirection(row[dirCol], true);

        if (loco) {
          currentLoco = loco;
        } else {
          loco = currentLoco;
        }

        if (dirFull) {
          currentDirectionFull = dirFull;
          currentDirectionShort = dirShort;
        } else {
          dirFull = currentDirectionFull;
          dirShort = currentDirectionShort;
        }

        if (!loco || (dirShort !== 'NOM' && dirShort !== 'REV')) {
          continue;
        }

        const trialDate = this.dateFromRow(row, dateCol, fromCol);
        const detailKey = `${loco}__${dirShort}__${trialDate}__${sectionName}`;

        if (!detailMap.has(detailKey)) {
          detailMap.set(detailKey, {
            loco,
            direction: dirShort,
            date: trialDate,
            section: sectionName,
          });
        }

        const station = this.cleanText(stationCol !== null ? row[stationCol] : '');
        const fromVal = this.cleanText(fromCol !== null ? row[fromCol] : '');
        const toVal = this.cleanText(toCol !== null ? row[toCol] : '');

        finalRows.push({
          loco,
          station,
          direction: dirFull,
          direction_short: dirShort,
          from: fromVal,
          to: toVal,
          section: sectionName,
          source: filename,
          date: trialDate,
        });
      }
    }

    return {
      detailRows: Array.from(detailMap.values()),
      allRows: finalRows,
    };
  }

  /**
   * Parses Make Details mapping from an Excel or CSV file
   */
  public static parseMakeWorkbook(buffer: Buffer): Record<string, string> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const makeMap: Record<string, string> = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!data || data.length === 0) continue;

      let locoCol: number | null = null;
      let makeCol: number | null = null;
      let headerRow = -1;

      for (let r = 0; r < Math.min(data.length, 20); r++) {
        const row = data[r];
        if (!row) continue;
        const possibleLoco = this.findColumn(row, ['locono', 'loconumber', 'locoid', 'loco']);
        const possibleMake = this.findColumn(row, ['make', 'locomake', 'company', 'oem', 'firm']);
        if (possibleLoco !== null && possibleMake !== null) {
          locoCol = possibleLoco;
          makeCol = possibleMake;
          headerRow = r;
          break;
        }
      }

      if (headerRow === -1 || locoCol === null || makeCol === null) continue;

      for (let r = headerRow + 1; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;
        const loco = this.normalizeLoco(row[locoCol]);
        const make = this.cleanText(row[makeCol]);
        if (loco) {
          makeMap[loco] = make;
        }
      }
    }

    return makeMap;
  }

  /**
   * Core trial processing algorithm replicating the Python logic:
   * 1. Detects and extracts zero-start rows (00:00:00 to 00:00:06).
   * 2. Removes flagged (loco, direction) pairs from the final detail records.
   * 3. Groups trips by (date, loco) to count test directions.
   * 4. Matches with Make Details dictionary (Medha vs other firms).
   * 5. Compiles date-wise summaries and missing loco registry entries.
   */
  public static processTrials(
    files: Array<{ filename: string; buffer: Buffer; section?: string; folderPath?: string }>,
    makeMap: Record<string, string>
  ): ProcessedTrialResult {
    const allDetailRows: DetailRecord[] = [];
    const allFinalRows: RawTrialRow[] = [];
    const skippedFiles: string[] = [];
    const sectionsSet = new Set<string>();
    const datesSet = new Set<string>();

    for (const file of files) {
      try {
        let sectionName = file.section || 'General Section';
        if (file.folderPath) {
          const parts = file.folderPath.split(/[/\\]/).filter(Boolean);
          if (parts.length > 0) {
            sectionName = parts[parts.length - 1];
          }
        } else {
          const nameWithoutExt = path.basename(file.filename, path.extname(file.filename));
          if (!file.section) {
            sectionName = nameWithoutExt.split(/[-_]/)[0] || 'Section 1';
          }
        }

        sectionsSet.add(sectionName);
        const parsed = this.parseSheetBuffer(file.buffer, file.filename, sectionName);
        allDetailRows.push(...parsed.detailRows);
        allFinalRows.push(...parsed.allRows);
      } catch (err: any) {
        skippedFiles.push(`${file.filename}: ${err?.message || 'Read error'}`);
      }
    }

    // Zero-start identification
    const removedKeysSet = new Set<string>();
    const removedKeysList: Array<{ loco: string; direction: string }> = [];
    const removedExamples: Record<string, RawTrialRow> = {};

    for (const row of allFinalRows) {
      if (this.isZeroStart(row.from)) {
        const key = `${row.loco}__${row.direction_short}`;
        if (!removedKeysSet.has(key)) {
          removedKeysSet.add(key);
          removedKeysList.push({ loco: row.loco, direction: row.direction_short });
          removedExamples[key] = row;
        }
      }
    }

    // Filter out zero-start records
    const filteredDetailRows = allDetailRows.filter((r) => {
      const key = `${r.loco}__${r.direction}`;
      return !removedKeysSet.has(key);
    });

    // Group trip data by (date, loco) -> set of directions
    const groupedMap = new Map<string, { date: string; loco: string; directions: Set<string> }>();

    for (const r of filteredDetailRows) {
      if (r.date) datesSet.add(r.date);
      const groupKey = `${r.date}__${r.loco}`;
      let entry = groupedMap.get(groupKey);
      if (!entry) {
        entry = { date: r.date, loco: r.loco, directions: new Set<string>() };
        groupedMap.set(groupKey, entry);
      }
      entry.directions.add(r.direction);
    }

    const groupedTrips = Array.from(groupedMap.values()).map((item) => {
      const make = makeMap[item.loco] || '';
      const isMedha = make.trim().toLowerCase() === 'medha';
      return {
        date: item.date,
        loco: item.loco,
        trips: item.directions.size,
        make: make || 'Not Found',
        isMedha,
      };
    });

    // Sort grouped trips: date then loco numeric sort key
    groupedTrips.sort((a, b) => {
      const dateA = LocoTrailsEngine.sortDate(a.date);
      const dateB = LocoTrailsEngine.sortDate(b.date);
      if (dateA !== dateB) return dateA - dateB;
      return LocoTrailsEngine.locoSortKey(a.loco) - LocoTrailsEngine.locoSortKey(b.loco);
    });

    // Date-wise summary
    const dateTotals = new Map<string, { total: number; medha: number; other: number }>();
    for (const item of groupedTrips) {
      if (!item.date) continue;
      let dtEntry = dateTotals.get(item.date);
      if (!dtEntry) {
        dtEntry = { total: 0, medha: 0, other: 0 };
        dateTotals.set(item.date, dtEntry);
      }
      dtEntry.total += item.trips;
      if (item.isMedha) {
        dtEntry.medha += item.trips;
      } else {
        dtEntry.other += item.trips;
      }
    }

    const sortedDates = Array.from(dateTotals.keys()).sort(
      (a, b) => LocoTrailsEngine.sortDate(a) - LocoTrailsEngine.sortDate(b)
    );

    const dateWiseSummary = sortedDates.map((d) => {
      const entry = dateTotals.get(d)!;
      return {
        date: d,
        totalTrips: entry.total,
        medhaTrips: entry.medha,
        otherFirmsTrips: entry.other,
      };
    });

    // Not found locos counts
    const notFoundCounts = new Map<string, number>();
    for (const r of filteredDetailRows) {
      if (!makeMap[r.loco]) {
        notFoundCounts.set(r.loco, (notFoundCounts.get(r.loco) || 0) + 1);
      }
    }

    const notFoundLocos = Array.from(notFoundCounts.entries())
      .map(([locoId, count]) => ({ locoId, count }))
      .sort((a, b) => LocoTrailsEngine.locoSortKey(a.locoId) - LocoTrailsEngine.locoSortKey(b.locoId));

    const totalTrips = groupedTrips.reduce((acc, t) => acc + t.trips, 0);
    const medhaTrips = groupedTrips.filter((t) => t.isMedha).reduce((acc, t) => acc + t.trips, 0);
    const otherFirmsTrips = totalTrips - medhaTrips;
    const uniqueLocos = new Set(filteredDetailRows.map((r) => r.loco)).size;

    return {
      detailRows: allDetailRows,
      allRows: allFinalRows,
      filteredDetailRows,
      removedKeys: removedKeysList,
      removedExamples,
      makeMap,
      groupedTrips,
      dateWiseSummary,
      notFoundLocos,
      stats: {
        totalFiles: files.length,
        sections: Array.from(sectionsSet),
        dates: Array.from(datesSet),
        uniqueLocosCount: uniqueLocos,
        zeroStartRemovedCount: removedKeysList.length,
        totalTrips,
        medhaTrips,
        otherFirmsTrips,
        skippedFiles,
      },
    };
  }

  /**
   * Generates the authentic 4-sheet Excel workbook with precise styles matching
   * openpyxl python implementation:
   * 1. Loco Details
   * 2. Loco Trip Details
   * 3. Date Wise Summary
   * 4. Not Found Locos
   */
  public static async generateExcelWorkbook(result: ProcessedTrialResult): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LocoTrails Pro Enterprise System';
    workbook.created = new Date();

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    };

    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF000000' },
    };

    const purpleHeaderFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    const normalFont: Partial<ExcelJS.Font> = {
      name: 'Arial',
      size: 10,
      color: { argb: 'FF000000' },
    };

    const yellowFill: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' },
    };

    const purpleFill: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF800080' },
    };

    const orangeFill: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFBF00' },
    };

    const separatorFill: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB2B2B2' },
    };

    // ----------------------------------------------------
    // Sheet 1: Loco Details
    // ----------------------------------------------------
    const wsLocoDetails = workbook.addWorksheet('Loco Details', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }],
    });

    const sectionNames = Array.from(new Set(result.filteredDetailRows.map((r) => r.section))).sort();
    const rowsBySection: Record<string, DetailRecord[]> = {};
    for (const sec of sectionNames) {
      rowsBySection[sec] = result.filteredDetailRows.filter((r) => r.section === sec);
    }

    let startRow = 1;
    let maxRowsWritten = 0;

    sectionNames.forEach((section, index) => {
      const startCol = 1 + index * 5;
      const endCol = startCol + 3;

      // Section title merged header
      wsLocoDetails.mergeCells(startRow, startCol, startRow, endCol);
      const titleCell = wsLocoDetails.getCell(startRow, startCol);
      titleCell.value = section;
      titleCell.fill = purpleFill;
      titleCell.font = purpleHeaderFont;
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = thinBorder;

      // Column subheaders
      const subheaders = ['Loco ID', 'Direction', 'Date', 'Section'];
      subheaders.forEach((hdr, offset) => {
        const c = wsLocoDetails.getCell(startRow + 1, startCol + offset);
        c.value = hdr;
        c.fill = yellowFill;
        c.font = headerFont;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
      });

      const sectionRows = (rowsBySection[section] || []).slice().sort((a, b) => {
        const diff = LocoTrailsEngine.locoSortKey(a.loco) - LocoTrailsEngine.locoSortKey(b.loco);
        if (diff !== 0) return diff;
        return a.direction.localeCompare(b.direction);
      });

      sectionRows.forEach((row, offset) => {
        const currRow = startRow + 2 + offset;
        const vals = [row.loco, row.direction, row.date, row.section];
        vals.forEach((v, vOffset) => {
          const c = wsLocoDetails.getCell(currRow, startCol + vOffset);
          c.value = v;
          c.font = normalFont;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          c.border = thinBorder;
        });
      });

      if (sectionRows.length > maxRowsWritten) {
        maxRowsWritten = sectionRows.length;
      }

      // Column widths
      for (let c = startCol; c <= endCol; c++) {
        wsLocoDetails.getColumn(c).width = 13;
      }

      // Separator column
      if (index < sectionNames.length - 1) {
        const sepCol = endCol + 1;
        wsLocoDetails.getColumn(sepCol).width = 2;
        const sepMax = startRow + 1 + sectionRows.length;
        for (let r = startRow; r <= sepMax; r++) {
          const sepCell = wsLocoDetails.getCell(r, sepCol);
          sepCell.fill = separatorFill;
          sepCell.border = thinBorder;
        }
      }
    });

    // ----------------------------------------------------
    // Sheet 2: Loco Trip Details
    // ----------------------------------------------------
    const wsTripDetails = workbook.addWorksheet('Loco Trip Details', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    const tripHeaders = ['Date ', 'Loco ID', 'Trips', 'Make'];
    tripHeaders.forEach((hdr, col) => {
      const c = wsTripDetails.getCell(1, col + 1);
      c.value = hdr;
      c.fill = yellowFill;
      c.font = headerFont;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
    });

    result.groupedTrips.forEach((item, offset) => {
      const rIndex = 2 + offset;
      const makeDisplay = item.make || 'Not Found';
      const isOrange = makeDisplay.toLowerCase().trim() !== 'medha';

      const vals = [item.date, item.loco, item.trips, makeDisplay];
      vals.forEach((v, cOffset) => {
        const c = wsTripDetails.getCell(rIndex, cOffset + 1);
        c.value = v;
        c.font = normalFont;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
        if (isOrange) {
          c.fill = orangeFill;
        }
      });
    });

    wsTripDetails.getColumn(1).width = 14;
    wsTripDetails.getColumn(2).width = 14;
    wsTripDetails.getColumn(3).width = 10;
    wsTripDetails.getColumn(4).width = 16;

    // ----------------------------------------------------
    // Sheet 3: Date Wise Summary
    // ----------------------------------------------------
    const wsSummary = workbook.addWorksheet('Date Wise Summary', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    const summaryHeaders = ['Date', 'Total Trip Count', 'Medha Trips', 'Other Firms Locos'];
    summaryHeaders.forEach((hdr, col) => {
      const c = wsSummary.getCell(1, col + 1);
      c.value = hdr;
      c.fill = yellowFill;
      c.font = headerFont;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
    });

    result.dateWiseSummary.forEach((item, offset) => {
      const rIndex = 2 + offset;
      const vals = [item.date, item.totalTrips, item.medhaTrips, item.otherFirmsTrips];
      vals.forEach((v, cOffset) => {
        const c = wsSummary.getCell(rIndex, cOffset + 1);
        c.value = v;
        c.font = normalFont;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
      });
    });

    for (let c = 1; c <= 4; c++) {
      wsSummary.getColumn(c).width = 18;
    }

    // ----------------------------------------------------
    // Sheet 4: Not Found Locos
    // ----------------------------------------------------
    const wsNotFound = workbook.addWorksheet('Not Found Locos', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    const notFoundHeaders = ['Loco Id', 'Trip Count'];
    notFoundHeaders.forEach((hdr, col) => {
      const c = wsNotFound.getCell(1, col + 1);
      c.value = hdr;
      c.fill = yellowFill;
      c.font = headerFont;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
    });

    result.notFoundLocos.forEach((item, offset) => {
      const rIndex = 2 + offset;
      const vals = [item.locoId, item.count];
      vals.forEach((v, cOffset) => {
        const c = wsNotFound.getCell(rIndex, cOffset + 1);
        c.value = v;
        c.font = normalFont;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
      });
    });

    wsNotFound.getColumn(1).width = 14;
    wsNotFound.getColumn(2).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates a sample Indian Railways trial dataset zip file containing
   * realistic dated folders and section spreadsheets for testing.
   */
  public static generateSampleRailwayDataset(): Buffer {
    const zip = new AdmZip();

    // Sample trial data structure:
    // 2025-05-10/
    //   Secunderabad/
    //     SC_trials_morning.xlsx
    //   Kazipet/
    //     KZJ_trials_main.xlsx
    // 2025-05-11/
    //   Vijayawada/
    //     BZA_trials.xlsx
    // Loco_Make_Details.xlsx

    const createSheetBuffer = (rows: any[][]) => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'TrialData');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    };

    // Secunderabad trial sheet with normal and zero-start records
    const scRows = [
      ['Loco ID', 'Direction', 'Date', 'Station Code', 'From', 'To'],
      // Zero-start artifact (00:00:03 - should be filtered!)
      ['30001', 'NOM', '10/05/25', 'SC', '2025-05-10 00:00:03', '2025-05-10 02:45:00'],
      // Valid runs
      ['30001', 'REV', '10/05/25', 'SC', '2025-05-10 08:30:00', '2025-05-10 11:15:00'],
      ['30002', 'NOM', '10/05/25', 'KZJ', '2025-05-10 06:10:00', '2025-05-10 09:20:00'],
      ['30050', 'NOM', '10/05/25', 'SC', '2025-05-10 10:00:00', '2025-05-10 12:45:00'],
      ['30080', 'REV', '10/05/25', 'SC', '2025-05-10 13:15:00', '2025-05-10 16:30:00'],
      // Missing loco in make list
      ['99999', 'NOM', '10/05/25', 'HYB', '2025-05-10 14:00:00', '2025-05-10 17:00:00'],
    ];

    const kzjRows = [
      ['Loco ID', 'Direction', 'Date', 'Station Code', 'From', 'To'],
      ['30002', 'REV', '10/05/25', 'KZJ', '2025-05-10 14:20:00', '2025-05-10 17:40:00'],
      ['30050', 'REV', '10/05/25', 'KZJ', '2025-05-10 15:30:00', '2025-05-10 18:45:00'],
      ['30105', 'NOM', '10/05/25', 'MDR', '2025-05-10 11:00:00', '2025-05-10 14:30:00'],
      // Another zero start (00:00:05)
      ['30200', 'NOM', '10/05/25', 'KZJ', '2025-05-10 00:00:05', '2025-05-10 03:00:00'],
    ];

    const bzaRows = [
      ['Loco ID', 'Direction', 'Date', 'Station Code', 'From', 'To'],
      ['30001', 'NOM', '11/05/25', 'BZA', '2025-05-11 07:15:00', '2025-05-11 10:20:00'],
      ['30001', 'REV', '11/05/25', 'BZA', '2025-05-11 12:00:00', '2025-05-11 15:10:00'],
      ['30080', 'NOM', '11/05/25', 'GDR', '2025-05-11 08:30:00', '2025-05-11 11:45:00'],
      ['30080', 'REV', '11/05/25', 'GDR', '2025-05-11 13:00:00', '2025-05-11 16:30:00'],
      ['60001', 'NOM', '11/05/25', 'BZA', '2025-05-11 09:00:00', '2025-05-11 13:00:00'],
      ['88888', 'REV', '11/05/25', 'BZA', '2025-05-11 10:15:00', '2025-05-11 14:20:00'],
    ];

    const makeRows = [
      ['Loco No', 'Make', 'Company Details'],
      ['30001', 'Medha', 'Medha Servo Drives Ltd'],
      ['30002', 'Medha', 'Medha Servo Drives Ltd'],
      ['30105', 'Medha', 'Medha Servo Drives Ltd'],
      ['30200', 'Medha', 'Medha Servo Drives Ltd'],
      ['30050', 'BHEL', 'Bharat Heavy Electricals Ltd'],
      ['30080', 'Siemens', 'Siemens Mobility India'],
      ['60001', 'Alstom', 'Alstom Transport India'],
    ];

    zip.addFile('2025-05-10/Secunderabad/SC_trials.xlsx', createSheetBuffer(scRows));
    zip.addFile('2025-05-10/Kazipet/KZJ_trials.xlsx', createSheetBuffer(kzjRows));
    zip.addFile('2025-05-11/Vijayawada/BZA_trials.xlsx', createSheetBuffer(bzaRows));
    zip.addFile('Loco_Make_Details.xlsx', createSheetBuffer(makeRows));

    return zip.toBuffer();
  }
}
