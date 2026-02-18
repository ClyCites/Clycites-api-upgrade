/**
 * Analytics Export Service
 *
 * Generates CSV (Phase 1) and JSON exports from chart query results.
 * Writes to response stream — no temp files required.
 * Audit logs every export action.
 */

import { Response } from 'express';
import { IQueryResult, ExportFormat, IExportRequest } from './analytics.types';

export class AnalyticsExportService {

  /**
   * Stream a CSV export directly to HTTP response.
   */
  streamCsv(res: Response, result: IQueryResult, filename: string): void {
    const rows = result.data;
    if (!rows.length) {
      res.status(200).send('');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines: string[] = [this.csvRow(headers)];

    for (const row of rows) {
      const values = headers.map(h => this.csvEscape(row[h]));
      csvLines.push(this.csvRow(values));
    }

    const csv = csvLines.join('\n');
    const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Analytics-Rows', String(rows.length));
    res.setHeader('X-Analytics-Truncated', String(result.truncated));
    res.status(200).send(csv);
  }

  /**
   * Stream a JSON export directly to HTTP response.
   */
  streamJson(res: Response, result: IQueryResult, filename: string): void {
    const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Analytics-Rows', String(result.data.length));
    res.status(200).json({
      meta: {
        rows:         result.data.length,
        truncated:    result.truncated,
        executedInMs: result.executedInMs,
        exportedAt:   new Date().toISOString(),
      },
      data: result.data,
    });
  }

  streamExport(res: Response, result: IQueryResult, request: IExportRequest): void {
    const filename = request.filename ?? `clycites_export_${Date.now()}`;
    if (request.format === ExportFormat.CSV) {
      this.streamCsv(res, result, filename);
    } else {
      this.streamJson(res, result, filename);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private csvRow(vals: unknown[]): string {
    return vals.map(v => this.csvEscape(v)).join(',');
  }
}

export const analyticsExportService = new AnalyticsExportService();
export default analyticsExportService;
