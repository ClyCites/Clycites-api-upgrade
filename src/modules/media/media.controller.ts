import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mediaService from './media.service';
import { sendSuccess } from '../../common/utils/response';
import { AuthRequest } from '../../common/middleware/auth';
import { ScanStatus } from './media.types';
import { AppError } from '../../common/errors/AppError';

// ── Multer: store in memory for processing ────────────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 100 * 1024 * 1024 }, // 100 MB hard limit; per-type enforced in service
});

// ── Upload ─────────────────────────────────────────────────────────────────────

export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file attached', 400);
    const result = await mediaService.upload(
      req.file,
      req.body,
      req.user!.id,
      { ip: req.ip, headers: req.headers as Record<string, string | string[] | undefined> }
    );
    sendSuccess(res, result, 'File uploaded successfully', 201);
  } catch (error) { next(error); }
};

// ── Signed URL ─────────────────────────────────────────────────────────────────

export const getSignedUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ttlSeconds = req.query.ttl ? Number(req.query.ttl) : undefined;
    const result = await mediaService.getSignedUrl(req.params.id, req.user!.id, ttlSeconds);
    sendSuccess(res, result, 'Signed URL generated');
  } catch (error) { next(error); }
};

// ── Serve (private signed) ─────────────────────────────────────────────────────

export const serveSignedFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const token   = req.query.token as string;
    const expires = Number(req.query.expires);
    if (!token || isNaN(expires)) throw new AppError('Missing or invalid signed URL parameters', 400);
    const { buffer, mimeType } = await mediaService.serveFile(
      decodeURIComponent(key), token, expires
    );
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  } catch (error) { next(error); }
};

// ── Serve (public) ─────────────────────────────────────────────────────────────

export const servePublicFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { buffer, mimeType } = await mediaService.servePublicFile(decodeURIComponent(key));
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  } catch (error) { next(error); }
};

// ── Metadata ───────────────────────────────────────────────────────────────────

export const getFileMetadata = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const file = await mediaService.getFileMetadata(req.params.id, req.user!.id);
    sendSuccess(res, file, 'File metadata retrieved');
  } catch (error) { next(error); }
};

export const listMyFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await mediaService.listMyFiles(req.user!.id, req.query as Record<string, unknown>);
    sendSuccess(res, result, 'Files retrieved');
  } catch (error) { next(error); }
};

export const listLinkedFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = await mediaService.listLinkedFiles(
      req.params.model, req.params.id, req.user!.id, req.user!.role
    );
    sendSuccess(res, files, 'Linked files retrieved');
  } catch (error) { next(error); }
};

// ── Delete ─────────────────────────────────────────────────────────────────────

export const deleteFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await mediaService.deleteFile(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, null, 'File deleted');
  } catch (error) { next(error); }
};

// ── Admin: scan update ─────────────────────────────────────────────────────────

export const updateScanResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await mediaService.updateScanResult(req.params.id, req.body.status as ScanStatus, req.user!.id);
    sendSuccess(res, null, 'Scan status updated');
  } catch (error) { next(error); }
};

// ── Admin: expire stale files ──────────────────────────────────────────────────

export const expireStaleFiles = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await mediaService.expireStaleFiles();
    sendSuccess(res, { expired: count }, 'Lifecycle sweep complete');
  } catch (error) { next(error); }
};
