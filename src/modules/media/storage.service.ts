/**
 * Storage Service — provider-agnostic file I/O abstraction
 *
 * Implements LocalStorageProvider backed by the `uploads/` directory.
 * The same interface can be satisfied by an S3Provider or GCSProvider
 * by implementing IStorageProvider and swapping the export at the bottom.
 *
 * Signed URL tokens are HMAC-SHA256 signed with the app secret and embed:
 *   fileId + expiresEpoch
 * No third-party JWT dependency is required.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../common/utils/logger';

// ── Config ────────────────────────────────────────────────────────────────────
const UPLOAD_ROOT   = path.resolve(process.cwd(), 'uploads');
const SIGNING_SECRET = process.env.STORAGE_SIGNING_SECRET ?? process.env.JWT_SECRET ?? 'clycites-storage-secret';
const BASE_URL      = process.env.API_BASE_URL ?? 'http://localhost:3000';

// ── Storage provider interface ────────────────────────────────────────────────

export interface IStorageProvider {
  /** Persist a buffer and return the storage key */
  put(fileName: string, buffer: Buffer, mimeType: string): Promise<string>;
  /** Retrieve file contents */
  get(key: string): Promise<Buffer>;
  /** Remove a file */
  delete(key: string): Promise<void>;
  /** List all keys under a prefix */
  list(prefix: string): Promise<string[]>;
  /** Generate a time-limited signed download URL */
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Public URL (for PUBLIC access level files) */
  publicUrl(key: string): string;
}

// ── Local storage provider ────────────────────────────────────────────────────

class LocalStorageProvider implements IStorageProvider {

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async put(fileName: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const subDir  = fileName.split('/').slice(0, -1).join('/');
    const fullDir = subDir ? path.join(UPLOAD_ROOT, subDir) : UPLOAD_ROOT;
    this.ensureDir(fullDir);

    const fullPath = path.join(UPLOAD_ROOT, fileName);
    await fs.promises.writeFile(fullPath, buffer);
    logger.debug(`[Storage] wrote ${buffer.length} bytes → ${fileName}`);
    return fileName;
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${key}`);
    return fs.promises.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.debug(`[Storage] deleted ${key}`);
    }
  }

  async list(prefix: string): Promise<string[]> {
    const dir = path.join(UPLOAD_ROOT, prefix);
    if (!fs.existsSync(dir)) return [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => path.join(prefix, e.name).replace(/\\/g, '/'));
  }

  /** HMAC-SHA256 signed URL: ?token=<sig>&expires=<epoch> */
  async signedUrl(key: string, ttlSeconds: number): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${key}:${expires}`;
    const sig     = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
    return `${BASE_URL}/api/v1/media/serve/${encodeURIComponent(key)}?token=${sig}&expires=${expires}`;
  }

  publicUrl(key: string): string {
    return `${BASE_URL}/api/v1/media/public/${encodeURIComponent(key)}`;
  }
}

// ── Signed URL verification (used by serve controller) ───────────────────────

export function verifySignedUrl(key: string, token: string, expires: number): boolean {
  const now     = Math.floor(Date.now() / 1000);
  if (now > expires) return false;
  const payload  = `${key}:${expires}`;
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
}

// ── Field-level encryption (AES-256-GCM) ─────────────────────────────────────

const ENCRYPTION_KEY_HEX = process.env.FILE_ENCRYPTION_KEY ??
  '0000000000000000000000000000000000000000000000000000000000000000'; // 64 hex chars = 32 bytes

export function encryptBuffer(plaintext: Buffer): {
  ciphertext: Buffer;
  iv: string;
  authTag: string;
  keyId: string;
} {
  const key     = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const iv      = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher  = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct1     = cipher.update(plaintext);
  const ct2     = cipher.final();
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([ct1, ct2]),
    iv:         iv.toString('hex'),
    authTag:    authTag.toString('hex'),
    keyId:      'primary-v1',
  };
}

export function decryptBuffer(ciphertext: Buffer, iv: string, authTag: string): Buffer {
  const key      = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const pt1 = decipher.update(ciphertext);
  const pt2 = decipher.final();
  return Buffer.concat([pt1, pt2]);
}

// ── Checksum ──────────────────────────────────────────────────────────────────

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ── Storage key generator ─────────────────────────────────────────────────────

export function buildStorageKey(fileType: string, ext: string): string {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm   = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(date.getUTCDate()).padStart(2, '0');
  const id   = uuidv4().replace(/-/g, '');
  return `${fileType}/${yyyy}/${mm}/${dd}/${id}.${ext}`;
}

// ── Virus scan stub (replace with ClamAV / VirusTotal integration) ────────────

import { ScanStatus } from './media.types';

export async function scanBuffer(_buffer: Buffer, mimeType: string): Promise<ScanStatus> {
  // Fast-track non-executable image/csv types that pose very low risk.
  const lowRisk = ['image/jpeg', 'image/png', 'image/webp', 'text/csv'];
  if (lowRisk.includes(mimeType)) return ScanStatus.CLEAN;

  // TODO: integrate ClamAV via `clamscan` npm package or VirusTotal API:
  //   const scanner = new NodeClam();
  //   const { isInfected } = await scanner.scanBuffer(buffer);
  //   return isInfected ? ScanStatus.INFECTED : ScanStatus.CLEAN;

  return ScanStatus.CLEAN;
}

// ── Export provider singleton ─────────────────────────────────────────────────

export const storageProvider: IStorageProvider = new LocalStorageProvider();
export default storageProvider;
